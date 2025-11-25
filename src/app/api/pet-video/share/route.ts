/**
 * Pet Video Share API
 * POST /api/pet-video/share
 *
 * Toggle video public/private status and return share link
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/core/auth';
import { db } from '@/core/db';
import { aiTask } from '@/config/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    console.log('\n🔗 ========== POST Pet Video Share API Called ==========');

    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      console.log('❌ [Share API] Unauthorized - no session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ [Share API] User authenticated:', session.user.id);

    const body = await request.json();
    const { videoId, setPublic } = body;

    if (!videoId) {
      console.log('❌ [Share API] Missing videoId');
      return NextResponse.json({ error: 'videoId is required' }, { status: 400 });
    }

    console.log('📋 [Share API] Video ID:', videoId);
    console.log('📋 [Share API] setPublic:', setPublic);

    // 查询视频任务，确保是当前用户的视频
    const database = db();
    const [task] = await database
      .select()
      .from(aiTask)
      .where(and(eq(aiTask.id, videoId), eq(aiTask.userId, session.user.id)));

    if (!task) {
      console.log('❌ [Share API] Video not found or not owned by user');
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    console.log('📦 [Share API] Current isPublic status:', task.isPublic);

    // 如果传入 setPublic 参数，直接设置；否则切换状态
    const newIsPublic = setPublic !== undefined ? Boolean(setPublic) : !task.isPublic;

    await database
      .update(aiTask)
      .set({ isPublic: newIsPublic, updatedAt: new Date() })
      .where(eq(aiTask.id, videoId));

    console.log('✅ [Share API] Updated isPublic to:', newIsPublic);

    // 生成分享链接
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const shareLink = `${appUrl}/share/${videoId}`;

    console.log('🔗 [Share API] Share link:', shareLink);

    return NextResponse.json({
      success: true,
      isPublic: newIsPublic,
      shareLink: newIsPublic ? shareLink : null,
      message: newIsPublic ? 'Video is now public' : 'Video is now private',
    });
  } catch (error) {
    console.error('Share video error:', error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to share video',
      },
      { status: 500 }
    );
  }
}
