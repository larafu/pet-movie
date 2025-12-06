/**
 * Custom Script Scene Frame API
 * POST /api/custom-script/[scriptId]/scene/[sceneId]/frame - 生成首帧图
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/core/auth';
import { headers } from 'next/headers';
import {
  generateSceneFrame,
  getCustomScript,
  CUSTOM_SCRIPT_CREDITS,
} from '@/shared/services/custom-script';
import { getRemainingCredits, consumeCredits } from '@/shared/models/credit';

interface RouteContext {
  params: Promise<{ scriptId: string; sceneId: string }>;
}

/**
 * POST /api/custom-script/[scriptId]/scene/[sceneId]/frame
 * 生成分镜首帧图
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

    // 检查场景是否存在
    const scene = scriptData.scenes.find((s) => s.id === sceneId);
    if (!scene) {
      return NextResponse.json(
        { success: false, error: 'Scene not found' },
        { status: 404 }
      );
    }

    // 防止重复生成：检查是否已经在生成中
    if (scene.frameStatus === 'generating') {
      return NextResponse.json(
        { success: false, error: 'Frame is already being generated' },
        { status: 409 } // Conflict
      );
    }

    // 检查用户积分是否足够
    const userCredits = await getRemainingCredits(userId);
    if (userCredits < CUSTOM_SCRIPT_CREDITS.FRAME) {
      return NextResponse.json(
        {
          success: false,
          error: 'Insufficient credits',
          required: CUSTOM_SCRIPT_CREDITS.FRAME,
          available: userCredits,
        },
        { status: 402 }
      );
    }

    // 扣除积分
    await consumeCredits({
      userId,
      credits: CUSTOM_SCRIPT_CREDITS.FRAME,
      scene: 'custom-script-frame',
      description: `Custom script frame generation - Scene ${sceneId}`,
    });

    // 异步生成首帧图（不阻塞响应）
    // 前端会轮询状态
    generateSceneFrame(sceneId, scriptId, userId).catch((error) => {
      console.error('Background frame generation error:', error);
    });

    return NextResponse.json({
      success: true,
      message: 'Frame generation started',
      creditsUsed: CUSTOM_SCRIPT_CREDITS.FRAME,
    });
  } catch (error) {
    console.error('Generate scene frame error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start frame generation',
      },
      { status: 500 }
    );
  }
}
