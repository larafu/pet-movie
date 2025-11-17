import { PERMISSIONS } from '@/core/rbac';
import { respData, respErr } from '@/shared/lib/resp';
import { getRemainingCredits } from '@/shared/models/credit';
import { getUserInfo } from '@/shared/models/user';
import { hasPermission, isSuperAdmin } from '@/shared/services/rbac';

export async function POST(req: Request) {
  try {
    // get sign user info
    const user = await getUserInfo();
    if (!user) {
      return respErr('no auth, please sign in');
    }

    // check if user is admin
    const isAdmin = await hasPermission(user.id, PERMISSIONS.ADMIN_ACCESS);

    // check if user is super admin
    const isSuperAdminUser = await isSuperAdmin(user.id);

    // get remaining credits
    const remainingCredits = await getRemainingCredits(user.id);

    return respData({
      ...user,
      isAdmin,
      isSuperAdmin: isSuperAdminUser,
      credits: { remainingCredits },
    });
  } catch (e) {
    console.log('get user info failed:', e);
    return respErr('get user info failed');
  }
}
