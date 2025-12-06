/**
 * Custom Script Scene API
 * GET /api/custom-script/[scriptId]/scene/[sceneId] - 获取分镜状态
 * PUT /api/custom-script/[scriptId]/scene/[sceneId] - 更新分镜提示词
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/core/auth';
import { headers } from 'next/headers';
import {
  getSceneStatus,
  updateScenePrompt,
} from '@/shared/services/custom-script';

interface RouteContext {
  params: Promise<{ scriptId: string; sceneId: string }>;
}

/**
 * GET /api/custom-script/[scriptId]/scene/[sceneId]
 * 获取分镜状态（用于轮询）
 */
export async function GET(request: NextRequest, context: RouteContext) {
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

    // 获取分镜状态
    const status = await getSceneStatus(sceneId, scriptId, userId);

    if (!status) {
      return NextResponse.json(
        { success: false, error: 'Scene not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      scene: status,
    });
  } catch (error) {
    console.error('Get scene status error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get scene status',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/custom-script/[scriptId]/scene/[sceneId]
 * 更新分镜提示词
 */
export async function PUT(request: NextRequest, context: RouteContext) {
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

    // 解析请求体
    const body = await request.json();
    const { prompt } = body;

    if (!prompt) {
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // 更新提示词
    const success = await updateScenePrompt(sceneId, scriptId, userId, prompt);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Scene not found or unauthorized' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Prompt updated',
    });
  } catch (error) {
    console.error('Update scene prompt error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update prompt',
      },
      { status: 500 }
    );
  }
}
