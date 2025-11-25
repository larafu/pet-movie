/**
 * 公开视频列表 API
 * Public Videos List API
 *
 * 获取公开分享的视频列表，用于 Inspiration 展示
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/db';
import { getAuth } from '@/core/auth';
import { aiTask, user, videoLike } from '@/config/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset = parseInt(searchParams.get('offset') || '0');

    const database = db();

    // 获取当前用户（如果已登录）
    let currentUserId: string | null = null;
    try {
      const auth = await getAuth();
      const session = await auth.api.getSession({ headers: request.headers });
      currentUserId = session?.user?.id || null;
    } catch {
      // 未登录，忽略
    }

    // 查询公开的视频，按点赞数降序排列
    const videos = await database
      .select({
        id: aiTask.id,
        userId: aiTask.userId,
        finalVideoUrl: aiTask.finalVideoUrl,
        watermarkedVideoUrl: aiTask.watermarkedVideoUrl,
        originalVideoUrl: aiTask.originalVideoUrl,
        frameImageUrl: aiTask.frameImageUrl,
        durationSeconds: aiTask.durationSeconds,
        aspectRatio: aiTask.aspectRatio,
        templateType: aiTask.templateType,
        petDescription: aiTask.petDescription,
        likeCount: aiTask.likeCount,
        createdAt: aiTask.createdAt,
        userName: user.name,
        userImage: user.image,
      })
      .from(aiTask)
      .leftJoin(user, eq(aiTask.userId, user.id))
      .where(
        and(
          eq(aiTask.isPublic, true),
          eq(aiTask.status, 'completed')
        )
      )
      .orderBy(desc(aiTask.likeCount), desc(aiTask.createdAt))
      .limit(limit)
      .offset(offset);

    // 如果用户已登录，检查每个视频是否被当前用户点赞
    let likedVideoIds: Set<string> = new Set();
    if (currentUserId && videos.length > 0) {
      const videoIds = videos.map((v) => v.id);
      const likes = await database
        .select({ videoId: videoLike.videoId })
        .from(videoLike)
        .where(eq(videoLike.userId, currentUserId));

      likedVideoIds = new Set(likes.map((l) => l.videoId));
    }

    // 添加 isLiked 字段
    const videosWithLikeStatus = videos.map((video) => ({
      ...video,
      isLiked: likedVideoIds.has(video.id),
    }));

    return NextResponse.json({
      success: true,
      videos: videosWithLikeStatus,
      total: videos.length,
    });
  } catch (error) {
    console.error('Get public videos error:', error);
    return NextResponse.json(
      { error: 'Failed to get public videos' },
      { status: 500 }
    );
  }
}
