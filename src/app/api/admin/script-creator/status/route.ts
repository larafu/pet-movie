/**
 * 查询场景状态 API
 * GET /api/admin/script-creator/status?scriptId=xxx&sceneId=xxx
 */

import { NextRequest, NextResponse } from 'next/server';

import { getAuth } from '@/core/auth';
import { getSceneStatus } from '@/shared/services/custom-script';

export async function GET(request: NextRequest) {
  try {
    // 验证用户登录
    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    const { searchParams } = new URL(request.url);
    const scriptId = searchParams.get('scriptId');
    const sceneId = searchParams.get('sceneId');

    if (!scriptId || !sceneId) {
      return NextResponse.json({ success: false, error: 'Missing scriptId or sceneId' }, { status: 400 });
    }

    const status = await getSceneStatus(sceneId, scriptId, userId);

    if (!status) {
      return NextResponse.json({ success: false, error: 'Scene not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      ...status,
    });
  } catch (error) {
    console.error('Get status error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
