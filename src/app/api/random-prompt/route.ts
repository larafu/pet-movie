/**
 * Random Prompt API
 * 随机 Prompt 接口 - 供前端骰子按钮调用
 *
 * GET /api/random-prompt?mode=image|video
 * 返回一条随机 prompt
 */

import { NextRequest, NextResponse } from 'next/server';

import {
  getOneRandomPrompt,
  hasActivePrompts,
  RandomPromptMode,
} from '@/shared/models/random-prompt';
import { respData, respErr } from '@/shared/lib/resp';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') as RandomPromptMode | null;

    // 验证 mode 参数
    if (!mode || !Object.values(RandomPromptMode).includes(mode)) {
      return respErr('Invalid mode parameter. Use "image" or "video".');
    }

    // 获取随机 prompt
    const prompt = await getOneRandomPrompt(mode);

    if (!prompt) {
      return respErr('No active prompts available for this mode.');
    }

    return respData({ prompt });
  } catch (error) {
    console.error('Random prompt API error:', error);
    return respErr('Failed to get random prompt');
  }
}
