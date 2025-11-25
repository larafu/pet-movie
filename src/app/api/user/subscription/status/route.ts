/**
 * 用户订阅状态检查API
 * GET /api/user/subscription/status
 *
 * 返回用户是否有活跃的订阅（VIP状态）
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/core/auth';
import { getCurrentSubscription } from '@/shared/models/subscription';

export async function GET(request: NextRequest) {
  try {
    // 获取当前用户会话
    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 查询用户的活跃订阅
    const subscription = await getCurrentSubscription(session.user.id);

    // 如果有活跃订阅，则认为是VIP
    const hasActiveSubscription = !!subscription;

    return NextResponse.json({
      success: true,
      hasActiveSubscription,
      subscription: hasActiveSubscription
        ? {
            id: subscription.id,
            status: subscription.status,
            planName: subscription.planName,
            interval: subscription.interval,
            currentPeriodEnd: subscription.currentPeriodEnd,
          }
        : null,
    });
  } catch (error) {
    console.error('Failed to check subscription status:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to check subscription status',
      },
      { status: 500 }
    );
  }
}
