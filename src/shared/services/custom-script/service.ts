/**
 * Custom Script Service
 * 自定义剧本服务 - 处理剧本创建、分镜管理、视频生成等
 */

import * as Sentry from '@sentry/nextjs';
import { and, asc, desc, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

import { db } from '@/core/db';
import { customScript, customScriptScene } from '@/config/db/schema';
import { createEvolinkClient } from '@/extensions/ai/providers/evolink/client';
import { createR2ProviderFromDb } from '@/extensions/storage/db-config-loader';

import { generateScenes, addMusicToPrompt } from './gemini-service';
import { mergeVideosWithRetry } from '@/extensions/video/merge-service';
import type {
  CreateScriptRequest,
  CustomScriptRecord,
  CustomScriptSceneRecord,
  GeneratedScenes,
  SceneItemStatus,
  ScriptStatus,
} from './types';
import { CUSTOM_SCRIPT_CREDITS, getStylePrefix, type VideoStyleId } from './types';

// ==================== 剧本管理 ====================

/**
 * 创建新的自定义剧本
 * 1. 扣除初始化积分
 * 2. 调用 Gemini 生成分镜
 * 3. 保存剧本和分镜到数据库
 */
export async function createCustomScript(
  userId: string,
  request: CreateScriptRequest
): Promise<{
  scriptId: string;
  title: string;
  scenes: Array<{
    id: string;
    sceneNumber: number;
    prompt: string;
    description: string;
  }>;
}> {
  const database = db();
  const scriptId = nanoid();

  console.log('\n🎬 ========== Creating Custom Script ==========');
  console.log('📝 Script ID:', scriptId);
  console.log('👤 User ID:', userId);
  console.log('⏱️  Duration:', request.durationSeconds, 'seconds');

  try {
    // Step 1: 调用 Gemini 生成分镜
    console.log('\n📝 Step 1: Generating scenes with Gemini...');
    const generatedScenes = await generateScenes(
      request.userPrompt,
      request.durationSeconds as 60 | 120,
      request.aspectRatio as '16:9' | '9:16',
      request.styleId || 'pixar-3d',
      request.customStyle,
      request.musicPrompt
    );

    // Step 2: 创建剧本主记录
    console.log('\n💾 Step 2: Saving script to database...');
    await database.insert(customScript).values({
      id: scriptId,
      userId,
      status: 'creating',
      petImageUrl: request.petImageUrl,
      userPrompt: request.userPrompt,
      musicPrompt: request.musicPrompt || null,
      durationSeconds: request.durationSeconds,
      aspectRatio: request.aspectRatio,
      styleId: request.styleId || 'pixar-3d',
      customStyle: request.customStyle || null,
      scenesJson: JSON.stringify(generatedScenes),
      storyTitle: generatedScenes.title,
      creditsUsed: 15, // 初始化扣除的积分
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Step 3: 创建分镜段落记录
    console.log('\n💾 Step 3: Saving scenes to database...');
    const sceneRecords = generatedScenes.scenes.map((scene, index) => {
      const sceneId = nanoid();
      // 如果有配乐提示词，添加到每个场景
      const promptWithMusic = addMusicToPrompt(scene.prompt, request.musicPrompt);

      return {
        id: sceneId,
        scriptId,
        sceneNumber: scene.sceneNumber,
        prompt: promptWithMusic,
        originalPrompt: scene.prompt,
        description: scene.description || null,
        descriptionEn: scene.descriptionEn || null,
        frameStatus: 'pending' as SceneItemStatus,
        videoStatus: 'pending' as SceneItemStatus,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    });

    await database.insert(customScriptScene).values(sceneRecords);

    console.log('✅ Custom script created successfully!');
    console.log('📖 Title:', generatedScenes.title);
    console.log('🎬 Scene count:', sceneRecords.length);

    return {
      scriptId,
      title: generatedScenes.title,
      scenes: sceneRecords.map((record) => ({
        id: record.id,
        sceneNumber: record.sceneNumber,
        prompt: record.prompt,
        description: record.description || '',
      })),
    };
  } catch (error) {
    console.error('❌ Failed to create custom script:', error);

    // 如果失败，记录错误但保留剧本记录（状态为 failed）
    try {
      await database.insert(customScript).values({
        id: scriptId,
        userId,
        status: 'failed',
        petImageUrl: request.petImageUrl,
        userPrompt: request.userPrompt,
        musicPrompt: request.musicPrompt || null,
        durationSeconds: request.durationSeconds,
        aspectRatio: request.aspectRatio,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (dbError) {
      console.error('Failed to save failed script record:', dbError);
    }

    Sentry.captureException(error, {
      tags: { component: 'custom_script', action: 'create' },
    });

    throw error;
  }
}

/**
 * 获取剧本详情（包含所有分镜）
 */
export async function getCustomScript(
  scriptId: string,
  userId: string
): Promise<{
  script: CustomScriptRecord;
  scenes: CustomScriptSceneRecord[];
} | null> {
  const database = db();

  const scripts = await database
    .select()
    .from(customScript)
    .where(and(eq(customScript.id, scriptId), eq(customScript.userId, userId)))
    .limit(1);

  if (scripts.length === 0) {
    return null;
  }

  const scenes = await database
    .select()
    .from(customScriptScene)
    .where(eq(customScriptScene.scriptId, scriptId))
    .orderBy(asc(customScriptScene.sceneNumber));

  return {
    script: scripts[0] as CustomScriptRecord,
    scenes: scenes as CustomScriptSceneRecord[],
  };
}

/**
 * 获取用户的剧本列表
 */
export async function getUserScripts(
  userId: string,
  limit: number = 20
): Promise<CustomScriptRecord[]> {
  const database = db();

  // 只选择列表需要的字段，减少数据传输
  const scripts = await database
    .select({
      id: customScript.id,
      userId: customScript.userId,
      status: customScript.status,
      petImageUrl: customScript.petImageUrl,
      userPrompt: customScript.userPrompt,
      musicPrompt: customScript.musicPrompt,
      durationSeconds: customScript.durationSeconds,
      aspectRatio: customScript.aspectRatio,
      styleId: customScript.styleId,
      customStyle: customScript.customStyle,
      scenesJson: customScript.scenesJson,
      storyTitle: customScript.storyTitle,
      finalVideoUrl: customScript.finalVideoUrl,
      creditsUsed: customScript.creditsUsed,
      createdAt: customScript.createdAt,
      updatedAt: customScript.updatedAt,
    })
    .from(customScript)
    .where(eq(customScript.userId, userId))
    .orderBy(desc(customScript.createdAt)) // 最新的在前
    .limit(limit);

  return scripts as CustomScriptRecord[];
}

/**
 * 更新剧本状态
 */
export async function updateScriptStatus(
  scriptId: string,
  status: ScriptStatus
): Promise<void> {
  const database = db();

  await database
    .update(customScript)
    .set({ status, updatedAt: new Date() })
    .where(eq(customScript.id, scriptId));
}

/**
 * 保存剧本（关闭时调用）
 */
export async function saveScript(scriptId: string): Promise<void> {
  const database = db();

  // 检查所有分镜是否都已完成
  const scenes = await database
    .select()
    .from(customScriptScene)
    .where(eq(customScriptScene.scriptId, scriptId));

  const allCompleted = scenes.every(
    (scene) =>
      scene.frameStatus === 'completed' && scene.videoStatus === 'completed'
  );

  // 如果全部完成，更新状态为 completed，否则保持 creating
  const newStatus: ScriptStatus = allCompleted ? 'completed' : 'creating';

  await database
    .update(customScript)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(eq(customScript.id, scriptId));

  console.log(`💾 Script ${scriptId} saved with status: ${newStatus}`);
}

// ==================== 分镜管理 ====================

/**
 * 更新分镜提示词
 */
export async function updateScenePrompt(
  sceneId: string,
  scriptId: string,
  userId: string,
  prompt: string
): Promise<boolean> {
  const database = db();

  // 验证剧本所有权
  const scripts = await database
    .select()
    .from(customScript)
    .where(and(eq(customScript.id, scriptId), eq(customScript.userId, userId)))
    .limit(1);

  if (scripts.length === 0) {
    return false;
  }

  // 更新提示词，同时重置状态为 pending
  await database
    .update(customScriptScene)
    .set({
      prompt,
      frameStatus: 'pending',
      frameImageUrl: null,
      frameTaskId: null,
      videoStatus: 'pending',
      videoUrl: null,
      videoTaskId: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(customScriptScene.id, sceneId),
        eq(customScriptScene.scriptId, scriptId)
      )
    );

  return true;
}

/**
 * 获取单个分镜
 */
export async function getScene(
  sceneId: string,
  scriptId: string
): Promise<CustomScriptSceneRecord | null> {
  const database = db();

  const scenes = await database
    .select()
    .from(customScriptScene)
    .where(
      and(
        eq(customScriptScene.id, sceneId),
        eq(customScriptScene.scriptId, scriptId)
      )
    )
    .limit(1);

  return scenes.length > 0 ? (scenes[0] as CustomScriptSceneRecord) : null;
}

// ==================== 首帧图生成 ====================

/**
 * 生成分镜首帧图
 * 使用 Seedream 4.0 图生图
 */
export async function generateSceneFrame(
  sceneId: string,
  scriptId: string,
  userId: string
): Promise<string> {
  const database = db();

  console.log('\n🖼️  ========== Generating Scene Frame ==========');
  console.log('📝 Scene ID:', sceneId);
  console.log('📝 Script ID:', scriptId);

  // 获取剧本和分镜信息
  const scriptData = await getCustomScript(scriptId, userId);
  if (!scriptData) {
    throw new Error('Script not found');
  }

  const scene = scriptData.scenes.find((s) => s.id === sceneId);
  if (!scene) {
    throw new Error('Scene not found');
  }

  if (!scriptData.script.petImageUrl) {
    throw new Error('Pet image URL is missing');
  }

  // 更新状态为生成中
  await database
    .update(customScriptScene)
    .set({ frameStatus: 'generating', updatedAt: new Date() })
    .where(eq(customScriptScene.id, sceneId));

  try {
    const evolinkClient = createEvolinkClient();

    // 获取风格前缀（从数据库读取用户选择的风格）
    const styleId = (scriptData.script.styleId || 'pixar-3d') as VideoStyleId;
    const customStyle = scriptData.script.customStyle || undefined;
    const stylePrefix = getStylePrefix(styleId, customStyle);

    // 构建图生图提示词（使用用户选择的风格）
    const styleTransferPrompt = `Transform this pet into ${stylePrefix}, ${scene.prompt}`;

    console.log('🎨 Style ID:', styleId);
    console.log('🎨 Style prefix:', stylePrefix.substring(0, 50) + '...');
    console.log('🎨 Style transfer prompt:', styleTransferPrompt.substring(0, 100) + '...');
    console.log('🖼️  Pet image URL:', scriptData.script.petImageUrl);
    console.log('📐 Aspect ratio:', scriptData.script.aspectRatio);

    // 创建图生图任务
    const response = await evolinkClient.generateImage({
      model: 'doubao-seedream-4.0',
      prompt: styleTransferPrompt,
      image_urls: [scriptData.script.petImageUrl],
      aspect_ratio: scriptData.script.aspectRatio,
    });

    console.log('✅ Image task created:', response.id);

    // 保存任务 ID，初始化进度为0
    await database
      .update(customScriptScene)
      .set({ frameTaskId: response.id, frameProgress: 0, updatedAt: new Date() })
      .where(eq(customScriptScene.id, sceneId));

    // 轮询等待完成，同时更新进度
    const tempFrameImageUrl = await evolinkClient.pollImageGeneration(response.id, {
      maxAttempts: 60,
      intervalMs: 5000,
      onProgress: async (progress: number) => {
        // 保存进度到数据库（进度更新不阻塞主流程）
        // 进度 0-80% 为 AI 生成阶段
        const adjustedProgress = Math.floor(progress * 0.8);
        database
          .update(customScriptScene)
          .set({ frameProgress: adjustedProgress, updatedAt: new Date() })
          .where(eq(customScriptScene.id, sceneId))
          .catch((err) => console.error('Failed to update frame progress:', err));
      },
    });

    console.log('🎉 Frame image generated (temp):', tempFrameImageUrl);

    // 更新进度为 85%（开始上传到 R2）
    await database
      .update(customScriptScene)
      .set({ frameProgress: 85, updatedAt: new Date() })
      .where(eq(customScriptScene.id, sceneId));

    // 上传到 R2 永久存储
    console.log('⬆️  Uploading frame image to R2...');
    const r2Provider = await createR2ProviderFromDb();
    const r2Key = `custom-script/${scriptId}/frames/${sceneId}.png`;

    const uploadResult = await r2Provider.downloadAndUpload({
      url: tempFrameImageUrl,
      key: r2Key,
      contentType: 'image/png',
      disposition: 'inline',
    });

    if (!uploadResult.success || !uploadResult.url) {
      throw new Error(`Failed to upload frame image to R2: ${uploadResult.error}`);
    }

    const frameImageUrl = uploadResult.url;
    console.log('✅ Frame image uploaded to R2:', frameImageUrl);

    // 更新状态为完成，进度100%
    await database
      .update(customScriptScene)
      .set({
        frameStatus: 'completed',
        frameImageUrl,
        frameProgress: 100,
        updatedAt: new Date(),
      })
      .where(eq(customScriptScene.id, sceneId));

    // 更新剧本已用积分
    await database
      .update(customScript)
      .set({
        creditsUsed: scriptData.script.creditsUsed + 5,
        updatedAt: new Date(),
      })
      .where(eq(customScript.id, scriptId));

    return frameImageUrl;
  } catch (error) {
    console.error('❌ Frame generation failed:', error);

    // 更新状态为失败
    await database
      .update(customScriptScene)
      .set({
        frameStatus: 'failed',
        errorLog: JSON.stringify({
          type: 'frame_generation',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        }),
        updatedAt: new Date(),
      })
      .where(eq(customScriptScene.id, sceneId));

    Sentry.captureException(error, {
      tags: { component: 'custom_script', action: 'generate_frame' },
    });

    throw error;
  }
}

// ==================== 视频生成 ====================

/**
 * 生成分镜视频
 * 使用 Evolink Sora-2
 */
export async function generateSceneVideo(
  sceneId: string,
  scriptId: string,
  userId: string
): Promise<string> {
  const database = db();

  console.log('\n🎬 ========== Generating Scene Video ==========');
  console.log('📝 Scene ID:', sceneId);
  console.log('📝 Script ID:', scriptId);

  // 获取剧本和分镜信息
  const scriptData = await getCustomScript(scriptId, userId);
  if (!scriptData) {
    throw new Error('Script not found');
  }

  const scene = scriptData.scenes.find((s) => s.id === sceneId);
  if (!scene) {
    throw new Error('Scene not found');
  }

  // 必须先有首帧图
  if (!scene.frameImageUrl) {
    throw new Error('Frame image must be generated first');
  }

  // 更新状态为生成中
  await database
    .update(customScriptScene)
    .set({ videoStatus: 'generating', updatedAt: new Date() })
    .where(eq(customScriptScene.id, sceneId));

  try {
    const evolinkClient = createEvolinkClient();

    console.log('🎨 Video prompt:', scene.prompt.substring(0, 100) + '...');
    console.log('🖼️  Frame image URL:', scene.frameImageUrl);
    console.log('📐 Aspect ratio:', scriptData.script.aspectRatio);

    // 创建 Sora-2 视频生成任务（每个分镜15秒）
    const response = await evolinkClient.generateSora2Video({
      model: 'sora-2',
      prompt: scene.prompt,
      aspect_ratio: scriptData.script.aspectRatio as '16:9' | '9:16',
      duration: 15, // 每个分镜固定15秒
      image_urls: [scene.frameImageUrl], // 使用首帧图作为参考
    });

    console.log('✅ Video task created:', response.id);

    // 保存任务 ID，初始化进度为0
    await database
      .update(customScriptScene)
      .set({ videoTaskId: response.id, videoProgress: 0, updatedAt: new Date() })
      .where(eq(customScriptScene.id, sceneId));

    // 轮询等待完成，同时更新进度
    const tempVideoUrl = await evolinkClient.pollSora2VideoGeneration(response.id, {
      maxAttempts: 60, // 10分钟超时
      intervalMs: 10000,
      onProgress: async (progress: number, status: string) => {
        console.log(`📊 Video progress: ${progress}% (${status})`);
        // 保存进度到数据库（进度更新不阻塞主流程）
        // 进度 0-80% 为 AI 生成阶段
        const adjustedProgress = Math.floor(progress * 0.8);
        database
          .update(customScriptScene)
          .set({ videoProgress: adjustedProgress, updatedAt: new Date() })
          .where(eq(customScriptScene.id, sceneId))
          .catch((err) => console.error('Failed to update video progress:', err));
      },
    });

    console.log('🎉 Video generated (temp):', tempVideoUrl);

    // 更新进度为 85%（开始上传到 R2）
    await database
      .update(customScriptScene)
      .set({ videoProgress: 85, updatedAt: new Date() })
      .where(eq(customScriptScene.id, sceneId));

    // 上传到 R2 永久存储
    console.log('⬆️  Uploading video to R2...');
    const r2Provider = await createR2ProviderFromDb();
    const r2Key = `custom-script/${scriptId}/videos/${sceneId}.mp4`;

    const uploadResult = await r2Provider.downloadAndUpload({
      url: tempVideoUrl,
      key: r2Key,
      contentType: 'video/mp4',
      disposition: 'inline',
    });

    if (!uploadResult.success || !uploadResult.url) {
      throw new Error(`Failed to upload video to R2: ${uploadResult.error}`);
    }

    const videoUrl = uploadResult.url;
    console.log('✅ Video uploaded to R2:', videoUrl);

    // 更新状态为完成，进度100%
    await database
      .update(customScriptScene)
      .set({
        videoStatus: 'completed',
        videoUrl,
        videoProgress: 100,
        updatedAt: new Date(),
      })
      .where(eq(customScriptScene.id, sceneId));

    // 更新剧本已用积分
    await database
      .update(customScript)
      .set({
        creditsUsed: scriptData.script.creditsUsed + 10,
        updatedAt: new Date(),
      })
      .where(eq(customScript.id, scriptId));

    return videoUrl;
  } catch (error) {
    console.error('❌ Video generation failed:', error);

    // 更新状态为失败
    await database
      .update(customScriptScene)
      .set({
        videoStatus: 'failed',
        errorLog: JSON.stringify({
          type: 'video_generation',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        }),
        updatedAt: new Date(),
      })
      .where(eq(customScriptScene.id, sceneId));

    Sentry.captureException(error, {
      tags: { component: 'custom_script', action: 'generate_video' },
    });

    throw error;
  }
}

// ==================== 查询任务状态 ====================

/**
 * 获取分镜的生成状态（用于轮询）
 */
export async function getSceneStatus(
  sceneId: string,
  scriptId: string,
  userId: string
): Promise<{
  frameStatus: SceneItemStatus;
  frameImageUrl?: string;
  frameProgress?: number;
  videoStatus: SceneItemStatus;
  videoUrl?: string;
  videoProgress?: number;
} | null> {
  const database = db();

  // 验证剧本所有权
  const scripts = await database
    .select()
    .from(customScript)
    .where(and(eq(customScript.id, scriptId), eq(customScript.userId, userId)))
    .limit(1);

  if (scripts.length === 0) {
    return null;
  }

  const scenes = await database
    .select({
      frameStatus: customScriptScene.frameStatus,
      frameImageUrl: customScriptScene.frameImageUrl,
      frameProgress: customScriptScene.frameProgress,
      videoStatus: customScriptScene.videoStatus,
      videoUrl: customScriptScene.videoUrl,
      videoProgress: customScriptScene.videoProgress,
    })
    .from(customScriptScene)
    .where(
      and(
        eq(customScriptScene.id, sceneId),
        eq(customScriptScene.scriptId, scriptId)
      )
    )
    .limit(1);

  if (scenes.length === 0) {
    return null;
  }

  return {
    frameStatus: scenes[0].frameStatus as SceneItemStatus,
    frameImageUrl: scenes[0].frameImageUrl || undefined,
    frameProgress: scenes[0].frameProgress ?? undefined,
    videoStatus: scenes[0].videoStatus as SceneItemStatus,
    videoUrl: scenes[0].videoUrl || undefined,
    videoProgress: scenes[0].videoProgress ?? undefined,
  };
}

// ==================== 视频合并 ====================

/**
 * 合并剧本的所有分镜视频
 * 检查所有分镜视频是否都已完成，然后进行合并
 */
export async function mergeScriptVideos(
  scriptId: string,
  userId: string
): Promise<string> {
  const database = db();

  console.log('\n🎬 ========== Merging Script Videos ==========');
  console.log('📝 Script ID:', scriptId);

  // 获取剧本和分镜
  const scriptData = await getCustomScript(scriptId, userId);
  if (!scriptData) {
    throw new Error('Script not found');
  }

  // 检查所有分镜视频是否都已完成
  const incompleteScenesCount = scriptData.scenes.filter(
    (scene) => scene.videoStatus !== 'completed' || !scene.videoUrl
  ).length;

  if (incompleteScenesCount > 0) {
    throw new Error(
      `Cannot merge: ${incompleteScenesCount} scene(s) are not completed`
    );
  }

  // 更新剧本状态为 merging
  await database
    .update(customScript)
    .set({ status: 'merging' as ScriptStatus, updatedAt: new Date() })
    .where(eq(customScript.id, scriptId));

  try {
    // 按顺序获取所有视频URL
    const videoUrls = scriptData.scenes
      .sort((a, b) => a.sceneNumber - b.sceneNumber)
      .map((scene) => scene.videoUrl!)
      .filter(Boolean);

    console.log('📼 Video URLs to merge:', videoUrls.length);

    // 调用合并服务
    const result = await mergeVideosWithRetry(videoUrls, scriptId);

    if (!result.success || !result.mergedUrl) {
      throw new Error(result.error || 'Video merge failed');
    }

    console.log('🎉 Merged video URL:', result.mergedUrl);

    // 更新剧本状态为 completed，保存最终视频URL
    await database
      .update(customScript)
      .set({
        status: 'completed',
        finalVideoUrl: result.mergedUrl,
        updatedAt: new Date(),
      })
      .where(eq(customScript.id, scriptId));

    return result.mergedUrl;
  } catch (error) {
    console.error('❌ Video merge failed:', error);

    // 更新状态为 failed
    await database
      .update(customScript)
      .set({ status: 'failed', updatedAt: new Date() })
      .where(eq(customScript.id, scriptId));

    Sentry.captureException(error, {
      tags: { component: 'custom_script', action: 'merge_videos' },
    });

    throw error;
  }
}
