/**
 * 社区服务
 * Community service for sharing and liking AI generated content
 */

import { db } from '@/core/db';
import { communityShare, communityLike, aiTask, user } from '@/config/db/schema';
import { eq, and, desc, sql, inArray, isNull } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import * as Sentry from '@sentry/nextjs';
import type {
  CreateShareRequest,
  ShareResponse,
  GetSharesRequest,
  LikeRequest,
  LikeResponse,
  ShareStatType,
} from './types';

/**
 * 自动生成分享标题
 * Auto-generate share title from AI task
 */
function generateShareTitle(task: any): string {
  const templateType = task.templateType || 'pet';
  const duration = task.durationSeconds || 25;
  const petType = templateType === 'dog' ? 'Dog' : templateType === 'cat' ? 'Cat' : 'Pet';

  // 生成标题：Christmas Dog Rescue - 25s
  return `Christmas ${petType} Rescue - ${duration}s`;
}

/**
 * 创建分享
 * Create a new share (title is optional, will be auto-generated if not provided)
 */
export async function createShare(
  userId: string,
  request: CreateShareRequest
): Promise<ShareResponse> {
  const database = db();
  try {
    // 检查AI任务是否存在且属于该用户
    const [task] = await database
      .select()
      .from(aiTask)
      .where(eq(aiTask.id, request.aiTaskId))
      .limit(1);

    if (!task) {
      throw new Error('AI task not found');
    }

    if (task.userId !== userId) {
      throw new Error('You do not have permission to share this task');
    }

    if (task.status !== 'completed') {
      throw new Error('Only completed tasks can be shared');
    }

    // 检查是否已经分享过
    const [existingShare] = await database
      .select()
      .from(communityShare)
      .where(eq(communityShare.aiTaskId, request.aiTaskId))
      .limit(1);

    if (existingShare) {
      throw new Error('This task has already been shared');
    }

    // 自动生成标题（如果未提供）
    const title = request.title || generateShareTitle(task);

    // 创建分享记录
    const shareId = nanoid();
    await database
      .insert(communityShare)
      .values({
        id: shareId,
        aiTaskId: request.aiTaskId,
        userId,
        title,
        description: request.description || null,
        isPublic: request.isPublic !== undefined ? request.isPublic : true,
        viewCount: 0,
        likeCount: 0,
        shareCount: 0,
        downloadCount: 0,
      });

    return await getShareById(shareId, userId);
  } catch (error) {
    // 监控上报不影响主逻辑
    Sentry.captureException(error, {
      tags: { service: 'community', action: 'create_share' },
      extra: { userId, request },
    });
    throw error;
  }
}

/**
 * 删除分享
 * Delete a share
 */
export async function deleteShare(
  userId: string,
  shareId: string
): Promise<boolean> {
  const database = db();
  try {
    // 检查分享是否存在且属于该用户
    const [share] = await database
      .select()
      .from(communityShare)
      .where(eq(communityShare.id, shareId))
      .limit(1);

    if (!share) {
      throw new Error('Share not found');
    }

    if (share.userId !== userId) {
      throw new Error('You do not have permission to delete this share');
    }

    // 软删除
    await database
      .update(communityShare)
      .set({
        deletedAt: new Date(),
      })
      .where(eq(communityShare.id, shareId));

    return true;
  } catch (error) {
    // 监控上报不影响主逻辑
    Sentry.captureException(error, {
      tags: { service: 'community', action: 'delete_share' },
      extra: { userId, shareId },
    });
    throw error;
  }
}

/**
 * 获取分享列表
 * Get list of shares
 */
export async function getShares(
  request: GetSharesRequest,
  currentUserId?: string
): Promise<ShareResponse[]> {
  const database = db();
  try {
    const limit = request.limit || 20;
    const offset = request.offset || 0;

    // 构建查询条件
    const conditions = [
      eq(communityShare.isPublic, true),
      isNull(communityShare.deletedAt),
    ];

    if (request.userId) {
      conditions.push(eq(communityShare.userId, request.userId));
    }

    // 构建排序
    const orderBy =
      request.sortBy === 'popular'
        ? desc(communityShare.likeCount)
        : desc(communityShare.createdAt);

    // 查询分享列表（联表查询）
    const shares = await database
      .select({
        share: communityShare,
        user: {
          id: user.id,
          name: user.name,
          image: user.image,
        },
        aiTask: {
          id: aiTask.id,
          mediaType: aiTask.mediaType,
          finalVideoUrl: aiTask.finalVideoUrl,
          frameImageUrl: aiTask.frameImageUrl,
          durationSeconds: aiTask.durationSeconds,
          aspectRatio: aiTask.aspectRatio,
        },
      })
      .from(communityShare)
      .leftJoin(user, eq(communityShare.userId, user.id))
      .leftJoin(aiTask, eq(communityShare.aiTaskId, aiTask.id))
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    // 如果有当前用户，查询点赞状态
    let likedShareIds: Set<string> = new Set();
    if (currentUserId && shares.length > 0) {
      const shareIds = shares.map((s) => s.share.id);
      const likes = await database
        .select()
        .from(communityLike)
        .where(
          and(
            eq(communityLike.userId, currentUserId),
            inArray(communityLike.shareId, shareIds)
          )
        );
      likedShareIds = new Set(likes.map((l) => l.shareId));
    }

    // 格式化响应
    return shares.map((row) => ({
      id: row.share.id,
      aiTaskId: row.share.aiTaskId,
      userId: row.share.userId,
      title: row.share.title,
      description: row.share.description,
      isPublic: row.share.isPublic,
      viewCount: row.share.viewCount,
      likeCount: row.share.likeCount,
      shareCount: row.share.shareCount,
      downloadCount: row.share.downloadCount,
      createdAt: row.share.createdAt.toISOString(),
      updatedAt: row.share.updatedAt.toISOString(),
      user: row.user
        ? {
            id: row.user.id,
            name: row.user.name,
            image: row.user.image,
          }
        : undefined,
      aiTask: row.aiTask
        ? {
            id: row.aiTask.id,
            mediaType: row.aiTask.mediaType,
            finalVideoUrl: row.aiTask.finalVideoUrl,
            frameImageUrl: row.aiTask.frameImageUrl,
            durationSeconds: row.aiTask.durationSeconds,
            aspectRatio: row.aiTask.aspectRatio,
          }
        : undefined,
      isLiked: likedShareIds.has(row.share.id),
    }));
  } catch (error) {
    // 监控上报不影响主逻辑
    Sentry.captureException(error, {
      tags: { service: 'community', action: 'get_shares' },
      extra: { request, currentUserId },
    });
    throw error;
  }
}

/**
 * 获取单个分享详情
 * Get share by ID
 */
export async function getShareById(
  shareId: string,
  currentUserId?: string
): Promise<ShareResponse> {
  const database = db();
  try {
    const [row] = await database
      .select({
        share: communityShare,
        user: {
          id: user.id,
          name: user.name,
          image: user.image,
        },
        aiTask: {
          id: aiTask.id,
          mediaType: aiTask.mediaType,
          finalVideoUrl: aiTask.finalVideoUrl,
          frameImageUrl: aiTask.frameImageUrl,
          durationSeconds: aiTask.durationSeconds,
          aspectRatio: aiTask.aspectRatio,
        },
      })
      .from(communityShare)
      .leftJoin(user, eq(communityShare.userId, user.id))
      .leftJoin(aiTask, eq(communityShare.aiTaskId, aiTask.id))
      .where(
        and(
          eq(communityShare.id, shareId),
          isNull(communityShare.deletedAt)
        )
      )
      .limit(1);

    if (!row) {
      throw new Error('Share not found');
    }

    // 检查是否点赞
    let isLiked = false;
    if (currentUserId) {
      const [like] = await database
        .select()
        .from(communityLike)
        .where(
          and(
            eq(communityLike.shareId, shareId),
            eq(communityLike.userId, currentUserId)
          )
        )
        .limit(1);
      isLiked = !!like;
    }

    return {
      id: row.share.id,
      aiTaskId: row.share.aiTaskId,
      userId: row.share.userId,
      title: row.share.title,
      description: row.share.description,
      isPublic: row.share.isPublic,
      viewCount: row.share.viewCount,
      likeCount: row.share.likeCount,
      shareCount: row.share.shareCount,
      downloadCount: row.share.downloadCount,
      createdAt: row.share.createdAt.toISOString(),
      updatedAt: row.share.updatedAt.toISOString(),
      user: row.user
        ? {
            id: row.user.id,
            name: row.user.name,
            image: row.user.image,
          }
        : undefined,
      aiTask: row.aiTask
        ? {
            id: row.aiTask.id,
            mediaType: row.aiTask.mediaType,
            finalVideoUrl: row.aiTask.finalVideoUrl,
            frameImageUrl: row.aiTask.frameImageUrl,
            durationSeconds: row.aiTask.durationSeconds,
            aspectRatio: row.aiTask.aspectRatio,
          }
        : undefined,
      isLiked,
    };
  } catch (error) {
    // 监控上报不影响主逻辑
    Sentry.captureException(error, {
      tags: { service: 'community', action: 'get_share_by_id' },
      extra: { shareId, currentUserId },
    });
    throw error;
  }
}

/**
 * 切换点赞状态
 * Toggle like status
 */
export async function toggleLike(
  userId: string,
  request: LikeRequest
): Promise<LikeResponse> {
  const database = db();
  try {
    const { shareId } = request;

    // 检查分享是否存在
    const [share] = await database
      .select()
      .from(communityShare)
      .where(
        and(
          eq(communityShare.id, shareId),
          isNull(communityShare.deletedAt)
        )
      )
      .limit(1);

    if (!share) {
      throw new Error('Share not found');
    }

    // 检查是否已点赞
    const [existingLike] = await database
      .select()
      .from(communityLike)
      .where(
        and(
          eq(communityLike.shareId, shareId),
          eq(communityLike.userId, userId)
        )
      )
      .limit(1);

    if (existingLike) {
      // 取消点赞
      await database
        .delete(communityLike)
        .where(eq(communityLike.id, existingLike.id));

      // 减少点赞数
      await database
        .update(communityShare)
        .set({
          likeCount: sql`${communityShare.likeCount} - 1`,
        })
        .where(eq(communityShare.id, shareId));

      return {
        success: true,
        isLiked: false,
        likeCount: share.likeCount - 1,
      };
    } else {
      // 添加点赞
      await database.insert(communityLike).values({
        id: nanoid(),
        shareId,
        userId,
      });

      // 增加点赞数
      await database
        .update(communityShare)
        .set({
          likeCount: sql`${communityShare.likeCount} + 1`,
        })
        .where(eq(communityShare.id, shareId));

      return {
        success: true,
        isLiked: true,
        likeCount: share.likeCount + 1,
      };
    }
  } catch (error) {
    // 监控上报不影响主逻辑
    Sentry.captureException(error, {
      tags: { service: 'community', action: 'toggle_like' },
      extra: { userId, request },
    });
    throw error;
  }
}

/**
 * 更新分享统计
 * Update share statistics
 */
export async function updateShareStats(
  shareId: string,
  statType: ShareStatType
): Promise<void> {
  const database = db();
  try {
    const fieldMap: Record<ShareStatType, keyof typeof communityShare> = {
      view: 'viewCount',
      like: 'likeCount',
      share: 'shareCount',
      download: 'downloadCount',
    };

    const field = fieldMap[statType];
    if (!field) {
      throw new Error('Invalid stat type');
    }

    await database
      .update(communityShare)
      .set({
        [field]: sql`${communityShare[field]} + 1`,
      })
      .where(eq(communityShare.id, shareId));
  } catch (error) {
    // 监控上报不影响主逻辑，统计更新失败不应该影响主流程
    Sentry.captureException(error, {
      tags: { service: 'community', action: 'update_stats' },
      extra: { shareId, statType },
      level: 'warning',
    });
  }
}
