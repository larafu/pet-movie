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
    model: 'sora-2-pro-storyboard',
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
    // Note: identifyPetWithRetry() could still be useful for analytics/logging if needed in the future
    console.log(
      '⏭️  [Service] Skipping pet identification - using image-to-image generation'
    );

    // Step 2: Generate frame image using image-to-image
    await updateTaskStatus(taskId, 'generating_frame');
    Sentry.addBreadcrumb({
      category: 'task',
      message: 'Starting frame generation (image-to-image)',
      level: 'info',
    });
    console.log(
      '🖼️  [Service] Using uploaded pet image for frame generation:',
      task.petImageUrl
    );
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
    console.log('✅ [Service] Original video uploaded:', originalVideoUrl);

    console.log('\n💧 ========== STEP 4.5: Apply Watermark ==========');
    console.log('📝 [Service] Task ID:', taskId);
    console.log('🔗 [Service] Original video URL:', originalVideoUrl);

    // Step 4.5: Apply watermark (不阻塞主流程，失败时降级到原视频)
    await updateTaskStatus(taskId, 'applying_watermark');
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

    let finalVideoUrl: string;
    let watermarkedVideoUrl: string | null = null;

    if (watermarkResult.success && watermarkResult.watermarkedUrl) {
      console.log('✅ [Service] Watermark applied successfully!');
      console.log('🔗 [Service] Watermarked URL:', watermarkResult.watermarkedUrl);
      console.log('⏱️  [Service] Processing time:', watermarkResult.processingTimeMs, 'ms');

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
      console.warn('⚠️  [Service] Watermark application failed, using original video');
      console.warn('   Error:', watermarkResult.error);

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

    console.log('\n💰 ========== STEP 5: Deduct Credits ==========');
    console.log('📝 [Service] Task ID:', taskId);
    console.log('⏳ [Service] Deducting credits...');

    // Step 5: Deduct credits (only after successful completion)
    await deductCredits(taskId);
    console.log('✅ [Service] Credits deducted successfully!');

    console.log('\n✅ ========== STEP 6: Mark as Completed ==========');
    console.log('📝 [Service] Task ID:', taskId);
    console.log('🔗 [Service] Final video URL:', finalVideoUrl);
    console.log('🔗 [Service] Original video URL:', originalVideoUrl);
    console.log('🔗 [Service] Watermarked video URL:', watermarkedVideoUrl || 'N/A');
    console.log('⏳ [Service] Updating task status to completed...');

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

    console.log('✅ [Service] Task marked as completed in database!');

    // Track successful completion
    const duration = Date.now() - startTime;

    console.log(
      `\n🎉 ========== VIDEO GENERATION COMPLETED ==========`
    );
    console.log('📝 [Service] Task ID:', taskId);
    console.log('⏱️  [Service] Total duration:', duration, 'ms');
    console.log('🔗 [Service] Final video URL:', finalVideoUrl);

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

    console.error(`Pet video generation failed for task ${taskId}:`, error);
  } finally {
    // Clean up Sentry context
    Sentry.setUser(null);
  }
}

/**
 * Identify pet characteristics with retry
 */
async function identifyPetWithRetry(taskId: string): Promise<string> {
  console.log('\n🐾 ========== STEP 1: Identify Pet ==========');
  console.log('📝 [Service] Task ID:', taskId);

  const database = db();
  const task = await getTask(taskId);

  if (!task.petImageUrl) {
    throw new Error('Pet image URL is missing');
  }

  console.log('🖼️  [Service] Pet image URL:', task.petImageUrl);

  const evolinkClient = createEvolinkClient();

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    console.log(
      `\n🔄 [Service] Identify attempt ${attempt + 1}/${MAX_RETRIES}`
    );

    try {
      const petDescription = await evolinkClient.identifyPet(task.petImageUrl);
      console.log('✅ [Service] Pet identified successfully!');
      console.log('📄 [Service] Description:', petDescription);

      // Save pet description
      await database
        .update(aiTask)
        .set({
          petDescription,
          updatedAt: new Date(),
        })
        .where(eq(aiTask.id, taskId));

      console.log('💾 [Service] Pet description saved to database');

      return petDescription;
    } catch (error) {
      console.error(`Pet identification attempt ${attempt + 1} failed:`, error);

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
        // Track final failure
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
  console.log(
    '\n🖼️  ========== STEP 2: Generate Frame (Image-to-Image) =========='
  );
  console.log('📝 [Service] Task ID:', taskId);
  console.log('🖼️  [Service] Pet image URL:', petImageUrl);

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
  const taskAspectRatio = task.aspectRatio || '16:9';

  console.log('🎨 [Service] Template type:', task.templateType);
  console.log('📝 [Service] Original frame prompt:', framePrompt);
  console.log('🎭 [Service] Style transfer prompt:', styleTransferPrompt);
  console.log('📐 [Service] Aspect ratio:', taskAspectRatio);

  const evolinkClient = createEvolinkClient();

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    console.log(
      `\n🔄 [Service] Frame generation attempt ${attempt + 1}/${MAX_RETRIES}`
    );

    try {
      // Create image-to-image generation task
      console.log(
        '🌐 [Service] Creating image-to-image generation task with model: doubao-seedream-4.0'
      );
      console.log('🖼️  [Service] Source image:', petImageUrl);

      const response = await evolinkClient.generateImage({
        model: 'doubao-seedream-4.0',
        prompt: styleTransferPrompt,
        image_urls: [petImageUrl], // Image-to-image source
        aspect_ratio: taskAspectRatio, // 传递用户选择的宽高比
      });

      console.log('✅ [Service] Image task created, task ID:', response.id);

      // Save frame task ID
      await database
        .update(aiTask)
        .set({
          frameTaskId: response.id,
          updatedAt: new Date(),
        })
        .where(eq(aiTask.id, taskId));

      console.log('💾 [Service] Frame task ID saved to database');

      // Poll for completion
      console.log('⏳ [Service] Waiting for image generation to complete...');

      const frameImageUrl = await evolinkClient.pollImageGeneration(
        response.id,
        {
          maxAttempts: 60,
          intervalMs: 5000,
        }
      );

      console.log('🎉 [Service] Frame image generated successfully!');
      console.log('🔗 [Service] Frame URL:', frameImageUrl);

      // Save frame image URL
      await database
        .update(aiTask)
        .set({
          frameImageUrl,
          updatedAt: new Date(),
        })
        .where(eq(aiTask.id, taskId));

      console.log('💾 [Service] Frame URL saved to database');

      return frameImageUrl;
    } catch (error) {
      console.error(`Frame generation attempt ${attempt + 1} failed:`, error);

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
        // Track final failure
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
  console.log('\n🎬 ========== STEP 3: Generate Video ==========');
  console.log('📝 [Service] Task ID:', taskId);
  console.log('🔗 [Service] Frame image URL:', frameImageUrl);

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

  console.log('🎨 [Service] Template type:', task.templateType);
  console.log('⏱️  [Service] Duration:', task.durationSeconds, 'seconds');
  console.log('🎞️  [Service] Number of frames:', nFrames);
  console.log('📐 [Service] User aspect ratio:', taskAspectRatio);
  console.log('📐 [Service] KIE aspect ratio:', kieAspectRatio);
  console.log('🎭 [Service] Video shots:', JSON.stringify(shots, null, 2));

  const kieClient = createKieClient();

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    console.log(
      `\n🔄 [Service] Video generation attempt ${attempt + 1}/${MAX_RETRIES}`
    );

    try {
      // Create video generation task
      const requestPayload = {
        model: 'sora-2-pro-storyboard',
        input: {
          n_frames: nFrames as '10' | '15' | '25' | '50',
          image_urls: [frameImageUrl],
          aspect_ratio: kieAspectRatio, // 使用用户选择的比例
          shots,
        },
      };

      console.log('🌐 [Service] Creating video generation task...');
      console.log(
        '📦 [Service] Request payload:',
        JSON.stringify(requestPayload, null, 2)
      );

      const response = await kieClient.createTask(requestPayload);

      console.log(
        '✅ [Service] Video task created, task ID:',
        response.data.taskId
      );

      // Save video task ID
      await database
        .update(aiTask)
        .set({
          videoTaskId: response.data.taskId,
          updatedAt: new Date(),
        })
        .where(eq(aiTask.id, taskId));

      console.log('💾 [Service] Video task ID saved to database');

      // Poll for completion
      console.log('⏳ [Service] Waiting for video generation to complete...');

      const tempVideoUrl = await kieClient.pollVideoGeneration(
        response.data.taskId,
        {
          maxAttempts: 120,
          intervalMs: 10000,
        }
      );

      console.log('🎉 [Service] Video generated successfully!');
      console.log('🔗 [Service] Video URL:', tempVideoUrl);

      // Save temp video URL
      await database
        .update(aiTask)
        .set({
          tempVideoUrl,
          updatedAt: new Date(),
        })
        .where(eq(aiTask.id, taskId));

      console.log('💾 [Service] Video URL saved to database');

      return tempVideoUrl;
    } catch (error) {
      console.error(`Video generation attempt ${attempt + 1} failed:`, error);

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
        // Track final failure
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
  console.log('\n☁️  ========== STEP 4: Upload to R2 ==========');
  console.log('📝 [Service] Task ID:', taskId);
  console.log('🔗 [Service] Temp video URL:', tempVideoUrl);

  // Check if this is a mock video URL (use local test video)
  if (tempVideoUrl.includes('mock-video-url.com')) {
    console.log(
      '🎭 [Service] Mock video URL detected - using local test video'
    );

    const database = db();
    const r2Provider = await createR2ProviderFromDb();

    // Read local test video file
    const fs = await import('fs/promises');
    const path = await import('path');
    const testVideoPath = path.join(
      process.cwd(),
      'public/video/dog-funny-family.mp4'
    );

    console.log('📁 [Service] Reading local test video:', testVideoPath);
    const videoBuffer = await fs.readFile(testVideoPath);
    console.log(
      '📦 [Service] Video size:',
      (videoBuffer.length / 1024 / 1024).toFixed(2),
      'MB'
    );

    const key = `pet-videos/${taskId}.mp4`;
    console.log('⬆️  [Service] Uploading test video to R2...');

    const result = await r2Provider.uploadFile({
      key,
      body: videoBuffer,
      contentType: 'video/mp4',
      disposition: 'inline',
    });

    if (!result.success || !result.url) {
      throw new Error(result.error || 'R2 upload of test video failed');
    }

    console.log('✅ [Service] Test video uploaded successfully!');
    console.log('🔗 [Service] R2 URL:', result.url);
    return result.url;
  }

  const database = db();
  const r2Provider = await createR2ProviderFromDb();

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    console.log(
      `\n🔄 [Service] R2 upload attempt ${attempt + 1}/${MAX_RETRIES}`
    );

    try {
      // Download video from temp URL and upload to R2
      const key = `pet-videos/${taskId}.mp4`;

      console.log('📦 [Service] Upload parameters:');
      console.log('   - Key:', key);
      console.log('   - Content type: video/mp4');
      console.log('   - Disposition: inline');

      console.log('⬇️  [Service] Downloading video from temp URL...');
      console.log('⬆️  [Service] Uploading to R2 storage...');

      const result = await r2Provider.downloadAndUpload({
        url: tempVideoUrl,
        key,
        contentType: 'video/mp4',
        disposition: 'inline',
      });

      console.log('📊 [Service] R2 upload result:', {
        success: result.success,
        hasUrl: !!result.url,
        error: result.error,
      });

      if (!result.success || !result.url) {
        throw new Error(result.error || 'R2 upload failed');
      }

      console.log('🎉 [Service] Video uploaded to R2 successfully!');
      console.log('🔗 [Service] Final video URL:', result.url);

      return result.url;
    } catch (error) {
      console.error(`R2 upload attempt ${attempt + 1} failed:`, error);

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
        // Track final failure
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
    console.log('⚠️  [Service] No credits to deduct for task:', taskId);
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

    console.log('✅ [Service] Credits deducted:', creditsCost);
    console.log('   Transaction No:', result.transactionNo);

    // 更新任务记录，关联积分交易
    await database
      .update(aiTask)
      .set({
        creditId: result.id,
        updatedAt: new Date(),
      })
      .where(eq(aiTask.id, taskId));
  } catch (error) {
    console.error('❌ [Service] Failed to deduct credits:', error);
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
 * Get user's pet video history
 */
export async function getUserPetVideoHistory(
  userId: string,
  limit: number = 20,
  offset: number = 0
) {
  const database = db();

  const tasks = await database
    .select()
    .from(aiTask)
    .where(
      and(
        eq(aiTask.userId, userId),
        eq(aiTask.scene, 'pet-video-generation')
      )
    )
    .orderBy(desc(aiTask.createdAt)) // Newest first
    .limit(limit)
    .offset(offset);

  return tasks.map((task) => ({
    id: task.id,
    templateType: task.templateType as 'dog' | 'cat',
    status: task.status,
    petImageUrl: task.petImageUrl,
    frameImageUrl: task.frameImageUrl, // AI-generated Pixar style frame
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
  }));
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
