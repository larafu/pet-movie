/**
 * 视频水印服务
 * 在视频右下角添加"petmovie.ai"白色半透明文字水印
 *
 * 优化特性：
 * 1. 超时控制 - 避免Vercel serverless超时
 * 2. 自动资源清理 - 及时释放/tmp空间
 * 3. 错误容错 - 水印失败不影响原视频交付
 * 4. 性能监控 - 记录处理时间和资源使用
 * 5. 自定义字体支持 - 支持多种品牌字体选择
 * 6. 文字阴影效果 - 提升可读性和视觉效果
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
const FFMPEG_TIMEOUT_MS = 45000; // 45秒超时（留15秒给其他操作）
const MAX_RETRIES = 2; // 最大重试次数
const RETRY_DELAY_MS = 2000; // 重试延迟
const MAX_TMP_SIZE_MB = 200; // /tmp最大使用量（MB）

/**
 * 支持的字体类型
 * - montserrat-bold: 现代几何风格，适合科技品牌
 * - montserrat-semibold: 稍细一点的Montserrat
 * - poppins-bold: 圆润现代，友好亲和
 * - poppins-semibold: 稍细一点的Poppins
 * - system: 系统默认字体（Arial/DejaVuSans）
 */
export type WatermarkFontFamily =
  | 'montserrat-bold'
  | 'montserrat-semibold'
  | 'poppins-bold'
  | 'poppins-semibold'
  | 'system';

/**
 * 水印配置接口
 */
export interface WatermarkConfig {
  text: string;           // 水印文字，默认 "petmovie.ai"
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  opacity: number;        // 0-1，建议0.7
  fontSize: number;       // 字体大小，建议32
  marginX: number;        // 水平边距（像素）
  marginY: number;        // 垂直边距（像素）
  fontFamily?: WatermarkFontFamily; // 字体选择，默认 'montserrat-bold'
  shadow?: boolean;       // 是否启用阴影效果，默认 true
  shadowColor?: string;   // 阴影颜色，默认 'black'
  shadowOpacity?: number; // 阴影透明度，默认 0.5
}

/**
 * 字体文件路径映射
 */
const FONT_PATHS: Record<WatermarkFontFamily, string> = {
  'montserrat-bold': 'public/fonts/Montserrat-Bold.ttf',
  'montserrat-semibold': 'public/fonts/Montserrat-SemiBold.ttf',
  'poppins-bold': 'public/fonts/Poppins-Bold.ttf',
  'poppins-semibold': 'public/fonts/Poppins-SemiBold.ttf',
  'system': '', // 系统字体，特殊处理
};

/**
 * 默认水印配置
 * 使用 Montserrat Bold 字体，带阴影效果
 */
export const DEFAULT_WATERMARK: WatermarkConfig = {
  text: 'petmovie.ai',
  position: 'bottom-right',
  opacity: 0.8,           // 稍微提高透明度，配合阴影更清晰
  fontSize: 36,           // 稍微增大字体
  marginX: 24,
  marginY: 24,
  fontFamily: 'montserrat-bold', // 使用Montserrat粗体
  shadow: true,           // 启用阴影
  shadowColor: 'black',
  shadowOpacity: 0.5,
};

/**
 * 可用字体列表及其描述
 * 方便前端或管理后台选择字体
 */
export const AVAILABLE_FONTS: Array<{
  id: WatermarkFontFamily;
  name: string;
  description: string;
  style: string;
}> = [
  {
    id: 'montserrat-bold',
    name: 'Montserrat Bold',
    description: '现代几何风格，适合科技品牌',
    style: 'bold',
  },
  {
    id: 'montserrat-semibold',
    name: 'Montserrat SemiBold',
    description: '稍细的Montserrat，优雅而现代',
    style: 'semibold',
  },
  {
    id: 'poppins-bold',
    name: 'Poppins Bold',
    description: '圆润现代，友好亲和',
    style: 'bold',
  },
  {
    id: 'poppins-semibold',
    name: 'Poppins SemiBold',
    description: '稍细的Poppins，清晰易读',
    style: 'semibold',
  },
  {
    id: 'system',
    name: '系统字体',
    description: '使用服务器系统字体（Arial/DejaVuSans）',
    style: 'regular',
  },
];

/**
 * 水印处理结果
 */
export interface WatermarkResult {
  success: boolean;
  watermarkedUrl?: string;
  originalUrl?: string;  // 如果水印失败，返回原始URL
  error?: string;
  processingTimeMs?: number;
  tmpSizeUsedMB?: number;
}

/**
 * 给视频添加水印（带重试机制）
 * @param sourceVideoUrl - 源视频URL（R2上的无水印视频）
 * @param taskId - 任务ID，用于命名和日志
 * @param config - 水印配置
 * @returns 水印处理结果
 */
export async function applyWatermarkWithRetry(
  sourceVideoUrl: string,
  taskId: string,
  config: WatermarkConfig = DEFAULT_WATERMARK
): Promise<WatermarkResult> {
  const startTime = Date.now();

  // 添加Sentry面包屑
  Sentry.addBreadcrumb({
    category: 'watermark',
    message: 'Starting watermark application',
    level: 'info',
    data: { taskId, sourceVideoUrl },
  });

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    console.log(`\n💧 [Watermark] 尝试 ${attempt}/${MAX_RETRIES} - 任务ID: ${taskId}`);

    try {
      const result = await applyWatermark(sourceVideoUrl, taskId, config);

      if (result.success) {
        const totalTime = Date.now() - startTime;
        console.log(`✅ [Watermark] 水印添加成功！总耗时: ${totalTime}ms`);

        // 记录成功的性能指标
        Sentry.addBreadcrumb({
          category: 'watermark',
          message: 'Watermark applied successfully',
          level: 'info',
          data: {
            taskId,
            attempt,
            processingTimeMs: result.processingTimeMs,
            totalTimeMs: totalTime,
          },
        });

        return result;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ [Watermark] 尝试 ${attempt} 失败:`, errorMessage);

      // 记录重试
      Sentry.addBreadcrumb({
        category: 'watermark',
        message: `Watermark attempt ${attempt} failed`,
        level: 'warning',
        data: {
          taskId,
          attempt,
          error: errorMessage,
        },
      });

      // 如果是最后一次重试，返回失败结果
      if (attempt === MAX_RETRIES) {
        console.warn(`⚠️  [Watermark] 所有重试已用尽，返回原始视频`);

        // 捕获异常到Sentry（但不抛出，因为我们要降级到原视频）
        Sentry.captureException(error, {
          tags: {
            component: 'watermark',
            taskId,
          },
          level: 'warning',
        });

        return {
          success: false,
          originalUrl: sourceVideoUrl,
          error: errorMessage,
          processingTimeMs: Date.now() - startTime,
        };
      }

      // 等待后重试
      await sleep(RETRY_DELAY_MS * attempt); // 指数退避
    }
  }

  // 理论上不会到这里，但为了类型安全
  return {
    success: false,
    originalUrl: sourceVideoUrl,
    error: 'Unexpected error in retry loop',
  };
}

/**
 * 给视频添加水印（单次尝试）
 * @param sourceVideoUrl - 源视频URL
 * @param taskId - 任务ID
 * @param config - 水印配置
 * @returns 水印处理结果
 */
async function applyWatermark(
  sourceVideoUrl: string,
  taskId: string,
  config: WatermarkConfig
): Promise<WatermarkResult> {
  const processingStartTime = Date.now();
  const tempInputPath = `/tmp/${nanoid()}-input.mp4`;
  const tempOutputPath = `/tmp/${nanoid()}-watermarked.mp4`;

  try {
    console.log('🎨 [Watermark] 开始处理...');
    console.log('   源视频:', sourceVideoUrl);
    console.log('   水印配置:', JSON.stringify(config));

    // 1. 检查/tmp空间
    await checkTmpSpace();

    // 2. 下载源视频
    console.log('⬇️  [Watermark] 下载源视频...');
    const downloadStartTime = Date.now();
    await downloadVideo(sourceVideoUrl, tempInputPath);
    const downloadTime = Date.now() - downloadStartTime;
    console.log(`✅ [Watermark] 下载完成，耗时: ${downloadTime}ms`);

    // 3. 获取文件大小（用于日志）
    const stats = await fs.stat(tempInputPath);
    const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);
    console.log(`📦 [Watermark] 视频大小: ${fileSizeMB}MB`);

    // 4. 使用FFmpeg添加文字水印（带超时控制）
    console.log('🎬 [Watermark] 开始FFmpeg处理...');
    const ffmpegStartTime = Date.now();
    await addTextWatermarkWithTimeout(tempInputPath, tempOutputPath, config);
    const ffmpegTime = Date.now() - ffmpegStartTime;
    console.log(`✅ [Watermark] FFmpeg处理完成，耗时: ${ffmpegTime}ms`);

    // 5. 上传带水印视频到R2
    console.log('⬆️  [Watermark] 上传到R2...');
    const uploadStartTime = Date.now();
    const watermarkedUrl = await uploadWatermarkedVideo(tempOutputPath, taskId);
    const uploadTime = Date.now() - uploadStartTime;
    console.log(`✅ [Watermark] 上传完成，耗时: ${uploadTime}ms`);

    const totalProcessingTime = Date.now() - processingStartTime;
    console.log(`🎉 [Watermark] 总处理时间: ${totalProcessingTime}ms`);
    console.log('   - 下载:', downloadTime, 'ms');
    console.log('   - FFmpeg:', ffmpegTime, 'ms');
    console.log('   - 上传:', uploadTime, 'ms');

    return {
      success: true,
      watermarkedUrl,
      processingTimeMs: totalProcessingTime,
      tmpSizeUsedMB: parseFloat(fileSizeMB),
    };
  } finally {
    // 6. 无论成功失败，都要清理临时文件
    await cleanupFiles([tempInputPath, tempOutputPath]);
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
 * 获取字体文件的绝对路径
 * 在Vercel部署时，工作目录是/var/task，public文件夹在这个目录下
 */
function getFontFilePath(fontFamily: WatermarkFontFamily): string {
  // 如果是系统字体，返回系统字体路径
  if (fontFamily === 'system') {
    return process.platform === 'darwin'
      ? '/System/Library/Fonts/Supplemental/Arial.ttf'  // macOS
      : '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'; // Linux (Vercel)
  }

  // 获取自定义字体路径
  const relativePath = FONT_PATHS[fontFamily];

  // 尝试多个可能的路径（兼容本地开发和Vercel部署）
  const possiblePaths = [
    path.join(process.cwd(), relativePath),           // 本地开发
    path.join('/var/task', relativePath),             // Vercel serverless
    path.resolve(relativePath),                       // 相对路径解析
  ];

  for (const fontPath of possiblePaths) {
    if (existsSync(fontPath)) {
      console.log(`🔤 [Watermark] 找到字体文件: ${fontPath}`);
      return fontPath;
    }
  }

  // 如果找不到自定义字体，回退到系统字体
  console.warn(`⚠️  [Watermark] 找不到字体 ${fontFamily}，使用系统字体`);
  return process.platform === 'darwin'
    ? '/System/Library/Fonts/Supplemental/Arial.ttf'
    : '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
}

/**
 * 构建水印滤镜字符串
 * 支持自定义字体和阴影效果
 */
function buildWatermarkFilter(config: WatermarkConfig): string {
  const position = getPosition(config.position, config.marginX, config.marginY);
  const fontFile = getFontFilePath(config.fontFamily || 'montserrat-bold');

  // 转义特殊字符（FFmpeg drawtext需要）
  const escapedText = config.text.replace(/'/g, "'\\''").replace(/:/g, '\\:');

  // 基础水印滤镜
  const baseFilter = `drawtext=text='${escapedText}':fontsize=${config.fontSize}:fontcolor=white@${config.opacity}:x=${position.x}:y=${position.y}:fontfile='${fontFile}'`;

  // 如果启用阴影效果，添加阴影层
  if (config.shadow !== false) {
    const shadowOpacity = config.shadowOpacity || 0.5;
    const shadowColor = config.shadowColor || 'black';
    const shadowOffset = Math.max(2, Math.floor(config.fontSize / 16)); // 阴影偏移量，根据字体大小调整

    // 先画阴影（稍微偏移），再画主文字
    const shadowFilter = `drawtext=text='${escapedText}':fontsize=${config.fontSize}:fontcolor=${shadowColor}@${shadowOpacity}:x=${position.x}+${shadowOffset}:y=${position.y}+${shadowOffset}:fontfile='${fontFile}'`;

    return `${shadowFilter},${baseFilter}`;
  }

  return baseFilter;
}

/**
 * 使用FFmpeg添加文字水印（带超时控制）
 * 支持自定义字体和阴影效果
 */
async function addTextWatermarkWithTimeout(
  inputPath: string,
  outputPath: string,
  config: WatermarkConfig
): Promise<void> {
  return new Promise((resolve, reject) => {
    let hasTimedOut = false;
    let ffmpegProcess: any;

    // 设置超时定时器
    const timeoutTimer = setTimeout(() => {
      hasTimedOut = true;
      console.error(`⏰ [Watermark] FFmpeg处理超时（${FFMPEG_TIMEOUT_MS}ms）`);

      if (ffmpegProcess) {
        try {
          ffmpegProcess.kill('SIGKILL');
          console.log('🔪 [Watermark] FFmpeg进程已强制终止');
        } catch (err) {
          console.error('❌ [Watermark] 终止FFmpeg进程失败:', err);
        }
      }

      reject(new Error(`FFmpeg processing timeout after ${FFMPEG_TIMEOUT_MS}ms`));
    }, FFMPEG_TIMEOUT_MS);

    // 构建水印滤镜（支持字体和阴影）
    const watermarkFilter = buildWatermarkFilter(config);

    console.log('🎨 [FFmpeg] 字体选择:', config.fontFamily || 'montserrat-bold');
    console.log('🎨 [FFmpeg] 阴影效果:', config.shadow !== false ? '启用' : '禁用');
    console.log('🎨 [FFmpeg] 水印滤镜:', watermarkFilter);

    // 启动FFmpeg处理
    ffmpegProcess = ffmpeg(inputPath)
      .videoFilters(watermarkFilter)
      .outputOptions([
        '-c:v libx264',        // 视频编码器
        '-preset ultrafast',   // 编码速度（ultrafast最快，但文件稍大）
        '-crf 23',             // 质量控制（18-28，越小质量越好）
        '-c:a copy',           // 音频直接复制，不重新编码
        '-movflags +faststart', // 优化Web播放
      ])
      .output(outputPath)
      .on('start', (commandLine) => {
        console.log('🎬 [FFmpeg] 开始处理，命令:', commandLine);
      })
      .on('progress', (progress) => {
        if (!hasTimedOut && progress.percent) {
          console.log(`🎬 [FFmpeg] 进度: ${progress.percent.toFixed(1)}%`);
        }
      })
      .on('end', () => {
        clearTimeout(timeoutTimer);

        if (!hasTimedOut) {
          console.log('✅ [FFmpeg] 处理完成');
          resolve();
        }
      })
      .on('error', (err) => {
        clearTimeout(timeoutTimer);

        if (!hasTimedOut) {
          console.error('❌ [FFmpeg] 处理错误:', err.message);
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
 * 上传带水印视频到R2
 */
async function uploadWatermarkedVideo(
  filePath: string,
  taskId: string
): Promise<string> {
  try {
    const r2Provider = await createR2ProviderFromDb();
    const fileBuffer = await fs.readFile(filePath);

    const result = await r2Provider.uploadFile({
      key: `pet-videos/watermarked/${taskId}.mp4`,
      body: fileBuffer,
      contentType: 'video/mp4',
      disposition: 'inline',
    });

    if (!result.success || !result.url) {
      throw new Error(result.error || '上传带水印视频失败');
    }

    return result.url;
  } catch (error) {
    throw new Error(
      `R2上传失败: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * 获取水印位置坐标
 * W = 视频宽度, H = 视频高度, tw = 文字宽度, th = 文字高度
 */
function getPosition(
  position: WatermarkConfig['position'],
  marginX: number,
  marginY: number
): { x: string; y: string } {
  const positions = {
    'top-left': { x: `${marginX}`, y: `${marginY}` },
    'top-right': { x: `W-tw-${marginX}`, y: `${marginY}` },
    'bottom-left': { x: `${marginX}`, y: `H-th-${marginY}` },
    'bottom-right': { x: `W-tw-${marginX}`, y: `H-th-${marginY}` },
  };
  return positions[position];
}

/**
 * 检查/tmp空间使用情况
 */
async function checkTmpSpace(): Promise<void> {
  try {
    const tmpFiles = await fs.readdir('/tmp');
    let totalSize = 0;

    for (const file of tmpFiles) {
      try {
        const stats = await fs.stat(`/tmp/${file}`);
        totalSize += stats.size;
      } catch {
        // 忽略无法访问的文件
      }
    }

    const totalSizeMB = totalSize / 1024 / 1024;
    console.log(`💾 [Watermark] /tmp 当前使用: ${totalSizeMB.toFixed(2)}MB`);

    if (totalSizeMB > MAX_TMP_SIZE_MB) {
      console.warn(
        `⚠️  [Watermark] /tmp空间使用过高: ${totalSizeMB.toFixed(2)}MB > ${MAX_TMP_SIZE_MB}MB`
      );

      // 记录到Sentry
      Sentry.captureMessage('High /tmp usage detected', {
        level: 'warning',
        extra: { tmpUsageMB: totalSizeMB },
      });
    }
  } catch (error) {
    console.warn('⚠️  [Watermark] 无法检查/tmp空间:', error);
  }
}

/**
 * 清理临时文件
 */
async function cleanupFiles(paths: string[]): Promise<void> {
  console.log('🗑️  [Watermark] 清理临时文件...');

  for (const path of paths) {
    try {
      if (existsSync(path)) {
        await fs.unlink(path);
        console.log(`   ✓ 已删除: ${path}`);
      }
    } catch (err) {
      console.warn(`   ⚠️  删除失败: ${path}`, err);
      // 不抛出异常，继续清理其他文件
    }
  }
}

/**
 * 睡眠函数
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
