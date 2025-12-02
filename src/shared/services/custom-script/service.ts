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
import { IMAGE_MODELS, VIDEO_MODELS } from '@/extensions/ai/providers/evolink/models';
import { createR2ProviderFromDb } from '@/extensions/storage/db-config-loader';

import { generateScenesWithPetImage, addMusicToPrompt } from './gemini-service';
import { mergeVideosWithRetry } from '@/extensions/video/merge-service';
import { refundCredits } from '@/shared/models/credit';
import { createAITask } from '@/shared/models/ai_task';
import { AITaskStatus } from '@/extensions/ai';
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

  try {
    // Step 1: 使用 Gemini Vision 一次调用完成：宠物识别 + 分镜生成
    const generatedResult = await generateScenesWithPetImage(
      request.petImageUrl,
      request.userPrompt,
      request.durationSeconds as 60 | 120,
      request.aspectRatio as '16:9' | '9:16',
      request.styleId || 'pixar-3d',
      request.customStyle,
      request.musicPrompt
    );

    // Step 2: 创建剧本主记录（包含宠物信息和全局风格）
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
      scenesJson: JSON.stringify(generatedResult), // 包含 pet + globalStylePrefix + scenes
      storyTitle: generatedResult.title,
      creditsUsed: 15, // 初始化扣除的积分
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Step 3: 创建分镜段落记录
    const sceneRecords = generatedResult.scenes.map((scene) => {
      const sceneId = nanoid();
      // 如果有配乐提示词，添加到每个场景的视频提示词
      const promptWithMusic = addMusicToPrompt(scene.prompt, request.musicPrompt);

      return {
        id: sceneId,
        scriptId,
        sceneNumber: scene.sceneNumber,
        prompt: promptWithMusic, // 视频生成用完整提示词
        firstFramePrompt: scene.firstFramePrompt || null, // 首帧图用简化提示词
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

    return {
      scriptId,
      title: generatedResult.title,
      scenes: sceneRecords.map((record) => ({
        id: record.id,
        sceneNumber: record.sceneNumber,
        prompt: record.prompt,
        description: record.description || '',
      })),
    };
  } catch (error) {
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
      // 记录数据库错误到 Sentry，但不阻断主错误
      Sentry.captureException(dbError, {
        tags: { component: 'custom_script', action: 'save_failed_record' },
      });
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

  // 只更新提示词，保留首帧图（用户可以选择是否重新生成）
  // 视频状态重置为 pending，因为提示词变化后可能需要重新生成
  await database
    .update(customScriptScene)
    .set({
      prompt,
      // 保留首帧图，不重置 frameStatus、frameImageUrl、frameTaskId
      // 只重置视频状态，让用户可以用现有首帧图重新生成视频
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

    // 使用 firstFramePrompt（专门为静态图片设计的提示词）
    // 如果没有 firstFramePrompt，则使用完整 prompt 的简化版本
    let framePrompt = scene.firstFramePrompt || scene.prompt;

    // 安全检查：确保 firstFramePrompt 包含宠物引用（图生图必须有主体）
    // 如果没有 "the same cat/dog" 或 "the cat/dog"，则添加一个默认的宠物描述
    const hasPetReference = /the\s+(same\s+)?(cat|dog|pet)/i.test(framePrompt);
    if (!hasPetReference) {
      // 从 scenesJson 中获取宠物信息
      let petSpecies = 'pet';
      try {
        const scenesData = JSON.parse(scriptData.script.scenesJson || '{}');
        if (scenesData.pet?.species) {
          petSpecies = scenesData.pet.species;
        }
      } catch {
        // 忽略解析错误
      }
      // 在提示词开头添加宠物引用
      framePrompt = `the same ${petSpecies} in the scene, ${framePrompt}`;
    }

    // 构建图生图提示词
    // 使用与模板功能相似的格式："Transform this pet into [style], [scene description]"
    // 这个格式在 Seedream 图生图中更稳定
    const styleTransferPrompt = `Transform this pet into ${stylePrefix} style, ${framePrompt}`;

    // 验证图片 URL 是否可访问，并检查格式
    let petImageUrl = scriptData.script.petImageUrl;
    try {
      const imageCheckResponse = await fetch(petImageUrl, { method: 'HEAD' });
      const contentType = imageCheckResponse.headers.get('content-type');

      // 检查是否为 WebP 格式 - Seedream 不支持 WebP 作为图生图输入
      if (contentType?.includes('webp') || petImageUrl.toLowerCase().endsWith('.webp')) {
        try {
          // 使用 sharp 进行真正的图片格式转换
          const sharp = (await import('sharp')).default;

          // 下载原始图片
          const imageResponse = await fetch(petImageUrl);
          if (!imageResponse.ok) {
            throw new Error(`Failed to download image: ${imageResponse.status}`);
          }
          const webpBuffer = Buffer.from(await imageResponse.arrayBuffer());

          // 使用 sharp 将 WebP 转换为 PNG
          const pngBuffer = await sharp(webpBuffer)
            .png()
            .toBuffer();

          // 上传转换后的 PNG 到 R2
          const r2Provider = await createR2ProviderFromDb();
          const convertedKey = `custom-script/${scriptId}/pet-image-converted.png`;

          const uploadResult = await r2Provider.uploadFile({
            body: pngBuffer,
            key: convertedKey,
            contentType: 'image/png',
            disposition: 'inline',
          });

          if (uploadResult.success && uploadResult.url) {
            petImageUrl = uploadResult.url;
          }
        } catch (convertError) {
          // 记录转换失败，但继续使用原始 URL
          Sentry.addBreadcrumb({
            category: 'custom_script',
            message: 'WebP to PNG conversion failed',
            level: 'warning',
            data: { error: convertError instanceof Error ? convertError.message : 'Unknown' },
          });
        }
      }
    } catch (urlError) {
      // 记录 URL 检查失败
      Sentry.addBreadcrumb({
        category: 'custom_script',
        message: 'Pet image URL check failed',
        level: 'warning',
        data: { error: urlError instanceof Error ? urlError.message : 'Unknown' },
      });
    }

    // 限制提示词长度（Seedream 可能对长提示词不友好）
    const maxPromptLength = 500;
    let finalPrompt = styleTransferPrompt;
    if (finalPrompt.length > maxPromptLength) {
      finalPrompt = finalPrompt.substring(0, maxPromptLength);
    }

    // 根据宽高比计算具体尺寸（与视频保持一致）
    const aspectRatio = scriptData.script.aspectRatio as '16:9' | '9:16';
    const size = aspectRatio === '16:9' ? '1280x720' : '720x1280';

    // 创建图生图任务（使用可能已转换的 petImageUrl）
    const response = await evolinkClient.generateImage({
      model: IMAGE_MODELS.SEEDREAM_4,
      prompt: finalPrompt,
      image_urls: [petImageUrl], // 使用可能已从 WebP 转换的 URL
      aspect_ratio: aspectRatio,
      size, // 具体尺寸，确保与视频一致
    });

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
          .catch(() => {}); // 进度更新失败不影响主流程
      },
    });

    // 更新进度为 85%（开始上传到 R2）
    await database
      .update(customScriptScene)
      .set({ frameProgress: 85, updatedAt: new Date() })
      .where(eq(customScriptScene.id, sceneId));

    // 上传到 R2 永久存储
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

    // 退还积分（首帧图生成失败时退回已扣积分）
    try {
      await refundCredits({
        userId,
        credits: CUSTOM_SCRIPT_CREDITS.FRAME,
        scene: 'custom-script-frame-refund',
        description: `Refund for failed frame generation - Scene ${sceneId}`,
        metadata: JSON.stringify({
          scriptId,
          sceneId,
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      });
    } catch (refundError) {
      Sentry.captureException(refundError, {
        tags: { component: 'custom_script', action: 'refund_credits' },
      });
    }

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

    // 从 scenesJson 中获取全局风格前缀（包含视觉风格 + 角色一致性描述）
    let globalStylePrefix = '';
    try {
      const scenesData = JSON.parse(scriptData.script.scenesJson || '{}') as GeneratedScenes;
      if (scenesData.globalStylePrefix) {
        globalStylePrefix = scenesData.globalStylePrefix;
      }
    } catch {
      // 忽略解析错误，使用空前缀
    }

    // 构建完整的视频提示词：全局风格前缀 + 场景提示词（已包含音乐）
    // globalStylePrefix 包含：视觉风格 + 角色描述（宠物外观一致性）
    // scene.prompt 包含：场景动作描述 + 音乐提示词（在创建时已添加）
    const fullVideoPrompt = globalStylePrefix
      ? `${globalStylePrefix}. ${scene.prompt}`
      : scene.prompt;

    // 创建 Sora-2 视频生成任务（每个分镜15秒）
    const response = await evolinkClient.generateSora2Video({
      model: VIDEO_MODELS.SORA_2,
      prompt: fullVideoPrompt,
      aspect_ratio: scriptData.script.aspectRatio as '16:9' | '9:16',
      duration: 15, // 每个分镜固定15秒
      image_urls: [scene.frameImageUrl], // 使用首帧图作为参考
    });

    // 保存任务 ID，初始化进度为0
    await database
      .update(customScriptScene)
      .set({ videoTaskId: response.id, videoProgress: 0, updatedAt: new Date() })
      .where(eq(customScriptScene.id, sceneId));

    // 轮询等待完成，同时更新进度
    const tempVideoUrl = await evolinkClient.pollSora2VideoGeneration(response.id, {
      maxAttempts: 60, // 10分钟超时
      intervalMs: 10000,
      onProgress: async (progress: number) => {
        // 保存进度到数据库（进度更新不阻塞主流程）
        // 进度 0-80% 为 AI 生成阶段
        const adjustedProgress = Math.floor(progress * 0.8);
        database
          .update(customScriptScene)
          .set({ videoProgress: adjustedProgress, updatedAt: new Date() })
          .where(eq(customScriptScene.id, sceneId))
          .catch(() => {}); // 进度更新失败不影响主流程
      },
    });

    // 更新进度为 85%（开始上传到 R2）
    await database
      .update(customScriptScene)
      .set({ videoProgress: 85, updatedAt: new Date() })
      .where(eq(customScriptScene.id, sceneId));

    // 上传到 R2 永久存储
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

    // 退还积分（视频生成失败时退回已扣积分）
    try {
      await refundCredits({
        userId,
        credits: CUSTOM_SCRIPT_CREDITS.VIDEO,
        scene: 'custom-script-video-refund',
        description: `Refund for failed video generation - Scene ${sceneId}`,
        metadata: JSON.stringify({
          scriptId,
          sceneId,
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      });
    } catch (refundError) {
      Sentry.captureException(refundError, {
        tags: { component: 'custom_script', action: 'refund_credits' },
      });
    }

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

    // 调用合并服务
    const result = await mergeVideosWithRetry(videoUrls, scriptId);

    if (!result.success || !result.mergedUrl) {
      throw new Error(result.error || 'Video merge failed');
    }

    // 更新剧本状态为 completed，保存最终视频URL
    await database
      .update(customScript)
      .set({
        status: 'completed',
        finalVideoUrl: result.mergedUrl,
        updatedAt: new Date(),
      })
      .where(eq(customScript.id, scriptId));

    // 创建 ai_task 记录，让视频显示在 /activity/ai-tasks 页面
    // 注意：积分已在各分镜生成时扣除，这里不再扣除
    try {
      // 获取剧本标题和宠物描述
      let storyTitle = scriptData.script.storyTitle || 'Custom Script Video';
      let petDescription = '';
      try {
        const scenesData = JSON.parse(scriptData.script.scenesJson || '{}') as GeneratedScenes;
        if (scenesData.pet?.descriptionCn) {
          petDescription = scenesData.pet.descriptionCn;
        }
      } catch {
        // 忽略解析错误
      }

      await createAITask(
        {
          id: nanoid(),
          userId,
          mediaType: 'video',
          provider: 'custom-script',
          model: VIDEO_MODELS.SORA_2,
          prompt: scriptData.script.userPrompt || storyTitle,
          options: JSON.stringify({
            scriptId,
            durationSeconds: scriptData.script.durationSeconds,
            aspectRatio: scriptData.script.aspectRatio,
            styleId: scriptData.script.styleId,
            sceneCount: scriptData.scenes.length,
          }),
          status: AITaskStatus.SUCCESS,
          costCredits: scriptData.script.creditsUsed,
          scene: 'custom-script',
          petImageUrl: scriptData.script.petImageUrl,
          petDescription,
          finalVideoUrl: result.mergedUrl,
          durationSeconds: scriptData.script.durationSeconds,
          aspectRatio: scriptData.script.aspectRatio,
          taskInfo: JSON.stringify({
            scriptId,
            storyTitle,
            sceneCount: scriptData.scenes.length,
          }),
        },
        { skipCreditConsumption: true } // 积分已在分镜生成时扣除
      );
    } catch (aiTaskError) {
      // ai_task 创建失败不影响主流程，只记录到 Sentry
      Sentry.captureException(aiTaskError, {
        tags: { component: 'custom_script', action: 'create_ai_task' },
      });
    }

    return result.mergedUrl;
  } catch (error) {

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
