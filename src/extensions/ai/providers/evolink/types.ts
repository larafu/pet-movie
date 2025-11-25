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
