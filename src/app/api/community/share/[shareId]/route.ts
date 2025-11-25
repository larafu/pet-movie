/**
 * 社区分享详情API路由
 * Community share detail API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/core/auth';
import {
  getShareById,
  deleteShare,
  updateShareStats,
} from '@/shared/services/community/service';
import * as Sentry from '@sentry/nextjs';

/**
 * GET /api/community/share/[shareId]
 * 获取分享详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { shareId: string } }
) {
  try {
    const { shareId } = params;

    // 获取当前用户（如果已登录）
    const auth = getAuth();
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    const currentUserId = session?.user?.id;

    // 获取分享详情
    const share = await getShareById(shareId, currentUserId);

    // 异步更新浏览次数（不等待结果）
    updateShareStats(shareId, 'view').catch(() => {
      // 静默失败，不影响主流程
    });

    return NextResponse.json(share);
  } catch (error) {
    // 监控上报不影响主逻辑
    Sentry.captureException(error, {
      tags: { api: 'community_share_detail', method: 'GET' },
      extra: { shareId: params.shareId },
    });

    const errorMessage =
      error instanceof Error ? error.message : 'Failed to get share';
    const status = error instanceof Error && error.message === 'Share not found' ? 404 : 500;
    return NextResponse.json({ error: errorMessage }, { status });
  }
}

/**
 * DELETE /api/community/share/[shareId]
 * 删除分享
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { shareId: string } }
) {
  try {
    const { shareId } = params;

    // 获取认证信息
    const auth = getAuth();
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 删除分享
    await deleteShare(session.user.id, shareId);

    return NextResponse.json({ success: true });
  } catch (error) {
    // 监控上报不影响主逻辑
    Sentry.captureException(error, {
      tags: { api: 'community_share_detail', method: 'DELETE' },
      extra: { shareId: params.shareId },
    });

    const errorMessage =
      error instanceof Error ? error.message : 'Failed to delete share';
    const status = error instanceof Error && error.message === 'Share not found' ? 404 : 500;
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
