/**
 * 订阅计划配置
 * 定义各计划的权益和限制
 */

// 计划配置类型
export interface PlanConfig {
  // 最大并发任务数
  maxConcurrentTasks: number;
  // 输出质量: standard(720p), hd(1080p), 4k(4K) - TODO: 后续接入高清输出
  quality: 'standard' | 'hd' | '4k';
  // 是否有水印
  hasWatermark: boolean;
  // 是否有商业授权
  commercialLicense: boolean;
  // 是否有优先队列
  priorityQueue?: boolean;
}

// 计划名称类型
export type PlanName = 'free' | 'lite' | 'standard' | 'pro';

/**
 * 各计划的具体配置
 *
 * | 计划 | 并发任务 | 画质 | 水印 | 商业授权 | 优先队列 |
 * |------|---------|------|------|---------|---------|
 * | Free | 1 | 标清 | 有 | 无 | 无 |
 * | Lite | 2 | 1080P | 无 | 无 | 无 |
 * | Standard | 3 | 4K | 无 | 有 | 无 |
 * | Pro | 5 | 4K | 无 | 有 | 有 |
 */
export const PLAN_CONFIGS: Record<PlanName, PlanConfig> = {
  // 免费用户（无订阅 或 注册送的100积分用户）
  free: {
    maxConcurrentTasks: 1,
    quality: 'standard', // 标清 720p
    hasWatermark: true,
    commercialLicense: false,
  },

  // Lite 入门版
  lite: {
    maxConcurrentTasks: 2,
    quality: 'hd', // 1080P - TODO: 后续接入
    hasWatermark: false,
    commercialLicense: false,
  },

  // Standard 标准版
  standard: {
    maxConcurrentTasks: 3,
    quality: '4k', // 4K - TODO: 后续接入
    hasWatermark: false,
    commercialLicense: true,
  },

  // Pro 专业版
  pro: {
    maxConcurrentTasks: 5,
    quality: '4k', // 4K - TODO: 后续接入
    hasWatermark: false,
    commercialLicense: true,
    priorityQueue: true,
  },
} as const;

/**
 * 根据订阅的 planName 解析计划名称
 * @param subscriptionPlanName - 订阅表中的 planName 字段
 * @returns 标准化的计划名称
 */
export function parsePlanName(subscriptionPlanName?: string | null): PlanName {
  if (!subscriptionPlanName) {
    return 'free';
  }

  const name = subscriptionPlanName.toLowerCase();

  if (name.includes('pro') || name === '专业版') {
    return 'pro';
  }
  if (name.includes('standard') || name === '标准版') {
    return 'standard';
  }
  if (name.includes('lite') || name === '入门版') {
    return 'lite';
  }

  return 'free';
}

/**
 * 获取计划配置
 * @param planName - 计划名称
 * @returns 计划配置
 */
export function getPlanConfig(planName: PlanName): PlanConfig {
  return PLAN_CONFIGS[planName];
}

/**
 * 默认计划（未订阅用户）
 */
export const DEFAULT_PLAN: PlanName = 'free';

/**
 * 积分配置
 */
export const CREDITS_CONFIG = {
  // 60秒视频消耗积分
  VIDEO_60S: 100,
  // 新用户注册赠送积分
  FREE_TRIAL: 100,
} as const;
