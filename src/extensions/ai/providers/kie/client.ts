/**
 * KIE AI Provider Client
 * For Sora 2 Pro Storyboard video generation
 */

import type {
  KieCreateTaskRequest,
  KieCreateTaskResponse,
  KieTaskRecordResponse,
  KieTaskResult,
} from './types';

const KIE_BASE_URL = 'https://api.kie.ai/api/v1';
const MOCK_MODE = false; // 设为 false 启用真实 API 调用

export class KieClient {
  private apiKey: string;
  private mockMode: boolean;

  constructor(apiKey: string, mockMode: boolean = MOCK_MODE) {
    if (!apiKey && !mockMode) {
      throw new Error('KIE API key is required');
    }
    this.apiKey = apiKey;
    this.mockMode = mockMode;

    if (mockMode) {
      console.log('🎭 [KIE Client] Mock mode enabled - will not call real API');
    }
  }

  /**
   * Create video generation task
   */
  async createTask(
    request: KieCreateTaskRequest
  ): Promise<KieCreateTaskResponse> {
    console.log('📹 [KIE] Creating video generation task...');
    console.log('📋 [KIE] Request:', JSON.stringify(request, null, 2));

    // Mock mode: return fake task ID
    if (this.mockMode) {
      const mockTaskId = `mock-task-${Date.now()}`;
      console.log('🎭 [KIE] Mock mode - returning fake task ID:', mockTaskId);

      return {
        code: 200,
        msg: 'success',
        data: {
          taskId: mockTaskId,
        },
      };
    }

    // Real API call
    console.log(
      '🌐 [KIE] Calling real API:',
      `${KIE_BASE_URL}/jobs/createTask`
    );

    const response = await fetch(`${KIE_BASE_URL}/jobs/createTask`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    console.log('📡 [KIE] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [KIE] API error:', errorText);
      throw new Error(
        `KIE Create Task API error (${response.status}): ${errorText}`
      );
    }

    const data: KieCreateTaskResponse = await response.json();
    console.log('✅ [KIE] Response data:', JSON.stringify(data, null, 2));

    if (data.code !== 200) {
      throw new Error(`KIE API error: ${data.msg}`);
    }

    return data;
  }

  /**
   * Get task status and result
   */
  async getTaskRecord(taskId: string): Promise<KieTaskRecordResponse> {
    console.log('🔍 [KIE] Getting task record for:', taskId);

    // Mock mode: return fake success result
    if (this.mockMode) {
      console.log('🎭 [KIE] Mock mode - returning fake success result');

      return {
        code: 200,
        msg: 'success',
        data: {
          taskId,
          model: 'sora-2-pro-storyboard',
          state: 'success',
          param: '{}',
          resultJson: JSON.stringify({
            resultUrls: ['https://mock-video-url.com/pet-video-mock.mp4'],
          }),
          failMsg: null,
          failCode: null,
          costTime: 1000,
          completeTime: Date.now(),
          createTime: Date.now() - 1000,
        },
      };
    }

    // Real API call
    console.log(
      '🌐 [KIE] Calling real API:',
      `${KIE_BASE_URL}/jobs/recordInfo?taskId=${taskId}`
    );

    const response = await fetch(
      `${KIE_BASE_URL}/jobs/recordInfo?taskId=${taskId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      }
    );

    console.log('📡 [KIE] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [KIE] API error:', errorText);
      throw new Error(
        `KIE Get Task Record API error (${response.status}): ${errorText}`
      );
    }

    const data: KieTaskRecordResponse = await response.json();
    console.log('✅ [KIE] Task record:', JSON.stringify(data, null, 2));

    if (data.code !== 200) {
      throw new Error(`KIE API error: ${data.msg}`);
    }

    return data;
  }

  /**
   * Poll video generation task until completion or timeout
   * Default: 1 hour (360 attempts * 10s = 3600s)
   */
  async pollVideoGeneration(
    taskId: string,
    options: {
      maxAttempts?: number;
      intervalMs?: number;
      onProgress?: (state: string) => void;
    } = {}
  ): Promise<string> {
    const { maxAttempts = 360, intervalMs = 10000, onProgress } = options;

    console.log(
      `⏳ [KIE] Starting to poll video generation (max ${maxAttempts} attempts)`
    );

    // Mock mode: return immediately
    if (this.mockMode) {
      console.log(
        '🎭 [KIE] Mock mode - skipping polling, returning mock video URL'
      );
      const mockVideoUrl = 'https://mock-video-url.com/pet-video-mock.mp4';

      if (onProgress) {
        onProgress('success');
      }

      return mockVideoUrl;
    }

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      console.log(`🔄 [KIE] Poll attempt ${attempt + 1}/${maxAttempts}`);

      const record = await this.getTaskRecord(taskId);
      console.log(`📊 [KIE] Current state: ${record.data.state}`);

      if (onProgress) {
        onProgress(record.data.state);
      }

      if (record.data.state === 'success' && record.data.resultJson) {
        const result: KieTaskResult = JSON.parse(record.data.resultJson);
        console.log('🎉 [KIE] Video generation completed!');
        console.log('🔗 [KIE] Result URLs:', result.resultUrls);

        if (result.resultUrls && result.resultUrls.length > 0) {
          return result.resultUrls[0];
        } else {
          throw new Error('Video generation succeeded but no result URL found');
        }
      }

      if (record.data.state === 'fail') {
        console.error('❌ [KIE] Video generation failed:', record.data.failMsg);
        throw new Error(
          `Video generation failed: ${record.data.failMsg || 'Unknown error'} (code: ${record.data.failCode})`
        );
      }

      // Wait before next poll
      console.log(`⏱️  [KIE] Waiting ${intervalMs}ms before next poll...`);
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new Error('Video generation timeout after maximum polling attempts');
  }
}

/**
 * Create KIE client instance
 */
export function createKieClient(): KieClient {
  const apiKey = process.env.KIE_API_KEY || '';
  // Use environment variable if set, otherwise use default MOCK_MODE constant
  const mockMode = process.env.KIE_MOCK_MODE === 'false' ? false : MOCK_MODE;

  if (!apiKey && !mockMode) {
    throw new Error('KIE_API_KEY environment variable is not configured');
  }

  return new KieClient(apiKey, mockMode);
}
