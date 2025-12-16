/**
 * Dashboard Feed API
 * 获取社区公开作品或用户自己的作品
 */

import { NextRequest } from 'next/server';
import { desc, eq, and, or, isNull, sql } from 'drizzle-orm';

import { db } from '@/core/db';
import { aiTask, user as userTable } from '@/config/db/schema';
import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tab = searchParams.get('tab') || 'all'; // all | mine
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const type = searchParams.get('type'); // video | image | all

    // 获取当前用户（可以为空，未登录用户只能查看公开作品）
    const user = await getUserInfo();

    // "我的作品" tab 需要登录
    if (tab === 'mine' && !user) {
      return respErr('no auth, please sign in');
    }

    // 构建查询条件
    // 同时包含 success 和 completed 状态（视频生成完成后状态可能是 completed）
    let whereConditions: any[] = [
      or(eq(aiTask.status, 'success'), eq(aiTask.status, 'completed')),
      isNull(aiTask.deletedAt), // 不显示已删除的
    ];

    if (tab === 'all') {
      // 社区公开作品（无需登录）
      whereConditions.push(eq(aiTask.isPublic, true));
    } else if (tab === 'mine' && user) {
      // 用户自己的作品(包括公开和私密)
      whereConditions.push(eq(aiTask.userId, user.id));
    }

    // 类型筛选
    if (type && type !== 'all') {
      whereConditions.push(eq(aiTask.mediaType, type));
    }

    // 查询数据库 - 使用 LEFT JOIN 一次性获取用户信息，避免 N+1 查询
    // 排序规则:
    // - "all" tab: 登录用户的作品优先（按时间），然后其他公开作品（按点赞数）
    // - "mine" tab: 按时间倒序
    const query = db()
      .select({
        id: aiTask.id,
        userId: aiTask.userId,
        mediaType: aiTask.mediaType,
        model: aiTask.model,
        prompt: aiTask.prompt,
        status: aiTask.status,
        createdAt: aiTask.createdAt,
        finalVideoUrl: aiTask.finalVideoUrl,
        watermarkedVideoUrl: aiTask.watermarkedVideoUrl,
        originalVideoUrl: aiTask.originalVideoUrl, // 原始视频 URL（Pro 用户用）
        finalImageUrl: aiTask.finalImageUrl, // R2 存储的图片 URL
        taskResult: aiTask.taskResult, // 图片结果存储在此字段（备用）
        aspectRatio: aiTask.aspectRatio,
        options: aiTask.options, // 生成选项（包含 aspectRatio）
        likeCount: aiTask.likeCount,
        isPublic: aiTask.isPublic,
        promptHidden: aiTask.promptHidden, // 是否隐藏提示词
        scene: aiTask.scene, // 场景类型：custom-script / pet-video-generation 等
        // 视频占位图字段
        petImageUrl: aiTask.petImageUrl, // 用户上传的图片
        frameImageUrl: aiTask.frameImageUrl, // 生成的首帧图
        // 用户信息通过 JOIN 获取
        userName: userTable.name,
      })
      .from(aiTask)
      .leftJoin(userTable, eq(aiTask.userId, userTable.id))
      .where(and(...whereConditions));

    // 根据 tab 和登录状态决定排序
    // 社区 tab 排序策略：综合考虑时间和点赞数，让新作品也能被看到
    // 使用时间衰减算法：score = likes + timeBonus，timeBonus 随时间衰减
    let tasks;
    if (tab === 'all' && user) {
      // 社区 tab + 已登录: 用户自己的作品优先，然后综合排序
      tasks = await query
        .orderBy(
          // 先按是否是当前用户的作品排序（用户自己的排前面）
          sql`CASE WHEN ${aiTask.userId} = ${user.id} THEN 0 ELSE 1 END`,
          // 用户自己的作品按时间倒序
          sql`CASE WHEN ${aiTask.userId} = ${user.id} THEN ${aiTask.createdAt} END DESC`,
          // 其他作品：综合点赞和时间排序（24小时内新作品权重最高，7天内次之）
          sql`(${aiTask.likeCount} + CASE
            WHEN ${aiTask.createdAt} > NOW() - INTERVAL '24 hours' THEN 50
            WHEN ${aiTask.createdAt} > NOW() - INTERVAL '7 days' THEN 10
            ELSE 0 END) DESC`,
          desc(aiTask.createdAt)
        )
        .limit(limit)
        .offset(offset);
    } else if (tab === 'all') {
      // 社区 tab + 未登录: 综合点赞和时间排序（新作品有权重加成）
      tasks = await query
        .orderBy(
          // 24小时内新作品权重最高，7天内次之，让新内容能被发现
          sql`(${aiTask.likeCount} + CASE
            WHEN ${aiTask.createdAt} > NOW() - INTERVAL '24 hours' THEN 50
            WHEN ${aiTask.createdAt} > NOW() - INTERVAL '7 days' THEN 10
            ELSE 0 END) DESC`,
          desc(aiTask.createdAt)
        )
        .limit(limit)
        .offset(offset);
    } else {
      // 我的作品 tab: 按时间倒序
      tasks = await query
        .orderBy(desc(aiTask.createdAt))
        .limit(limit)
        .offset(offset);
    }

    // 转换为 FeedItem 格式（无需额外数据库查询）
    const items = tasks.map((task) => {
      // 确定使用哪个URL
      // 优先级：R2 存储的 URL > Provider 返回的临时 URL
      let mediaUrl = '';
      if (task.mediaType === 'video') {
        // 视频：优先水印版本，其次最终版本，最后原始版本
        mediaUrl = task.watermarkedVideoUrl || task.finalVideoUrl || task.originalVideoUrl || '';
      } else {
        // 图片：优先 R2 存储的 URL，其次从 taskResult 中提取
        if (task.finalImageUrl) {
          // R2 存储的永久 URL
          mediaUrl = task.finalImageUrl;
        } else {
          // 备用：从 taskResult 中提取 Provider 的临时 URL
          try {
            const taskResult = task.taskResult;
            if (taskResult) {
              const result = JSON.parse(taskResult);
              // 根据不同 provider 提取图片 URL
              if (result.results && Array.isArray(result.results)) {
                // Evolink/Doubao 格式
                mediaUrl = result.results[0];
              } else if (result.output) {
                // Replicate 格式
                mediaUrl =
                  typeof result.output === 'string'
                    ? result.output
                    : result.output[0];
              } else if (result.images && Array.isArray(result.images)) {
                // Gemini 格式
                mediaUrl = result.images[0]?.url || result.images[0];
              } else if (result.url) {
                // 直接 URL 格式
                mediaUrl = result.url;
              }
            }
          } catch (e) {
            console.warn('Failed to parse task result:', e);
          }
        }
      }

      // 计算宽高比
      // 优先从 aspectRatio 字段读取，否则从 options JSON 中解析
      let aspectRatio = 16 / 9; // 默认
      let aspectRatioStr = task.aspectRatio;

      // 如果 aspectRatio 字段为空，尝试从 options 中获取
      if (!aspectRatioStr && task.options) {
        try {
          let options = typeof task.options === 'string'
            ? JSON.parse(task.options)
            : task.options;
          // 处理双重 JSON 编码的情况
          if (typeof options === 'string') {
            options = JSON.parse(options);
          }
          aspectRatioStr = options.aspectRatio;
        } catch (e) {
          // 解析失败，使用默认值
        }
      }

      if (aspectRatioStr) {
        const [width, height] = aspectRatioStr
          .split(':')
          .map((n: string) => parseInt(n));
        if (width && height) {
          aspectRatio = width / height;
        }
      }

      // 判断是否是当前用户的作品（未登录用户为 false）
      const isOwner = user ? task.userId === user.id : false;

      // 处理提示词隐藏逻辑：如果提示词被隐藏且不是作品所有者，则不返回提示词
      const shouldHidePrompt = task.promptHidden && !isOwner;
      const displayPrompt = shouldHidePrompt ? undefined : task.prompt;

      return {
        id: task.id,
        type: task.mediaType as 'image' | 'video',
        src: mediaUrl,
        alt: shouldHidePrompt ? 'AI Generated' : task.prompt?.slice(0, 100) || 'AI Generated',
        username: task.userName || 'Unknown',
        userId: task.userId,
        likes: task.likeCount || 0,
        prompt: displayPrompt,
        aspectRatio,
        // 视频占位图：优先用户上传的图片，其次生成的首帧图
        inputImage: task.petImageUrl || undefined,
        videoThumbnail: task.frameImageUrl || undefined,
        isLiked: false, // TODO: 查询当前用户是否点赞
        model: task.model,
        scene: task.scene, // 场景类型：custom-script = create-pet-movie 生成的视频
        createdAt: task.createdAt.toISOString(),
        promptHidden: task.promptHidden, // 是否隐藏提示词
        isOwner, // 是否是当前用户的作品
        isPublic: task.isPublic ?? true, // 是否公开分享（默认 true）
      };
    });

    // 过滤掉没有媒体 URL 的项目
    const validItems = items.filter((item) => item.src);

    // hasMore 应该基于数据库返回的原始数量，而不是过滤后的数量
    // 这样即使有些数据被过滤，也会继续加载更多
    return respData({
      items: validItems,
      total: validItems.length,
      hasMore: tasks.length >= limit, // 使用原始查询数量判断
    });
  } catch (error) {
    console.error('Feed API error:', error);
    return respErr('Failed to fetch feed');
  }
}
