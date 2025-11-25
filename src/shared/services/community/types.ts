/**
 * 社区服务类型定义
 * Community service type definitions
 */

// 分享创建请求
export interface CreateShareRequest {
  aiTaskId: string; // AI任务ID
  title?: string; // 分享标题（可选，不传则自动生成）
  description?: string; // 分享描述
  isPublic?: boolean; // 是否公开，默认true
}

// 分享响应
export interface ShareResponse {
  id: string;
  aiTaskId: string;
  userId: string;
  title: string;
  description: string | null;
  isPublic: boolean;
  viewCount: number;
  likeCount: number;
  shareCount: number;
  downloadCount: number;
  createdAt: string;
  updatedAt: string;
  // 关联数据
  user?: {
    id: string;
    name: string;
    image: string | null;
  };
  aiTask?: {
    id: string;
    mediaType: string;
    finalVideoUrl: string | null;
    frameImageUrl: string | null;
    durationSeconds: number | null;
    aspectRatio: string | null;
  };
  // 当前用户是否点赞
  isLiked?: boolean;
}

// 分享列表查询参数
export interface GetSharesRequest {
  sortBy?: 'latest' | 'popular'; // 排序方式：最新或热门
  limit?: number; // 每页数量
  offset?: number; // 偏移量
  userId?: string; // 筛选指定用户的分享
}

// 点赞请求
export interface LikeRequest {
  shareId: string; // 分享ID
}

// 点赞响应
export interface LikeResponse {
  success: boolean;
  isLiked: boolean; // 点赞后的状态
  likeCount: number; // 当前点赞数
}

// 统计更新类型
export type ShareStatType = 'view' | 'like' | 'share' | 'download';
