/**
 * Custom Script Detail API
 * GET /api/custom-script/[scriptId] - 获取剧本详情
 * PUT /api/custom-script/[scriptId] - 保存剧本
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/core/auth';
import { headers } from 'next/headers';
import { getCustomScript, saveScript } from '@/shared/services/custom-script';

interface RouteContext {
  params: Promise<{ scriptId: string }>;
}

/**
 * GET /api/custom-script/[scriptId]
 * 获取剧本详情（包含所有分镜）
 */
export async function GET(request: NextRequest, context: RouteContext) {
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

    // 获取剧本详情
    const data = await getCustomScript(scriptId, userId);

    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Script not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      script: {
        id: data.script.id,
        status: data.script.status,
        petImageUrl: data.script.petImageUrl,
        userPrompt: data.script.userPrompt,
        musicPrompt: data.script.musicPrompt,
        durationSeconds: data.script.durationSeconds,
        aspectRatio: data.script.aspectRatio,
        storyTitle: data.script.storyTitle,
        finalVideoUrl: data.script.finalVideoUrl,
        creditsUsed: data.script.creditsUsed,
        createdAt: data.script.createdAt.toISOString(),
        updatedAt: data.script.updatedAt.toISOString(),
        scenes: data.scenes.map((scene) => ({
          id: scene.id,
          sceneNumber: scene.sceneNumber,
          prompt: scene.prompt,
          description: scene.description,
          descriptionEn: scene.descriptionEn,
          frameStatus: scene.frameStatus,
          frameImageUrl: scene.frameImageUrl,
          frameProgress: scene.frameProgress,
          videoStatus: scene.videoStatus,
          videoUrl: scene.videoUrl,
          videoProgress: scene.videoProgress,
        })),
      },
    });
  } catch (error) {
    console.error('Get custom script error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get script',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/custom-script/[scriptId]
 * 保存剧本（关闭弹窗时调用）
 */
export async function PUT(request: NextRequest, context: RouteContext) {
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
    const data = await getCustomScript(scriptId, userId);
    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Script not found' },
        { status: 404 }
      );
    }

    // 保存剧本
    await saveScript(scriptId);

    return NextResponse.json({
      success: true,
      message: 'Script saved',
    });
  } catch (error) {
    console.error('Save custom script error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save script',
      },
      { status: 500 }
    );
  }
}
