/**
 * Custom Script Scene Video API
 * POST /api/custom-script/[scriptId]/scene/[sceneId]/video - 生成视频
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/core/auth';
import { headers } from 'next/headers';
import {
  generateSceneVideo,
  getCustomScript,
  getScene,
  CUSTOM_SCRIPT_CREDITS,
} from '@/shared/services/custom-script';
import { getRemainingCredits, consumeCredits } from '@/shared/models/credit';

interface RouteContext {
  params: Promise<{ scriptId: string; sceneId: string }>;
}

/**
 * POST /api/custom-script/[scriptId]/scene/[sceneId]/video
 * 生成分镜视频
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { scriptId, sceneId } = await context.params;

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

    // 验证分镜存在且首帧图已完成
    const scene = await getScene(sceneId, scriptId);
    if (!scene) {
      return NextResponse.json(
        { success: false, error: 'Scene not found' },
        { status: 404 }
      );
    }

    if (scene.frameStatus !== 'completed' || !scene.frameImageUrl) {
      return NextResponse.json(
        { success: false, error: 'Frame image must be generated first' },
        { status: 400 }
      );
    }

    // 防止重复生成：检查是否已经在生成中
    if (scene.videoStatus === 'generating') {
      return NextResponse.json(
        { success: false, error: 'Video is already being generated' },
        { status: 409 } // Conflict
      );
    }

    // 检查用户积分是否足够
    const userCredits = await getRemainingCredits(userId);
    if (userCredits < CUSTOM_SCRIPT_CREDITS.VIDEO) {
      return NextResponse.json(
        {
          success: false,
          error: 'Insufficient credits',
          required: CUSTOM_SCRIPT_CREDITS.VIDEO,
          available: userCredits,
        },
        { status: 402 }
      );
    }

    // 扣除积分
    await consumeCredits({
      userId,
      credits: CUSTOM_SCRIPT_CREDITS.VIDEO,
      scene: 'custom-script-video',
      description: `Custom script video generation - Scene ${sceneId}`,
    });

    // 异步生成视频（不阻塞响应）
    // 前端会轮询状态
    generateSceneVideo(sceneId, scriptId, userId).catch((error) => {
      console.error('Background video generation error:', error);
    });

    return NextResponse.json({
      success: true,
      message: 'Video generation started',
      creditsUsed: CUSTOM_SCRIPT_CREDITS.VIDEO,
    });
  } catch (error) {
    console.error('Generate scene video error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start video generation',
      },
      { status: 500 }
    );
  }
}
