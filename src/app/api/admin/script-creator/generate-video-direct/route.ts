/**
 * 直接生成视频 API（不依赖数据库）
 * POST /api/admin/script-creator/generate-video-direct
 * 直接使用传入的表单数据生成，不需要先存数据库
 */

import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';

import { getAuth } from '@/core/auth';
import { createEvolinkClient } from '@/extensions/ai/providers/evolink/client';
import { VIDEO_MODELS } from '@/extensions/ai/providers/evolink/models';
import { checkScriptTemplateWritePermission } from '../_lib/check-admin';

interface GenerateVideoDirectRequest {
  frameImageUrl: string; // 首帧图 URL
  prompt: string; // 视频提示词
  globalStylePrefix: string; // 全局风格前缀
  subjectPrompt?: string; // 主体人物描述（可选）
  aspectRatio: '16:9' | '9:16';
  sceneIndex: number; // 场景索引（用于标识）
}

export async function POST(request: NextRequest) {
  try {
    // 验证用户登录
    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // 验证管理员权限
    const permissionError = await checkScriptTemplateWritePermission(session.user.id);
    if (permissionError) return permissionError;

    const body: GenerateVideoDirectRequest = await request.json();
    const { frameImageUrl, prompt, globalStylePrefix, subjectPrompt, aspectRatio, sceneIndex } = body;

    if (!frameImageUrl || !prompt) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const taskId = nanoid();
    console.log('\n🎬 ========== Direct Video Generation ==========');
    console.log('📝 Task ID:', taskId);
    console.log('📝 Scene Index:', sceneIndex);

    const evolinkClient = createEvolinkClient();

    // 构建完整的视频提示词：globalStylePrefix + subjectPrompt + prompt
    // 组合顺序：风格前缀 -> 主体描述 -> 场景动作描述
    const promptParts: string[] = [];
    if (globalStylePrefix) {
      promptParts.push(globalStylePrefix);
    }
    if (subjectPrompt) {
      promptParts.push(subjectPrompt);
    }
    promptParts.push(prompt);
    const fullVideoPrompt = promptParts.join('. ');

    console.log('🎨 Prompt length:', fullVideoPrompt.length);
    console.log('🖼️  Frame image URL:', frameImageUrl);
    console.log('📐 Aspect ratio:', aspectRatio);

    // 调用 Sora-2 图生视频
    const response = await evolinkClient.generateSora2Video({
      model: VIDEO_MODELS.SORA_2,
      prompt: fullVideoPrompt,
      aspect_ratio: aspectRatio,
      duration: 15, // 每个分镜固定15秒
      image_urls: [frameImageUrl],
    });

    console.log('✅ Sora-2 task created:', response.id);

    return NextResponse.json({
      success: true,
      taskId: response.id,
      sceneIndex,
    });
  } catch (error) {
    console.error('Generate video direct error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
