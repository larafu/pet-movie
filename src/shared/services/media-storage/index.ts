/**
 * Media Storage Service
 * 处理 AI 生成内容的 R2 存储上传
 * - 从 AI Provider (如 Evolink) 下载生成的图片/视频
 * - 上传到 R2 存储
 * - 支持视频水印处理
 */

import { nanoid } from 'nanoid';
import { createR2ProviderFromDb } from '@/extensions/storage/db-config-loader';
import type { StorageUploadResult } from '@/extensions/storage';

// 重试配置
const MAX_RETRIES = 3;
const RETRY_DELAY = 3000; // 3秒

/**
 * 从 URL 获取文件扩展名
 */
function getExtensionFromUrl(url: string, mediaType: 'image' | 'video'): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const ext = pathname.split('.').pop()?.toLowerCase();

    // 验证扩展名
    if (mediaType === 'image' && ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext || '')) {
      return ext!;
    }
    if (mediaType === 'video' && ['mp4', 'webm', 'mov'].includes(ext || '')) {
      return ext!;
    }
  } catch {
    // URL 解析失败
  }

  // 默认扩展名
  return mediaType === 'image' ? 'png' : 'mp4';
}

/**
 * 获取 Content-Type
 */
function getContentType(extension: string): string {
  const contentTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
  };
  return contentTypes[extension] || 'application/octet-stream';
}

/**
 * 带重试的上传函数
 */
async function uploadWithRetry(
  sourceUrl: string,
  key: string,
  contentType: string
): Promise<StorageUploadResult> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const r2Provider = await createR2ProviderFromDb();
      const result = await r2Provider.downloadAndUpload({
        url: sourceUrl,
        key,
        contentType,
        disposition: 'inline',
      });

      if (result.success) {
        return result;
      }

      lastError = new Error(result.error || 'Upload failed');
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`[MediaStorage] Upload attempt ${attempt}/${MAX_RETRIES} failed:`, lastError.message);
    }

    // 等待后重试
    if (attempt < MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }

  throw lastError || new Error('Upload failed after retries');
}

export interface MediaUploadResult {
  success: boolean;
  url?: string;
  key?: string;
  error?: string;
}

/**
 * 上传图片到 R2
 * @param sourceUrl - 源图片 URL（来自 AI Provider）
 * @param taskId - 任务 ID（用于生成存储路径）
 * @param userId - 用户 ID（用于生成存储路径）
 */
export async function uploadImageToR2(
  sourceUrl: string,
  taskId: string,
  userId: string
): Promise<MediaUploadResult> {
  try {
    const extension = getExtensionFromUrl(sourceUrl, 'image');
    const contentType = getContentType(extension);
    const uniqueId = nanoid(8);
    const key = `ai-images/${userId}/${taskId}-${uniqueId}.${extension}`;

    console.log(`[MediaStorage] Uploading image to R2: ${key}`);

    const result = await uploadWithRetry(sourceUrl, key, contentType);

    if (result.success && result.url) {
      console.log(`[MediaStorage] Image uploaded successfully: ${result.url}`);
      return {
        success: true,
        url: result.url,
        key: result.key,
      };
    }

    return {
      success: false,
      error: result.error || 'Upload failed',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[MediaStorage] Image upload failed:`, errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * 上传视频到 R2（原始视频，无水印）
 * @param sourceUrl - 源视频 URL（来自 AI Provider）
 * @param taskId - 任务 ID（用于生成存储路径）
 * @param userId - 用户 ID（用于生成存储路径）
 */
export async function uploadVideoToR2(
  sourceUrl: string,
  taskId: string,
  userId: string
): Promise<MediaUploadResult> {
  try {
    const extension = getExtensionFromUrl(sourceUrl, 'video');
    const contentType = getContentType(extension);
    const uniqueId = nanoid(8);
    const key = `ai-videos/${userId}/${taskId}-${uniqueId}.${extension}`;

    console.log(`[MediaStorage] Uploading video to R2: ${key}`);

    const result = await uploadWithRetry(sourceUrl, key, contentType);

    if (result.success && result.url) {
      console.log(`[MediaStorage] Video uploaded successfully: ${result.url}`);
      return {
        success: true,
        url: result.url,
        key: result.key,
      };
    }

    return {
      success: false,
      error: result.error || 'Upload failed',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[MediaStorage] Video upload failed:`, errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * 从 taskResult 中提取媒体 URL
 * 支持多种 AI Provider 的返回格式
 */
export function extractMediaUrlFromTaskResult(
  taskResult: string | null,
  mediaType: 'image' | 'video'
): string | null {
  if (!taskResult) return null;

  try {
    const result = JSON.parse(taskResult);

    // Evolink 格式 - results 数组
    if (result.results && Array.isArray(result.results) && result.results.length > 0) {
      return result.results[0];
    }

    // Replicate 格式 - output
    if (result.output) {
      return typeof result.output === 'string' ? result.output : result.output[0];
    }

    // Gemini 格式 - images 数组
    if (result.images && Array.isArray(result.images) && result.images.length > 0) {
      return result.images[0]?.url || result.images[0];
    }

    // 直接 URL 格式
    if (result.url) {
      return result.url;
    }

    // 视频特殊格式 - video_url
    if (mediaType === 'video' && result.video_url) {
      return result.video_url;
    }

    return null;
  } catch (error) {
    console.warn('[MediaStorage] Failed to parse taskResult:', error);
    return null;
  }
}

/**
 * 处理 AI 生成任务完成后的媒体存储
 * - 图片：直接上传到 R2
 * - 视频：上传原始视频到 R2，根据用户计划决定是否加水印
 */
export interface ProcessMediaStorageOptions {
  taskId: string;
  userId: string;
  mediaType: 'image' | 'video';
  taskResult: string | null;
  skipWatermark?: boolean; // Pro 用户跳过水印
}

export interface ProcessMediaStorageResult {
  success: boolean;
  finalUrl?: string;        // 最终使用的 URL（图片或视频）
  originalUrl?: string;     // 原始视频 URL（仅视频）
  watermarkedUrl?: string;  // 带水印视频 URL（仅视频）
  error?: string;
}

export async function processMediaStorage(
  options: ProcessMediaStorageOptions
): Promise<ProcessMediaStorageResult> {
  const { taskId, userId, mediaType, taskResult, skipWatermark } = options;

  // 提取源 URL
  const sourceUrl = extractMediaUrlFromTaskResult(taskResult, mediaType);
  if (!sourceUrl) {
    return {
      success: false,
      error: 'No media URL found in task result',
    };
  }

  console.log(`[MediaStorage] Processing ${mediaType} for task ${taskId}`);

  if (mediaType === 'image') {
    // 图片：直接上传到 R2
    const uploadResult = await uploadImageToR2(sourceUrl, taskId, userId);
    return {
      success: uploadResult.success,
      finalUrl: uploadResult.url,
      error: uploadResult.error,
    };
  } else {
    // 视频：上传原始视频到 R2
    const uploadResult = await uploadVideoToR2(sourceUrl, taskId, userId);

    if (!uploadResult.success || !uploadResult.url) {
      return {
        success: false,
        error: uploadResult.error || 'Video upload failed',
      };
    }

    const originalUrl = uploadResult.url;

    // 根据用户计划决定是否添加水印
    if (skipWatermark) {
      // Pro 用户：跳过水印，直接使用原始视频
      console.log(`[MediaStorage] Skipping watermark for pro user`);
      return {
        success: true,
        finalUrl: originalUrl,
        originalUrl,
      };
    }

    // 免费用户：添加水印
    try {
      console.log(`[MediaStorage] Applying watermark for free user`);
      const { applyWatermarkWithRetry } = await import('@/extensions/video/watermark-service');

      const watermarkResult = await applyWatermarkWithRetry(originalUrl, taskId);

      if (watermarkResult.success && watermarkResult.watermarkedUrl) {
        return {
          success: true,
          finalUrl: watermarkResult.watermarkedUrl,
          originalUrl,
          watermarkedUrl: watermarkResult.watermarkedUrl,
        };
      }

      // 水印失败，降级到原始视频
      console.warn(`[MediaStorage] Watermark failed, fallback to original: ${watermarkResult.error}`);
      return {
        success: true,
        finalUrl: originalUrl,
        originalUrl,
      };
    } catch (error) {
      // 水印服务异常，降级到原始视频
      console.warn(`[MediaStorage] Watermark service error, fallback to original:`, error);
      return {
        success: true,
        finalUrl: originalUrl,
        originalUrl,
      };
    }
  }
}
