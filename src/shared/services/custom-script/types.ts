/**
 * Custom Script Types
 * 自定义剧本相关类型定义
 */

// ==================== 分镜相关类型 ====================

/**
 * Gemini 生成的单个分镜
 */
export interface GeneratedScene {
  sceneNumber: number;
  prompt: string; // 完整场景提示词，用于视频生成（包含多个shot）
  firstFramePrompt: string; // 首帧图提示词，用于图片生成（只描述第一个shot的静态画面）
  description: string; // 中文说明，给用户看
  descriptionEn: string; // 英文说明，给用户看
}

/**
 * Gemini 分镜生成结果
 */
export interface GeneratedScenes {
  title: string; // 故事标题
  scenes: GeneratedScene[];
}

// ==================== 数据库记录类型 ====================

/**
 * 剧本状态
 */
export type ScriptStatus =
  | 'draft'
  | 'creating'
  | 'merging'
  | 'completed'
  | 'failed';

/**
 * 分镜段落状态
 */
export type SceneItemStatus = 'pending' | 'generating' | 'completed' | 'failed';

/**
 * 自定义剧本记录（数据库）
 */
export interface CustomScriptRecord {
  id: string;
  userId: string;
  status: ScriptStatus;
  petImageUrl: string | null;
  userPrompt: string | null;
  musicPrompt: string | null;
  durationSeconds: number;
  aspectRatio: string;
  styleId: string | null; // 视觉风格ID
  customStyle: string | null; // 自定义风格描述
  scenesJson: string | null;
  storyTitle: string | null;
  finalVideoUrl: string | null;
  creditsUsed: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 分镜段落记录（数据库）
 */
export interface CustomScriptSceneRecord {
  id: string;
  scriptId: string;
  sceneNumber: number;
  prompt: string; // 完整场景提示词，用于视频生成
  firstFramePrompt: string | null; // 首帧图专用提示词
  originalPrompt: string | null;
  description: string | null; // 中文描述
  descriptionEn: string | null; // 英文描述
  frameStatus: SceneItemStatus;
  frameImageUrl: string | null;
  frameTaskId: string | null;
  videoStatus: SceneItemStatus;
  videoUrl: string | null;
  videoTaskId: string | null;
  frameProgress: number | null; // 首帧图生成进度 0-100
  videoProgress: number | null; // 视频生成进度 0-100
  errorLog: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== API 请求/响应类型 ====================

/**
 * 创建剧本请求
 */
export interface CreateScriptRequest {
  petImageUrl: string;
  userPrompt: string;
  musicPrompt?: string;
  durationSeconds: 60 | 120;
  aspectRatio: '16:9' | '9:16';
  styleId?: VideoStyleId; // 风格ID，默认 'pixar-3d'
  customStyle?: string; // 自定义风格（当 styleId 为 'custom' 时使用）
}

/**
 * 创建剧本响应
 */
export interface CreateScriptResponse {
  success: boolean;
  scriptId?: string;
  title?: string;
  scenes?: Array<{
    id: string;
    sceneNumber: number;
    prompt: string;
    description: string;
  }>;
  creditsUsed?: number;
  error?: string;
}

/**
 * 获取剧本详情响应
 */
export interface GetScriptResponse {
  success: boolean;
  script?: {
    id: string;
    status: ScriptStatus;
    petImageUrl: string;
    userPrompt: string;
    musicPrompt?: string;
    durationSeconds: number;
    aspectRatio: string;
    storyTitle?: string;
    finalVideoUrl?: string;
    creditsUsed: number;
    createdAt: string;
    updatedAt: string;
    scenes: Array<{
      id: string;
      sceneNumber: number;
      prompt: string;
      description?: string;
      frameStatus: SceneItemStatus;
      frameImageUrl?: string;
      videoStatus: SceneItemStatus;
      videoUrl?: string;
    }>;
  };
  error?: string;
}

/**
 * 更新分镜提示词请求
 */
export interface UpdateScenePromptRequest {
  prompt: string;
}

/**
 * 生成首帧图响应
 */
export interface GenerateFrameResponse {
  success: boolean;
  taskId?: string;
  error?: string;
}

/**
 * 生成视频响应
 */
export interface GenerateVideoResponse {
  success: boolean;
  taskId?: string;
  error?: string;
}

/**
 * 拼接视频响应
 */
export interface MergeVideoResponse {
  success: boolean;
  videoUrl?: string;
  error?: string;
}

// ==================== 视频风格定义 ====================

/**
 * 预设视频风格
 */
export type VideoStyleId =
  | 'pixar-3d'
  | 'ghibli'
  | 'disney-classic'
  | 'realistic-cinematic'
  | 'anime'
  | 'watercolor'
  | 'custom';

/**
 * 视频风格配置
 */
export interface VideoStyle {
  id: VideoStyleId;
  name: string; // 英文名
  nameCn: string; // 中文名
  prefix: string; // 用于生成提示词的前缀
  description: string; // 英文描述
  descriptionCn: string; // 中文描述
}

/**
 * 预设风格列表
 * 注意：prefix 不能包含受版权保护的品牌名称（如 Pixar、Disney、Ghibli、Miyazaki 等）
 * 否则会触发 Sora-2 API 的安全策略拦截
 */
export const VIDEO_STYLES: VideoStyle[] = [
  {
    id: 'pixar-3d',
    name: '3D Animation',
    nameCn: '3D动画风格',
    prefix:
      'Pixar-style High-quality 3D CG animation style, cinematic lighting, vibrant saturated colors, expressive cartoon characters, smooth rendering, professional studio quality',
    description:
      'Professional Pixar-style 3D animation with vibrant colors and expressive characters',
    descriptionCn: '专业3D动画风格，色彩鲜艳，角色表情丰富',
  },
  {
    id: 'ghibli',
    name: 'Hand-drawn Fantasy',
    nameCn: '手绘幻想风格',
    prefix:
      'Hand-drawn 2D animation style, soft watercolor backgrounds, dreamy whimsical atmosphere, gentle natural lighting, detailed environmental art, nostalgic warmth',
    description: 'Hand-drawn style with soft, dreamy watercolor aesthetics',
    descriptionCn: '手绘动画风格，柔和梦幻的水彩美学',
  },
  {
    id: 'disney-classic',
    name: 'Classic 2D Animation',
    nameCn: '经典2D动画',
    prefix:
      'Classic 2D cel animation style, warm golden lighting, fairy tale aesthetic, magical sparkles and glows, storybook illustration quality',
    description: 'Traditional 2D animation with fairy tale charm',
    descriptionCn: '传统2D动画风格，童话般的魅力',
  },
  {
    id: 'realistic-cinematic',
    name: 'Realistic Cinematic',
    nameCn: '写实电影',
    prefix:
      'Photorealistic cinematic style, movie-grade lighting, dramatic shadows, film grain texture, anamorphic lens effects, professional cinematography',
    description: 'Photorealistic movie quality with dramatic lighting',
    descriptionCn: '照片级写实电影质感，戏剧性光影效果',
  },
  {
    id: 'anime',
    name: 'Anime Style',
    nameCn: '动漫风格',
    prefix:
      'Anime animation style, vibrant cel-shading, dynamic action lines, large expressive eyes, detailed colorful backgrounds, bold outlines',
    description: 'Modern anime style with dynamic visuals',
    descriptionCn: '现代动漫风格，动态视觉效果',
  },
  {
    id: 'watercolor',
    name: 'Watercolor Art',
    nameCn: '水彩艺术',
    prefix:
      'Watercolor painting animation style, soft flowing brush strokes, pastel color palette, artistic and dreamy, gentle color transitions, paper texture',
    description: 'Soft watercolor painting style with artistic aesthetics',
    descriptionCn: '柔和水彩画风格，艺术感十足',
  },
  {
    id: 'custom',
    name: 'Custom Style',
    nameCn: '自定义风格',
    prefix: '', // 用户自定义
    description: 'Define your own visual style',
    descriptionCn: '定义您自己的视觉风格',
  },
];

/**
 * 根据ID获取风格
 */
export function getVideoStyleById(id: VideoStyleId): VideoStyle | undefined {
  return VIDEO_STYLES.find((style) => style.id === id);
}

/**
 * 获取风格前缀（支持自定义）
 */
export function getStylePrefix(
  styleId: VideoStyleId,
  customStyle?: string
): string {
  if (styleId === 'custom' && customStyle) {
    return customStyle;
  }
  const style = getVideoStyleById(styleId);
  return style?.prefix || VIDEO_STYLES[0].prefix; // 默认使用 Pixar 风格
}

// ==================== 积分定价 ====================

export const CUSTOM_SCRIPT_CREDITS = {
  INIT: 15, // 初始化（Gemini分镜生成）
  FRAME: 5, // 每个首帧图
  VIDEO: 10, // 每个15s视频
} as const;

/**
 * 计算剧本总积分
 */
export function calculateTotalCredits(durationSeconds: 60 | 120): number {
  const sceneCount = durationSeconds / 15;
  return (
    CUSTOM_SCRIPT_CREDITS.INIT +
    sceneCount * (CUSTOM_SCRIPT_CREDITS.FRAME + CUSTOM_SCRIPT_CREDITS.VIDEO)
  );
}
