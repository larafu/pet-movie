/**
 * 宠物纪念服务模块
 * Pet Memorial Service Module
 *
 * 统一导出类型、API 方法和 React Hooks
 */

// 类型定义导出
export type {
  // 基础类型
  PetSpecies,
  MemorialStatus,
  MemorialSortType,

  // 响应类型
  PaginatedResponse,
  ApiResponse,

  // 列表和详情类型
  PetMemorialListItem,
  PetMemorialDetail,
  CandleListItem,

  // 请求参数类型
  PaginationParams,
  MemorialListParams,
  CreateMemorialRequest,
  UpdateMemorialRequest,
  LightCandleRequest,
  GenerateVideoRequest,

  // 响应数据类型
  CreateMemorialResponse,
  LightCandleResponse,
  GenerateVideoResponse,

  // 错误码类型
  PetMemorialErrorCode,
} from './types';

// 错误码常量导出
export { PET_MEMORIAL_ERROR_CODES } from './types';

// API 方法导出
export {
  // 列表 API
  getMemorialList,
  getMyMemorials,

  // 详情 API
  getMemorialDetail,
  createMemorial,
  updateMemorial,
  deleteMemorial,

  // 蜡烛 API
  getCandleList,
  lightCandle,

  // 视频 API
  generateMemorialVideo,

  // SWR Keys（用于缓存标识）
  swrKeys,
} from './api';

// React Hooks 导出
export {
  // 列表 Hooks
  useMemorialList,
  useMyMemorials,

  // 详情 Hook
  useMemorialDetail,

  // 蜡烛 Hook
  useCandleList,

  // 变更操作 Hooks
  useCreateMemorial,
  useUpdateMemorial,
  useDeleteMemorial,
  useLightCandle,
  useGenerateVideo,
} from './hooks';
