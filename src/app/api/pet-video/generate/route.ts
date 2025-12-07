/**
 * Pet Video Generation API
 * POST /api/pet-video/generate
 *
 * Creates a pet video generation task and starts the async pipeline
 */

import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { getAuth } from '@/core/auth';
import {
  createPetVideoTask,
  executePetVideoGeneration,
} from '@/shared/services/pet-video/service';
import { getRemainingCredits } from '@/shared/models/credit';
import { getCreditsCost, getTemplate } from '@/shared/services/pet-video/template-loader';
import { canCreateTask } from '@/shared/services/task-limiter';

export async function POST(request: NextRequest) {
  try {
    console.error('\n🎬 ========== Pet Video Generate API Called ==========');
    console.error('[DEBUG] Route handler started');

    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      console.error('❌ [Generate API] Unauthorized - no session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('✅ [Generate API] User authenticated:', session.user.id);

    const body = await request.json();
    const { templateType, petImageUrl, durationSeconds, aspectRatio } = body;

    console.error('📦 [Generate API] Request body:', JSON.stringify(body, null, 2));
    console.error('📋 [Generate API] Extracted values:');
    console.error('   - templateType:', templateType, '(type:', typeof templateType, ')');
    console.error('   - petImageUrl:', petImageUrl, '(type:', typeof petImageUrl, ')');
    console.error('   - durationSeconds:', durationSeconds, '(type:', typeof durationSeconds, ')');
    console.error('   - aspectRatio:', aspectRatio, '(type:', typeof aspectRatio, ')');

    // Set user context for Sentry
    Sentry.setUser({ id: session.user.id });

    // Add breadcrumb for API call
    Sentry.addBreadcrumb({
      category: 'api',
      message: 'Pet video generation API called',
      level: 'info',
      data: { templateType, durationSeconds },
    });

    // Validate input
    if (!templateType || !['dog', 'cat'].includes(templateType)) {
      console.error('❌ [Generate API] Validation failed: Invalid template type');
      return NextResponse.json(
        { error: 'Invalid template type. Must be "dog" or "cat"' },
        { status: 400 }
      );
    }

    if (!petImageUrl) {
      console.error('❌ [Generate API] Validation failed: Missing pet image URL');
      return NextResponse.json(
        { error: 'Pet image URL is required' },
        { status: 400 }
      );
    }

    if (!durationSeconds || ![25, 50].includes(durationSeconds)) {
      console.error('❌ [Generate API] Validation failed: Invalid duration');
      console.error('   - Received:', durationSeconds);
      console.error('   - Expected: 25 or 50');
      return NextResponse.json(
        { error: 'Invalid duration. Must be 25 or 50 seconds' },
        { status: 400 }
      );
    }

    // Check if 50s is available (currently not)
    if (durationSeconds === 50) {
      console.error('❌ [Generate API] Validation failed: 50s not available yet');
      return NextResponse.json(
        { error: '50-second videos are coming soon' },
        { status: 400 }
      );
    }

    // Validate aspect ratio (optional parameter with default)
    const validAspectRatio = aspectRatio || '16:9';
    if (!['16:9', '9:16'].includes(validAspectRatio)) {
      console.error('❌ [Generate API] Validation failed: Invalid aspect ratio');
      console.error('   - Received:', aspectRatio);
      console.error('   - Expected: "16:9" or "9:16"');
      return NextResponse.json(
        { error: 'Invalid aspect ratio. Must be "16:9" or "9:16"' },
        { status: 400 }
      );
    }

    console.error('✅ [Generate API] All validations passed');

    // 检查并发任务限制
    const taskLimit = await canCreateTask(session.user.id);
    console.error('🔒 [Generate API] Task limit check:', taskLimit);

    if (!taskLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Concurrent task limit reached',
          code: 'CONCURRENT_LIMIT_EXCEEDED',
          currentCount: taskLimit.currentCount,
          maxAllowed: taskLimit.maxAllowed,
          planName: taskLimit.planName,
          message: `You have ${taskLimit.currentCount} tasks running. Your ${taskLimit.planName} plan allows ${taskLimit.maxAllowed} concurrent tasks. Please wait for current tasks to complete.`,
        },
        { status: 429 }
      );
    }

    // Check user credits before creating task
    const template = getTemplate(templateType);
    const creditsCost = getCreditsCost(template, durationSeconds);
    const userCredits = await getRemainingCredits(session.user.id);

    console.error('💰 [Generate API] Credits check:');
    console.error('   - Required:', creditsCost);
    console.error('   - Available:', userCredits);

    if (userCredits < creditsCost) {
      console.error('❌ [Generate API] Insufficient credits');
      return NextResponse.json(
        {
          error: 'Insufficient credits',
          required: creditsCost,
          available: userCredits,
        },
        { status: 402 } // Payment Required
      );
    }

    console.error('✅ [Generate API] Credits check passed');

    // Create task
    const taskId = await createPetVideoTask({
      userId: session.user.id,
      templateType,
      petImageUrl,
      durationSeconds,
      aspectRatio: validAspectRatio,
    });

    // Start async execution (don't await)
    executePetVideoGeneration(taskId).catch((error) => {
      console.error(`Background execution error for task ${taskId}:`, error);
      Sentry.captureException(error, {
        tags: {
          endpoint: '/api/pet-video/generate',
          taskId,
        },
      });
    });

    return NextResponse.json({
      success: true,
      taskId,
      message: 'Video generation started',
    });
  } catch (error) {
    console.error('Pet video generation API error:', error);

    // Capture exception in Sentry
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/pet-video/generate',
      },
      level: 'error',
    });

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Generation failed',
      },
      { status: 500 }
    );
  }
}
