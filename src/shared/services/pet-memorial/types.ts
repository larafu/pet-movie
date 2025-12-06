/**
 * 宠物纪念功能类型定义
 * Pet Memorial Feature Type Definitions
 */

// ============================================================================
// 基础类型 / Base Types
// ============================================================================

/**
 * 宠物物种类型
 * 简化为 dog/cat/other，参考 lapoflove 数据
 */
export type PetSpecies = 'dog' | 'cat' | 'other';

/**
 * 纪念状态类型
 */
export type MemorialStatus = 'pending' | 'approved' | 'rejected';

/**
 * 排序方式
 */
export type MemorialSortType = 'latest' | 'popular';

// ============================================================================
// API 响应类型 / API Response Types
// ============================================================================

/**
 * 分页响应结构
 */
export interface PaginatedResponse<T> {
  success: boolean;
  data: {
    list: T[];
    count: number;
    offset: number;
    limit: number;
    hasMore: boolean;
  };
  error?: string;
}

/**
 * 通用 API 响应
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================================
// 纪念列表项 / Memorial List Item
// ============================================================================

/**
 * 纪念列表项（精简版，用于列表展示）
 */
export interface PetMemorialListItem {
  id: string;
  petName: string;
  species: PetSpecies | null;
  birthday: string | null; // ISO 日期
  dateOfPassing: string | null; // ISO 日期
  message: string | null; // 截断到 200 字符
  ownerFirstName: string | null; // 根据 isNameDisplayed 返回
  ownerLastName: string | null;
  city: string | null;
  state: string | null;
  images: string[]; // 图片URL数组
  candleCount: number; // 蜡烛数量
  hasVideo: boolean; // 是否有关联视频
  createdAt: string; // ISO 日期时间
}

// ============================================================================
// 纪念详情 / Memorial Detail
// ============================================================================

/**
 * 蜡烛列表项
 */
export interface CandleListItem {
  id: string;
  name: string; // 合并 firstName + lastName 或 guestName
  message: string | null;
  createdAt: string;
}

/**
 * 纪念详情（完整版，用于详情页展示）
 */
export interface PetMemorialDetail extends PetMemorialListItem {
  story: string | null; // 完整故事
  videoUrl: string | null; // 视频URL（如果有）
  videoThumbnail: string | null; // 视频缩略图
  isOwner: boolean; // 当前用户是否是所有者
  candles: CandleListItem[]; // 最新 10 条蜡烛
  totalCandles: number; // 蜡烛总数
}

// ============================================================================
// 请求参数类型 / Request Parameter Types
// ============================================================================

/**
 * 分页查询参数
 */
export interface PaginationParams {
  limit?: number; // 每页数量，默认 12，最大 50
  offset?: number; // 偏移量，默认 0
}

/**
 * 纪念列表查询参数
 */
export interface MemorialListParams extends PaginationParams {
  /** 通用搜索关键词（模糊搜索宠物名和主人名） */
  search?: string;
  /** 排序方式 */
  sort?: MemorialSortType;
}

/**
 * 创建纪念请求
 * 简化字段，移除 lastName 和 email
 */
export interface CreateMemorialRequest {
  petName: string; // 必填
  species?: PetSpecies;
  birthday?: string; // ISO 日期
  dateOfPassing?: string; // ISO 日期
  message?: string; // 限制 500 字符
  story?: string; // 限制 5000 字符
  images: string[]; // 已上传的图片URL，1-6张，必填至少1张
  ownerFirstName?: string;
  city?: string;
  state?: string;
  isNameDisplayed?: boolean; // 默认 true
  isPublic?: boolean; // 默认 true
}

/**
 * 更新纪念请求
 */
export type UpdateMemorialRequest = Partial<CreateMemorialRequest>;

/**
 * 点蜡烛请求
 */
export interface LightCandleRequest {
  name?: string; // 匿名访客姓名（登录用户可不填）
  email?: string; // 匿名访客邮箱（可选）
  message?: string; // 留言，限制 500 字符
}

/**
 * 生成视频请求
 */
export interface GenerateVideoRequest {
  aspectRatio: '16:9' | '9:16';
}

// ============================================================================
// 响应数据类型 / Response Data Types
// ============================================================================

/**
 * 创建纪念响应
 */
export interface CreateMemorialResponse {
  id: string;
  petName: string;
  status: MemorialStatus;
  createdAt: string;
}

/**
 * 点蜡烛响应
 */
export interface LightCandleResponse {
  id: string;
  name: string;
  message: string | null;
  createdAt: string;
}

/**
 * 生成视频响应
 */
export interface GenerateVideoResponse {
  taskId: string;
  estimatedSeconds: number; // 预计耗时
  creditsUsed: number; // 消耗积分
}

// ============================================================================
// 错误码 / Error Codes
// ============================================================================

/**
 * 宠物纪念功能错误码
 */
export const PET_MEMORIAL_ERROR_CODES = {
  // 通用
  UNAUTHORIZED: 'error.unauthorized',
  FORBIDDEN: 'error.forbidden',
  NOT_FOUND: 'error.notFound',
  VALIDATION_ERROR: 'error.validation',

  // 纪念相关
  MEMORIAL_NOT_FOUND: 'petMemorial.error.notFound',
  MEMORIAL_NOT_OWNER: 'petMemorial.error.notOwner',
  MEMORIAL_IMAGE_REQUIRED: 'petMemorial.error.imageRequired',
  MEMORIAL_IMAGE_LIMIT: 'petMemorial.error.imageLimitExceeded',

  // 蜡烛相关
  CANDLE_RATE_LIMIT: 'petMemorial.error.candleRateLimit',
  CANDLE_MESSAGE_REQUIRED: 'petMemorial.error.messageRequired',

  // 视频相关
  VIDEO_ALREADY_EXISTS: 'petMemorial.error.videoExists',
  INSUFFICIENT_CREDITS: 'petMemorial.error.insufficientCredits',
} as const;

export type PetMemorialErrorCode =
  (typeof PET_MEMORIAL_ERROR_CODES)[keyof typeof PET_MEMORIAL_ERROR_CODES];
