/**
 * User Media Item API
 * DELETE /api/user-media/[id] - 删除资源
 */

import { eq, and } from 'drizzle-orm';

import { getAuth } from '@/core/auth';
import { db } from '@/core/db';
import { userMedia } from '@/config/db/schema';
import { respOk, respErr } from '@/shared/lib/resp';

/**
 * DELETE /api/user-media/[id]
 * 删除用户资源（软删除）
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user?.id) {
      return respErr('Unauthorized');
    }

    const { id } = await params;

    if (!id) {
      return respErr('Media ID is required');
    }

    // 查找资源
    const [media] = await db()
      .select()
      .from(userMedia)
      .where(
        and(
          eq(userMedia.id, id),
          eq(userMedia.userId, session.user.id),
          eq(userMedia.status, 'active')
        )
      )
      .limit(1);

    if (!media) {
      return respErr('Media not found');
    }

    // 软删除：更新状态
    await db()
      .update(userMedia)
      .set({
        status: 'deleted',
        deletedAt: new Date(),
      })
      .where(eq(userMedia.id, id));

    // 注意：存储服务目前不支持删除文件
    // 如需硬删除，需要扩展 StorageManager 添加 deleteFile 方法

    return respOk();
  } catch (e) {
    console.error('[User Media] DELETE error:', e);
    return respErr('Delete failed');
  }
}
