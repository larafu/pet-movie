/**
 * Evolink API 模型常量
 * 统一管理所有模型名称，避免硬编码导致的不一致
 */

// 图片生成模型
export const IMAGE_MODELS = {
  // 豆包 Seedream 4.0 - 图生图、文生图
  SEEDREAM_4: 'doubao-seedream-4.0',
} as const;

// 视频生成模型
export const VIDEO_MODELS = {
  // Sora 2 基础版
  SORA_2: 'sora-2',
  // Sora 2 Pro 分镜版（用于宠物视频生成）
  SORA_2_PRO_STORYBOARD: 'sora-2-pro-storyboard',
} as const;

// 默认模型配置
export const DEFAULT_MODELS = {
  IMAGE_GENERATION: IMAGE_MODELS.SEEDREAM_4,
  VIDEO_GENERATION: VIDEO_MODELS.SORA_2,
  VIDEO_GENERATION_STORYBOARD: VIDEO_MODELS.SORA_2_PRO_STORYBOARD,
} as const;
