/**
 * 宠物纪念 API - 详情、更新、删除
 * Pet Memorial API - Detail, Update, Delete
 *
 * GET    - 获取纪念详情（公开）
 * PATCH  - 更新纪念（需要登录+所有者）
 * DELETE - 删除纪念（需要登录+所有者）
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/db';
import { getAuth } from '@/core/auth';
import { petMemorial, petMemorialCandle, aiTask, user } from '@/config/db/schema';
import { and, eq, desc, isNull, sql } from 'drizzle-orm';
import { updateMemorialSchema } from '@/shared/lib/validations/pet-memorial';
import type {
  PetMemorialDetail,
  ApiResponse,
  CandleListItem,
} from '@/shared/services/pet-memorial/types';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/pet-memorial/[id]
 * 获取纪念详情
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<ApiResponse<PetMemorialDetail>>> {
  try {
    const { id } = await context.params;
    const database = db();

    // 获取当前用户（如果已登录）
    let currentUserId: string | null = null;
    try {
      const auth = await getAuth();
      const session = await auth.api.getSession({ headers: request.headers });
      currentUserId = session?.user?.id || null;
    } catch {
      // 未登录，忽略
    }

    // 查询纪念详情
    const memorialResult = await database
      .select({
        id: petMemorial.id,
        userId: petMemorial.userId,
        petName: petMemorial.petName,
        species: petMemorial.species,
        birthday: petMemorial.birthday,
        dateOfPassing: petMemorial.dateOfPassing,
        message: petMemorial.message,
        story: petMemorial.story,
        images: petMemorial.images,
        ownerFirstName: petMemorial.ownerFirstName,
        ownerLastName: petMemorial.ownerLastName,
        city: petMemorial.city,
        state: petMemorial.state,
        isNameDisplayed: petMemorial.isNameDisplayed,
        aiTaskId: petMemorial.aiTaskId,
        status: petMemorial.status,
        isPublic: petMemorial.isPublic,
        candleCount: petMemorial.candleCount,
        createdAt: petMemorial.createdAt,
      })
      .from(petMemorial)
      .where(and(eq(petMemorial.id, id), isNull(petMemorial.deletedAt)))
      .limit(1);

    const memorial = memorialResult[0];

    if (!memorial) {
      return NextResponse.json(
        { success: false, error: 'petMemorial.error.notFound' },
        { status: 404 }
      );
    }

    // 检查访问权限（非公开纪念只有所有者可见）
    const isOwner = currentUserId === memorial.userId;
    if (!memorial.isPublic && !isOwner) {
      return NextResponse.json(
        { success: false, error: 'petMemorial.error.notFound' },
        { status: 404 }
      );
    }

    // 查询关联视频信息（如果有）
    let videoUrl: string | null = null;
    let videoThumbnail: string | null = null;

    if (memorial.aiTaskId) {
      const videoResult = await database
        .select({
          finalVideoUrl: aiTask.finalVideoUrl,
          frameImageUrl: aiTask.frameImageUrl,
        })
        .from(aiTask)
        .where(eq(aiTask.id, memorial.aiTaskId))
        .limit(1);

      if (videoResult[0]) {
        videoUrl = videoResult[0].finalVideoUrl;
        videoThumbnail = videoResult[0].frameImageUrl;
      }
    }

    // 查询最新 10 条蜡烛
    const candlesResult = await database
      .select({
        id: petMemorialCandle.id,
        userId: petMemorialCandle.userId,
        guestName: petMemorialCandle.guestName,
        message: petMemorialCandle.message,
        createdAt: petMemorialCandle.createdAt,
      })
      .from(petMemorialCandle)
      .leftJoin(user, eq(petMemorialCandle.userId, user.id))
      .where(
        and(
          eq(petMemorialCandle.memorialId, id),
          eq(petMemorialCandle.isPublished, true)
        )
      )
      .orderBy(desc(petMemorialCandle.createdAt))
      .limit(10);

    // 获取用户名（如果是登录用户点的蜡烛）
    const candleUserIds = candlesResult
      .filter((c) => c.userId)
      .map((c) => c.userId!);

    let userNameMap: Record<string, string> = {};
    if (candleUserIds.length > 0) {
      const usersResult = await database
        .select({ id: user.id, name: user.name })
        .from(user)
        .where(sql`${user.id} IN (${sql.join(candleUserIds.map(id => sql`${id}`), sql`, `)})`);

      userNameMap = Object.fromEntries(usersResult.map((u) => [u.id, u.name]));
    }

    // 转换蜡烛列表
    const candles: CandleListItem[] = candlesResult.map((c) => ({
      id: c.id,
      name: c.userId ? userNameMap[c.userId] || 'Anonymous' : c.guestName || 'Anonymous',
      message: c.message,
      createdAt: c.createdAt.toISOString(),
    }));

    // 更新浏览次数（异步，不阻塞响应）
    database
      .update(petMemorial)
      .set({ viewCount: sql`${petMemorial.viewCount} + 1` })
      .where(eq(petMemorial.id, id))
      .catch((err) => console.error('Failed to update view count:', err));

    // 构建响应
    const detail: PetMemorialDetail = {
      id: memorial.id,
      petName: memorial.petName,
      species: memorial.species as PetMemorialDetail['species'],
      birthday: memorial.birthday?.toISOString() || null,
      dateOfPassing: memorial.dateOfPassing?.toISOString() || null,
      message: memorial.message,
      story: memorial.story,
      ownerFirstName: memorial.isNameDisplayed ? memorial.ownerFirstName : null,
      ownerLastName: memorial.isNameDisplayed ? memorial.ownerLastName : null,
      city: memorial.city,
      state: memorial.state,
      images: JSON.parse(memorial.images || '[]'),
      candleCount: memorial.candleCount,
      hasVideo: !!memorial.aiTaskId,
      createdAt: memorial.createdAt.toISOString(),
      videoUrl,
      videoThumbnail,
      isOwner,
      candles,
      totalCandles: memorial.candleCount,
    };

    return NextResponse.json({ success: true, data: detail });
  } catch (error) {
    console.error('Get pet memorial detail error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get memorial detail' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/pet-memorial/[id]
 * 更新纪念
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<ApiResponse>> {
  try {
    const { id } = await context.params;

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
      .select({ userId: petMemorial.userId })
      .from(petMemorial)
      .where(and(eq(petMemorial.id, id), isNull(petMemorial.deletedAt)))
      .limit(1);

    if (!memorialResult[0]) {
      return NextResponse.json(
        { success: false, error: 'petMemorial.error.notFound' },
        { status: 404 }
      );
    }

    if (memorialResult[0].userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'petMemorial.error.notOwner' },
        { status: 403 }
      );
    }

    // 解析并验证请求体
    const body = await request.json();
    const validationResult = updateMemorialSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: 'petMemorial.error.validation' },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // 构建更新数据
    const updateData: Partial<typeof petMemorial.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (data.petName !== undefined) updateData.petName = data.petName;
    if (data.species !== undefined) updateData.species = data.species;
    if (data.birthday !== undefined)
      updateData.birthday = data.birthday ? new Date(data.birthday) : null;
    if (data.dateOfPassing !== undefined)
      updateData.dateOfPassing = data.dateOfPassing
        ? new Date(data.dateOfPassing)
        : null;
    if (data.message !== undefined) updateData.message = data.message || null;
    if (data.story !== undefined) updateData.story = data.story || null;
    if (data.images !== undefined)
      updateData.images = JSON.stringify(data.images);
    if (data.ownerFirstName !== undefined)
      updateData.ownerFirstName = data.ownerFirstName || null;
    if (data.ownerLastName !== undefined)
      updateData.ownerLastName = data.ownerLastName || null;
    if (data.city !== undefined) updateData.city = data.city || null;
    if (data.state !== undefined) updateData.state = data.state || null;
    if (data.email !== undefined) updateData.email = data.email || null;
    if (data.isNameDisplayed !== undefined)
      updateData.isNameDisplayed = data.isNameDisplayed;
    if (data.isPublic !== undefined) updateData.isPublic = data.isPublic;

    // 执行更新
    await database
      .update(petMemorial)
      .set(updateData)
      .where(eq(petMemorial.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update pet memorial error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update memorial' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/pet-memorial/[id]
 * 删除纪念（软删除）
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<ApiResponse>> {
  try {
    const { id } = await context.params;

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
      .select({ userId: petMemorial.userId })
      .from(petMemorial)
      .where(and(eq(petMemorial.id, id), isNull(petMemorial.deletedAt)))
      .limit(1);

    if (!memorialResult[0]) {
      return NextResponse.json(
        { success: false, error: 'petMemorial.error.notFound' },
        { status: 404 }
      );
    }

    if (memorialResult[0].userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'petMemorial.error.notOwner' },
        { status: 403 }
      );
    }

    // 软删除
    await database
      .update(petMemorial)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(petMemorial.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete pet memorial error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete memorial' },
      { status: 500 }
    );
  }
}
