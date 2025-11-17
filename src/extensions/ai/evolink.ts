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
 * Evolink AI provider for text-to-video generation
 * @docs https://api.evolink.ai/
 */
export class EvolinkProvider implements AIProvider {
  readonly name = 'evolink';
  configs: EvolinkConfigs;

  constructor(configs: EvolinkConfigs) {
    this.configs = configs;
  }

  /**
   * Generate video from text prompt
   */
  async generate({
    params,
  }: {
    params: AIGenerateParams;
  }): Promise<AITaskResult> {
    const { mediaType, model, prompt, image_urls } = params;

    if (mediaType !== AIMediaType.VIDEO) {
      throw new Error('Evolink only supports video generation');
    }

    if (!model) {
      throw new Error('model is required');
    }

    if (!prompt) {
      throw new Error('prompt is required');
    }

    const baseUrl = this.configs.baseUrl || 'https://api.evolink.ai';
    const url = `${baseUrl}/v1/videos/generations`;

    // Build request body
    const requestBody: any = {
      model: model,
      prompt: prompt,
    };

    // Add image_urls if provided (for reference images)
    if (image_urls && Array.isArray(image_urls) && image_urls.length > 0) {
      requestBody.image_urls = image_urls;
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
        `Evolink API error: ${response.status} - ${errorText}`
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
        createTime: new Date(data.created * 1000),
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
