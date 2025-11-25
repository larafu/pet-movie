/**
 * 社区分享列表API路由
 * Community shares list API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/core/auth';
import { getShares } from '@/shared/services/community/service';
import type { GetSharesRequest } from '@/shared/services/community/types';
import * as Sentry from '@sentry/nextjs';

/**
 * GET /api/community/shares
 * 获取分享列表
 *
 * Query params:
 * - sortBy: 'latest' | 'popular' (default: 'latest')
 * - limit: number (default: 20)
 * - offset: number (default: 0)
 * - userId: string (optional, filter by user)
 */
export async function GET(request: NextRequest) {
  try {
    // 解析查询参数
    const searchParams = request.nextUrl.searchParams;
    const queryRequest: GetSharesRequest = {
      sortBy: (searchParams.get('sortBy') as 'latest' | 'popular') || 'latest',
      limit: parseInt(searchParams.get('limit') || '20'),
      offset: parseInt(searchParams.get('offset') || '0'),
      userId: searchParams.get('userId') || undefined,
    };

    // 获取当前用户（如果已登录）
    const auth = getAuth();
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    const currentUserId = session?.user?.id;

    // 获取分享列表
    const shares = await getShares(queryRequest, currentUserId);

    return NextResponse.json({
      shares,
      pagination: {
        limit: queryRequest.limit,
        offset: queryRequest.offset,
        count: shares.length,
      },
    });
  } catch (error) {
    // 监控上报不影响主逻辑
    Sentry.captureException(error, {
      tags: { api: 'community_shares', method: 'GET' },
    });

    const errorMessage =
      error instanceof Error ? error.message : 'Failed to get shares';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
