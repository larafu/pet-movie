/**
 * Evolink AI Provider Client
 * Supports both Chat API (pet identification) and Image Generation API (frame generation)
 */

import type {
  EvolinkChatRequest,
  EvolinkChatResponse,
  EvolinkImageGenerationRequest,
  EvolinkImageGenerationResponse,
  EvolinkTaskStatusResponse,
  EvolinkSora2VideoRequest,
  EvolinkSora2VideoResponse,
} from './types';

const EVOLINK_BASE_URL = 'https://api.evolink.ai/v1';

export class EvolinkClient {
  private apiToken: string;

  constructor(apiToken: string) {
    if (!apiToken) {
      throw new Error('Evolink API token is required');
    }
    this.apiToken = apiToken;
  }

  /**
   * Call Chat Completion API (used for pet identification with vision)
   */
  async chatCompletion(
    request: EvolinkChatRequest
  ): Promise<EvolinkChatResponse> {
    const response = await fetch(`${EVOLINK_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Evolink Chat API error (${response.status}): ${errorText}`
      );
    }

    return response.json();
  }

  /**
   * Identify pet characteristics from image using vision model
   */
  async identifyPet(imageUrl: string): Promise<string> {
    const prompt = `You are a pet description expert for Pixar-style 3D CG animation. Analyze the uploaded pet photo and provide a detailed description of the pet that will be used as the main character in an animated Christmas rescue story.

Requirements:
1. Identify the species and breed (e.g., "toy poodle", "tabby cat", "golden retriever")
2. Describe fur characteristics: color, pattern, length, texture
3. Describe distinctive facial features: eye color/size, nose, ears
4. Describe body size and build
5. The description should match Pixar-style 3D CG animation aesthetic - appealing, expressive, stylized, suitable for family-friendly animated content

Output format (provide ONLY this, no extra text):
"A [size] [color/pattern] [breed] [species] with [fur texture] fur, [distinctive features including eyes, nose, ears], [body characteristics], Pixar-style 3D CG animated character design"

Example outputs:
- "A small brown toy poodle with fluffy curly fur, big expressive dark eyes, a tiny black nose, perky ears, and a compact energetic build, Pixar-style 3D CG animated character design"
- "A medium-sized orange-and-cream striped tabby cat with soft fluffy fur, large round green eyes full of curiosity, a tiny pink nose, perky triangular ears, and an athletic graceful build, Pixar-style 3D CG animated character design"
- "A large golden retriever with thick wavy golden fur, warm expressive brown eyes, a friendly black nose, floppy ears, and a strong athletic build, Pixar-style 3D CG animated character design"

Provide only the description, nothing else.`;

    const response = await this.chatCompletion({
      model: 'gemini-2.5-flash',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt,
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
              },
            },
          ],
        },
      ],
      temperature: 0.3, // Lower temperature for more consistent descriptions
      max_tokens: 200,
    });

    const description = response.choices[0]?.message?.content?.trim();

    if (!description) {
      throw new Error('Failed to get pet description from Evolink');
    }

    return description;
  }

  /**
   * Generate image using Evolink Image Generation API
   */
  async generateImage(
    request: EvolinkImageGenerationRequest
  ): Promise<EvolinkImageGenerationResponse> {
    const response = await fetch(`${EVOLINK_BASE_URL}/images/generations`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Evolink Image Generation API error (${response.status}): ${errorText}`
      );
    }

    return response.json();
  }

  /**
   * Get task status (for image generation)
   */
  async getTaskStatus(taskId: string): Promise<EvolinkTaskStatusResponse> {
    const response = await fetch(`${EVOLINK_BASE_URL}/tasks/${taskId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Evolink Task Status API error (${response.status}): ${errorText}`
      );
    }

    return response.json();
  }

  /**
   * Poll image generation task until completion or timeout
   * Default: 10 minutes (120 attempts * 5s = 600s)
   */
  async pollImageGeneration(
    taskId: string,
    options: {
      maxAttempts?: number;
      intervalMs?: number;
      onProgress?: (progress: number) => void;
    } = {}
  ): Promise<string> {
    const { maxAttempts = 120, intervalMs = 5000, onProgress } = options;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const status = await this.getTaskStatus(taskId);

      if (onProgress) {
        onProgress(status.progress);
      }

      if (status.status === 'completed' && status.results?.[0]) {
        return status.results[0];
      }

      if (status.status === 'failed') {
        throw new Error(
          `Image generation failed: ${status.error?.message || 'Unknown error'}`
        );
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new Error('Image generation timeout after maximum polling attempts');
  }

  // ==================== Sora-2 Video Generation ====================

  /**
   * Generate video using Sora-2 model
   * 用于自定义剧本的每个15秒分镜视频生成
   */
  async generateSora2Video(
    request: EvolinkSora2VideoRequest
  ): Promise<EvolinkSora2VideoResponse> {
    console.log('🎬 [Evolink] Creating Sora-2 video generation task...');
    console.log('📝 [Evolink] Prompt:', request.prompt.substring(0, 100) + '...');
    console.log('📐 [Evolink] Aspect ratio:', request.aspect_ratio || '16:9');
    console.log('⏱️  [Evolink] Duration:', request.duration || 5, 'seconds');
    console.log('🖼️  [Evolink] Image URLs:', request.image_urls?.length || 0);

    const response = await fetch(`${EVOLINK_BASE_URL}/videos/generations`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sora-2',
        prompt: request.prompt,
        aspect_ratio: request.aspect_ratio || '16:9',
        duration: request.duration || 15, // 默认15秒
        ...(request.image_urls?.length ? { image_urls: request.image_urls } : {}),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [Evolink] Sora-2 video generation error:', errorText);
      throw new Error(
        `Evolink Sora-2 Video API error (${response.status}): ${errorText}`
      );
    }

    const result = await response.json();
    console.log('✅ [Evolink] Sora-2 task created:', result.id);
    console.log('⏱️  [Evolink] Estimated time:', result.task_info?.estimated_time, 'seconds');
    console.log('🎞️  [Evolink] Video duration:', result.task_info?.video_duration, 'seconds');

    return result;
  }

  /**
   * Get video task status (for Sora-2)
   * 复用通用的 getTaskStatus，响应格式兼容
   */
  async getVideoTaskStatus(taskId: string): Promise<EvolinkSora2VideoResponse> {
    const response = await fetch(`${EVOLINK_BASE_URL}/tasks/${taskId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Evolink Video Task Status API error (${response.status}): ${errorText}`
      );
    }

    return response.json();
  }

  /**
   * Poll Sora-2 video generation task until completion or timeout
   * Default: 10 minutes (60 attempts * 10s = 600s)
   * Sora-2 视频生成通常需要 3-5 分钟
   */
  async pollSora2VideoGeneration(
    taskId: string,
    options: {
      maxAttempts?: number;
      intervalMs?: number;
      onProgress?: (progress: number, status: string) => void;
    } = {}
  ): Promise<string> {
    const { maxAttempts = 60, intervalMs = 10000, onProgress } = options;

    console.log('⏳ [Evolink] Starting to poll Sora-2 video task:', taskId);

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const status = await this.getVideoTaskStatus(taskId);

      console.log(`🔄 [Evolink] Poll ${attempt + 1}/${maxAttempts}:`, {
        status: status.status,
        progress: status.progress,
      });

      if (onProgress) {
        onProgress(status.progress, status.status);
      }

      if (status.status === 'completed' && status.results?.[0]) {
        console.log('🎉 [Evolink] Sora-2 video completed:', status.results[0]);
        return status.results[0];
      }

      if (status.status === 'failed') {
        console.error('❌ [Evolink] Sora-2 video generation failed:', status.error);
        throw new Error(
          `Sora-2 video generation failed: ${status.error?.message || 'Unknown error'}`
        );
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new Error('Sora-2 video generation timeout after maximum polling attempts');
  }
}

/**
 * Create Evolink client instance
 */
export function createEvolinkClient(): EvolinkClient {
  const apiToken = process.env.EVOLINK_API_TOKEN;

  if (!apiToken) {
    throw new Error(
      'EVOLINK_API_TOKEN environment variable is not configured'
    );
  }

  return new EvolinkClient(apiToken);
}
