/**
 * 宠物纪念蜡烛 API
 * Pet Memorial Candles API
 *
 * GET  - 获取蜡烛列表（支持分页）
 * POST - 点蜡烛（可匿名）
 */

import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { db } from '@/core/db';
import { getAuth } from '@/core/auth';
import { petMemorial, petMemorialCandle, user } from '@/config/db/schema';
import { and, eq, desc, isNull, sql } from 'drizzle-orm';
import {
  lightCandleSchema,
  paginationSchema,
} from '@/shared/lib/validations/pet-memorial';
import type {
  CandleListItem,
  PaginatedResponse,
  ApiResponse,
  LightCandleResponse,
} from '@/shared/services/pet-memorial/types';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/pet-memorial/[id]/candles
 * 获取蜡烛列表
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<PaginatedResponse<CandleListItem>>> {
  try {
    const { id: memorialId } = await context.params;
    const { searchParams } = new URL(request.url);

    // 验证并解析分页参数
    const params = paginationSchema.parse({
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
    });

    const { limit, offset } = params;
    const database = db();

    // 检查纪念是否存在
    const memorialResult = await database
      .select({ id: petMemorial.id })
      .from(petMemorial)
      .where(
        and(eq(petMemorial.id, memorialId), isNull(petMemorial.deletedAt))
      )
      .limit(1);

    if (!memorialResult[0]) {
      return NextResponse.json(
        {
          success: false,
          data: { list: [], count: 0, offset: 0, limit, hasMore: false },
          error: 'petMemorial.error.notFound',
        },
        { status: 404 }
      );
    }

    // 查询蜡烛总数
    const countResult = await database
      .select({ count: sql<number>`count(*)` })
      .from(petMemorialCandle)
      .where(
        and(
          eq(petMemorialCandle.memorialId, memorialId),
          eq(petMemorialCandle.isPublished, true)
        )
      );
    const totalCount = Number(countResult[0]?.count || 0);

    // 查询蜡烛列表
    const candlesResult = await database
      .select({
        id: petMemorialCandle.id,
        userId: petMemorialCandle.userId,
        guestName: petMemorialCandle.guestName,
        message: petMemorialCandle.message,
        createdAt: petMemorialCandle.createdAt,
      })
      .from(petMemorialCandle)
      .where(
        and(
          eq(petMemorialCandle.memorialId, memorialId),
          eq(petMemorialCandle.isPublished, true)
        )
      )
      .orderBy(desc(petMemorialCandle.createdAt))
      .limit(limit)
      .offset(offset);

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
    const list: CandleListItem[] = candlesResult.map((c) => ({
      id: c.id,
      name: c.userId
        ? userNameMap[c.userId] || 'Anonymous'
        : c.guestName || 'Anonymous',
      message: c.message,
      createdAt: c.createdAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      data: {
        list,
        count: totalCount,
        offset,
        limit,
        hasMore: offset + list.length < totalCount,
      },
    });
  } catch (error) {
    console.error('Get candles error:', error);
    return NextResponse.json(
      {
        success: false,
        data: { list: [], count: 0, offset: 0, limit: 12, hasMore: false },
        error: 'Failed to get candles',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pet-memorial/[id]/candles
 * 点蜡烛
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<ApiResponse<LightCandleResponse>>> {
  try {
    const { id: memorialId } = await context.params;
    const database = db();

    // 检查纪念是否存在且公开
    const memorialResult = await database
      .select({
        id: petMemorial.id,
        isPublic: petMemorial.isPublic,
        candleCount: petMemorial.candleCount,
      })
      .from(petMemorial)
      .where(
        and(eq(petMemorial.id, memorialId), isNull(petMemorial.deletedAt))
      )
      .limit(1);

    if (!memorialResult[0]) {
      return NextResponse.json(
        { success: false, error: 'petMemorial.error.notFound' },
        { status: 404 }
      );
    }

    // 获取当前用户（如果已登录）
    let currentUserId: string | null = null;
    let currentUserName: string | null = null;
    try {
      const auth = await getAuth();
      const session = await auth.api.getSession({ headers: request.headers });
      currentUserId = session?.user?.id || null;
      currentUserName = session?.user?.name || null;
    } catch {
      // 未登录，忽略
    }

    // 解析并验证请求体
    const body = await request.json();
    const validationResult = lightCandleSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: 'petMemorial.error.validation' },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // 确定显示名称
    let displayName: string;
    if (currentUserId) {
      displayName = currentUserName || 'Anonymous';
    } else {
      displayName = data.name || 'Anonymous';
    }

    // 创建蜡烛记录
    const candleId = nanoid();
    const now = new Date();

    await database.insert(petMemorialCandle).values({
      id: candleId,
      memorialId,
      userId: currentUserId,
      guestName: currentUserId ? null : data.name || null,
      guestEmail: currentUserId ? null : data.email || null,
      message: data.message || null,
      isPublished: true, // 默认直接发布
      createdAt: now,
    });

    // 更新纪念的蜡烛数量
    await database
      .update(petMemorial)
      .set({
        candleCount: sql`${petMemorial.candleCount} + 1`,
        updatedAt: now,
      })
      .where(eq(petMemorial.id, memorialId));

    return NextResponse.json({
      success: true,
      data: {
        id: candleId,
        name: displayName,
        message: data.message || null,
        createdAt: now.toISOString(),
      },
    });
  } catch (error) {
    console.error('Light candle error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to light candle' },
      { status: 500 }
    );
  }
}
