/**
 * 直接合并视频 API（不依赖数据库）
 * POST /api/admin/script-creator/merge-direct
 * 直接使用传入的视频 URL 列表进行合并
 */

import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';

import { getAuth } from '@/core/auth';
import { mergeVideosWithRetry } from '@/extensions/video/merge-service';
import { checkScriptTemplateWritePermission } from '../_lib/check-admin';

interface MergeDirectRequest {
  videoUrls: string[]; // 视频 URL 列表，按顺序排列
}

export async function POST(request: NextRequest) {
  try {
    // 验证用户登录
    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // 验证管理员权限
    const permissionError = await checkScriptTemplateWritePermission(session.user.id);
    if (permissionError) return permissionError;

    const body: MergeDirectRequest = await request.json();
    const { videoUrls } = body;

    if (!videoUrls || !Array.isArray(videoUrls) || videoUrls.length === 0) {
      return NextResponse.json({ success: false, error: 'Missing videoUrls' }, { status: 400 });
    }

    // 验证所有 URL 都有效
    const validUrls = videoUrls.filter(url => url && typeof url === 'string');
    if (validUrls.length !== videoUrls.length) {
      return NextResponse.json({ success: false, error: 'Some video URLs are invalid' }, { status: 400 });
    }

    const taskId = nanoid();
    console.log('\n🎬 ========== Direct Video Merge ==========');
    console.log('📝 Task ID:', taskId);
    console.log('📼 Video URLs to merge:', validUrls.length);

    // 调用合并服务
    const result = await mergeVideosWithRetry(validUrls, taskId);

    if (!result.success || !result.mergedUrl) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Video merge failed'
      }, { status: 500 });
    }

    console.log('✅ Merged video URL:', result.mergedUrl);

    return NextResponse.json({
      success: true,
      videoUrl: result.mergedUrl,
    });
  } catch (error) {
    console.error('Merge direct error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
