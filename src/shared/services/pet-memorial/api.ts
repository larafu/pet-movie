/**
 * 宠物纪念 API 请求封装
 * Pet Memorial API Request Wrapper
 *
 * 提供统一的 API 请求方法，封装错误处理和响应解析
 */

import type {
  PetMemorialListItem,
  PetMemorialDetail,
  CandleListItem,
  PaginatedResponse,
  ApiResponse,
  MemorialListParams,
  PaginationParams,
  CreateMemorialRequest,
  CreateMemorialResponse,
  UpdateMemorialRequest,
  LightCandleRequest,
  LightCandleResponse,
  GenerateVideoRequest,
  GenerateVideoResponse,
} from './types';

// API 基础路径
const API_BASE = '/api/pet-memorial';

// ============================================================================
// 通用请求方法 / Common Request Methods
// ============================================================================

/**
 * 通用 fetch 封装
 * 处理请求和响应，统一错误处理
 */
async function request<T>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    const data = await response.json();

    // 如果响应不成功，返回错误结构
    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.error || `Request failed with status ${response.status}`,
      };
    }

    return data;
  } catch (error) {
    // 网络错误或解析错误
    console.error('API request failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * 构建查询字符串
 */
function buildQueryString(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

// ============================================================================
// 纪念列表 API / Memorial List API
// ============================================================================

/**
 * 获取公开纪念列表
 * GET /api/pet-memorial
 */
export async function getMemorialList(
  params?: MemorialListParams
): Promise<PaginatedResponse<PetMemorialListItem>> {
  const query = buildQueryString({
    limit: params?.limit,
    offset: params?.offset,
    search: params?.search,
    sort: params?.sort,
  });

  const response = await request<PaginatedResponse<PetMemorialListItem>['data']>(
    `${API_BASE}${query}`
  );

  // 转换为分页响应格式
  if (response.success && response.data) {
    return {
      success: true,
      data: response.data,
    };
  }

  return {
    success: false,
    data: { list: [], count: 0, offset: 0, limit: 12, hasMore: false },
    error: response.error,
  };
}

/**
 * 获取当前用户的纪念列表（包含私有纪念）
 * GET /api/pet-memorial/my
 */
export async function getMyMemorials(
  params?: PaginationParams
): Promise<PaginatedResponse<PetMemorialListItem>> {
  const query = buildQueryString({
    limit: params?.limit,
    offset: params?.offset,
  });

  const response = await request<PaginatedResponse<PetMemorialListItem>['data']>(
    `${API_BASE}/my${query}`
  );

  if (response.success && response.data) {
    return {
      success: true,
      data: response.data,
    };
  }

  return {
    success: false,
    data: { list: [], count: 0, offset: 0, limit: 12, hasMore: false },
    error: response.error,
  };
}

// ============================================================================
// 纪念详情 API / Memorial Detail API
// ============================================================================

/**
 * 获取纪念详情
 * GET /api/pet-memorial/[id]
 */
export async function getMemorialDetail(
  id: string
): Promise<ApiResponse<PetMemorialDetail>> {
  return request<PetMemorialDetail>(`${API_BASE}/${id}`);
}

/**
 * 创建纪念
 * POST /api/pet-memorial
 */
export async function createMemorial(
  data: CreateMemorialRequest
): Promise<ApiResponse<CreateMemorialResponse>> {
  return request<CreateMemorialResponse>(API_BASE, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * 更新纪念
 * PATCH /api/pet-memorial/[id]
 */
export async function updateMemorial(
  id: string,
  data: UpdateMemorialRequest
): Promise<ApiResponse> {
  return request(`${API_BASE}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * 删除纪念（软删除）
 * DELETE /api/pet-memorial/[id]
 */
export async function deleteMemorial(id: string): Promise<ApiResponse> {
  return request(`${API_BASE}/${id}`, {
    method: 'DELETE',
  });
}

// ============================================================================
// 蜡烛 API / Candle API
// ============================================================================

/**
 * 获取蜡烛列表
 * GET /api/pet-memorial/[id]/candles
 */
export async function getCandleList(
  memorialId: string,
  params?: PaginationParams
): Promise<PaginatedResponse<CandleListItem>> {
  const query = buildQueryString({
    limit: params?.limit,
    offset: params?.offset,
  });

  const response = await request<PaginatedResponse<CandleListItem>['data']>(
    `${API_BASE}/${memorialId}/candles${query}`
  );

  if (response.success && response.data) {
    return {
      success: true,
      data: response.data,
    };
  }

  return {
    success: false,
    data: { list: [], count: 0, offset: 0, limit: 12, hasMore: false },
    error: response.error,
  };
}

/**
 * 点蜡烛
 * POST /api/pet-memorial/[id]/candles
 */
export async function lightCandle(
  memorialId: string,
  data: LightCandleRequest
): Promise<ApiResponse<LightCandleResponse>> {
  return request<LightCandleResponse>(`${API_BASE}/${memorialId}/candles`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ============================================================================
// 视频生成 API / Video Generation API
// ============================================================================

/**
 * 生成纪念视频
 * POST /api/pet-memorial/[id]/generate-video
 */
export async function generateMemorialVideo(
  memorialId: string,
  data: GenerateVideoRequest
): Promise<ApiResponse<GenerateVideoResponse>> {
  return request<GenerateVideoResponse>(
    `${API_BASE}/${memorialId}/generate-video`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    }
  );
}

// ============================================================================
// 辅助方法 / Helper Methods
// ============================================================================

/**
 * 获取 SWR Key（用于缓存标识）
 */
export const swrKeys = {
  /** 公开纪念列表 */
  memorialList: (params?: MemorialListParams) =>
    `${API_BASE}${buildQueryString({ ...params })}`,

  /** 我的纪念列表 */
  myMemorials: (params?: PaginationParams) =>
    `${API_BASE}/my${buildQueryString({ ...params })}`,

  /** 纪念详情 */
  memorialDetail: (id: string) => `${API_BASE}/${id}`,

  /** 蜡烛列表 */
  candleList: (memorialId: string, params?: PaginationParams) =>
    `${API_BASE}/${memorialId}/candles${buildQueryString({ ...params })}`,
} as const;
