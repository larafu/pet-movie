import {
  AIConfigs,
  AIGenerateParams,
  AIMediaType,
  AIProvider,
  AITaskResult,
  AITaskStatus,
} from '.';

/**
 * Evolink AI configs
 * @docs https://api.evolink.ai/
 */
export interface EvolinkConfigs extends AIConfigs {
  baseUrl?: string;
  apiToken: string;
}

/**
 * Evolink AI provider for image and video generation
 * @docs https://api.evolink.ai/
 */
export class EvolinkProvider implements AIProvider {
  readonly name = 'evolink';
  configs: EvolinkConfigs;

  constructor(configs: EvolinkConfigs) {
    this.configs = configs;
  }

  /**
   * Generate content from text prompt (supports both image and video)
   */
  async generate({
    params,
  }: {
    params: AIGenerateParams;
  }): Promise<AITaskResult> {
    const { mediaType, model, prompt, image_urls, options } = params;

    if (mediaType === AIMediaType.IMAGE) {
      return this.generateImage({ model, prompt, image_urls, options });
    } else if (mediaType === AIMediaType.VIDEO) {
      return this.generateVideo({ model, prompt, image_urls, options });
    } else {
      throw new Error(`Evolink does not support mediaType: ${mediaType}`);
    }
  }

  /**
   * Generate image from text prompt
   */
  private async generateImage({
    model,
    prompt,
    image_urls,
    options,
  }: {
    model?: string;
    prompt: string;
    image_urls?: string[];
    options?: any;
  }): Promise<AITaskResult> {
    if (!model) {
      throw new Error('model is required');
    }

    if (!prompt) {
      throw new Error('prompt is required');
    }

    const baseUrl = this.configs.baseUrl || 'https://api.evolink.ai';
    const url = `${baseUrl}/v1/images/generations`;

    // 解析 options（可能是 JSON 字符串）
    let parsedOptions: any = {};
    if (options) {
      try {
        parsedOptions = typeof options === 'string' ? JSON.parse(options) : options;
      } catch {
        parsedOptions = {};
      }
    }

    // Build request body
    const requestBody: any = {
      model: model,
      prompt: prompt,
    };

    // 添加宽高比（如果有且不是 'auto'）
    // 'auto' 表示让 API 自动决定，不发送 aspect_ratio 参数
    if (parsedOptions.aspectRatio && parsedOptions.aspectRatio !== 'auto') {
      requestBody.aspect_ratio = parsedOptions.aspectRatio;
    }

    // 添加图片尺寸设置
    // 根据 quality (1K/2K/4K) 或默认值，结合 aspectRatio 计算实际尺寸
    {
      const quality = parsedOptions.quality;
      const ratio = parsedOptions.aspectRatio || '1:1';

      // 基础尺寸 (质量等级对应的基础像素，默认 1K)
      const basePixels: Record<string, number> = {
        '1K': 1024,
        '2K': 2048,
        '4K': 4096,
      };

      const base = basePixels[quality] || 1024; // 默认 1K

      // 根据宽高比计算尺寸
      let width = base;
      let height = base;

      if (ratio !== 'auto') {
        const [w, h] = ratio.split(':').map(Number);
        if (w && h) {
          if (w > h) {
            // 横向 (如 16:9)
            height = Math.round(base * h / w);
            width = base;
          } else if (h > w) {
            // 纵向 (如 9:16)
            width = Math.round(base * w / h);
            height = base;
          }
        }
      }

      requestBody.size = `${width}x${height}`;
    }

    // 添加引导强度 (guidance_scale, 仅 doubao-seedream 系列支持)
    if (parsedOptions.guidanceScale && model.startsWith('doubao-seedream')) {
      requestBody.guidance_scale = parsedOptions.guidanceScale;
    }

    // Add image_urls if provided (for image-to-image)
    // 只添加有效的 URL（以 http:// 或 https:// 开头）
    if (image_urls && Array.isArray(image_urls)) {
      const validUrls = image_urls.filter(
        (url) => url && (url.startsWith('http://') || url.startsWith('https://'))
      );
      if (validUrls.length > 0) {
        requestBody.image_urls = validUrls;
      }
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.configs.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Evolink Image API error: ${response.status} - ${errorText}`
      );
    }

    const data = await response.json();

    return {
      taskStatus: this.mapStatus(data.status),
      taskId: data.id,
      taskInfo: {
        status: data.status,
        createTime: data.created ? new Date(data.created * 1000) : new Date(),
      },
      taskResult: data,
    };
  }

  /**
   * Generate video from text prompt
   */
  private async generateVideo({
    model,
    prompt,
    image_urls,
    options,
  }: {
    model?: string;
    prompt: string;
    image_urls?: string[];
    options?: any;
  }): Promise<AITaskResult> {
    if (!model) {
      throw new Error('model is required');
    }

    if (!prompt) {
      throw new Error('prompt is required');
    }

    const baseUrl = this.configs.baseUrl || 'https://api.evolink.ai';
    const url = `${baseUrl}/v1/videos/generations`;

    // 解析 options（可能是 JSON 字符串）
    let parsedOptions: any = {};
    if (options) {
      try {
        parsedOptions = typeof options === 'string' ? JSON.parse(options) : options;
      } catch {
        parsedOptions = {};
      }
    }

    // Build request body
    const requestBody: any = {
      model: model,
      prompt: prompt,
    };

    // 添加视频时长（如果有）
    if (parsedOptions.duration) {
      requestBody.duration = parsedOptions.duration;
    }

    // 添加宽高比（如果有）
    if (parsedOptions.aspectRatio) {
      requestBody.aspect_ratio = parsedOptions.aspectRatio;
    }

    // Add image_urls if provided (for reference images)
    // 只添加有效的 URL（以 http:// 或 https:// 开头）
    if (image_urls && Array.isArray(image_urls)) {
      const validUrls = image_urls.filter(
        (url) => url && (url.startsWith('http://') || url.startsWith('https://'))
      );
      if (validUrls.length > 0) {
        requestBody.image_urls = validUrls;
      }
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.configs.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Evolink Video API error: ${response.status} - ${errorText}`
      );
    }

    const data = await response.json();

    // Response format:
    // {
    //   "id": "task-unified-1757169743-7cvnl5zw",
    //   "status": "pending",
    //   "progress": 0,
    //   "model": "sora-2",
    //   "task_info": {
    //     "estimated_time": 300,
    //     "video_duration": 9
    //   }
    // }

    return {
      taskStatus: this.mapStatus(data.status),
      taskId: data.id,
      taskInfo: {
        status: data.status,
        createTime: data.created ? new Date(data.created * 1000) : new Date(),
      },
      taskResult: data,
    };
  }

  /**
   * Query video generation task status
   */
  async query({ taskId }: { taskId: string }): Promise<AITaskResult> {
    const baseUrl = this.configs.baseUrl || 'https://api.evolink.ai';
    const url = `${baseUrl}/v1/tasks/${taskId}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.configs.apiToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Evolink API error: ${response.status} - ${errorText}`
      );
    }

    const data = await response.json();

    // Response format:
    // {
    //   "id": "task-unified-1756817821-4x3rx6ny",
    //   "status": "completed",
    //   "progress": 100,
    //   "results": ["http://example.com/video.mp4"]
    // }

    return {
      taskId,
      taskStatus: this.mapStatus(data.status),
      taskInfo: {
        status: data.status,
        errorMessage: data.error,
        createTime: new Date(data.created * 1000),
        // Store video URL in images array for compatibility with existing structure
        // TODO: Add proper video field to AITaskInfo
        images: data.results
          ? data.results.map((url: string) => ({
              id: '',
              createTime: new Date(data.created * 1000),
              imageUrl: url, // Video URL stored here temporarily
            }))
          : undefined,
      },
      taskResult: data,
    };
  }

  /**
   * Map Evolink status to AITaskStatus
   */
  private mapStatus(status: string): AITaskStatus {
    switch (status) {
      case 'pending':
        return AITaskStatus.PENDING;
      case 'processing':
        return AITaskStatus.PROCESSING;
      case 'completed':
        return AITaskStatus.SUCCESS;
      case 'failed':
        return AITaskStatus.FAILED;
      case 'canceled':
        return AITaskStatus.CANCELED;
      default:
        console.warn(`Unknown Evolink status: ${status}, treating as pending`);
        return AITaskStatus.PENDING;
    }
  }
}

/**
 * Create Evolink provider with configs
 */
export function createEvolinkProvider(
  configs: EvolinkConfigs
): EvolinkProvider {
  return new EvolinkProvider(configs);
}
