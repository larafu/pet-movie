import { respData, respErr } from '@/shared/lib/resp';
import { grantFreeTrialCredit } from '@/shared/models/credit';
import { getUserInfo } from '@/shared/models/user';

/**
 * Initialize new user - grant free trial credits
 * This endpoint should be called after user signs up/signs in
 */
export async function POST(request: Request) {
  try {
    // Get current user
    const user = await getUserInfo();
    if (!user) {
      throw new Error('Not authenticated');
    }

    // Grant free trial credits (function checks if already granted)
    const result = await grantFreeTrialCredit(user.id);

    if (result) {
      return respData({
        success: true,
        message: 'Free trial credits granted',
        credits: 5,
      });
    } else {
      return respData({
        success: false,
        message: 'Free trial already claimed',
      });
    }
  } catch (e: any) {
    console.error('User init failed:', e);
    return respErr(e.message);
  }
}
