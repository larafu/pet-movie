/**
 * 社区点赞API路由
 * Community like API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/core/auth';
import { toggleLike } from '@/shared/services/community/service';
import type { LikeRequest } from '@/shared/services/community/types';
import * as Sentry from '@sentry/nextjs';

/**
 * POST /api/community/like
 * 切换点赞状态（点赞/取消点赞）
 */
export async function POST(request: NextRequest) {
  try {
    // 获取认证信息
    const auth = await getAuth();
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 解析请求体
    const body: LikeRequest = await request.json();

    // 验证必填字段
    if (!body.shareId) {
      return NextResponse.json(
        { error: 'Missing required field: shareId' },
        { status: 400 }
      );
    }

    // 切换点赞
    const result = await toggleLike(session.user.id, body);

    return NextResponse.json(result);
  } catch (error) {
    // 监控上报不影响主逻辑
    Sentry.captureException(error, {
      tags: { api: 'community_like', method: 'POST' },
    });

    const errorMessage =
      error instanceof Error ? error.message : 'Failed to toggle like';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
