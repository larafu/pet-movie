/**
 * 生成视频 API
 * POST /api/admin/script-creator/generate-video
 */

import { NextRequest, NextResponse } from 'next/server';

import { getAuth } from '@/core/auth';
import { generateSceneVideo } from '@/shared/services/custom-script';

interface GenerateVideoRequest {
  scriptId: string;
  sceneId: string;
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

    const body: GenerateVideoRequest = await request.json();
    const { scriptId, sceneId } = body;

    if (!scriptId || !sceneId) {
      return NextResponse.json({ success: false, error: 'Missing scriptId or sceneId' }, { status: 400 });
    }

    // 异步启动生成任务（不等待完成）
    generateSceneVideo(sceneId, scriptId, userId).catch(error => {
      console.error('Generate video error (async):', error);
    });

    return NextResponse.json({
      success: true,
      message: 'Video generation started',
    });
  } catch (error) {
    console.error('Generate video error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
