/**
 * Gemini Scene Generation Service
 * 使用 Gemini Vision 同时识别宠物外观并生成分镜提示词
 * 一次调用完成：宠物识别 + 角色一致性 + 画面风格 + 分镜设计
 */

import { createEvolinkClient } from '@/extensions/ai/providers/evolink/client';

import {
  getStylePrefix,
  getVideoStyleById,
  type GeneratedScenes,
  type PetAppearance,
  type VideoStyleId,
} from './types';

// 重新导出类型供外部使用
export type { PetAppearance, GeneratedScenes };

// ==================== 分镜生成（合并宠物识别）====================

/**
 * 构建合并的 Gemini Vision prompt
 * 一次调用完成：宠物识别 + 分镜生成
 *
 * 结构说明：
 * - 先识别图片中的宠物外观
 * - 生成全局风格前缀（包含画面风格+角色一致性）
 * - 每个 scene 是一个 15 秒的场景段落，包含 3-4 个 shots
 */
function buildGeminiVisionPrompt(
  userPrompt: string,
  durationSeconds: 60 | 120,
  aspectRatio: '16:9' | '9:16',
  styleId: VideoStyleId,
  customStyle?: string,
  musicPrompt?: string
): string {
  const sceneCount = durationSeconds / 15;
  const orientationNote =
    aspectRatio === '9:16'
      ? 'Portrait mode (9:16), vertical frame compositions for mobile viewing.'
      : 'Landscape mode (16:9), horizontal frame compositions for desktop viewing.';

  // 获取风格前缀
  const stylePrefix = getStylePrefix(styleId, customStyle);
  const styleName =
    styleId === 'custom'
      ? 'custom style'
      : getVideoStyleById(styleId)?.name || '3D Animation';

  const musicSection = musicPrompt
    ? `\n**Background Music**: ${musicPrompt} (use generic style descriptions, no specific song/artist names)`
    : '';

  return `You are a professional pet video storyboard artist. Analyze the uploaded pet photo and create a complete ${durationSeconds}-second video storyboard.

## TASK 1: IDENTIFY THE PET (from the uploaded image)

Carefully analyze the pet in the photo:
- Species (cat or dog)
- Fur: color, pattern, length, texture
- Face: eye color/shape, nose, ears, distinctive markings
- Body: size, build, unique features

## TASK 2: CREATE STORYBOARD

**User's Story Idea**: "${userPrompt}"

**Visual Style**: ${styleName} - ${stylePrefix}

**Format**: ${orientationNote}
${musicSection}

Create ${sceneCount} scene segments (each ~15 seconds).

## SCENE STRUCTURE

Each scene contains 3-4 SHOTS:
- **Shot 1 (0-3s)**: Establishing shot / transition
- **Shot 2 (3-7s)**: Main action / key moment
- **Shot 3 (7-11s)**: Reaction / detail / secondary action
- **Shot 4 (11-15s)**: Conclusion / lead-in to next (optional)

## SHOT ELEMENTS

Include for each shot:
1. Camera: wide/medium/close-up/aerial/low-angle/tracking
2. Movement: static/dolly/pan/tilt/crane/orbit
3. Pet action: specific movements and expressions
4. Environment: background, lighting
5. Emotion: mood and atmosphere

## CRITICAL RULES

1. **Pet Reference**: ALWAYS use "the same [species]" or "the [species]" - NEVER use breed names, colors, or specific descriptions in prompts
2. **No Copyrights**: No brand names (Pixar, Disney, Ghibli, etc.)
3. **Story Arc**: Scene 1 = opening, Scene ${sceneCount} = satisfying ending

## OUTPUT FORMAT (JSON only):

{
  "title": "Story Title",
  "pet": {
    "species": "cat" or "dog",
    "description": "[English description of the pet from the photo, 50-80 words, for character consistency reference]",
    "descriptionCn": "[中文描述，30-50字]"
  },
  "globalStylePrefix": "[Combined style prefix: visual style + character description, ~50 words. Example: 'High-quality 3D animation style, cinematic lighting, vibrant colors. The main character is a fluffy cat with expressive eyes, maintaining consistent appearance throughout.']",
  "scenes": [
    {
      "sceneNumber": 1,
      "prompt": "[Complete scene with all shots, 150-250 words. Format: 'SHOT 1: [camera] [setting] the same [species] [action]. SHOT 2: [camera] the [species] [action]...' Use 'the same cat/dog' or 'the cat/dog' throughout]",
      "firstFramePrompt": "[CRITICAL: MUST include 'the same cat' or 'the same dog'. Static image prompt for Shot 1, 30-50 words. Format: '[setting description], the same [species] [pose/action], [lighting], [mood]'. Example: 'A cozy living room with warm lighting, the same cat sitting on a windowsill looking outside, soft afternoon sunlight, peaceful atmosphere']",
      "description": "场景概述（中文）",
      "descriptionEn": "Scene overview"
    }
  ]
}

CRITICAL RULES FOR firstFramePrompt:
1. MUST contain "the same cat" or "the same dog" - this is REQUIRED for image-to-image generation
2. Describe the pet's pose/action in the scene
3. NO camera movements, NO transitions - static image only
4. Keep it 30-50 words

Generate exactly ${sceneCount} scenes. Output ONLY valid JSON.`;
}

/**
 * 使用 Gemini Vision 生成分镜提示词（合并宠物识别）
 * 一次调用完成：宠物外观识别 + 角色一致性 + 画面风格 + 分镜设计
 *
 * @param petImageUrl 宠物图片URL（必需，用于识别宠物外观）
 * @param userPrompt 用户故事描述
 * @param durationSeconds 视频时长（60或120秒）
 * @param aspectRatio 视频比例
 * @param styleId 视觉风格ID
 * @param customStyle 自定义风格描述
 * @param musicPrompt 配乐风格描述
 */
export async function generateScenesWithPetImage(
  petImageUrl: string,
  userPrompt: string,
  durationSeconds: 60 | 120,
  aspectRatio: '16:9' | '9:16',
  styleId: VideoStyleId = 'pixar-3d',
  customStyle?: string,
  musicPrompt?: string
): Promise<GeneratedScenes> {
  console.log('\n🎬 ========== Gemini Vision Scene Generation ==========');
  console.log('🖼️  Pet image URL:', petImageUrl);
  console.log('📝 User prompt:', userPrompt.substring(0, 100) + '...');
  console.log('⏱️  Duration:', durationSeconds, 'seconds');
  console.log('📐 Aspect ratio:', aspectRatio);
  console.log(
    '🎨 Style:',
    styleId,
    customStyle ? `(custom: ${customStyle.substring(0, 50)}...)` : ''
  );
  console.log('🎵 Music prompt:', musicPrompt || 'None');

  const evolinkClient = createEvolinkClient();
  const geminiPrompt = buildGeminiVisionPrompt(
    userPrompt,
    durationSeconds,
    aspectRatio,
    styleId,
    customStyle,
    musicPrompt
  );

  console.log(
    '🤖 Calling Gemini Vision via Evolink (pet identification + scene generation)...'
  );

  // 根据场景数量动态计算 token 限制
  // 每个场景约需 500-800 tokens + 宠物描述约 200 tokens
  const sceneCount = durationSeconds / 15;
  const estimatedTokensPerScene = 800;
  const maxTokens = Math.max(8000, sceneCount * estimatedTokensPerScene + 1500);

  try {
    // 使用 Vision API，同时传入图片和文本
    const response = await evolinkClient.chatCompletion({
      model: 'gemini-2.5-pro',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: geminiPrompt,
            },
            {
              type: 'image_url',
              image_url: {
                url: petImageUrl,
              },
            },
          ],
        },
      ],
      temperature: 0.7, // 稍高温度获得更有创意的内容
      max_tokens: maxTokens,
    });

    const content = response.choices[0]?.message?.content?.trim();

    if (!content) {
      throw new Error('Gemini returned empty response');
    }

    console.log('📄 Gemini raw response length:', content.length);
    console.log('📄 Max tokens requested:', maxTokens);

    // 解析 JSON 响应
    let jsonContent = content;

    // 移除 markdown 代码块标记
    if (jsonContent.includes('```json')) {
      jsonContent = jsonContent
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '');
    } else if (jsonContent.includes('```')) {
      jsonContent = jsonContent.replace(/```\s*/g, '');
    }

    // 找到 JSON 对象
    const jsonStart = jsonContent.indexOf('{');
    const jsonEnd = jsonContent.lastIndexOf('}');

    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      jsonContent = jsonContent.substring(jsonStart, jsonEnd + 1);
    }

    jsonContent = jsonContent.trim();

    // 检查 JSON 是否被截断
    const openBraces = (jsonContent.match(/\{/g) || []).length;
    const closeBraces = (jsonContent.match(/\}/g) || []).length;
    const openBrackets = (jsonContent.match(/\[/g) || []).length;
    const closeBrackets = (jsonContent.match(/\]/g) || []).length;

    if (openBraces !== closeBraces || openBrackets !== closeBrackets) {
      console.error('❌ JSON appears to be truncated');
      console.error(`Braces: ${openBraces} open, ${closeBraces} close`);
      console.error(`Brackets: ${openBrackets} open, ${closeBrackets} close`);
      console.error(
        'Raw content (last 500 chars):',
        content.substring(content.length - 500)
      );
      throw new Error('Gemini response was truncated - JSON incomplete');
    }

    let parsed: GeneratedScenes;
    try {
      parsed = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error('❌ Failed to parse Gemini response as JSON');
      console.error('Parse error:', parseError);
      console.error('Raw content (first 500):', content.substring(0, 500));
      console.error(
        'Raw content (last 500):',
        content.substring(content.length - 500)
      );
      throw new Error('Failed to parse Gemini response as JSON');
    }

    // 验证响应结构
    if (
      !parsed.title ||
      !parsed.pet ||
      !Array.isArray(parsed.scenes) ||
      parsed.scenes.length === 0
    ) {
      throw new Error(
        'Invalid Gemini response structure: missing title, pet, or scenes'
      );
    }

    // 验证宠物信息
    if (!parsed.pet.species || !parsed.pet.description) {
      console.warn('⚠️  Pet information incomplete, using defaults');
      parsed.pet = {
        species: parsed.pet.species || 'pet',
        description:
          parsed.pet.description || 'a cute pet with expressive eyes',
        descriptionCn: parsed.pet.descriptionCn || '一只可爱的宠物',
      };
    }

    const expectedSceneCount = durationSeconds / 15;
    if (parsed.scenes.length !== expectedSceneCount) {
      console.warn(
        `⚠️  Expected ${expectedSceneCount} scenes, got ${parsed.scenes.length}`
      );
    }

    // 验证每个场景
    for (const scene of parsed.scenes) {
      if (!scene.sceneNumber || !scene.prompt) {
        throw new Error(`Invalid scene structure: ${JSON.stringify(scene)}`);
      }
    }

    console.log('✅ Gemini Vision generation successful!');
    console.log(
      '🐾 Pet identified:',
      parsed.pet.species,
      '-',
      parsed.pet.description.substring(0, 50) + '...'
    );
    console.log(
      '🎨 Global style:',
      parsed.globalStylePrefix?.substring(0, 50) + '...' || 'Not set'
    );
    console.log('📖 Story title:', parsed.title);
    console.log('🎬 Scene count:', parsed.scenes.length);

    return parsed;
  } catch (error) {
    console.error('❌ Gemini Vision scene generation failed:', error);
    throw error;
  }
}

/**
 * 为单个场景添加配乐提示词
 */
export function addMusicToPrompt(
  scenePrompt: string,
  musicPrompt?: string
): string {
  if (!musicPrompt) {
    return scenePrompt;
  }

  // 在提示词末尾添加配乐描述
  return `${scenePrompt}, with ${musicPrompt} background music`;
}
