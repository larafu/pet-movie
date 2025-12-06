/**
 * 宠物纪念视频生成 API
 * Pet Memorial Video Generation API
 *
 * POST - 为纪念生成视频（需要登录+所有者）
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/db';
import { getAuth } from '@/core/auth';
import { petMemorial, aiTask } from '@/config/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { generateVideoSchema } from '@/shared/lib/validations/pet-memorial';
import type {
  ApiResponse,
  GenerateVideoResponse,
} from '@/shared/services/pet-memorial/types';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/pet-memorial/[id]/generate-video
 * 为纪念生成视频
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<ApiResponse<GenerateVideoResponse>>> {
  try {
    const { id: memorialId } = await context.params;

    // 验证登录状态
    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'petMemorial.error.unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const database = db();

    // 检查纪念是否存在且为所有者
    const memorialResult = await database
      .select({
        id: petMemorial.id,
        userId: petMemorial.userId,
        petName: petMemorial.petName,
        species: petMemorial.species,
        images: petMemorial.images,
        aiTaskId: petMemorial.aiTaskId,
      })
      .from(petMemorial)
      .where(
        and(eq(petMemorial.id, memorialId), isNull(petMemorial.deletedAt))
      )
      .limit(1);

    const memorial = memorialResult[0];

    if (!memorial) {
      return NextResponse.json(
        { success: false, error: 'petMemorial.error.notFound' },
        { status: 404 }
      );
    }

    if (memorial.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'petMemorial.error.notOwner' },
        { status: 403 }
      );
    }

    // 检查是否已有关联视频
    if (memorial.aiTaskId) {
      // 检查视频是否已完成
      const existingTask = await database
        .select({ status: aiTask.status, finalVideoUrl: aiTask.finalVideoUrl })
        .from(aiTask)
        .where(eq(aiTask.id, memorial.aiTaskId))
        .limit(1);

      if (existingTask[0]?.finalVideoUrl) {
        return NextResponse.json(
          { success: false, error: 'petMemorial.error.videoExists' },
          { status: 400 }
        );
      }
    }

    // 解析并验证请求体
    const body = await request.json();
    const validationResult = generateVideoSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: 'petMemorial.error.validation' },
        { status: 400 }
      );
    }

    const { aspectRatio } = validationResult.data;

    // 获取纪念图片（用于视频生成）
    const images: string[] = JSON.parse(memorial.images || '[]');
    if (images.length === 0) {
      return NextResponse.json(
        { success: false, error: 'petMemorial.error.imageRequired' },
        { status: 400 }
      );
    }

    // 确定模板类型
    const templateType = memorial.species === 'cat' ? 'cat' : 'dog';

    // 调用现有的视频生成 API
    // 这里直接调用内部 API 而不是 HTTP 请求
    const generateUrl = new URL('/api/pet-video/generate-v2', request.url);

    const generateResponse = await fetch(generateUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: request.headers.get('cookie') || '',
      },
      body: JSON.stringify({
        petImageUrl: images[0], // 使用第一张图片
        templateType,
        aspectRatio,
        durationSeconds: 25, // 纪念视频使用25秒
        // 附加信息
        metadata: {
          source: 'pet-memorial',
          memorialId,
          petName: memorial.petName,
        },
      }),
    });

    if (!generateResponse.ok) {
      const errorData = await generateResponse.json().catch(() => ({}));
      console.error('Video generation failed:', errorData);

      // 检查是否是积分不足
      if (errorData.error?.includes('credit') || errorData.error?.includes('insufficient')) {
        return NextResponse.json(
          { success: false, error: 'petMemorial.error.insufficientCredits' },
          { status: 402 }
        );
      }

      return NextResponse.json(
        { success: false, error: 'Failed to generate video' },
        { status: 500 }
      );
    }

    const generateResult = await generateResponse.json();

    if (!generateResult.success || !generateResult.taskId) {
      return NextResponse.json(
        { success: false, error: 'Failed to generate video' },
        { status: 500 }
      );
    }

    // 更新纪念关联的 AI 任务 ID
    await database
      .update(petMemorial)
      .set({
        aiTaskId: generateResult.taskId,
        updatedAt: new Date(),
      })
      .where(eq(petMemorial.id, memorialId));

    return NextResponse.json({
      success: true,
      data: {
        taskId: generateResult.taskId,
        estimatedSeconds: generateResult.estimatedTime || 180, // 预计3分钟
        creditsUsed: generateResult.creditsUsed || 0,
      },
    });
  } catch (error) {
    console.error('Generate memorial video error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate video' },
      { status: 500 }
    );
  }
}
