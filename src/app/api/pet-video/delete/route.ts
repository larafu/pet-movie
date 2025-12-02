/**
 * Pet Video Delete API
 * DELETE /api/pet-video/delete
 *
 * 删除用户的视频任务（仅允许删除自己的失败或卡住的任务）
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { getAuth } from '@/core/auth';
import { db } from '@/core/db';
import { aiTask } from '@/config/db/schema';

export async function DELETE(request: NextRequest) {
  try {
    // 验证用户登录
    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // 获取任务 ID
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    const database = db();

    // 查询任务，确保是用户自己的任务
    const [task] = await database
      .select()
      .from(aiTask)
      .where(
        and(
          eq(aiTask.id, taskId),
          eq(aiTask.userId, userId)
        )
      )
      .limit(1);

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // 只允许删除失败的任务或超过2小时的卡住任务
    const STUCK_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2小时
    const createdAt = new Date(task.createdAt!).getTime();
    const isStuck = (Date.now() - createdAt) > STUCK_TIMEOUT_MS;
    const isFailed = task.status === 'failed';

    if (!isFailed && !isStuck && task.status !== 'completed') {
      return NextResponse.json(
        { error: 'Cannot delete task that is still in progress' },
        { status: 400 }
      );
    }

    // 删除任务
    await database
      .delete(aiTask)
      .where(eq(aiTask.id, taskId));

    console.log(`🗑️ Task ${taskId} deleted by user ${userId}`);

    return NextResponse.json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error) {
    console.error('❌ Delete task error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Delete failed' },
      { status: 500 }
    );
  }
}
