/**
 * 生成角色参考卡 API
 * POST /api/admin/script-creator/generate-character-sheet
 * 使用 Seedream 生成包含所有角色的参考卡图片
 */

import { NextRequest, NextResponse } from 'next/server';

import { getAuth } from '@/core/auth';
import { createEvolinkClient } from '@/extensions/ai/providers/evolink/client';
import { IMAGE_MODELS } from '@/extensions/ai/providers/evolink/models';
import { createR2ProviderFromDb } from '@/extensions/storage/db-config-loader';
import { checkScriptTemplateWritePermission } from '../_lib/check-admin';
import { nanoid } from 'nanoid';

// 角色数据结构
interface CharacterData {
  id: string;
  role: 'primary' | 'secondary';
  name: string;
  nameCn: string;
  description: string;
  descriptionCn: string;
}

interface GenerateCharacterSheetRequest {
  characters: CharacterData[]; // 角色数组
  petImageUrl?: string; // 宠物原图（可选，用于图生图）
  globalStylePrefix: string; // 全局风格前缀
  aspectRatio: '16:9' | '9:16';
}

/**
 * 构建角色参考卡的提示词
 * 将所有角色放在一张图中，用于后续生成时保持一致性
 */
function buildCharacterSheetPrompt(
  characters: CharacterData[],
  globalStylePrefix: string
): string {
  // 分离主要角色和次要角色
  const primaryCharacters = characters.filter(c => c.role === 'primary');
  const secondaryCharacters = characters.filter(c => c.role === 'secondary');

  // 构建角色描述
  const characterDescriptions = characters
    .map((char, index) => {
      const position = index === 0 ? 'center' : index === 1 ? 'left side' : 'right side';
      return `${char.name} (${position}): ${char.description}`;
    })
    .join('. ');

  // 构建提示词
  const prompt = `${globalStylePrefix}.

Character reference sheet with ${characters.length} characters on a simple clean background.

${characterDescriptions}.

Each character is clearly visible, facing forward or 3/4 view, full body visible, standing in a row with space between them. Clean white or light gray gradient background. Professional character design sheet layout. High quality, detailed, consistent art style across all characters.`;

  return prompt;
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

    const body: GenerateCharacterSheetRequest = await request.json();
    const { characters, petImageUrl, globalStylePrefix, aspectRatio } = body;

    if (!characters || characters.length === 0) {
      return NextResponse.json({ success: false, error: '请先添加角色' }, { status: 400 });
    }

    if (!globalStylePrefix) {
      return NextResponse.json({ success: false, error: '请先设置全局风格前缀' }, { status: 400 });
    }

    const taskId = nanoid();
    console.log('\n🎨 ========== Generate Character Sheet ==========');
    console.log('📝 Task ID:', taskId);
    console.log('👥 Characters:', characters.length);
    console.log('🖼️  Pet image URL:', petImageUrl || '(none, text-to-image)');
    console.log('📐 Aspect ratio:', aspectRatio);

    const evolinkClient = createEvolinkClient();

    // 构建提示词
    const prompt = buildCharacterSheetPrompt(characters, globalStylePrefix);
    console.log('📝 Prompt length:', prompt.length);
    console.log('📝 Prompt preview:', prompt.substring(0, 200) + '...');

    // 调用图片生成 API
    // 如果有宠物原图，使用图生图模式；否则使用文生图
    const generateRequest: {
      model: string;
      prompt: string;
      aspect_ratio: string;
      image_url?: string;
      strength?: number;
    } = {
      model: IMAGE_MODELS.SEEDREAM_4,
      prompt,
      aspect_ratio: aspectRatio,
    };

    if (petImageUrl) {
      generateRequest.image_url = petImageUrl;
      generateRequest.strength = 0.5; // 较低的强度，保留更多原图特征
      console.log('🖼️  Using image-to-image mode with pet reference');
    } else {
      console.log('📝 Using text-to-image mode');
    }

    const response = await evolinkClient.generateImage(generateRequest);
    console.log('✅ Seedream task created:', response.id);

    // 返回任务 ID，前端轮询获取结果
    return NextResponse.json({
      success: true,
      taskId: response.id,
      message: '角色参考卡生成中...',
    });

  } catch (error) {
    console.error('Generate character sheet error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
