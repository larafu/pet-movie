/**
 * 并发任务限制服务
 * 根据用户订阅计划限制同时进行的任务数量
 */

import { and, count, eq, inArray } from 'drizzle-orm';

import { db } from '@/core/db';
import { aiTask } from '@/config/db/schema';
import { AITaskStatus } from '@/extensions/ai';
import {
  PLAN_CONFIGS,
  PlanConfig,
  PlanName,
  parsePlanName,
  DEFAULT_PLAN,
} from '@/config/plans';
import { getCurrentSubscription } from '@/shared/models/subscription';

/**
 * 任务限制检查结果
 */
export interface TaskLimitResult {
  // 是否允许创建新任务
  allowed: boolean;
  // 当前正在运行的任务数
  currentCount: number;
  // 计划允许的最大并发数
  maxAllowed: number;
  // 计划名称
  planName: PlanName;
  // 计划配置
  planConfig: PlanConfig;
}

/**
 * 获取用户当前正在运行的任务数量
 * 包括 pending 和 processing 状态的任务
 *
 * @param userId - 用户ID
 * @returns 正在运行的任务数量
 */
export async function getRunningTaskCount(userId: string): Promise<number> {
  const [result] = await db()
    .select({ count: count() })
    .from(aiTask)
    .where(
      and(
        eq(aiTask.userId, userId),
        inArray(aiTask.status, [AITaskStatus.PENDING, AITaskStatus.PROCESSING])
      )
    );

  return result?.count || 0;
}

/**
 * 获取用户的计划配置
 * 根据用户的当前订阅状态返回对应的计划配置
 *
 * @param userId - 用户ID
 * @returns 计划名称和配置
 */
export async function getUserPlanConfig(userId: string): Promise<{
  planName: PlanName;
  config: PlanConfig;
}> {
  // 获取用户当前有效订阅
  const subscription = await getCurrentSubscription(userId);

  // 解析计划名称
  const planName = parsePlanName(subscription?.planName);

  return {
    planName,
    config: PLAN_CONFIGS[planName],
  };
}

/**
 * 检查用户是否可以创建新任务
 * 根据用户的订阅计划和当前运行的任务数判断
 *
 * @param userId - 用户ID
 * @returns 任务限制检查结果
 */
export async function canCreateTask(userId: string): Promise<TaskLimitResult> {
  // 并行获取运行中任务数和计划配置
  const [runningCount, { planName, config }] = await Promise.all([
    getRunningTaskCount(userId),
    getUserPlanConfig(userId),
  ]);

  return {
    allowed: runningCount < config.maxConcurrentTasks,
    currentCount: runningCount,
    maxAllowed: config.maxConcurrentTasks,
    planName,
    planConfig: config,
  };
}

/**
 * 检查用户是否需要添加水印
 * 根据用户的订阅计划判断
 *
 * @param userId - 用户ID
 * @returns 是否需要添加水印
 */
export async function shouldAddWatermark(userId: string): Promise<boolean> {
  const { config } = await getUserPlanConfig(userId);
  return config.hasWatermark;
}

/**
 * 检查用户是否有商业授权
 *
 * @param userId - 用户ID
 * @returns 是否有商业授权
 */
export async function hasCommercialLicense(userId: string): Promise<boolean> {
  const { config } = await getUserPlanConfig(userId);
  return config.commercialLicense;
}

/**
 * 检查用户是否有优先队列权限
 *
 * @param userId - 用户ID
 * @returns 是否有优先队列权限
 */
export async function hasPriorityQueue(userId: string): Promise<boolean> {
  const { config } = await getUserPlanConfig(userId);
  return config.priorityQueue || false;
}

/**
 * 获取用户的输出质量设置
 *
 * @param userId - 用户ID
 * @returns 输出质量 ('standard' | 'hd' | '4k')
 */
export async function getUserOutputQuality(
  userId: string
): Promise<'standard' | 'hd' | '4k'> {
  const { config } = await getUserPlanConfig(userId);
  return config.quality;
}
