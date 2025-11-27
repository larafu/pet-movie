/**
 * Custom Script Merge API
 * POST /api/custom-script/[scriptId]/merge - 合并所有分镜视频
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/core/auth';
import { headers } from 'next/headers';
import {
  mergeScriptVideos,
  getCustomScript,
} from '@/shared/services/custom-script';

interface RouteContext {
  params: Promise<{ scriptId: string }>;
}

/**
 * POST /api/custom-script/[scriptId]/merge
 * 合并剧本的所有分镜视频
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { scriptId } = await context.params;

    // 获取当前用户
    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // 验证剧本所有权
    const scriptData = await getCustomScript(scriptId, userId);
    if (!scriptData) {
      return NextResponse.json(
        { success: false, error: 'Script not found' },
        { status: 404 }
      );
    }

    // 检查是否所有分镜视频都已完成
    const incompleteScenes = scriptData.scenes.filter(
      (scene) => scene.videoStatus !== 'completed' || !scene.videoUrl
    );

    if (incompleteScenes.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'All scene videos must be completed before merging',
          incompleteScenes: incompleteScenes.map((s) => ({
            id: s.id,
            sceneNumber: s.sceneNumber,
            videoStatus: s.videoStatus,
          })),
        },
        { status: 400 }
      );
    }

    // 异步合并视频（不阻塞响应）
    // 前端会轮询剧本状态
    mergeScriptVideos(scriptId, userId).catch((error) => {
      console.error('Background video merge error:', error);
    });

    return NextResponse.json({
      success: true,
      message: 'Video merge started',
    });
  } catch (error) {
    console.error('Merge scene videos error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start video merge',
      },
      { status: 500 }
    );
  }
}
