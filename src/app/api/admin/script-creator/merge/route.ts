/**
 * 合并视频 API
 * POST /api/admin/script-creator/merge
 */

import { NextRequest, NextResponse } from 'next/server';

import { getAuth } from '@/core/auth';
import { mergeScriptVideos } from '@/shared/services/custom-script';

interface MergeRequest {
  scriptId: string;
}

export async function POST(request: NextRequest) {
  try {
    // 验证用户登录
    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    // TODO: 验证管理员权限

    const body: MergeRequest = await request.json();
    const { scriptId } = body;

    if (!scriptId) {
      return NextResponse.json({ success: false, error: 'Missing scriptId' }, { status: 400 });
    }

    // 调用合并服务
    const videoUrl = await mergeScriptVideos(scriptId, userId);

    return NextResponse.json({
      success: true,
      videoUrl,
    });
  } catch (error) {
    console.error('Merge videos error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
