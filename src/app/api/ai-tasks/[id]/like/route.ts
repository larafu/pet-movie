/**
 * 点赞 API
 * POST /api/ai-tasks/:id/like
 */

import { NextRequest } from 'next/server';
import { eq, and, isNull, sql } from 'drizzle-orm';

import { db } from '@/core/db';
import { aiTask, videoLike } from '@/config/db/schema';
import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { getUuid } from '@/shared/lib/hash';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { liked } = await request.json();

    // 获取当前用户
    const user = await getUserInfo();
    if (!user) {
      return respErr('no auth, please sign in');
    }

    // 检查任务是否存在
    const tasks = await db()
      .select({ id: aiTask.id })
      .from(aiTask)
      .where(and(eq(aiTask.id, id), isNull(aiTask.deletedAt)))
      .limit(1);

    if (!tasks[0]) {
      return respErr('task not found');
    }

    // 检查是否已经点赞
    const existingLikes = await db()
      .select({ id: videoLike.id })
      .from(videoLike)
      .where(
        and(
          eq(videoLike.videoId, id),
          eq(videoLike.userId, user.id)
        )
      )
      .limit(1);

    const existingLike = existingLikes[0];

    if (liked) {
      // 点赞
      if (!existingLike) {
        // 创建点赞记录
        await db().insert(videoLike).values({
          id: getUuid(),
          videoId: id,
          userId: user.id,
        });

        // 增加点赞数
        await db()
          .update(aiTask)
          .set({
            likeCount: sql`${aiTask.likeCount} + 1`,
          })
          .where(eq(aiTask.id, id));
      }
    } else {
      // 取消点赞
      if (existingLike) {
        // 删除点赞记录
        await db()
          .delete(videoLike)
          .where(
            and(
              eq(videoLike.videoId, id),
              eq(videoLike.userId, user.id)
            )
          );

        // 减少点赞数
        await db()
          .update(aiTask)
          .set({
            likeCount: sql`${aiTask.likeCount} - 1`,
          })
          .where(eq(aiTask.id, id));
      }
    }

    // 获取更新后的点赞数
    const updatedTasks = await db()
      .select({ likeCount: aiTask.likeCount })
      .from(aiTask)
      .where(eq(aiTask.id, id))
      .limit(1);

    return respData({
      liked,
      likeCount: updatedTasks[0]?.likeCount || 0,
    });
  } catch (error) {
    console.error('Like API error:', error);
    return respErr('Failed to like/unlike');
  }
}
