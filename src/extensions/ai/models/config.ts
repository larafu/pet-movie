/**
 * AI 模型统一配置
 * 管理所有可用的图片和视频生成模型
 */

export type AIModelType = 'video' | 'image';
export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:3' | '3:4' | '3:2';
export type InputType = 'text' | 'image';
export type BadgeType = 'pro' | 'new' | undefined;

export interface AIModel {
  id: string; // 前端显示的模型ID
  displayName: string; // UI展示名称
  actualModel: string; // 后端实际调用的模型名
  type: AIModelType; // 模型类型
  credits: number; // 消耗积分
  duration?: number; // 视频时长(秒)
  supportedRatios: AspectRatio[]; // 支持的宽高比
  supportedInputs: InputType[]; // 支持的输入类型
  isDefault?: boolean; // 是否为默认模型
  badge?: BadgeType; // 标签(pro/new)
  description: string; // 多语言key
}

// ============ 视频模型 ============

export const VIDEO_MODELS: AIModel[] = [
  {
    id: 'vidgen-10s',
    displayName: 'VidGen-10s',
    actualModel: 'sora-2',
    type: 'video',
    credits: 10,
    duration: 10,
    supportedRatios: ['16:9', '9:16'],
    supportedInputs: ['text', 'image'],
    isDefault: true,
    description: 'models.video.vidgen10s.description',
  },
  {
    id: 'vidgen-15s',
    displayName: 'VidGen-15s',
    actualModel: 'sora-2',
    type: 'video',
    credits: 15,
    duration: 15,
    supportedRatios: ['16:9', '9:16'],
    supportedInputs: ['text', 'image'],
    description: 'models.video.vidgen15s.description',
  },
];

// ============ 图片模型 ============

export const IMAGE_MODELS: AIModel[] = [
  {
    id: 'imggen-standard',
    displayName: 'ImgGen-Standard',
    actualModel: 'doubao-seedream-4.0',
    type: 'image',
    credits: 2,
    supportedRatios: ['16:9', '9:16', '1:1'],
    supportedInputs: ['text', 'image'],
    isDefault: true,
    description: 'models.image.standard.description',
  },
  {
    id: 'imggen-pro',
    displayName: 'ImgGen-Pro',
    actualModel: 'doubao-seedream-4.5',
    type: 'image',
    credits: 5,
    supportedRatios: ['16:9', '9:16', '1:1'],
    supportedInputs: ['text', 'image'],
    badge: 'pro',
    description: 'models.image.pro.description',
  },
  {
    id: 'nanobanana',
    displayName: 'NanoBanana',
    actualModel: 'gemini-2.5-flash-image',
    type: 'image',
    credits: 5,
    supportedRatios: ['16:9', '9:16', '1:1'],
    supportedInputs: ['text', 'image'],
    description: 'models.image.nanobanana.description',
  },
  {
    id: 'nanobanana-pro',
    displayName: 'NanoBanana Pro',
    actualModel: 'nano-banana-2-lite',
    type: 'image',
    credits: 10,
    supportedRatios: ['16:9', '9:16', '1:1'],
    supportedInputs: ['text', 'image'],
    badge: 'pro',
    description: 'models.image.nanobanana-pro.description',
  },
  {
    id: 'nanobanana-2',
    displayName: 'NanoBanana 2',
    actualModel: 'gemini-3-pro-image-preview',
    type: 'image',
    credits: 20,
    supportedRatios: ['16:9', '9:16', '1:1'],
    supportedInputs: ['text', 'image'],
    badge: 'new',
    description: 'models.image.nanobanana-2.description',
  },
];

// ============ 辅助函数 ============

/**
 * 根据ID获取模型配置
 */
export function getModelById(id: string): AIModel | undefined {
  const allModels = [...VIDEO_MODELS, ...IMAGE_MODELS];
  return allModels.find((model) => model.id === id);
}

/**
 * 根据 actualModel 和 mediaType 获取模型配置
 * 注意：同一个 actualModel 可能对应多个前端模型（如 sora-2 对应 vidgen-10s 和 vidgen-15s）
 * 此时需要通过额外参数（如 duration）来区分
 */
export function getModelByActualModel(
  actualModel: string,
  mediaType: AIModelType,
  options?: { duration?: number }
): AIModel | undefined {
  const models = getModelsByType(mediaType);
  const matches = models.filter((m) => m.actualModel === actualModel);

  // 如果只有一个匹配，直接返回
  if (matches.length === 1) {
    return matches[0];
  }

  // 如果有多个匹配（如视频模型），需要通过 duration 区分
  if (matches.length > 1 && options?.duration) {
    const match = matches.find((m) => m.duration === options.duration);
    if (match) return match;
  }

  // 返回第一个匹配或 undefined
  return matches[0];
}

/**
 * 根据类型获取模型列表
 */
export function getModelsByType(type: AIModelType): AIModel[] {
  return type === 'video' ? VIDEO_MODELS : IMAGE_MODELS;
}

/**
 * 获取默认模型
 */
export function getDefaultModel(type: AIModelType): AIModel {
  const models = getModelsByType(type);
  return models.find((m) => m.isDefault) || models[0];
}
