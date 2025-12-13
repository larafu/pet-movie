import { PERMISSIONS } from '@/core/rbac';
import { respData, respErr } from '@/shared/lib/resp';
import { getRemainingCredits } from '@/shared/models/credit';
import { getUserInfo } from '@/shared/models/user';
import { getCurrentSubscription, SubscriptionStatus } from '@/shared/models/subscription';
import { hasPermission, isSuperAdmin } from '@/shared/services/rbac';

export async function POST(req: Request) {
  try {
    // 获取登录用户信息
    const user = await getUserInfo();
    if (!user) {
      return respErr('no auth, please sign in');
    }

    // 检查是否是管理员
    const isAdmin = await hasPermission(user.id, PERMISSIONS.ADMIN_ACCESS);

    // 检查是否是超级管理员
    const isSuperAdminUser = await isSuperAdmin(user.id);

    // 获取剩余积分
    const remainingCredits = await getRemainingCredits(user.id);

    // 获取当前订阅信息
    const subscription = await getCurrentSubscription(user.id);
    const hasActiveSubscription = subscription && [
      SubscriptionStatus.ACTIVE,
      SubscriptionStatus.TRIALING,
    ].includes(subscription.status as SubscriptionStatus);

    return respData({
      ...user,
      isAdmin,
      isSuperAdmin: isSuperAdminUser,
      credits: { remainingCredits },
      subscription: subscription ? {
        status: subscription.status,
        planName: subscription.planName,
        currentPeriodEnd: subscription.currentPeriodEnd,
      } : null,
      isPro: hasActiveSubscription,
    });
  } catch (e) {
    console.log('get user info failed:', e);
    return respErr('get user info failed');
  }
}
