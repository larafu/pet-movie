/**
 * Pet Video Generation API V2 - Rainbow Bridge Template
 * POST /api/pet-video/generate-v2
 *
 * 新版视频生成流程：
 * 1. 验证用户积分（15积分）
 * 2. 预扣积分（实际消费，失败时退还）
 * 3. 生成角色参考卡
 * 4. 并发生成4个首帧图（首帧完成即触发对应视频生成）
 * 5. 合并视频 + 加水印
 * 6. 失败时退还积分
 */

import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { getAuth } from '@/core/auth';
import { getVideoTemplate } from '@/config/video-templates';
import {
  createRainbowBridgeTask,
  executeRainbowBridgeGeneration,
} from '@/shared/services/rainbow-bridge/service';
import { getRemainingCredits, consumeCredits } from '@/shared/models/credit';

export async function POST(request: NextRequest) {
  try {
    console.log('\n🌈 ========== Rainbow Bridge Generate API V2 ==========');

    // 验证用户登录
    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      console.error('❌ [Generate V2] Unauthorized - no session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    console.log('✅ [Generate V2] User authenticated:', userId);

    // 解析请求
    const body = await request.json();
    const { petType, petImageUrl, aspectRatio = '16:9' } = body;

    console.log('📦 [Generate V2] Request:', { petType, petImageUrl: petImageUrl?.substring(0, 50), aspectRatio });

    // Set Sentry context
    Sentry.setUser({ id: userId });
    Sentry.addBreadcrumb({
      category: 'api',
      message: 'Rainbow Bridge generation API called',
      level: 'info',
      data: { petType, aspectRatio },
    });

    // 验证输入
    if (!petType || !['dog', 'cat'].includes(petType)) {
      return NextResponse.json(
        { error: 'Invalid pet type. Must be "dog" or "cat"' },
        { status: 400 }
      );
    }

    if (!petImageUrl) {
      return NextResponse.json(
        { error: 'Pet image URL is required' },
        { status: 400 }
      );
    }

    if (!['16:9', '9:16'].includes(aspectRatio)) {
      return NextResponse.json(
        { error: 'Invalid aspect ratio. Must be "16:9" or "9:16"' },
        { status: 400 }
      );
    }

    // 获取模板和积分要求
    const template = getVideoTemplate(petType);
    const creditsRequired = template.creditsRequired;

    // 检查用户积分
    const userCredits = await getRemainingCredits(userId);
    console.log('💰 [Generate V2] Credits - Required:', creditsRequired, ', Available:', userCredits);

    if (userCredits < creditsRequired) {
      return NextResponse.json(
        {
          success: false,
          error: 'Insufficient credits',
          required: creditsRequired,
          available: userCredits,
        },
        { status: 402 }
      );
    }

    // 预扣积分（先消费，失败时退还）
    await consumeCredits({
      userId,
      credits: creditsRequired,
      scene: 'rainbow-bridge-video',
      description: `Rainbow Bridge ${petType} video generation`,
    });
    console.log('💰 [Generate V2] Credits consumed:', creditsRequired);

    // 创建任务
    const taskId = await createRainbowBridgeTask({
      userId,
      petType,
      petImageUrl,
      aspectRatio: aspectRatio as '16:9' | '9:16',
      creditsRequired,
    });

    console.log('📝 [Generate V2] Task created:', taskId);

    // 启动异步生成（不等待）
    executeRainbowBridgeGeneration(taskId).catch((error) => {
      console.error(`❌ [Generate V2] Background error for task ${taskId}:`, error);
      Sentry.captureException(error, {
        tags: {
          endpoint: '/api/pet-video/generate-v2',
          taskId,
        },
      });
    });

    return NextResponse.json({
      success: true,
      taskId,
      message: 'Rainbow Bridge video generation started',
      creditsReserved: creditsRequired,
    });
  } catch (error) {
    console.error('❌ [Generate V2] API error:', error);

    Sentry.captureException(error, {
      tags: { endpoint: '/api/pet-video/generate-v2' },
      level: 'error',
    });

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    );
  }
}
