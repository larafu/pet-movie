/**
 * Pet Video Generation Service
 * Orchestrates the complete video generation pipeline
 */

import * as Sentry from '@sentry/nextjs';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';

import { db } from '@/core/db';
import { aiTask } from '@/config/db/schema';
import { createEvolinkClient } from '@/extensions/ai/providers/evolink/client';
import { IMAGE_MODELS, VIDEO_MODELS } from '@/extensions/ai/providers/evolink/models';
import { createKieClient } from '@/extensions/ai/providers/kie/client';
import { createR2ProviderFromDb } from '@/extensions/storage/db-config-loader';

import {
  getCreditsCost,
  getNFrames,
  getTemplate,
  replacePetDescription,
} from './template-loader';
import type { PetVideoGenerationRequest, PetVideoTaskStatus } from './types';

const MAX_RETRIES = 3;
const EVOLINK_RETRY_DELAY = 10000; // 10s
const KIE_RETRY_DELAY = 15000; // 15s
const R2_RETRY_DELAY = 5000; // 5s

/**
 * Create a new pet video generation task
 */
export async function createPetVideoTask(
  request: PetVideoGenerationRequest
): Promise<string> {
  const database = db();
  const taskId = nanoid();

  // Get template and calculate cost
  const template = getTemplate(request.templateType);
  const creditsCost = getCreditsCost(template, request.durationSeconds);

  // Create task record
  await database.insert(aiTask).values({
    id: taskId,
    userId: request.userId,
    mediaType: 'video',
    provider: 'kie',
    model: VIDEO_MODELS.SORA_2_PRO_STORYBOARD,
    prompt: `Pet video - ${request.templateType} template`,
    status: 'pending',
    costCredits: creditsCost,
    scene: 'pet-video-generation',
    petImageUrl: request.petImageUrl,
    templateType: request.templateType,
    durationSeconds: request.durationSeconds,
    aspectRatio: request.aspectRatio,
    retryCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return taskId;
}

/**
 * Execute the complete video generation pipeline
 * This runs asynchronously after task creation
 */
export async function executePetVideoGeneration(taskId: string): Promise<void> {
  const database = db();
  const startTime = Date.now();

  try {
    // Get task details for context
    const task = await getTask(taskId);

    // Set user context
    Sentry.setUser({ id: task.userId });

    // Set task context
    Sentry.setContext('pet_video_task', {
      taskId,
      templateType: task.templateType,
      durationSeconds: task.durationSeconds,
      scene: task.scene,
    });

    // Step 1: Identify pet characteristics (SKIPPED - using image-to-image instead)
    // With image-to-image generation, we don't need text description of the pet
    // The uploaded pet image is used directly as source for style transfer

    // Step 2: Generate frame image using image-to-image
    await updateTaskStatus(taskId, 'generating_frame');
    Sentry.addBreadcrumb({
      category: 'task',
      message: 'Starting frame generation (image-to-image)',
      level: 'info',
    });
    if (!task.petImageUrl) {
      throw new Error('Pet image URL is missing');
    }

    const frameImageUrl = await generateFrameWithRetry(
      taskId,
      task.petImageUrl
    );

    // Step 3: Generate video
    await updateTaskStatus(taskId, 'generating_video');
    Sentry.addBreadcrumb({
      category: 'task',
      message: 'Starting video generation',
      level: 'info',
    });
    const tempVideoUrl = await generateVideoWithRetry(taskId, frameImageUrl);

    // Step 4: Upload to R2 (原始视频，无水印)
    await updateTaskStatus(taskId, 'uploading');
    Sentry.addBreadcrumb({
      category: 'task',
      message: 'Starting R2 upload (original video)',
      level: 'info',
    });
    const originalVideoUrl = await uploadToR2WithRetry(taskId, tempVideoUrl);

    // Step 4.5: 根据用户计划决定是否加水印
    await updateTaskStatus(taskId, 'applying_watermark');

    // 获取任务对应的用户ID（复用已有的 task 变量）
    const currentUserId = task.userId;

    // 动态导入水印检查服务
    const { shouldAddWatermark } = await import('@/shared/services/task-limiter');
    const needWatermark = currentUserId ? await shouldAddWatermark(currentUserId) : true;

    let finalVideoUrl: string;
    let watermarkedVideoUrl: string | null = null;

    if (needWatermark) {
      // 免费用户需要添加水印
      Sentry.addBreadcrumb({
        category: 'task',
        message: 'Starting watermark application',
        level: 'info',
      });

      // 动态导入水印服务（避免在不需要时加载FFmpeg）
      const { applyWatermarkWithRetry } = await import(
        '@/extensions/video/watermark-service'
      );

      const watermarkResult = await applyWatermarkWithRetry(
        originalVideoUrl,
        taskId
      );

      if (watermarkResult.success && watermarkResult.watermarkedUrl) {
        watermarkedVideoUrl = watermarkResult.watermarkedUrl;
        finalVideoUrl = watermarkResult.watermarkedUrl; // 默认返回带水印版本

        // 记录成功指标到Sentry
        Sentry.addBreadcrumb({
          category: 'task',
          message: 'Watermark applied successfully',
          level: 'info',
          data: {
            processingTimeMs: watermarkResult.processingTimeMs,
            tmpSizeUsedMB: watermarkResult.tmpSizeUsedMB,
          },
        });
      } else {
        finalVideoUrl = originalVideoUrl; // 降级到原视频
        watermarkedVideoUrl = null;

        // 记录警告到Sentry（不影响主流程）
        Sentry.addBreadcrumb({
          category: 'task',
          message: 'Watermark application failed, fallback to original',
          level: 'warning',
          data: {
            error: watermarkResult.error,
          },
        });
      }
    } else {
      // 付费用户跳过水印，直接使用原视频
      finalVideoUrl = originalVideoUrl;
      console.log(`[Pet Video] Skipping watermark for paid user: ${currentUserId}`);
      Sentry.addBreadcrumb({
        category: 'task',
        message: 'Skipping watermark for paid user',
        level: 'info',
      });
    }

    // Step 5: Deduct credits (only after successful completion)
    await deductCredits(taskId);

    // Step 6: Mark as completed
    await database
      .update(aiTask)
      .set({
        status: 'completed',
        finalVideoUrl,
        originalVideoUrl,
        watermarkedVideoUrl,
        updatedAt: new Date(),
      })
      .where(eq(aiTask.id, taskId));

    // Track successful completion
    const duration = Date.now() - startTime;

    Sentry.addBreadcrumb({
      category: 'task',
      message: `Pet video generation completed in ${duration}ms`,
      level: 'info',
    });
  } catch (error) {
    // Set transaction as failed
    // Get current task status for error context
    const task = await getTask(taskId).catch(() => null);
    const currentStatus = task?.status || 'unknown';

    // Log error and mark task as failed
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    await database
      .update(aiTask)
      .set({
        status: 'failed',
        errorLog: JSON.stringify({
          message: errorMessage,
          timestamp: new Date().toISOString(),
          step: currentStatus,
        }),
        updatedAt: new Date(),
      })
      .where(eq(aiTask.id, taskId));

    // Capture exception with detailed context
    Sentry.captureException(error, {
      tags: {
        taskId,
        currentStatus,
      },
    });
  } finally {
    // Clean up Sentry context
    Sentry.setUser(null);
  }
}

/**
 * Identify pet characteristics with retry
 * 注：当前使用 image-to-image 流程，此函数暂未使用，保留供后续扩展
 */
async function identifyPetWithRetry(taskId: string): Promise<string> {
  const database = db();
  const task = await getTask(taskId);

  if (!task.petImageUrl) {
    throw new Error('Pet image URL is missing');
  }

  const evolinkClient = createEvolinkClient();

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const petDescription = await evolinkClient.identifyPet(task.petImageUrl);

      // Save pet description
      await database
        .update(aiTask)
        .set({
          petDescription,
          updatedAt: new Date(),
        })
        .where(eq(aiTask.id, taskId));

      return petDescription;
    } catch (error) {
      // Add breadcrumb for retry
      Sentry.addBreadcrumb({
        category: 'retry',
        message: `Pet identification attempt ${attempt + 1} failed`,
        level: 'warning',
        data: {
          attempt: attempt + 1,
          maxRetries: MAX_RETRIES,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      if (attempt < MAX_RETRIES - 1) {
        await sleep(EVOLINK_RETRY_DELAY);
      } else {
        throw new Error(
          `Pet identification failed after ${MAX_RETRIES} attempts`
        );
      }
    }
  }

  throw new Error('Unexpected error in identifyPetWithRetry');
}

/**
 * Generate frame image with retry using image-to-image generation
 */
async function generateFrameWithRetry(
  taskId: string,
  petImageUrl: string
): Promise<string> {
  const database = db();
  const task = await getTask(taskId);

  if (!task.templateType) {
    throw new Error('Template type is missing');
  }

  const template = getTemplate(task.templateType as 'dog' | 'cat');
  const { framePrompt } = replacePetDescription(template);

  // For image-to-image generation, we add a Pixar style transfer prefix
  const styleTransferPrompt = `Transform this pet into Pixar 3D CG animated style, ${framePrompt}`;

  // 用户选择的宽高比
  const taskAspectRatio = (task.aspectRatio || '16:9') as '16:9' | '9:16';

  const evolinkClient = createEvolinkClient();

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // 根据宽高比计算具体尺寸（与视频保持一致）
      const size = taskAspectRatio === '16:9' ? '1280x720' : '720x1280';

      const response = await evolinkClient.generateImage({
        model: IMAGE_MODELS.SEEDREAM_4,
        prompt: styleTransferPrompt,
        image_urls: [petImageUrl], // Image-to-image source
        aspect_ratio: taskAspectRatio, // 传递用户选择的宽高比
        size, // 具体尺寸，确保与视频一致
      });

      // Save frame task ID
      await database
        .update(aiTask)
        .set({
          frameTaskId: response.id,
          updatedAt: new Date(),
        })
        .where(eq(aiTask.id, taskId));

      // 轮询等待完成，获取临时 URL
      const tempFrameImageUrl = await evolinkClient.pollImageGeneration(
        response.id,
        {
          maxAttempts: 60,
          intervalMs: 5000,
        }
      );

      // 上传到 R2 永久存储，避免临时链接过期
      const r2Provider = await createR2ProviderFromDb();
      const r2Key = `pet-video/${taskId}/frame.png`;

      const uploadResult = await r2Provider.downloadAndUpload({
        url: tempFrameImageUrl,
        key: r2Key,
        contentType: 'image/png',
        disposition: 'inline',
      });

      if (!uploadResult.success || !uploadResult.url) {
        throw new Error(`Failed to upload frame to R2: ${uploadResult.error}`);
      }

      const frameImageUrl = uploadResult.url;

      // Save frame image URL (now permanent R2 URL)
      await database
        .update(aiTask)
        .set({
          frameImageUrl,
          updatedAt: new Date(),
        })
        .where(eq(aiTask.id, taskId));

      return frameImageUrl;
    } catch (error) {
      // Add breadcrumb for retry
      Sentry.addBreadcrumb({
        category: 'retry',
        message: `Frame generation attempt ${attempt + 1} failed`,
        level: 'warning',
        data: {
          attempt: attempt + 1,
          maxRetries: MAX_RETRIES,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      if (attempt < MAX_RETRIES - 1) {
        await sleep(EVOLINK_RETRY_DELAY);
      } else {
        throw new Error(
          `Frame generation failed after ${MAX_RETRIES} attempts`
        );
      }
    }
  }

  throw new Error('Unexpected error in generateFrameWithRetry');
}

/**
 * Generate video with retry
 */
async function generateVideoWithRetry(
  taskId: string,
  frameImageUrl: string
): Promise<string> {
  const database = db();
  const task = await getTask(taskId);

  if (!task.templateType || !task.durationSeconds) {
    throw new Error('Missing required task data for video generation');
  }

  const template = getTemplate(task.templateType as 'dog' | 'cat');
  const { shots } = replacePetDescription(template);
  const nFrames = getNFrames(template, task.durationSeconds as 25 | 50);

  // 将用户选择的比例转换为 KIE API 格式
  // "16:9" -> "landscape", "9:16" -> "portrait"
  const taskAspectRatio = task.aspectRatio || '16:9';
  const kieAspectRatio: 'portrait' | 'landscape' =
    taskAspectRatio === '9:16' ? 'portrait' : 'landscape';

  const kieClient = createKieClient();

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // Create video generation task
      const requestPayload = {
        model: VIDEO_MODELS.SORA_2_PRO_STORYBOARD,
        input: {
          n_frames: nFrames as '10' | '15' | '25' | '50',
          image_urls: [frameImageUrl],
          aspect_ratio: kieAspectRatio, // 使用用户选择的比例
          shots,
        },
      };

      const response = await kieClient.createTask(requestPayload);

      // Save video task ID
      await database
        .update(aiTask)
        .set({
          videoTaskId: response.data.taskId,
          updatedAt: new Date(),
        })
        .where(eq(aiTask.id, taskId));

      // Poll for completion
      const tempVideoUrl = await kieClient.pollVideoGeneration(
        response.data.taskId,
        {
          maxAttempts: 120,
          intervalMs: 10000,
        }
      );

      // Save temp video URL
      await database
        .update(aiTask)
        .set({
          tempVideoUrl,
          updatedAt: new Date(),
        })
        .where(eq(aiTask.id, taskId));

      return tempVideoUrl;
    } catch (error) {
      // Add breadcrumb for retry
      Sentry.addBreadcrumb({
        category: 'retry',
        message: `Video generation attempt ${attempt + 1} failed`,
        level: 'warning',
        data: {
          attempt: attempt + 1,
          maxRetries: MAX_RETRIES,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      if (attempt < MAX_RETRIES - 1) {
        await sleep(KIE_RETRY_DELAY);
      } else {
        throw new Error(
          `Video generation failed after ${MAX_RETRIES} attempts`
        );
      }
    }
  }

  throw new Error('Unexpected error in generateVideoWithRetry');
}

/**
 * Upload video to R2 with retry
 */
async function uploadToR2WithRetry(
  taskId: string,
  tempVideoUrl: string
): Promise<string> {
  // Check if this is a mock video URL (use local test video)
  if (tempVideoUrl.includes('mock-video-url.com')) {
    const r2Provider = await createR2ProviderFromDb();

    // Read local test video file
    const fs = await import('fs/promises');
    const path = await import('path');
    const testVideoPath = path.join(
      process.cwd(),
      'public/video/dog-funny-family.mp4'
    );

    const videoBuffer = await fs.readFile(testVideoPath);

    const key = `pet-videos/${taskId}.mp4`;

    const result = await r2Provider.uploadFile({
      key,
      body: videoBuffer,
      contentType: 'video/mp4',
      disposition: 'inline',
    });

    if (!result.success || !result.url) {
      throw new Error(result.error || 'R2 upload of test video failed');
    }

    return result.url;
  }

  const r2Provider = await createR2ProviderFromDb();

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // Download video from temp URL and upload to R2
      const key = `pet-videos/${taskId}.mp4`;

      const result = await r2Provider.downloadAndUpload({
        url: tempVideoUrl,
        key,
        contentType: 'video/mp4',
        disposition: 'inline',
      });

      if (!result.success || !result.url) {
        throw new Error(result.error || 'R2 upload failed');
      }

      return result.url;
    } catch (error) {
      // Add breadcrumb for retry
      Sentry.addBreadcrumb({
        category: 'retry',
        message: `R2 upload attempt ${attempt + 1} failed`,
        level: 'warning',
        data: {
          attempt: attempt + 1,
          maxRetries: MAX_RETRIES,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      if (attempt < MAX_RETRIES - 1) {
        await sleep(R2_RETRY_DELAY);
      } else {
        throw new Error(`R2 upload failed after ${MAX_RETRIES} attempts`);
      }
    }
  }

  throw new Error('Unexpected error in uploadToR2WithRetry');
}

/**
 * Deduct credits from user
 * 使用FIFO队列从用户积分中扣除
 */
async function deductCredits(taskId: string): Promise<void> {
  const database = db();

  // 获取任务信息
  const task = await getTask(taskId);
  const creditsCost = task.costCredits;

  if (!creditsCost || creditsCost <= 0) {
    return;
  }

  try {
    // 动态导入避免循环依赖
    const { consumeCredits } = await import('@/shared/models/credit');

    // 执行积分扣除
    const result = await consumeCredits({
      userId: task.userId,
      credits: creditsCost,
      scene: 'pet-video-generation',
      description: `Pet video generation - ${task.templateType} template`,
      metadata: JSON.stringify({
        taskId,
        templateType: task.templateType,
        durationSeconds: task.durationSeconds,
      }),
    });

    // 更新任务记录，关联积分交易
    await database
      .update(aiTask)
      .set({
        creditId: result.id,
        updatedAt: new Date(),
      })
      .where(eq(aiTask.id, taskId));
  } catch (error) {
    // 积分扣除失败不应该阻止视频交付，记录错误但继续
    Sentry.captureException(error, {
      tags: {
        component: 'credit_deduction',
        taskId,
      },
      level: 'error',
    });
  }
}

/**
 * Update task status
 */
async function updateTaskStatus(
  taskId: string,
  status: PetVideoTaskStatus['status']
): Promise<void> {
  const database = db();
  await database
    .update(aiTask)
    .set({
      status,
      updatedAt: new Date(),
    })
    .where(eq(aiTask.id, taskId));
}

/**
 * Get task by ID
 */
async function getTask(taskId: string) {
  const database = db();
  const tasks = await database
    .select()
    .from(aiTask)
    .where(eq(aiTask.id, taskId))
    .limit(1);

  if (tasks.length === 0) {
    throw new Error(`Task ${taskId} not found`);
  }

  return tasks[0];
}

/**
 * Get task status for user
 */
export async function getPetVideoTaskStatus(
  taskId: string,
  userId: string
): Promise<PetVideoTaskStatus | null> {
  const database = db();
  const tasks = await database
    .select()
    .from(aiTask)
    .where(eq(aiTask.id, taskId))
    .limit(1);

  if (tasks.length === 0 || tasks[0].userId !== userId) {
    return null;
  }

  const task = tasks[0];

  return {
    id: task.id,
    userId: task.userId,
    status: task.status as PetVideoTaskStatus['status'],
    templateType: task.templateType as 'dog' | 'cat',
    petImageUrl: task.petImageUrl || '',
    petDescription: task.petDescription || undefined,
    frameImageUrl: task.frameImageUrl || undefined,
    tempVideoUrl: task.tempVideoUrl || undefined,
    finalVideoUrl: task.finalVideoUrl || undefined,
    originalVideoUrl: task.originalVideoUrl || undefined,
    watermarkedVideoUrl: task.watermarkedVideoUrl || undefined,
    durationSeconds: task.durationSeconds || 25,
    costCredits: task.costCredits,
    retryCount: task.retryCount || 0,
    errorLog: task.errorLog || undefined,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

/**
 * 从 Rainbow Bridge 任务的 taskInfo 中提取第一个场景的首帧图
 */
function getFirstSceneFrameUrl(taskInfo: string | null): string | undefined {
  if (!taskInfo) return undefined;
  try {
    const info = JSON.parse(taskInfo);
    // Rainbow Bridge 任务的 scenes 数组中，每个场景有 frameUrl
    if (info.scenes && Array.isArray(info.scenes) && info.scenes.length > 0) {
      // 返回第一个已完成的场景首帧图
      const completedScene = info.scenes.find((s: any) => s.frameUrl);
      return completedScene?.frameUrl;
    }
  } catch {
    // 解析失败，返回 undefined
  }
  return undefined;
}

/**
 * Get user's pet video history
 * 获取用户的宠物视频历史（包括旧版和 Rainbow Bridge 任务）
 */
export async function getUserPetVideoHistory(
  userId: string,
  limit: number = 20,
  offset: number = 0
) {
  const database = db();

  // 查询所有宠物视频任务（包括旧版和 Rainbow Bridge）
  const tasks = await database
    .select()
    .from(aiTask)
    .where(
      and(
        eq(aiTask.userId, userId),
        inArray(aiTask.scene, ['pet-video-generation', 'rainbow-bridge'])
      )
    )
    .orderBy(desc(aiTask.createdAt)) // Newest first
    .limit(limit)
    .offset(offset);

  return tasks.map((task) => {
    // 对于 Rainbow Bridge 任务，优先使用第一个场景的首帧图
    let displayThumbnail = task.frameImageUrl;
    if (task.scene === 'rainbow-bridge') {
      const sceneFrameUrl = getFirstSceneFrameUrl(task.taskInfo);
      if (sceneFrameUrl) {
        displayThumbnail = sceneFrameUrl;
      }
    }

    return {
      id: task.id,
      templateType: task.templateType as 'dog' | 'cat',
      status: task.status,
      scene: task.scene, // 返回 scene 字段用于前端区分任务类型
      petImageUrl: task.petImageUrl,
      frameImageUrl: displayThumbnail, // 优先使用场景首帧图
      characterSheetUrl: task.frameImageUrl, // 角色参考卡 URL（原 frameImageUrl）
      finalVideoUrl: task.finalVideoUrl,
      tempVideoUrl: task.tempVideoUrl,
      originalVideoUrl: task.originalVideoUrl, // 原始无水印视频
      watermarkedVideoUrl: task.watermarkedVideoUrl, // 带水印视频
      durationSeconds: task.durationSeconds,
      aspectRatio: task.aspectRatio,
      costCredits: task.costCredits,
      isPublic: task.isPublic, // 是否公开分享
      likeCount: task.likeCount, // 点赞数
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  });
}

/**
 * Get public shared videos for inspiration
 * 获取公开分享的视频用于展示（包含用户信息和点赞数）
 */
export async function getPublicSharedVideos(
  limit: number = 20,
  offset: number = 0,
  currentUserId?: string
) {
  const database = db();

  // 动态导入表（避免循环依赖）
  const { user, videoLike } = await import('@/config/db/schema');

  const tasks = await database
    .select({
      id: aiTask.id,
      userId: aiTask.userId,
      templateType: aiTask.templateType,
      status: aiTask.status,
      frameImageUrl: aiTask.frameImageUrl,
      finalVideoUrl: aiTask.finalVideoUrl,
      originalVideoUrl: aiTask.originalVideoUrl, // 原始无水印视频URL（VIP下载使用）
      watermarkedVideoUrl: aiTask.watermarkedVideoUrl,
      durationSeconds: aiTask.durationSeconds,
      aspectRatio: aiTask.aspectRatio,
      likeCount: aiTask.likeCount,
      createdAt: aiTask.createdAt,
      // 用户信息
      userName: user.name,
      userImage: user.image,
    })
    .from(aiTask)
    .leftJoin(user, eq(aiTask.userId, user.id))
    .where(
      and(
        eq(aiTask.isPublic, true),
        eq(aiTask.scene, 'pet-video-generation'),
        eq(aiTask.status, 'completed')
      )
    )
    .orderBy(desc(aiTask.likeCount), desc(aiTask.createdAt)) // 先按点赞数降序，再按时间降序
    .limit(limit)
    .offset(offset);

  // 如果有当前用户，查询用户的点赞状态
  if (currentUserId && tasks.length > 0) {
    const videoIds = tasks.map((t) => t.id);
    const userLikes = await database
      .select({ videoId: videoLike.videoId })
      .from(videoLike)
      .where(
        and(
          eq(videoLike.userId, currentUserId),
          inArray(videoLike.videoId, videoIds)
        )
      );

    const likedVideoIds = new Set(userLikes.map((l) => l.videoId));

    return tasks.map((task) => ({
      ...task,
      isLiked: likedVideoIds.has(task.id),
    }));
  }

  return tasks.map((task) => ({
    ...task,
    isLiked: false,
  }));
}

/**
 * Helper: sleep function
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
