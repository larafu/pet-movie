/**
 * 视频分享页面
 * Video Share Page
 *
 * 公开展示用户分享的视频内容
 * 支持系统示例视频和用户分享视频
 * 登录用户可点赞，未登录引导登录
 */

import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { db } from '@/core/db';
import { getAuth } from '@/core/auth';
import { aiTask, user, videoLike } from '@/config/db/schema';
import { eq, and } from 'drizzle-orm';
import { VideoShareDisplay } from '@/shared/components/ui/video-share-display';

interface PageProps {
  params: Promise<{
    locale: string;
    videoId: string;
  }>;
}

export default async function SharePage({ params }: PageProps) {
  const { videoId } = await params;

  const database = db();

  // 查询数据库中的视频（包括系统示例和用户分享）
  const [task] = await database
    .select({
      id: aiTask.id,
      userId: aiTask.userId,
      finalVideoUrl: aiTask.finalVideoUrl,
      watermarkedVideoUrl: aiTask.watermarkedVideoUrl, // 带水印版本
      frameImageUrl: aiTask.frameImageUrl,
      durationSeconds: aiTask.durationSeconds,
      aspectRatio: aiTask.aspectRatio,
      templateType: aiTask.templateType,
      petDescription: aiTask.petDescription,
      isPublic: aiTask.isPublic,
      likeCount: aiTask.likeCount,
      createdAt: aiTask.createdAt,
      userName: user.name,
      userImage: user.image,
    })
    .from(aiTask)
    .leftJoin(user, eq(aiTask.userId, user.id))
    .where(and(eq(aiTask.id, videoId), eq(aiTask.isPublic, true)));

  // 如果视频不存在或不是公开的，返回404
  if (!task || !task.finalVideoUrl) {
    notFound();
  }

  // 检查当前用户是否已点赞（如果已登录）
  let isLiked = false;
  try {
    const auth = await getAuth();
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });

    if (session?.user?.id) {
      // 查询用户是否已点赞该视频
      const [existingLike] = await database
        .select({ id: videoLike.id })
        .from(videoLike)
        .where(
          and(
            eq(videoLike.videoId, videoId),
            eq(videoLike.userId, session.user.id)
          )
        );
      isLiked = !!existingLike;
    }
  } catch {
    // 获取会话失败，忽略错误，默认未点赞
  }

  // 优先使用带水印版本，如果没有则使用finalVideoUrl
  const displayVideoUrl = task.watermarkedVideoUrl || task.finalVideoUrl;

  return (
    <main className="min-h-screen bg-background pt-[80px]">
      <VideoShareDisplay
        videoId={task.id}
        videoUrl={displayVideoUrl}
        thumbnailUrl={task.frameImageUrl || undefined}
        aspectRatio={(task.aspectRatio as '16:9' | '9:16') || '16:9'}
        likeCount={task.likeCount || 0}
        isLiked={isLiked}
        user={{
          name: task.userName || 'Pet Movie',
          avatarUrl: task.userImage || undefined,
        }}
        metadata={{
          templateType: task.templateType || '',
          petDescription: task.petDescription || '',
          duration: task.durationSeconds || 0,
          createdAt: task.createdAt?.toISOString() || '',
        }}
      />
    </main>
  );
}
