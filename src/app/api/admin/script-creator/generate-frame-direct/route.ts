/**
 * 直接生成首帧图 API（不依赖数据库）
 * POST /api/admin/script-creator/generate-frame-direct
 * 直接使用传入的表单数据生成，不需要先存数据库
 */

import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';

import { getAuth } from '@/core/auth';
import { createEvolinkClient } from '@/extensions/ai/providers/evolink/client';
import { IMAGE_MODELS } from '@/extensions/ai/providers/evolink/models';
import { checkScriptTemplateWritePermission } from '../_lib/check-admin';

// 角色数据结构
interface CharacterData {
  id: string;
  role: 'primary' | 'secondary';
  name: string;
  nameCn: string;
  description: string;
  descriptionCn: string;
}

interface GenerateFrameDirectRequest {
  petImageUrl: string; // 宠物图片 URL
  firstFramePrompt: string; // 首帧提示词
  globalStylePrefix: string; // 全局风格前缀
  characters?: CharacterData[]; // 所有角色定义
  characterIds?: string[]; // 该场景应出现的角色ID数组
  characterSheetUrl?: string; // 角色参考卡URL（可选）
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

    const body: GenerateFrameDirectRequest = await request.json();
    const { petImageUrl, firstFramePrompt, globalStylePrefix, characters, characterIds, characterSheetUrl, aspectRatio, sceneIndex } = body;

    if (!petImageUrl || !firstFramePrompt) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const taskId = nanoid();
    console.log('\n🖼️  ========== Direct Frame Generation ==========');
    console.log('📝 Task ID:', taskId);
    console.log('📝 Scene Index:', sceneIndex);
    console.log('📝 Character IDs:', characterIds);

    const evolinkClient = createEvolinkClient();

    // 根据 characterIds 筛选角色
    const sceneCharacters = characters?.filter(c => characterIds?.includes(c.id)) || [];
    const excludedCharacters = characters?.filter(c => !characterIds?.includes(c.id)) || [];

    // 构建提示词，按照设计的结构：
    // {globalStylePrefix} scene.
    // Use ONLY the following character(s) from the reference image: {activeCharacterNames}
    // {firstFramePrompt}
    // DO NOT include: {excludedCharacterNames}
    const promptParts: string[] = [];

    // 1. 全局风格前缀
    if (globalStylePrefix) {
      promptParts.push(`${globalStylePrefix} scene.`);
    }

    // 2. 应出现的角色（从参考图中选取）
    if (sceneCharacters.length > 0) {
      const activeCharacterNames = sceneCharacters.map(c => c.name).join(', ');
      promptParts.push(`Use ONLY the following character(s) from the reference image: ${activeCharacterNames}`);
    }

    // 3. 首帧提示词（场景描述）
    promptParts.push(firstFramePrompt);

    // 4. 不应出现的角色
    if (excludedCharacters.length > 0) {
      const excludedCharacterNames = excludedCharacters.map(c => c.name).join(', ');
      promptParts.push(`DO NOT include: ${excludedCharacterNames}`);
    }

    const styleTransferPrompt = promptParts.join('\n\n');

    console.log('📝 Active characters:', sceneCharacters.map(c => c.name).join(', ') || '(none)');
    console.log('📝 Excluded characters:', excludedCharacters.map(c => c.name).join(', ') || '(none)');

    // 选择参考图：优先使用角色参考卡（已包含风格化的角色），否则使用宠物原图
    // 角色参考卡是预先生成的风格化角色图，用于保持角色外观一致性
    const referenceImageUrl = characterSheetUrl || petImageUrl;

    console.log('🎨 Prompt length:', styleTransferPrompt.length);
    console.log('🖼️  Reference image:', characterSheetUrl ? 'Character Sheet' : 'Pet Image');
    console.log('🖼️  Reference URL:', referenceImageUrl);
    console.log('📐 Aspect ratio:', aspectRatio);

    // 调用图片生成 API（图生图模式）
    // 只支持单张参考图，优先使用角色参考卡
    const response = await evolinkClient.generateImage({
      model: IMAGE_MODELS.SEEDREAM_4,
      prompt: styleTransferPrompt,
      aspect_ratio: aspectRatio,
      image_url: referenceImageUrl, // 优先角色参考卡，否则宠物原图
      strength: 0.65, // 图生图强度
    });

    console.log('✅ Seedream task created:', response.id);

    return NextResponse.json({
      success: true,
      taskId: response.id,
      sceneIndex,
    });
  } catch (error) {
    console.error('Generate frame direct error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
