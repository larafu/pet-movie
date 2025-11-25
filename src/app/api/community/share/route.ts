/**
 * 社区分享API路由
 * Community share API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/core/auth';
import { createShare } from '@/shared/services/community/service';
import type { CreateShareRequest } from '@/shared/services/community/types';
import * as Sentry from '@sentry/nextjs';

/**
 * POST /api/community/share
 * 创建分享
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
    const body: CreateShareRequest = await request.json();

    // 验证必填字段（title现在是可选的，会自动生成）
    if (!body.aiTaskId) {
      return NextResponse.json(
        { error: 'Missing required field: aiTaskId' },
        { status: 400 }
      );
    }

    // 创建分享
    const share = await createShare(session.user.id, body);

    return NextResponse.json(share, { status: 201 });
  } catch (error) {
    // 监控上报不影响主逻辑
    Sentry.captureException(error, {
      tags: { api: 'community_share', method: 'POST' },
    });

    const errorMessage =
      error instanceof Error ? error.message : 'Failed to create share';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
