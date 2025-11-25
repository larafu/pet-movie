/**
 * Pet Video History API
 * GET /api/pet-video/history
 *
 * Get user's pet video generation history
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/core/auth';
import { getUserPetVideoHistory } from '@/shared/services/pet-video/service';

export async function GET(request: NextRequest) {
  try {
    console.log('\n📜 ========== GET Pet Video History API Called ==========');

    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      console.log('❌ [History API] Unauthorized - no session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ [History API] User authenticated:', session.user.id);

    // Get pagination params from query string
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    console.log('📊 [History API] Query params - limit:', limit, 'offset:', offset);

    const history = await getUserPetVideoHistory(
      session.user.id,
      limit,
      offset
    );

    console.log('📦 [History API] Found', history.length, 'videos');
    console.log('📋 [History API] Videos:', JSON.stringify(history, null, 2));

    return NextResponse.json({
      success: true,
      videos: history,
      pagination: {
        limit,
        offset,
        total: history.length,
      },
    });
  } catch (error) {
    console.error('Get video history error:', error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to get history',
      },
      { status: 500 }
    );
  }
}
