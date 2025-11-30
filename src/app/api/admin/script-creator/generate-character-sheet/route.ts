/**
 * 生成角色参考卡 API
 * POST /api/admin/script-creator/generate-character-sheet
 * 使用 Seedream 生成包含所有角色的参考卡图片
 */

import { NextRequest, NextResponse } from 'next/server';

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
 *
 * 布局：每个角色一行，每行显示该角色的多个角度（正面、3/4、侧面）
 */
function buildCharacterSheetPrompt(
  characters: CharacterData[],
  globalStylePrefix: string
): string {
  // 找到宠物角色（id 为 'pet' 的角色）
  const petCharacter = characters.find(c => c.id === 'pet');
  // 其他所有角色（非宠物）
  const otherCharacters = characters.filter(c => c.id !== 'pet');

  // 构建提示词 - 每行一个角色，多角度展示
  let prompt = `${globalStylePrefix}.

Professional character model sheet with ${characters.length} rows, one character per row.

ROW 1 - ${petCharacter?.name?.toUpperCase() || 'MAIN CHARACTER'} (based on the uploaded pet image):
${petCharacter ? `${petCharacter.name}: ${petCharacter.description}` : 'The pet from the uploaded image'}
This row shows: front view | 3/4 view | side view | back view
Keep the pet's distinctive features (fur color, markings, eye color, body shape) while applying the animation style.`;

  // 其他角色，每个角色一行
  if (otherCharacters.length > 0) {
    otherCharacters.forEach((char, index) => {
      prompt += `

ROW ${index + 2} - ${char.name.toUpperCase()}:
${char.description}
This row shows: front view | 3/4 view | side view | back view`;
    });
  }

  prompt += `

Layout requirements:
- ${characters.length} horizontal rows stacked vertically
- Each row dedicated to ONE character only
- Each row contains 3-4 poses of the SAME character: front view, 3/4 view, side view, back view
- Character name label on the left of each row
- Clean white background
- Thin black lines separating each row
- Consistent ${globalStylePrefix.split(',')[0]} art style across all characters
- Professional animation model sheet format
- High quality, detailed`;

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
    console.log('👥 Characters detail:', JSON.stringify(characters, null, 2));
    console.log('🖼️  Pet image URL:', petImageUrl);
    console.log('🎨 Global style prefix:', globalStylePrefix);
    console.log('📐 Aspect ratio:', aspectRatio);

    const evolinkClient = createEvolinkClient();

    // 构建提示词
    const prompt = buildCharacterSheetPrompt(characters, globalStylePrefix);

    // 打印完整提示词用于调试
    console.log('📝 ========== FULL PROMPT ==========');
    console.log(prompt);
    console.log('📝 ========== END PROMPT ==========');
    console.log('📝 Prompt length:', prompt.length);

    // 根据宽高比计算具体尺寸（与视频保持一致）
    // 16:9 -> 1280x720, 9:16 -> 720x1280
    const size = aspectRatio === '16:9' ? '1280x720' : '720x1280';
    console.log('📐 Aspect ratio:', aspectRatio);
    console.log('📐 Image size:', size);

    // 调用图片生成 API（图生图模式，基于宠物原图）
    // 使用较低的 strength 保留更多原图特征（宠物外观）
    const response = await evolinkClient.generateImage({
      model: IMAGE_MODELS.SEEDREAM_4,
      prompt,
      aspect_ratio: aspectRatio,
      size, // 具体尺寸，确保与视频一致
      image_url: petImageUrl,
      strength: 0.55, // 适中的强度：保留宠物特征，同时应用风格
    });

    console.log('🖼️  Using image-to-image mode with pet reference');
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
