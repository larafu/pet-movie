/**
 * 我的宠物纪念 API
 * My Pet Memorials API
 *
 * GET - 获取当前用户的纪念列表（包含私有纪念）
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/db';
import { getAuth } from '@/core/auth';
import { petMemorial } from '@/config/db/schema';
import { and, eq, desc, isNull, sql } from 'drizzle-orm';
import { paginationSchema } from '@/shared/lib/validations/pet-memorial';
import type {
  PetMemorialListItem,
  PaginatedResponse,
} from '@/shared/services/pet-memorial/types';

/**
 * GET /api/pet-memorial/my
 * 获取当前用户的纪念列表
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<PaginatedResponse<PetMemorialListItem>>> {
  try {
    // 验证登录状态
    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          data: { list: [], count: 0, offset: 0, limit: 12, hasMore: false },
          error: 'petMemorial.error.unauthorized',
        },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);

    // 验证并解析分页参数
    const params = paginationSchema.parse({
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
    });

    const { limit, offset } = params;
    const database = db();

    // 构建查询条件（包含私有纪念，排除已删除）
    const conditions = [
      eq(petMemorial.userId, userId),
      isNull(petMemorial.deletedAt),
    ];

    // 查询总数
    const countResult = await database
      .select({ count: sql<number>`count(*)` })
      .from(petMemorial)
      .where(and(...conditions));
    const totalCount = Number(countResult[0]?.count || 0);

    // 查询列表（按创建时间倒序）
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
        isPublic: petMemorial.isPublic,
        status: petMemorial.status,
        createdAt: petMemorial.createdAt,
      })
      .from(petMemorial)
      .where(and(...conditions))
      .orderBy(desc(petMemorial.createdAt))
      .limit(limit)
      .offset(offset);

    // 转换为响应格式（自己的纪念，显示所有信息）
    const list: PetMemorialListItem[] = memorials.map((m) => ({
      id: m.id,
      petName: m.petName,
      species: m.species as PetMemorialListItem['species'],
      birthday: m.birthday?.toISOString() || null,
      dateOfPassing: m.dateOfPassing?.toISOString() || null,
      message: m.message ? m.message.slice(0, 200) : null,
      ownerFirstName: m.ownerFirstName,
      ownerLastName: m.ownerLastName,
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
    console.error('Get my memorials error:', error);
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
