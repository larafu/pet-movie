/**
 * Random Prompt Check API
 * 检查是否有可用的随机 Prompt - 供前端判断是否显示骰子按钮
 *
 * GET /api/random-prompt/check?mode=image|video
 * 返回 { hasPrompts: boolean }
 */

import { NextRequest } from 'next/server';

import { hasActivePrompts, RandomPromptMode } from '@/shared/models/random-prompt';
import { respData, respErr } from '@/shared/lib/resp';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') as RandomPromptMode | null;

    // 验证 mode 参数
    if (!mode || !Object.values(RandomPromptMode).includes(mode)) {
      return respErr('Invalid mode parameter. Use "image" or "video".');
    }

    // 检查是否有活跃的 prompt
    const hasPrompts = await hasActivePrompts(mode);

    return respData({ hasPrompts });
  } catch (error) {
    console.error('Random prompt check API error:', error);
    return respErr('Failed to check random prompts');
  }
}
