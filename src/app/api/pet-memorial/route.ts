/**
 * 宠物纪念 API - 列表和创建
 * Pet Memorial API - List and Create
 *
 * GET  - 获取公开纪念列表（支持分页、搜索）
 * POST - 创建纪念（需要登录）
 */

import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { db } from '@/core/db';
import { getAuth } from '@/core/auth';
import { petMemorial, aiTask } from '@/config/db/schema';
import { and, eq, desc, ilike, or, sql, isNull } from 'drizzle-orm';
import {
  createMemorialSchema,
  memorialListParamsSchema,
} from '@/shared/lib/validations/pet-memorial';
import type {
  PetMemorialListItem,
  PaginatedResponse,
  ApiResponse,
  CreateMemorialResponse,
} from '@/shared/services/pet-memorial/types';

/**
 * GET /api/pet-memorial
 * 获取公开纪念列表
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<PaginatedResponse<PetMemorialListItem>>> {
  try {
    const { searchParams } = new URL(request.url);

    // 验证并解析查询参数
    // 注意：searchParams.get() 返回 null 而非 undefined，需要转换
    const params = memorialListParamsSchema.parse({
      limit: searchParams.get('limit') ?? undefined,
      offset: searchParams.get('offset') ?? undefined,
      search: searchParams.get('search') ?? undefined,
      sort: searchParams.get('sort') ?? undefined,
    });

    const { limit, offset, search, sort } = params;
    const database = db();

    // 构建查询条件
    const conditions = [
      eq(petMemorial.isPublic, true),
      eq(petMemorial.status, 'approved'),
      isNull(petMemorial.deletedAt),
    ];

    // 搜索条件 - 只搜索宠物名和主人名（不区分大小写的模糊匹配）
    if (search) {
      const searchPattern = `%${search}%`;
      conditions.push(
        or(
          ilike(petMemorial.petName, searchPattern),
          ilike(petMemorial.ownerFirstName, searchPattern),
          ilike(petMemorial.ownerLastName, searchPattern)
        )!
      );
    }

    // 查询总数
    const countResult = await database
      .select({ count: sql<number>`count(*)` })
      .from(petMemorial)
      .where(and(...conditions));
    const totalCount = Number(countResult[0]?.count || 0);

    // 排序方式
    const orderBy =
      sort === 'popular'
        ? [desc(petMemorial.candleCount), desc(petMemorial.createdAt)]
        : [desc(petMemorial.createdAt)];

    // 查询列表
    const memorials = await database
      .select({
        id: petMemorial.id,
        petName: petMemorial.petName,
        species: petMemorial.species,
        birthday: petMemorial.birthday,
        dateOfPassing: petMemorial.dateOfPassing,
        message: petMemorial.message,
        ownerFirstName: petMemorial.ownerFirstName,
        ownerLastName: petMemorial.ownerLastName,
        city: petMemorial.city,
        state: petMemorial.state,
        images: petMemorial.images,
        candleCount: petMemorial.candleCount,
        aiTaskId: petMemorial.aiTaskId,
        isNameDisplayed: petMemorial.isNameDisplayed,
        createdAt: petMemorial.createdAt,
      })
      .from(petMemorial)
      .where(and(...conditions))
      .orderBy(...orderBy)
      .limit(limit)
      .offset(offset);

    // 转换为响应格式
    const list: PetMemorialListItem[] = memorials.map((m) => ({
      id: m.id,
      petName: m.petName,
      species: m.species as PetMemorialListItem['species'],
      birthday: m.birthday?.toISOString() || null,
      dateOfPassing: m.dateOfPassing?.toISOString() || null,
      message: m.message ? m.message.slice(0, 200) : null,
      ownerFirstName: m.isNameDisplayed ? m.ownerFirstName : null,
      ownerLastName: m.isNameDisplayed ? m.ownerLastName : null,
      city: m.city,
      state: m.state,
      images: JSON.parse(m.images || '[]'),
      candleCount: m.candleCount,
      hasVideo: !!m.aiTaskId,
      createdAt: m.createdAt.toISOString(),
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
    console.error('Get pet memorials error:', error);
    return NextResponse.json(
      {
        success: false,
        data: { list: [], count: 0, offset: 0, limit: 12, hasMore: false },
        error: 'Failed to get memorials',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pet-memorial
 * 创建纪念
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<CreateMemorialResponse>>> {
  try {
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

    // 解析并验证请求体
    const body = await request.json();
    const validationResult = createMemorialSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'petMemorial.error.validation',
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;
    const database = db();

    // 创建纪念记录
    const memorialId = nanoid();
    const now = new Date();

    await database.insert(petMemorial).values({
      id: memorialId,
      userId,
      petName: data.petName,
      species: data.species || null,
      birthday: data.birthday ? new Date(data.birthday) : null,
      dateOfPassing: data.dateOfPassing ? new Date(data.dateOfPassing) : null,
      message: data.message || null,
      story: data.story || null,
      images: JSON.stringify(data.images),
      ownerFirstName: data.ownerFirstName || null,
      ownerLastName: data.ownerLastName || null,
      city: data.city || null,
      state: data.state || null,
      email: data.email || null,
      isNameDisplayed: data.isNameDisplayed ?? true,
      status: 'approved', // 默认直接批准
      isPublic: data.isPublic ?? true,
      viewCount: 0,
      candleCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: memorialId,
        petName: data.petName,
        status: 'approved',
        createdAt: now.toISOString(),
      },
    });
  } catch (error) {
    console.error('Create pet memorial error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create memorial' },
      { status: 500 }
    );
  }
}
