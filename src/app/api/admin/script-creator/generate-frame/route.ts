/**
 * 生成首帧图 API
 * POST /api/admin/script-creator/generate-frame
 */

import { NextRequest, NextResponse } from 'next/server';

import { getAuth } from '@/core/auth';
import { generateSceneFrame } from '@/shared/services/custom-script';

interface GenerateFrameRequest {
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

    const body: GenerateFrameRequest = await request.json();
    const { scriptId, sceneId } = body;

    if (!scriptId || !sceneId) {
      return NextResponse.json({ success: false, error: 'Missing scriptId or sceneId' }, { status: 400 });
    }

    // 异步启动生成任务（不等待完成）
    // 注意：这里直接调用 service 层，它会更新数据库状态
    generateSceneFrame(sceneId, scriptId, userId).catch(error => {
      console.error('Generate frame error (async):', error);
    });

    return NextResponse.json({
      success: true,
      message: 'Frame generation started',
    });
  } catch (error) {
    console.error('Generate frame error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
