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
 * 基于用户上传的宠物图片，生成风格化的角色参考卡
 * 用于后续生成时保持角色一致性
 */
function buildCharacterSheetPrompt(
  characters: CharacterData[],
  globalStylePrefix: string
): string {
  // 找到主角（宠物）
  const petCharacter = characters.find(c => c.id === 'pet' || c.role === 'primary');
  const otherCharacters = characters.filter(c => c.id !== 'pet' && c.role !== 'primary');

  // 构建提示词 - 强调基于原图转换风格
  let prompt = `${globalStylePrefix}.

Transform this pet photo into a stylized character reference sheet.

MAIN CHARACTER (center, based on the uploaded pet image):
${petCharacter ? `${petCharacter.name}: ${petCharacter.description}` : 'The pet from the uploaded image'}

Keep the pet's distinctive features (fur color, markings, eye color, body shape) while applying the animation style.`;

  // 如果有其他角色，添加到参考卡中
  if (otherCharacters.length > 0) {
    const otherDescriptions = otherCharacters
      .map((char, index) => {
        const position = index === 0 ? 'left side' : 'right side';
        return `${char.name} (${position}): ${char.description}`;
      })
      .join('. ');

    prompt += `

SUPPORTING CHARACTERS:
${otherDescriptions}`;
  }

  prompt += `

Character reference sheet layout. Each character clearly visible, facing forward or 3/4 view, full body. Clean simple background. Consistent art style across all characters. High quality, detailed.`;

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

    if (!petImageUrl) {
      return NextResponse.json({ success: false, error: '请先上传宠物图片，参考卡需要基于宠物图片生成' }, { status: 400 });
    }

    console.log('\n🎨 ========== Generate Character Sheet ==========');
    console.log('👥 Characters:', characters.length);
    console.log('🖼️  Pet image URL:', petImageUrl);
    console.log('📐 Aspect ratio:', aspectRatio);

    const evolinkClient = createEvolinkClient();

    // 构建提示词
    const prompt = buildCharacterSheetPrompt(characters, globalStylePrefix);
    console.log('📝 Prompt length:', prompt.length);
    console.log('📝 Prompt preview:', prompt.substring(0, 200) + '...');

    // 调用图片生成 API（图生图模式，基于宠物原图）
    // 使用较低的 strength 保留更多原图特征（宠物外观）
    const response = await evolinkClient.generateImage({
      model: IMAGE_MODELS.SEEDREAM_4,
      prompt,
      aspect_ratio: aspectRatio,
      image_url: petImageUrl,
      strength: 0.55, // 适中的强度：保留宠物特征，同时应用风格
    });

    console.log('🖼️  Using image-to-image mode with pet reference');
    console.log('✅ Seedream task created:', response.id);
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
