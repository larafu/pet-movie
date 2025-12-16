/**
 * 管理员修改 AI 任务点赞数 API
 * PUT /api/admin/ai-tasks/[id]/likes
 *
 * 仅超级管理员（拥有 AITASKS_WRITE 权限）可使用
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

import { getAuth } from '@/core/auth';
import { db } from '@/core/db';
import { aiTask } from '@/config/db/schema';
import { hasPermission } from '@/shared/services/rbac';
import { PERMISSIONS } from '@/core/rbac/permission';

interface UpdateLikesRequest {
  likeCount: number;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 验证用户登录
    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 验证管理员权限（需要 AITASKS_WRITE 权限）
    const hasWritePermission = await hasPermission(
      session.user.id,
      PERMISSIONS.AITASKS_WRITE
    );
    if (!hasWritePermission) {
      return NextResponse.json(
        { success: false, error: 'Permission denied: admin.ai-tasks.write required' },
        { status: 403 }
      );
    }

    const body: UpdateLikesRequest = await request.json();
    const { likeCount } = body;

    // 验证参数
    if (typeof likeCount !== 'number' || likeCount < 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid likeCount: must be a non-negative number' },
        { status: 400 }
      );
    }

    const database = db();

    // 检查任务是否存在
    const existing = await database
      .select({ id: aiTask.id, isPublic: aiTask.isPublic })
      .from(aiTask)
      .where(eq(aiTask.id, id))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { success: false, error: 'AI task not found' },
        { status: 404 }
      );
    }

    // 更新点赞数
    await database
      .update(aiTask)
      .set({ likeCount })
      .where(eq(aiTask.id, id));

    console.log(`✅ Admin updated like count: taskId=${id}, likeCount=${likeCount}, adminId=${session.user.id}`);

    return NextResponse.json({
      success: true,
      data: {
        id,
        likeCount,
      },
    });
  } catch (error) {
    console.error('Update like count error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
