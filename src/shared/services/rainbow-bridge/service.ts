/**
 * Rainbow Bridge Video Generation Service
 * 彩虹桥视频生成服务
 *
 * 流程：
 * 1. 生成角色参考卡（Character Sheet）- 包含所有角色的多角度视图
 * 2. 并发生成4个首帧图（使用参考卡保持角色一致性，根据 characterIds 控制出场角色）
 * 3. 首帧完成即触发对应视频生成（不等待所有首帧）
 * 4. 所有视频完成后合并
 * 5. 加水印上传
 * 6. 失败时退还积分
 */

import * as Sentry from '@sentry/nextjs';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

import { db } from '@/core/db';
import { aiTask } from '@/config/db/schema';
import {
  getVideoTemplate,
  replacePlaceholders,
  type VideoTemplate,
  type SceneTemplate,
  type CharacterData,
} from '@/config/video-templates';
import { createEvolinkClient } from '@/extensions/ai/providers/evolink/client';
import { IMAGE_MODELS, VIDEO_MODELS } from '@/extensions/ai/providers/evolink/models';
import { createR2ProviderFromDb } from '@/extensions/storage/db-config-loader';
import { mergeVideosWithRetry } from '@/extensions/video/merge-service';
import { applyWatermarkWithRetry } from '@/extensions/video/watermark-service';
import { refundCredits } from '@/shared/models/credit';
import { shouldAddWatermark } from '@/shared/services/task-limiter';

// 常量配置
const MAX_RETRIES = 2;           // 单个生成任务的重试次数
const SCENE_RETRY_ROUNDS = 2;    // 场景级别的重试轮数（只重试失败的场景）
const RETRY_DELAY_MS = 5000;

// 任务状态类型
export type RainbowBridgeStatus =
  | 'pending'
  | 'generating_character_sheet'
  | 'generating_frames'
  | 'generating_videos'
  | 'merging'
  | 'applying_watermark'
  | 'completed'
  | 'failed';

// 场景状态
interface SceneStatus {
  sceneNumber: number;
  frameTaskId?: string;
  frameUrl?: string;
  frameStatus: 'pending' | 'generating' | 'completed' | 'failed';
  videoTaskId?: string;
  videoUrl?: string;
  videoStatus: 'pending' | 'generating' | 'completed' | 'failed';
}

// 任务信息（存储在 taskInfo JSON 字段）
interface TaskInfo {
  petType: 'cat' | 'dog';
  aspectRatio: '16:9' | '9:16';
  characterSheetUrl?: string;
  characterSheetTaskId?: string;
  scenes: SceneStatus[];
  creditsRequired: number;
  startTime: number;
}

/**
 * 创建 Rainbow Bridge 任务
 */
export async function createRainbowBridgeTask({
  userId,
  petType,
  petImageUrl,
  aspectRatio,
  creditsRequired,
}: {
  userId: string;
  petType: 'cat' | 'dog';
  petImageUrl: string;
  aspectRatio: '16:9' | '9:16';
  creditsRequired: number;
}): Promise<string> {
  const database = db();
  const taskId = nanoid();
  const template = getVideoTemplate(petType);

  // 初始化场景状态
  const scenes: SceneStatus[] = template.scenes.map((scene) => ({
    sceneNumber: scene.sceneNumber,
    frameStatus: 'pending',
    videoStatus: 'pending',
  }));

  const taskInfo: TaskInfo = {
    petType,
    aspectRatio,
    scenes,
    creditsRequired,
    startTime: Date.now(),
  };

  // 创建任务记录
  await database.insert(aiTask).values({
    id: taskId,
    userId,
    mediaType: 'video',
    provider: 'evolink',
    model: VIDEO_MODELS.SORA_2,
    prompt: `Rainbow Bridge ${petType} video - ${template.name}`,
    status: 'pending',
    costCredits: creditsRequired,
    scene: 'rainbow-bridge',
    petImageUrl,
    templateType: petType,
    durationSeconds: template.durationSeconds,
    aspectRatio,
    taskInfo: JSON.stringify(taskInfo),
    retryCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return taskId;
}

/**
 * 执行 Rainbow Bridge 视频生成
 */
export async function executeRainbowBridgeGeneration(taskId: string): Promise<void> {
  const database = db();
  const startTime = Date.now();

  try {
    // 获取任务详情
    const task = await getTask(taskId);
    const taskInfo = JSON.parse(task.taskInfo || '{}') as TaskInfo;
    const template = getVideoTemplate(taskInfo.petType);

    // Sentry 上下文
    Sentry.setUser({ id: task.userId });
    Sentry.setContext('rainbow_bridge_task', {
      taskId,
      petType: taskInfo.petType,
      aspectRatio: taskInfo.aspectRatio,
    });

    // Step 1: 生成角色参考卡
    await updateTaskStatus(taskId, 'generating_character_sheet');

    const characterSheetUrl = await generateCharacterSheetWithRetry(
      taskId,
      task.petImageUrl!,
      template,
      taskInfo.aspectRatio
    );
    taskInfo.characterSheetUrl = characterSheetUrl;
    await updateTaskInfo(taskId, taskInfo);

    // Step 2 & 3: 并发生成首帧图，首帧完成即触发视频生成
    await updateTaskStatus(taskId, 'generating_frames');

    // 场景重试机制：只重试失败的场景
    let pendingSceneIndices = template.scenes.map((_, index) => index);

    for (let round = 1; round <= SCENE_RETRY_ROUNDS; round++) {
      if (pendingSceneIndices.length === 0) break;

      // 并发处理待处理的场景
      // 定义统一的结果类型，避免 TypeScript 类型推断问题
      type SceneResult = { index: number; success: boolean; error?: Error };
      const scenePromises = pendingSceneIndices.map((index): Promise<SceneResult> => {
        const scene = template.scenes[index];
        return processScene(taskId, task.petImageUrl!, characterSheetUrl, scene, template, taskInfo, index)
          .then(() => ({ index, success: true }))
          .catch((error) => ({ index, success: false, error }));
      });

      const results = await Promise.all(scenePromises);

      // 找出仍然失败的场景
      const failedResults = results.filter((r) => !r.success);
      pendingSceneIndices = failedResults.map((r) => r.index);

      if (failedResults.length > 0) {
        // 上报场景失败信息到 Sentry
        Sentry.addBreadcrumb({
          category: 'rainbow_bridge',
          message: `Round ${round}: ${failedResults.length} scene(s) failed`,
          level: 'warning',
          data: {
            round,
            failedScenes: failedResults.map((r) => ({
              index: r.index + 1,
              error: r.error?.message,
            })),
          },
        });

        if (round < SCENE_RETRY_ROUNDS && pendingSceneIndices.length > 0) {
          await sleep(RETRY_DELAY_MS);
        }
      }
    }

    // 最终检查：如果还有失败的场景，抛出错误
    if (pendingSceneIndices.length > 0) {
      const failedSceneNumbers = pendingSceneIndices.map((i) => i + 1).join(', ');
      throw new Error(`Scene(s) ${failedSceneNumbers} failed after ${SCENE_RETRY_ROUNDS} retry rounds`);
    }

    // 收集所有视频 URL
    const videoUrls = taskInfo.scenes
      .filter((s) => s.videoUrl)
      .sort((a, b) => a.sceneNumber - b.sceneNumber)
      .map((s) => s.videoUrl!);

    if (videoUrls.length !== template.sceneCount) {
      throw new Error(`Expected ${template.sceneCount} videos, got ${videoUrls.length}`);
    }

    // Step 4: 合并视频
    await updateTaskStatus(taskId, 'merging');

    const mergeResult = await mergeVideosWithRetry(videoUrls, taskId);
    if (!mergeResult.success || !mergeResult.mergedUrl) {
      throw new Error(mergeResult.error || 'Video merge failed');
    }

    // Step 5: 根据用户计划决定是否加水印
    await updateTaskStatus(taskId, 'applying_watermark');

    // 使用已有的 task 变量获取用户ID
    const needWatermark = await shouldAddWatermark(task.userId);

    let watermarkedUrl: string | undefined;

    if (needWatermark) {
      // 免费用户需要添加水印
      try {
        const watermarkResult = await applyWatermarkWithRetry(mergeResult.mergedUrl, taskId);
        if (watermarkResult.success && watermarkResult.watermarkedUrl) {
          watermarkedUrl = watermarkResult.watermarkedUrl;
        } else {
          // 水印失败上报 Sentry，但不阻断流程
          Sentry.captureMessage('Watermark failed', {
            level: 'warning',
            extra: { taskId, error: watermarkResult.error },
          });
        }
      } catch (err) {
        // 水印异常上报 Sentry，但不阻断流程
        Sentry.captureException(err, { extra: { taskId, step: 'watermark' } });
      }
    } else {
      // 付费用户跳过水印，直接使用原视频
      console.log(`[Rainbow Bridge] Skipping watermark for paid user: ${task.userId}`);
    }

    // 完成任务
    const totalTime = Date.now() - startTime;

    await database
      .update(aiTask)
      .set({
        status: 'completed',
        frameImageUrl: characterSheetUrl,
        finalVideoUrl: mergeResult.mergedUrl,
        watermarkedVideoUrl: watermarkedUrl,
        taskInfo: JSON.stringify(taskInfo),
        updatedAt: new Date(),
      })
      .where(eq(aiTask.id, taskId));

    Sentry.addBreadcrumb({
      category: 'task',
      message: 'Rainbow Bridge generation completed',
      level: 'info',
      data: { totalTimeMs: totalTime },
    });
  } catch (error) {
    // 获取任务详情用于退款
    const task = await getTask(taskId);
    const taskInfo = JSON.parse(task.taskInfo || '{}') as TaskInfo;

    // 防止重复退款：检查任务是否已经失败（已退过款）
    if (task.status === 'failed') {
      throw error;
    }

    // 先更新任务状态为失败，防止并发重复退款
    await db()
      .update(aiTask)
      .set({
        status: 'failed',
        errorLog: JSON.stringify({ message: error instanceof Error ? error.message : 'Unknown error', time: new Date().toISOString() }),
        updatedAt: new Date(),
      })
      .where(eq(aiTask.id, taskId));

    // 退还积分（状态已更新，即使退款失败也不会重复退）
    try {
      if (taskInfo.creditsRequired && taskInfo.creditsRequired > 0) {
        await refundCredits({
          userId: task.userId,
          credits: taskInfo.creditsRequired,
          scene: 'rainbow-bridge-refund',
          description: `Refund for failed Rainbow Bridge video: ${taskId}`,
          metadata: JSON.stringify({ taskId, error: error instanceof Error ? error.message : 'Unknown' }),
        });
      }
    } catch (refundError) {
      // 退款失败上报 Sentry
      Sentry.captureException(refundError, {
        tags: { taskId, action: 'refund_credits' },
      });
    }

    // 上报任务失败到 Sentry
    Sentry.captureException(error, {
      tags: { taskId, service: 'rainbow-bridge' },
    });

    throw error;
  }
}

/**
 * 处理单个场景（首帧 + 视频）
 * 支持断点续传：如果首帧已完成则跳过，只生成视频
 */
async function processScene(
  taskId: string,
  petImageUrl: string,
  characterSheetUrl: string,
  scene: SceneTemplate,
  template: VideoTemplate,
  taskInfo: TaskInfo,
  index: number
): Promise<void> {
  let frameUrl = taskInfo.scenes[index].frameUrl;

  // 检查首帧是否已完成（支持断点续传）
  if (!(frameUrl && taskInfo.scenes[index].frameStatus === 'completed')) {
    // 生成首帧图
    taskInfo.scenes[index].frameStatus = 'generating';
    await updateTaskInfo(taskId, taskInfo);

    frameUrl = await generateFrameWithRetry(
      taskId,
      characterSheetUrl,
      scene,
      template,
      taskInfo.aspectRatio
    );

    taskInfo.scenes[index].frameUrl = frameUrl;
    taskInfo.scenes[index].frameStatus = 'completed';
    await updateTaskInfo(taskId, taskInfo);
  }

  // 检查视频是否已完成（支持断点续传）
  if (taskInfo.scenes[index].videoUrl && taskInfo.scenes[index].videoStatus === 'completed') {
    return;
  }

  // 首帧完成后生成视频
  taskInfo.scenes[index].videoStatus = 'generating';
  await updateTaskInfo(taskId, taskInfo);

  // 替换视频提示词中的占位符
  const videoPromptWithCharacters = replacePlaceholders(scene.videoPrompt, template.characters);

  const videoUrl = await generateVideoWithRetry(
    taskId,
    frameUrl,
    videoPromptWithCharacters,
    taskInfo.aspectRatio,
    scene.sceneNumber
  );

  taskInfo.scenes[index].videoUrl = videoUrl;
  taskInfo.scenes[index].videoStatus = 'completed';
  await updateTaskInfo(taskId, taskInfo);
}

/**
 * 生成角色参考卡（带重试）
 * 生成后上传到 R2 永久存储，避免临时链接过期
 */
async function generateCharacterSheetWithRetry(
  taskId: string,
  petImageUrl: string,
  template: VideoTemplate,
  aspectRatio: '16:9' | '9:16'
): Promise<string> {
  const evolinkClient = createEvolinkClient();
  const size = aspectRatio === '16:9' ? '1280x720' : '720x1280';

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // 创建图片生成任务
      const response = await evolinkClient.generateImage({
        model: IMAGE_MODELS.SEEDREAM_4,
        prompt: template.characterSheet.prompt,
        aspect_ratio: aspectRatio,
        size,
        image_url: petImageUrl,
        strength: 0.55, // 保留宠物特征
      });

      // 轮询等待完成，获取临时 URL
      const tempImageUrl = await evolinkClient.pollImageGeneration(response.id, {
        maxAttempts: 60,
        intervalMs: 5000,
      });

      // 上传到 R2 永久存储
      const r2Provider = await createR2ProviderFromDb();
      const r2Key = `rainbow-bridge/${taskId}/character-sheet.png`;

      const uploadResult = await r2Provider.downloadAndUpload({
        url: tempImageUrl,
        key: r2Key,
        contentType: 'image/png',
        disposition: 'inline',
      });

      if (!uploadResult.success || !uploadResult.url) {
        throw new Error(`Failed to upload character sheet to R2: ${uploadResult.error}`);
      }

      return uploadResult.url;
    } catch (error) {
      // 重试时上报 Sentry breadcrumb
      Sentry.addBreadcrumb({
        category: 'rainbow_bridge',
        message: `Character sheet attempt ${attempt} failed`,
        level: 'warning',
        data: { attempt, error: error instanceof Error ? error.message : 'Unknown' },
      });
      if (attempt === MAX_RETRIES) throw error;
      await sleep(RETRY_DELAY_MS * attempt);
    }
  }

  throw new Error('Character sheet generation failed after all retries');
}

/**
 * 构建首帧图的完整提示词
 * 基于场景的 characterIds 筛选角色，构建包含角色描述和排除角色的提示词
 */
function buildFramePrompt(
  scene: SceneTemplate,
  template: VideoTemplate
): string {
  const { characters, globalStylePrefix } = template;
  const { characterIds, firstFramePrompt } = scene;

  // 根据 characterIds 筛选出场角色和排除角色
  const sceneCharacters = characters.filter(c => characterIds.includes(c.id));
  const excludedCharacters = characters.filter(c => !characterIds.includes(c.id));

  const promptParts: string[] = [];

  // 1. 全局风格前缀
  promptParts.push(`${globalStylePrefix} scene.`);

  // 2. 出场角色的详细描述
  if (sceneCharacters.length > 0) {
    let characterSection = 'CHARACTERS IN THIS SCENE (must match the reference image exactly):';
    sceneCharacters.forEach(char => {
      characterSection += `\n- ${char.name}: ${char.description}`;
    });
    promptParts.push(characterSection);
  }

  // 3. 场景描述（替换占位符）
  const sceneDescWithCharacters = replacePlaceholders(firstFramePrompt, characters);
  promptParts.push(`SCENE DESCRIPTION:\n${sceneDescWithCharacters}`);

  // 4. 重要约束：角色一致性
  if (sceneCharacters.length > 0) {
    const characterNames = sceneCharacters.map(c => c.name).join(' and ');
    promptParts.push(`IMPORTANT REQUIREMENTS:
- ${characterNames} must appear in this frame with their exact appearance from the reference image
- All characters must be clearly visible and recognizable
- The scene composition must be logical and coherent`);
  }

  // 5. 不应出现的角色
  if (excludedCharacters.length > 0) {
    const excludedNames = excludedCharacters.map(c => c.name).join(', ');
    promptParts.push(`DO NOT include these characters in this frame: ${excludedNames}`);
  }

  return promptParts.join('\n\n');
}

/**
 * 生成首帧图（带重试）
 * 生成后上传到 R2 永久存储，避免临时链接过期
 */
async function generateFrameWithRetry(
  taskId: string,
  referenceImageUrl: string,
  scene: SceneTemplate,
  template: VideoTemplate,
  aspectRatio: '16:9' | '9:16'
): Promise<string> {
  const evolinkClient = createEvolinkClient();
  const size = aspectRatio === '16:9' ? '1280x720' : '720x1280';
  const sceneNumber = scene.sceneNumber;

  // 构建完整的首帧提示词
  const prompt = buildFramePrompt(scene, template);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await evolinkClient.generateImage({
        model: IMAGE_MODELS.SEEDREAM_4,
        prompt,
        aspect_ratio: aspectRatio,
        size,
        image_url: referenceImageUrl,
        strength: 0.65,
      });

      // 轮询等待完成，获取临时 URL
      const tempImageUrl = await evolinkClient.pollImageGeneration(response.id, {
        maxAttempts: 60,
        intervalMs: 5000,
      });

      // 上传到 R2 永久存储
      const r2Provider = await createR2ProviderFromDb();
      const r2Key = `rainbow-bridge/${taskId}/frames/scene-${sceneNumber}.png`;

      const uploadResult = await r2Provider.downloadAndUpload({
        url: tempImageUrl,
        key: r2Key,
        contentType: 'image/png',
        disposition: 'inline',
      });

      if (!uploadResult.success || !uploadResult.url) {
        throw new Error(`Failed to upload frame ${sceneNumber} to R2: ${uploadResult.error}`);
      }

      return uploadResult.url;
    } catch (error) {
      // 重试时上报 Sentry breadcrumb
      Sentry.addBreadcrumb({
        category: 'rainbow_bridge',
        message: `Frame ${sceneNumber} attempt ${attempt} failed`,
        level: 'warning',
        data: { sceneNumber, attempt, error: error instanceof Error ? error.message : 'Unknown' },
      });
      if (attempt === MAX_RETRIES) throw error;
      await sleep(RETRY_DELAY_MS * attempt);
    }
  }

  throw new Error(`Frame ${sceneNumber} generation failed after all retries`);
}

/**
 * 生成视频（带重试）
 */
async function generateVideoWithRetry(
  taskId: string,
  frameImageUrl: string,
  prompt: string,
  aspectRatio: '16:9' | '9:16',
  sceneNumber: number
): Promise<string> {
  const evolinkClient = createEvolinkClient();

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await evolinkClient.generateSora2Video({
        model: VIDEO_MODELS.SORA_2,
        prompt,
        aspect_ratio: aspectRatio,
        duration: 15, // 每个分镜固定15秒（4场景×15秒=60秒）
        image_urls: [frameImageUrl],
      });

      // 轮询等待完成
      const videoUrl = await pollVideoGeneration(evolinkClient, response.id, sceneNumber);

      return videoUrl;
    } catch (error) {
      // 重试时上报 Sentry breadcrumb
      Sentry.addBreadcrumb({
        category: 'rainbow_bridge',
        message: `Video ${sceneNumber} attempt ${attempt} failed`,
        level: 'warning',
        data: { sceneNumber, attempt, error: error instanceof Error ? error.message : 'Unknown' },
      });
      if (attempt === MAX_RETRIES) throw error;
      await sleep(RETRY_DELAY_MS * attempt);
    }
  }

  throw new Error(`Video ${sceneNumber} generation failed after all retries`);
}

/**
 * 轮询视频生成状态
 */
async function pollVideoGeneration(
  client: ReturnType<typeof createEvolinkClient>,
  taskId: string,
  sceneNumber: number
): Promise<string> {
  const maxAttempts = 120; // 10分钟
  const intervalMs = 5000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const status = await client.getTaskStatus(taskId);

    if (status.status === 'completed' && status.results?.[0]) {
      return status.results[0];
    }

    if (status.status === 'failed') {
      throw new Error(`Video ${sceneNumber} generation failed: ${status.error?.message || 'Unknown'}`);
    }

    await sleep(intervalMs);
  }

  throw new Error(`Video ${sceneNumber} generation timed out`);
}

/**
 * 获取任务详情
 */
async function getTask(taskId: string) {
  const [task] = await db()
    .select()
    .from(aiTask)
    .where(eq(aiTask.id, taskId))
    .limit(1);

  if (!task) {
    throw new Error(`Task not found: ${taskId}`);
  }

  return task;
}

/**
 * 更新任务状态
 */
async function updateTaskStatus(taskId: string, status: RainbowBridgeStatus) {
  await db()
    .update(aiTask)
    .set({ status, updatedAt: new Date() })
    .where(eq(aiTask.id, taskId));
}

/**
 * 更新任务信息
 */
async function updateTaskInfo(taskId: string, taskInfo: TaskInfo) {
  await db()
    .update(aiTask)
    .set({ taskInfo: JSON.stringify(taskInfo), updatedAt: new Date() })
    .where(eq(aiTask.id, taskId));
}

/**
 * 睡眠函数
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
