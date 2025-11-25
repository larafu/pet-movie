/**
 * Pet Video Task Status API
 * GET /api/pet-video/status/[taskId]
 *
 * Query the status of a pet video generation task
 */

import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { getAuth } from '@/core/auth';
import { getPetVideoTaskStatus } from '@/shared/services/pet-video/service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { taskId } = await params;

    // Set user context for Sentry
    Sentry.setUser({ id: session.user.id });

    const taskStatus = await getPetVideoTaskStatus(taskId, session.user.id);

    if (!taskStatus) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      task: taskStatus,
    });
  } catch (error) {
    console.error('Get task status error:', error);

    // Capture exception in Sentry
    const { taskId } = await params;
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/pet-video/status',
        taskId,
      },
      level: 'error',
    });

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to get status',
      },
      { status: 500 }
    );
  }
}
