/**
 * 视频合并服务
 * 将多个15秒的分镜视频拼接成完整的长视频
 *
 * 用于自定义剧本功能：
 * - 接收多个分镜视频URL
 * - 按顺序拼接
 * - 上传到R2并返回最终URL
 */

import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import * as Sentry from '@sentry/nextjs';
import { createR2ProviderFromDb } from '@/extensions/storage/db-config-loader';
import { nanoid } from 'nanoid';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// 设置FFmpeg路径
ffmpeg.setFfmpegPath(ffmpegPath.path);

// 常量配置
const FFMPEG_MERGE_TIMEOUT_MS = 180000; // 3分钟超时（合并多个视频需要更长时间）
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 3000;

/**
 * 视频合并配置
 */
export interface MergeConfig {
  outputQuality?: 'high' | 'medium' | 'low'; // 输出质量
  addTransition?: boolean; // 是否添加转场效果（预留，暂不实现）
}

/**
 * 默认合并配置
 */
export const DEFAULT_MERGE_CONFIG: MergeConfig = {
  outputQuality: 'high',
  addTransition: false,
};

/**
 * 合并处理结果
 */
export interface MergeResult {
  success: boolean;
  mergedUrl?: string;
  error?: string;
  processingTimeMs?: number;
  inputCount?: number; // 输入视频数量
  outputDurationSeconds?: number; // 输出视频时长
}

/**
 * 合并多个视频（带重试机制）
 * @param videoUrls - 视频URL列表，按顺序排列
 * @param scriptId - 剧本ID，用于命名
 * @param config - 合并配置
 * @returns 合并处理结果
 */
export async function mergeVideosWithRetry(
  videoUrls: string[],
  scriptId: string,
  config: MergeConfig = DEFAULT_MERGE_CONFIG
): Promise<MergeResult> {
  const startTime = Date.now();

  if (!videoUrls || videoUrls.length === 0) {
    return {
      success: false,
      error: 'No video URLs provided',
    };
  }

  if (videoUrls.length === 1) {
    // 只有一个视频，直接返回
    return {
      success: true,
      mergedUrl: videoUrls[0],
      inputCount: 1,
    };
  }

  // 添加Sentry面包屑
  Sentry.addBreadcrumb({
    category: 'video-merge',
    message: 'Starting video merge',
    level: 'info',
    data: { scriptId, videoCount: videoUrls.length },
  });

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    console.log(`\n🎬 [Merge] 尝试 ${attempt}/${MAX_RETRIES} - 剧本ID: ${scriptId}`);
    console.log(`   视频数量: ${videoUrls.length}`);

    try {
      const result = await mergeVideos(videoUrls, scriptId, config);

      if (result.success) {
        const totalTime = Date.now() - startTime;
        console.log(`✅ [Merge] 视频合并成功！总耗时: ${totalTime}ms`);

        Sentry.addBreadcrumb({
          category: 'video-merge',
          message: 'Videos merged successfully',
          level: 'info',
          data: {
            scriptId,
            attempt,
            processingTimeMs: result.processingTimeMs,
            videoCount: videoUrls.length,
          },
        });

        return result;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ [Merge] 尝试 ${attempt} 失败:`, errorMessage);

      Sentry.addBreadcrumb({
        category: 'video-merge',
        message: `Merge attempt ${attempt} failed`,
        level: 'warning',
        data: {
          scriptId,
          attempt,
          error: errorMessage,
        },
      });

      if (attempt === MAX_RETRIES) {
        console.error(`⚠️  [Merge] 所有重试已用尽`);

        Sentry.captureException(error, {
          tags: {
            component: 'video_merge',
            scriptId,
          },
          level: 'error',
        });

        return {
          success: false,
          error: errorMessage,
          processingTimeMs: Date.now() - startTime,
        };
      }

      await sleep(RETRY_DELAY_MS * attempt);
    }
  }

  return {
    success: false,
    error: 'Unexpected error in retry loop',
  };
}

/**
 * 合并视频（单次尝试）
 */
async function mergeVideos(
  videoUrls: string[],
  scriptId: string,
  config: MergeConfig
): Promise<MergeResult> {
  const processingStartTime = Date.now();
  const tempDir = `/tmp/merge-${nanoid()}`;
  const tempInputPaths: string[] = [];
  const tempListPath = `${tempDir}/input.txt`;
  const tempOutputPath = `${tempDir}/merged.mp4`;

  try {
    console.log('🎬 [Merge] 开始处理...');

    // 1. 创建临时目录
    await fs.mkdir(tempDir, { recursive: true });
    console.log(`📁 [Merge] 创建临时目录: ${tempDir}`);

    // 2. 下载所有视频
    console.log('⬇️  [Merge] 下载视频文件...');
    const downloadStartTime = Date.now();

    for (let i = 0; i < videoUrls.length; i++) {
      const inputPath = `${tempDir}/input-${i + 1}.mp4`;
      await downloadVideo(videoUrls[i], inputPath);
      tempInputPaths.push(inputPath);
      console.log(`   ✓ 视频 ${i + 1}/${videoUrls.length} 下载完成`);
    }

    const downloadTime = Date.now() - downloadStartTime;
    console.log(`✅ [Merge] 所有视频下载完成，耗时: ${downloadTime}ms`);

    // 3. 创建FFmpeg输入列表文件
    const listContent = tempInputPaths
      .map((p) => `file '${p}'`)
      .join('\n');
    await fs.writeFile(tempListPath, listContent);
    console.log('📝 [Merge] 已创建输入列表文件');

    // 4. 使用FFmpeg concat合并视频
    console.log('🎬 [Merge] 开始FFmpeg合并...');
    const ffmpegStartTime = Date.now();
    await concatVideosWithTimeout(tempListPath, tempOutputPath, config);
    const ffmpegTime = Date.now() - ffmpegStartTime;
    console.log(`✅ [Merge] FFmpeg合并完成，耗时: ${ffmpegTime}ms`);

    // 5. 上传合并后的视频到R2
    console.log('⬆️  [Merge] 上传到R2...');
    const uploadStartTime = Date.now();
    const mergedUrl = await uploadMergedVideo(tempOutputPath, scriptId);
    const uploadTime = Date.now() - uploadStartTime;
    console.log(`✅ [Merge] 上传完成，耗时: ${uploadTime}ms`);

    const totalProcessingTime = Date.now() - processingStartTime;
    console.log(`🎉 [Merge] 总处理时间: ${totalProcessingTime}ms`);
    console.log('   - 下载:', downloadTime, 'ms');
    console.log('   - FFmpeg:', ffmpegTime, 'ms');
    console.log('   - 上传:', uploadTime, 'ms');

    return {
      success: true,
      mergedUrl,
      processingTimeMs: totalProcessingTime,
      inputCount: videoUrls.length,
      outputDurationSeconds: videoUrls.length * 15, // 每个视频15秒
    };
  } finally {
    // 清理临时文件
    await cleanupDirectory(tempDir);
  }
}

/**
 * 下载视频到本地
 */
async function downloadVideo(url: string, destPath: string): Promise<void> {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`下载失败: HTTP ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(destPath, buffer);
  } catch (error) {
    throw new Error(
      `视频下载失败: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * 使用FFmpeg concat合并视频（带超时控制）
 * 使用 concat demuxer 无损合并
 */
async function concatVideosWithTimeout(
  listPath: string,
  outputPath: string,
  config: MergeConfig
): Promise<void> {
  return new Promise((resolve, reject) => {
    let hasTimedOut = false;
    let ffmpegProcess: any;

    // 设置超时定时器
    const timeoutTimer = setTimeout(() => {
      hasTimedOut = true;
      console.error(`⏰ [Merge] FFmpeg处理超时（${FFMPEG_MERGE_TIMEOUT_MS}ms）`);

      if (ffmpegProcess) {
        try {
          ffmpegProcess.kill('SIGKILL');
          console.log('🔪 [Merge] FFmpeg进程已强制终止');
        } catch (err) {
          console.error('❌ [Merge] 终止FFmpeg进程失败:', err);
        }
      }

      reject(new Error(`FFmpeg merge timeout after ${FFMPEG_MERGE_TIMEOUT_MS}ms`));
    }, FFMPEG_MERGE_TIMEOUT_MS);

    // 输出选项基于质量配置
    const outputOptions = getOutputOptions(config.outputQuality || 'high');

    // 使用 concat demuxer 无损合并
    ffmpegProcess = ffmpeg()
      .input(listPath)
      .inputOptions(['-f concat', '-safe 0'])
      .outputOptions(outputOptions)
      .output(outputPath)
      .on('start', (commandLine) => {
        console.log('🎬 [FFmpeg Merge] 开始处理，命令:', commandLine);
      })
      .on('progress', (progress) => {
        if (!hasTimedOut && progress.percent) {
          console.log(`🎬 [FFmpeg Merge] 进度: ${progress.percent.toFixed(1)}%`);
        }
      })
      .on('end', () => {
        clearTimeout(timeoutTimer);

        if (!hasTimedOut) {
          console.log('✅ [FFmpeg Merge] 处理完成');
          resolve();
        }
      })
      .on('error', (err) => {
        clearTimeout(timeoutTimer);

        if (!hasTimedOut) {
          console.error('❌ [FFmpeg Merge] 处理错误:', err.message);
          reject(err);
        }
      });

    try {
      ffmpegProcess.run();
    } catch (err) {
      clearTimeout(timeoutTimer);
      reject(err);
    }
  });
}

/**
 * 获取输出选项基于质量配置
 */
function getOutputOptions(quality: 'high' | 'medium' | 'low'): string[] {
  const qualitySettings = {
    high: {
      preset: 'medium',
      crf: 18,
    },
    medium: {
      preset: 'fast',
      crf: 23,
    },
    low: {
      preset: 'ultrafast',
      crf: 28,
    },
  };

  const settings = qualitySettings[quality];

  return [
    '-c:v libx264',           // 视频编码器
    `-preset ${settings.preset}`,
    `-crf ${settings.crf}`,
    '-c:a aac',               // 音频编码器
    '-b:a 128k',              // 音频比特率
    '-movflags +faststart',   // 优化Web播放
  ];
}

/**
 * 上传合并后的视频到R2
 */
async function uploadMergedVideo(
  filePath: string,
  scriptId: string
): Promise<string> {
  try {
    const r2Provider = await createR2ProviderFromDb();
    const fileBuffer = await fs.readFile(filePath);

    const result = await r2Provider.uploadFile({
      key: `custom-scripts/merged/${scriptId}-${Date.now()}.mp4`,
      body: fileBuffer,
      contentType: 'video/mp4',
      disposition: 'inline',
    });

    if (!result.success || !result.url) {
      throw new Error(result.error || '上传合并视频失败');
    }

    return result.url;
  } catch (error) {
    throw new Error(
      `R2上传失败: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * 清理临时目录
 */
async function cleanupDirectory(dirPath: string): Promise<void> {
  console.log('🗑️  [Merge] 清理临时目录...');

  try {
    if (existsSync(dirPath)) {
      await fs.rm(dirPath, { recursive: true, force: true });
      console.log(`   ✓ 已删除: ${dirPath}`);
    }
  } catch (err) {
    console.warn(`   ⚠️  删除失败: ${dirPath}`, err);
  }
}

/**
 * 睡眠函数
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
