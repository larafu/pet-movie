/**
 * Custom Script API - 创建剧本 / 获取剧本列表
 * POST /api/custom-script - 创建新剧本
 * GET /api/custom-script - 获取用户剧本列表
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/core/auth';
import { headers } from 'next/headers';
import {
  createCustomScript,
  getUserScripts,
  generateSceneFrame,
  CUSTOM_SCRIPT_CREDITS,
} from '@/shared/services/custom-script';
import { getRemainingCredits, consumeCredits } from '@/shared/models/credit';

/**
 * POST /api/custom-script
 * 创建新的自定义剧本
 */
export async function POST(request: NextRequest) {
  try {
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

    // 解析请求体
    const body = await request.json();
    const { petImageUrl, userPrompt, musicPrompt, durationSeconds, aspectRatio, styleId, customStyle } = body;

    // 验证必填字段
    if (!petImageUrl || !userPrompt || !durationSeconds || !aspectRatio) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 验证自定义风格
    if (styleId === 'custom' && !customStyle) {
      return NextResponse.json(
        { success: false, error: 'Custom style text is required when using custom style' },
        { status: 400 }
      );
    }

    // 验证时长
    if (durationSeconds !== 60 && durationSeconds !== 120) {
      return NextResponse.json(
        { success: false, error: 'Duration must be 60 or 120 seconds' },
        { status: 400 }
      );
    }

    // 验证比例
    if (aspectRatio !== '16:9' && aspectRatio !== '9:16') {
      return NextResponse.json(
        { success: false, error: 'Aspect ratio must be 16:9 or 9:16' },
        { status: 400 }
      );
    }

    // 检查用户积分是否足够（初始化需要15积分）
    const userCredits = await getRemainingCredits(userId);
    if (userCredits < CUSTOM_SCRIPT_CREDITS.INIT) {
      return NextResponse.json(
        {
          success: false,
          error: 'Insufficient credits',
          required: CUSTOM_SCRIPT_CREDITS.INIT,
          available: userCredits,
        },
        { status: 402 }
      );
    }

    // 扣除初始化积分
    await consumeCredits({
      userId,
      credits: CUSTOM_SCRIPT_CREDITS.INIT,
      scene: 'custom-script-init',
      description: 'Custom script initialization - Gemini scene generation',
    });

    // 创建剧本
    const result = await createCustomScript(userId, {
      petImageUrl,
      userPrompt,
      musicPrompt,
      durationSeconds,
      aspectRatio,
      styleId: styleId || 'pixar-3d',
      customStyle,
    });

    // 自动开始生成第一个分镜的首帧图（异步，不阻塞响应）
    // 这可以鼓励用户继续创作
    if (result.scenes && result.scenes.length > 0) {
      const firstScene = result.scenes[0];

      // 先扣除首帧图的积分
      try {
        await consumeCredits({
          userId,
          credits: CUSTOM_SCRIPT_CREDITS.FRAME,
          scene: 'custom-script-frame',
          description: `Custom script frame generation - Scene ${firstScene.id} (auto)`,
        });

        // 异步生成首帧图
        generateSceneFrame(firstScene.id, result.scriptId, userId).catch((error) => {
          console.error('Auto generate first frame error:', error);
        });
      } catch (creditError) {
        // 积分扣除失败不影响剧本创建
        console.error('Failed to consume credits for first frame:', creditError);
      }
    }

    return NextResponse.json({
      success: true,
      scriptId: result.scriptId,
      title: result.title,
      scenes: result.scenes,
      creditsUsed: CUSTOM_SCRIPT_CREDITS.INIT + CUSTOM_SCRIPT_CREDITS.FRAME, // 包含首帧图的积分
    });
  } catch (error) {
    console.error('Create custom script error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create script',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/custom-script
 * 获取用户的剧本列表
 */
export async function GET(request: NextRequest) {
  try {
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

    // 获取分页参数
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // 获取剧本列表
    const scripts = await getUserScripts(userId, limit);

    return NextResponse.json({
      success: true,
      scripts: scripts.map((script) => ({
        id: script.id,
        status: script.status,
        storyTitle: script.storyTitle,
        durationSeconds: script.durationSeconds,
        aspectRatio: script.aspectRatio,
        creditsUsed: script.creditsUsed,
        createdAt: script.createdAt.toISOString(),
        updatedAt: script.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Get custom scripts error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get scripts',
      },
      { status: 500 }
    );
  }
}
