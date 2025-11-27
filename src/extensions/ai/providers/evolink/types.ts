/**
 * Evolink AI Provider Type Definitions
 */

// Chat API Types (for pet identification)
export interface EvolinkChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | EvolinkChatContent[];
}

export interface EvolinkChatContent {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
  };
}

export interface EvolinkChatRequest {
  model: string;
  messages: EvolinkChatMessage[];
  temperature?: number;
  max_tokens?: number;
}

export interface EvolinkChatResponse {
  id: string;
  model: string;
  object: string;
  created: number;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Image Generation API Types
export interface EvolinkImageGenerationRequest {
  model: string;
  prompt: string;
  aspect_ratio?: string;
  n?: number;
  image_urls?: string[]; // For image-to-image generation
}

export interface EvolinkImageGenerationResponse {
  created: number;
  id: string;
  model: string;
  object: string;
  progress: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  task_info?: {
    can_cancel: boolean;
    estimated_time?: number;
  };
  type: string;
  usage?: {
    billing_rule: string;
    credits_reserved: number;
    user_group: string;
  };
  results?: string[];
  error?: {
    code: string;
    message: string;
  };
}

export interface EvolinkTaskStatusResponse {
  created: number;
  id: string;
  model: string;
  object: string;
  progress: number;
  results?: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  task_info: {
    can_cancel: boolean;
  };
  type: string;
  error?: {
    code: string;
    message: string;
  };
}

// ==================== Sora-2 Video Generation Types ====================

/**
 * Sora-2 视频生成请求
 * 用于自定义剧本的每个15秒分镜视频生成
 */
export interface EvolinkSora2VideoRequest {
  model: 'sora-2'; // 固定使用 sora-2 模型
  prompt: string; // 视频描述提示词，最多5000 tokens
  aspect_ratio?: '16:9' | '9:16'; // 视频比例
  duration?: number; // 视频时长（秒），默认 5s，可选 5/10/15/20
  image_urls?: string[]; // 参考图片URL列表（用于图生视频）
}

/**
 * Sora-2 视频生成响应
 */
export interface EvolinkSora2VideoResponse {
  created: number;
  id: string; // 任务ID，用于查询状态
  model: string;
  object: 'video.generation.task';
  progress: number; // 进度 0-100
  status: 'pending' | 'processing' | 'completed' | 'failed';
  task_info: {
    can_cancel: boolean;
    estimated_time?: number; // 预计时间（秒）
    video_duration?: number; // 视频时长（秒）
  };
  type: 'video';
  usage?: {
    billing_rule: string;
    credits_reserved: number;
    user_group: string;
  };
  results?: string[]; // 完成后的视频URL列表
  error?: {
    code: string;
    message: string;
  };
}
