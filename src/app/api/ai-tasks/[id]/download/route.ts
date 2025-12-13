/**
 * 图片下载 API（带水印处理）
 * GET /api/ai-tasks/:id/download
 *
 * 功能说明：
 * - 免费用户下载图片时自动添加水印
 * - Pro 会员默认下载无水印原图
 * - 支持通过 query 参数控制是否添加水印
 *
 * 水印样式与视频水印保持一致：
 * - 品牌词：petmovie.ai
 * - 位置：右下角
 * - 带阴影效果
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq, and, isNull, or } from 'drizzle-orm';
import sharp from 'sharp';

import { db } from '@/core/db';
import { aiTask } from '@/config/db/schema';
import { getUserInfo } from '@/shared/models/user';
import { getCurrentSubscription, SubscriptionStatus } from '@/shared/models/subscription';

// 水印配置（与视频水印保持一致）
const WATERMARK_CONFIG = {
  text: 'petmovie.ai',
  opacity: 0.8,
  marginX: 24,
  marginY: 24,
  shadowOffset: 2,
  shadowOpacity: 0.5,
};

/**
 * 生成右下角水印 SVG（带阴影效果）
 * 与视频水印样式保持一致
 */
function createWatermarkSvg(width: number, height: number): Buffer {
  // 根据图片尺寸计算水印大小（最小 24px，最大 48px）
  const fontSize = Math.max(Math.min(Math.min(width, height) * 0.04, 48), 24);
  const { text, opacity, marginX, marginY, shadowOffset, shadowOpacity } = WATERMARK_CONFIG;

  // 估算文字宽度（用于定位）
  const textWidth = text.length * fontSize * 0.6;

  // 计算右下角位置
  const x = width - textWidth - marginX;
  const y = height - marginY;

  // 创建右下角水印 SVG（带阴影）
  const watermarkSvg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <!-- 阴影层 -->
      <text x="${x + shadowOffset}" y="${y + shadowOffset}"
            font-family="Montserrat, Arial, sans-serif"
            font-size="${fontSize}px"
            font-weight="bold"
            fill="black"
            fill-opacity="${shadowOpacity}">
        ${text}
      </text>
      <!-- 主文字层 -->
      <text x="${x}" y="${y}"
            font-family="Montserrat, Arial, sans-serif"
            font-size="${fontSize}px"
            font-weight="bold"
            fill="white"
            fill-opacity="${opacity}">
        ${text}
      </text>
    </svg>
  `;

  return Buffer.from(watermarkSvg);
}

/**
 * 检查用户是否是 Pro 会员
 */
async function checkIsPro(userId: string): Promise<boolean> {
  const subscription = await getCurrentSubscription(userId);
  return subscription && [
    SubscriptionStatus.ACTIVE,
    SubscriptionStatus.TRIALING,
  ].includes(subscription.status as SubscriptionStatus);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;

    // 可选参数：强制添加/不添加水印（仅 Pro 用户可用 noWatermark）
    const forceWatermark = searchParams.get('watermark') === 'true';

    // 获取当前用户（允许未登录用户下载，但会带水印）
    const user = await getUserInfo();
    const isPro = user ? await checkIsPro(user.id) : false;

    // 获取任务信息
    // 注意：图片生成使用 finalImageUrl 存储最终图片 URL
    const tasks = await db()
      .select({
        id: aiTask.id,
        mediaType: aiTask.mediaType,
        finalImageUrl: aiTask.finalImageUrl,
      })
      .from(aiTask)
      .where(
        and(
          eq(aiTask.id, id),
          or(eq(aiTask.status, 'success'), eq(aiTask.status, 'completed')),
          isNull(aiTask.deletedAt)
        )
      )
      .limit(1);

    const task = tasks[0];

    if (!task) {
      return NextResponse.json(
        { code: -1, message: 'Task not found' },
        { status: 404 }
      );
    }

    // 仅支持图片下载（视频走原有逻辑）
    if (task.mediaType !== 'image') {
      return NextResponse.json(
        { code: -1, message: 'Only image downloads are supported' },
        { status: 400 }
      );
    }

    if (!task.finalImageUrl) {
      return NextResponse.json(
        { code: -1, message: 'Image not found' },
        { status: 404 }
      );
    }

    // 决定是否添加水印
    // 规则：
    // - 免费用户：强制添加水印
    // - Pro 用户：默认无水印，可通过 watermark=true 主动添加
    let shouldAddWatermark = !isPro; // 默认免费用户添加水印

    if (isPro) {
      // Pro 用户可以选择
      shouldAddWatermark = forceWatermark;
    } else {
      // 免费用户始终添加水印
      shouldAddWatermark = true;
    }

    // 获取原始图片
    const imageResponse = await fetch(task.finalImageUrl);
    if (!imageResponse.ok) {
      return NextResponse.json(
        { code: -1, message: 'Failed to fetch image' },
        { status: 500 }
      );
    }

    const arrayBuffer = await imageResponse.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    // 如果不需要水印，直接返回原图
    if (!shouldAddWatermark) {
      const contentType = imageResponse.headers.get('content-type') || 'image/png';
      return new NextResponse(new Uint8Array(imageBuffer), {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="image-${id}.${contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg' : 'png'}"`,
          'Cache-Control': 'private, max-age=3600',
        },
      });
    }

    // 添加水印
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    const width = metadata.width || 1024;
    const height = metadata.height || 1024;

    // 生成水印 SVG
    const watermarkSvg = createWatermarkSvg(width, height);

    // 合成水印图片
    const watermarkedBuffer = await image
      .composite([
        {
          input: watermarkSvg,
          top: 0,
          left: 0,
        },
      ])
      .png() // 输出为 PNG 保证质量
      .toBuffer();

    return new NextResponse(new Uint8Array(watermarkedBuffer), {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="image-${id}.png"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Download API error:', error);
    return NextResponse.json(
      { code: -1, message: 'Download failed' },
      { status: 500 }
    );
  }
}
