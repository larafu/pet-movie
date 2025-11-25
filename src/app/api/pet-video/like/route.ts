/**
 * Pet Video Like API
 * POST /api/pet-video/like
 *
 * Toggle like status for a video
 * 切换视频点赞状态
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq, and, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

import { getAuth } from '@/core/auth';
import { db } from '@/core/db';
import { aiTask, videoLike } from '@/config/db/schema';

export async function POST(request: NextRequest) {
  try {
    console.log('\n❤️ ========== POST Video Like API Called ==========');

    // 验证用户身份
    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      console.log('❌ [Like API] User not authenticated');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ [Like API] User authenticated:', session.user.id);

    const body = await request.json();
    const { videoId } = body;

    if (!videoId) {
      console.log('❌ [Like API] Missing videoId');
      return NextResponse.json({ error: 'videoId is required' }, { status: 400 });
    }

    console.log('📋 [Like API] Video ID:', videoId);

    const database = db();

    // 检查视频是否存在
    const [video] = await database
      .select({ id: aiTask.id, likeCount: aiTask.likeCount })
      .from(aiTask)
      .where(eq(aiTask.id, videoId));

    if (!video) {
      console.log('❌ [Like API] Video not found');
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // 检查是否已经点赞
    const [existingLike] = await database
      .select()
      .from(videoLike)
      .where(
        and(
          eq(videoLike.videoId, videoId),
          eq(videoLike.userId, session.user.id)
        )
      );

    let isLiked: boolean;
    let newLikeCount: number;

    if (existingLike) {
      // 取消点赞
      console.log('👎 [Like API] Removing like');
      await database
        .delete(videoLike)
        .where(eq(videoLike.id, existingLike.id));

      // 更新点赞数
      await database
        .update(aiTask)
        .set({ likeCount: sql`${aiTask.likeCount} - 1` })
        .where(eq(aiTask.id, videoId));

      isLiked = false;
      newLikeCount = Math.max(0, (video.likeCount || 0) - 1);
    } else {
      // 添加点赞
      console.log('👍 [Like API] Adding like');
      await database.insert(videoLike).values({
        id: nanoid(),
        videoId,
        userId: session.user.id,
        createdAt: new Date(),
      });

      // 更新点赞数
      await database
        .update(aiTask)
        .set({ likeCount: sql`${aiTask.likeCount} + 1` })
        .where(eq(aiTask.id, videoId));

      isLiked = true;
      newLikeCount = (video.likeCount || 0) + 1;
    }

    console.log('✅ [Like API] Like toggled:', { isLiked, newLikeCount });

    return NextResponse.json({
      success: true,
      isLiked,
      likeCount: newLikeCount,
    });
  } catch (error) {
    console.error('Like video error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to like video',
      },
      { status: 500 }
    );
  }
}
