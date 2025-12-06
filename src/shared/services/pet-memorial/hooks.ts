/**
 * 宠物纪念 React Hooks
 * Pet Memorial React Hooks
 *
 * 提供数据获取、分页加载、状态管理的 React Hooks
 * 遵循项目现有模式：useState + useEffect + fetch
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  PetMemorialListItem,
  PetMemorialDetail,
  CandleListItem,
  MemorialListParams,
  PaginationParams,
  CreateMemorialRequest,
  UpdateMemorialRequest,
  LightCandleRequest,
  GenerateVideoRequest,
} from './types';
import {
  getMemorialList,
  getMyMemorials,
  getMemorialDetail,
  getCandleList,
  createMemorial,
  updateMemorial,
  deleteMemorial,
  lightCandle,
  generateMemorialVideo,
} from './api';

// ============================================================================
// 通用类型 / Common Types
// ============================================================================

interface PaginatedState<T> {
  list: T[];
  count: number;
  offset: number;
  limit: number;
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
}

interface AsyncState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

// ============================================================================
// 纪念列表 Hooks / Memorial List Hooks
// ============================================================================

/**
 * 公开纪念列表 Hook
 * 支持分页加载、搜索、排序
 */
export function useMemorialList(params?: MemorialListParams) {
  const [state, setState] = useState<PaginatedState<PetMemorialListItem>>({
    list: [],
    count: 0,
    offset: 0,
    limit: params?.limit || 12,
    hasMore: false,
    isLoading: true,
    isLoadingMore: false,
    error: null,
  });

  // 跟踪参数变化，重置列表
  const paramsRef = useRef({ search: params?.search, sort: params?.sort });

  // 初始加载
  const fetchList = useCallback(async (newOffset?: number) => {
    const isLoadMore = newOffset !== undefined && newOffset > 0;

    setState((prev) => ({
      ...prev,
      isLoading: !isLoadMore,
      isLoadingMore: isLoadMore,
      error: null,
    }));

    const response = await getMemorialList({
      ...params,
      offset: newOffset ?? 0,
    });

    if (response.success) {
      setState((prev) => ({
        ...response.data,
        list: isLoadMore
          ? [...prev.list, ...response.data.list]
          : response.data.list,
        isLoading: false,
        isLoadingMore: false,
        error: null,
      }));
    } else {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        isLoadingMore: false,
        error: response.error || 'Failed to load memorials',
      }));
    }
  }, [params?.search, params?.sort, params?.limit]);

  // 加载更多
  const loadMore = useCallback(() => {
    if (state.hasMore && !state.isLoadingMore && !state.isLoading) {
      fetchList(state.offset + state.limit);
    }
  }, [state.hasMore, state.isLoadingMore, state.isLoading, state.offset, state.limit, fetchList]);

  // 刷新列表
  const refresh = useCallback(() => {
    fetchList(0);
  }, [fetchList]);

  // 参数变化时重新加载
  useEffect(() => {
    const paramsChanged =
      paramsRef.current.search !== params?.search ||
      paramsRef.current.sort !== params?.sort;

    if (paramsChanged) {
      paramsRef.current = { search: params?.search, sort: params?.sort };
      // 参数变化时重置列表
      setState((prev) => ({
        ...prev,
        list: [],
        offset: 0,
        isLoading: true,
      }));
    }

    fetchList(0);
  }, [params?.search, params?.sort]);

  return {
    ...state,
    loadMore,
    refresh,
  };
}

/**
 * 我的纪念列表 Hook
 * 获取当前用户的所有纪念（包含私有）
 */
export function useMyMemorials(params?: PaginationParams) {
  const [state, setState] = useState<PaginatedState<PetMemorialListItem>>({
    list: [],
    count: 0,
    offset: 0,
    limit: params?.limit || 12,
    hasMore: false,
    isLoading: true,
    isLoadingMore: false,
    error: null,
  });

  const fetchList = useCallback(async (newOffset?: number) => {
    const isLoadMore = newOffset !== undefined && newOffset > 0;

    setState((prev) => ({
      ...prev,
      isLoading: !isLoadMore,
      isLoadingMore: isLoadMore,
      error: null,
    }));

    const response = await getMyMemorials({
      ...params,
      offset: newOffset ?? 0,
    });

    if (response.success) {
      setState((prev) => ({
        ...response.data,
        list: isLoadMore
          ? [...prev.list, ...response.data.list]
          : response.data.list,
        isLoading: false,
        isLoadingMore: false,
        error: null,
      }));
    } else {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        isLoadingMore: false,
        error: response.error || 'Failed to load memorials',
      }));
    }
  }, [params?.limit]);

  const loadMore = useCallback(() => {
    if (state.hasMore && !state.isLoadingMore && !state.isLoading) {
      fetchList(state.offset + state.limit);
    }
  }, [state.hasMore, state.isLoadingMore, state.isLoading, state.offset, state.limit, fetchList]);

  const refresh = useCallback(() => {
    fetchList(0);
  }, [fetchList]);

  useEffect(() => {
    fetchList(0);
  }, []);

  return {
    ...state,
    loadMore,
    refresh,
  };
}

// ============================================================================
// 纪念详情 Hook / Memorial Detail Hook
// ============================================================================

/**
 * 纪念详情 Hook
 */
export function useMemorialDetail(id: string | null) {
  const [state, setState] = useState<AsyncState<PetMemorialDetail>>({
    data: null,
    isLoading: true,
    error: null,
  });

  const fetchDetail = useCallback(async () => {
    if (!id) {
      setState({ data: null, isLoading: false, error: null });
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    const response = await getMemorialDetail(id);

    if (response.success && response.data) {
      setState({
        data: response.data,
        isLoading: false,
        error: null,
      });
    } else {
      setState({
        data: null,
        isLoading: false,
        error: response.error || 'Failed to load memorial detail',
      });
    }
  }, [id]);

  const refresh = useCallback(() => {
    fetchDetail();
  }, [fetchDetail]);

  useEffect(() => {
    fetchDetail();
  }, [id]);

  return {
    ...state,
    refresh,
  };
}

// ============================================================================
// 蜡烛列表 Hook / Candle List Hook
// ============================================================================

/**
 * 蜡烛列表 Hook
 */
export function useCandleList(memorialId: string | null, params?: PaginationParams) {
  const [state, setState] = useState<PaginatedState<CandleListItem>>({
    list: [],
    count: 0,
    offset: 0,
    limit: params?.limit || 20,
    hasMore: false,
    isLoading: true,
    isLoadingMore: false,
    error: null,
  });

  const fetchList = useCallback(async (newOffset?: number) => {
    if (!memorialId) {
      setState((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    const isLoadMore = newOffset !== undefined && newOffset > 0;

    setState((prev) => ({
      ...prev,
      isLoading: !isLoadMore,
      isLoadingMore: isLoadMore,
      error: null,
    }));

    const response = await getCandleList(memorialId, {
      ...params,
      offset: newOffset ?? 0,
    });

    if (response.success) {
      setState((prev) => ({
        ...response.data,
        list: isLoadMore
          ? [...prev.list, ...response.data.list]
          : response.data.list,
        isLoading: false,
        isLoadingMore: false,
        error: null,
      }));
    } else {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        isLoadingMore: false,
        error: response.error || 'Failed to load candles',
      }));
    }
  }, [memorialId, params?.limit]);

  const loadMore = useCallback(() => {
    if (state.hasMore && !state.isLoadingMore && !state.isLoading) {
      fetchList(state.offset + state.limit);
    }
  }, [state.hasMore, state.isLoadingMore, state.isLoading, state.offset, state.limit, fetchList]);

  const refresh = useCallback(() => {
    fetchList(0);
  }, [fetchList]);

  useEffect(() => {
    if (memorialId) {
      fetchList(0);
    }
  }, [memorialId]);

  return {
    ...state,
    loadMore,
    refresh,
  };
}

// ============================================================================
// 变更操作 Hooks / Mutation Hooks
// ============================================================================

interface MutationState {
  isLoading: boolean;
  error: string | null;
}

/**
 * 创建纪念 Hook
 */
export function useCreateMemorial() {
  const [state, setState] = useState<MutationState>({
    isLoading: false,
    error: null,
  });

  const create = useCallback(async (data: CreateMemorialRequest) => {
    setState({ isLoading: true, error: null });

    const response = await createMemorial(data);

    if (response.success && response.data) {
      setState({ isLoading: false, error: null });
      return { success: true, data: response.data };
    }

    setState({ isLoading: false, error: response.error || 'Failed to create memorial' });
    return { success: false, error: response.error };
  }, []);

  return {
    ...state,
    create,
  };
}

/**
 * 更新纪念 Hook
 */
export function useUpdateMemorial() {
  const [state, setState] = useState<MutationState>({
    isLoading: false,
    error: null,
  });

  const update = useCallback(async (id: string, data: UpdateMemorialRequest) => {
    setState({ isLoading: true, error: null });

    const response = await updateMemorial(id, data);

    if (response.success) {
      setState({ isLoading: false, error: null });
      return { success: true };
    }

    setState({ isLoading: false, error: response.error || 'Failed to update memorial' });
    return { success: false, error: response.error };
  }, []);

  return {
    ...state,
    update,
  };
}

/**
 * 删除纪念 Hook
 */
export function useDeleteMemorial() {
  const [state, setState] = useState<MutationState>({
    isLoading: false,
    error: null,
  });

  const remove = useCallback(async (id: string) => {
    setState({ isLoading: true, error: null });

    const response = await deleteMemorial(id);

    if (response.success) {
      setState({ isLoading: false, error: null });
      return { success: true };
    }

    setState({ isLoading: false, error: response.error || 'Failed to delete memorial' });
    return { success: false, error: response.error };
  }, []);

  return {
    ...state,
    remove,
  };
}

/**
 * 点蜡烛 Hook
 */
export function useLightCandle() {
  const [state, setState] = useState<MutationState>({
    isLoading: false,
    error: null,
  });

  const light = useCallback(async (memorialId: string, data: LightCandleRequest) => {
    setState({ isLoading: true, error: null });

    const response = await lightCandle(memorialId, data);

    if (response.success && response.data) {
      setState({ isLoading: false, error: null });
      return { success: true, data: response.data };
    }

    setState({ isLoading: false, error: response.error || 'Failed to light candle' });
    return { success: false, error: response.error };
  }, []);

  return {
    ...state,
    light,
  };
}

/**
 * 生成视频 Hook
 */
export function useGenerateVideo() {
  const [state, setState] = useState<MutationState>({
    isLoading: false,
    error: null,
  });

  const generate = useCallback(async (memorialId: string, data: GenerateVideoRequest) => {
    setState({ isLoading: true, error: null });

    const response = await generateMemorialVideo(memorialId, data);

    if (response.success && response.data) {
      setState({ isLoading: false, error: null });
      return { success: true, data: response.data };
    }

    setState({ isLoading: false, error: response.error || 'Failed to generate video' });
    return { success: false, error: response.error };
  }, []);

  return {
    ...state,
    generate,
  };
}

// ============================================================================
// 宠物视频列表 Hook / Pet Video List Hook
// ============================================================================

/**
 * 宠物视频项类型
 */
export interface PetVideoItem {
  id: string;
  templateType: 'dog' | 'cat';
  status: string;
  scene: string;
  petImageUrl: string | null;
  frameImageUrl: string | null;
  finalVideoUrl: string | null;
  tempVideoUrl: string | null;
  originalVideoUrl: string | null;
  watermarkedVideoUrl: string | null;
  durationSeconds: number | null;
  aspectRatio: string | null;
  costCredits: number;
  isPublic: boolean | null;
  likeCount: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

interface PetVideoListState {
  videos: PetVideoItem[];
  isLoading: boolean;
  error: string | null;
}

/**
 * 用户宠物视频列表 Hook
 * 获取当前用户的所有宠物视频
 */
export function useUserPetVideos(limit: number = 20) {
  const [state, setState] = useState<PetVideoListState>({
    videos: [],
    isLoading: true,
    error: null,
  });

  const fetchVideos = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(`/api/pet-video/history?limit=${limit}`);
      const data = await response.json();

      if (data.success && data.videos) {
        setState({
          videos: data.videos,
          isLoading: false,
          error: null,
        });
      } else {
        setState({
          videos: [],
          isLoading: false,
          error: data.error || 'Failed to load videos',
        });
      }
    } catch (error) {
      setState({
        videos: [],
        isLoading: false,
        error: error instanceof Error ? error.message : 'Network error',
      });
    }
  }, [limit]);

  const refresh = useCallback(() => {
    fetchVideos();
  }, [fetchVideos]);

  useEffect(() => {
    fetchVideos();
  }, []);

  return {
    ...state,
    refresh,
  };
}

/**
 * 切换视频公开状态 Hook
 */
export function useToggleVideoShare() {
  const [state, setState] = useState<MutationState>({
    isLoading: false,
    error: null,
  });

  const toggle = useCallback(async (videoId: string, setPublic?: boolean) => {
    setState({ isLoading: true, error: null });

    try {
      const response = await fetch('/api/pet-video/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, setPublic }),
      });

      const data = await response.json();

      if (data.success) {
        setState({ isLoading: false, error: null });
        return {
          success: true,
          isPublic: data.isPublic,
          shareLink: data.shareLink,
        };
      }

      setState({ isLoading: false, error: data.error || 'Failed to toggle share' });
      return { success: false, error: data.error };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Network error';
      setState({ isLoading: false, error: errorMsg });
      return { success: false, error: errorMsg };
    }
  }, []);

  return {
    ...state,
    toggle,
  };
}
