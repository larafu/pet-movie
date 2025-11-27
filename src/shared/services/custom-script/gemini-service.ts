/**
 * Gemini Scene Generation Service
 * 使用 Gemini 将用户提示词转换为分镜提示词
 */

import { createEvolinkClient } from '@/extensions/ai/providers/evolink/client';
import type { GeneratedScenes, VideoStyleId } from './types';
import { getStylePrefix, getVideoStyleById } from './types';

/**
 * 生成分镜提示词的 Gemini prompt
 */
function buildGeminiPrompt(
  userPrompt: string,
  durationSeconds: 60 | 120,
  aspectRatio: '16:9' | '9:16',
  styleId: VideoStyleId,
  customStyle?: string,
  musicPrompt?: string
): string {
  const sceneCount = durationSeconds / 15; // 每段15秒
  const orientationNote =
    aspectRatio === '9:16'
      ? 'The video is in portrait mode (9:16), suitable for mobile viewing. Frame compositions should be vertical.'
      : 'The video is in landscape mode (16:9), suitable for desktop viewing. Frame compositions should be horizontal.';

  const musicNote = musicPrompt
    ? `\nBackground Music Style: ${musicPrompt}\nInclude this music atmosphere in each scene prompt.`
    : '';

  // 获取风格前缀
  const stylePrefix = getStylePrefix(styleId, customStyle);
  const styleName = styleId === 'custom'
    ? 'custom style'
    : (getVideoStyleById(styleId)?.name || 'Pixar 3D CG');

  return `You are a professional pet video storyboard artist specializing in ${styleName}. A user wants to create a ${durationSeconds}-second custom pet video.

User's Creative Description:
"${userPrompt}"

Visual Style: ${stylePrefix}

${orientationNote}
${musicNote}

Please split this story into ${sceneCount} scenes, each 15 seconds long.

IMPORTANT REQUIREMENTS:
1. Each scene prompt MUST start with the exact style prefix: "${stylePrefix}"
2. Each scene prompt MUST include "the same pet" to maintain character consistency (the actual pet appearance will be provided via reference image)
3. Each scene prompt should describe clear settings, actions, and camera movements
4. Scene 1 is the opening, Scene ${sceneCount} is the ending (should have a satisfying conclusion)
5. Each 15-second scene should have internal action progression (mini-scenes within)
6. Maintain the ${styleName} style consistently throughout ALL scenes
7. Include appropriate lighting, atmosphere, and emotional beats matching the style
8. Prompts should be detailed enough for AI video generation (100-200 words each)
9. NEVER use copyrighted brand names in prompts (no Pixar, Disney, Ghibli, Miyazaki, Marvel, etc.) - use generic descriptive terms instead

PROMPT STRUCTURE for each scene:
"${stylePrefix}, [Setting/Environment], the same pet [specific actions and movements], [camera work], [atmosphere/mood], [any specific details]"

OUTPUT FORMAT (JSON only, no other text):
{
  "title": "Story Title in English",
  "scenes": [
    {
      "sceneNumber": 1,
      "prompt": "${stylePrefix}, [full scene prompt in English]...",
      "description": "简短的中文说明（一句话描述这个场景）",
      "descriptionEn": "Brief English description (one sentence describing this scene)"
    },
    {
      "sceneNumber": 2,
      "prompt": "${stylePrefix}, [full scene prompt in English]...",
      "description": "简短的中文说明",
      "descriptionEn": "Brief English description"
    }
  ]
}

IMPORTANT: Each scene MUST include both "description" (Chinese) and "descriptionEn" (English) fields.

Generate exactly ${sceneCount} scenes. Output ONLY the JSON, nothing else.`;
}

/**
 * 使用 Gemini 生成分镜提示词
 */
export async function generateScenes(
  userPrompt: string,
  durationSeconds: 60 | 120,
  aspectRatio: '16:9' | '9:16',
  styleId: VideoStyleId = 'pixar-3d',
  customStyle?: string,
  musicPrompt?: string
): Promise<GeneratedScenes> {
  console.log('\n🎬 ========== Gemini Scene Generation ==========');
  console.log('📝 User prompt:', userPrompt.substring(0, 100) + '...');
  console.log('⏱️  Duration:', durationSeconds, 'seconds');
  console.log('📐 Aspect ratio:', aspectRatio);
  console.log('🎨 Style:', styleId, customStyle ? `(custom: ${customStyle.substring(0, 50)}...)` : '');
  console.log('🎵 Music prompt:', musicPrompt || 'None');

  const evolinkClient = createEvolinkClient();
  const geminiPrompt = buildGeminiPrompt(
    userPrompt,
    durationSeconds,
    aspectRatio,
    styleId,
    customStyle,
    musicPrompt
  );

  console.log('🤖 Calling Gemini via Evolink...');

  try {
    const response = await evolinkClient.chatCompletion({
      model: 'gemini-2.5-flash',
      messages: [
        {
          role: 'user',
          content: geminiPrompt,
        },
      ],
      temperature: 0.7, // 稍高一点的温度以获得更有创意的内容
      max_tokens: 4000, // 足够容纳多个场景
    });

    const content = response.choices[0]?.message?.content?.trim();

    if (!content) {
      throw new Error('Gemini returned empty response');
    }

    console.log('📄 Gemini raw response length:', content.length);

    // 解析 JSON 响应
    // 尝试提取 JSON（Gemini 可能会在 JSON 前后添加额外文本或 markdown 代码块）
    let jsonContent = content;

    // 移除 markdown 代码块标记 ```json ... ```
    if (jsonContent.includes('```json')) {
      jsonContent = jsonContent.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    } else if (jsonContent.includes('```')) {
      jsonContent = jsonContent.replace(/```\s*/g, '');
    }

    // 尝试找到 JSON 对象的开始和结束
    const jsonStart = jsonContent.indexOf('{');
    const jsonEnd = jsonContent.lastIndexOf('}');

    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      jsonContent = jsonContent.substring(jsonStart, jsonEnd + 1);
    }

    // 清理可能的尾部空白和换行
    jsonContent = jsonContent.trim();

    let parsed: GeneratedScenes;
    try {
      parsed = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error('❌ Failed to parse Gemini response as JSON');
      console.error('Raw content:', content.substring(0, 500));
      throw new Error('Failed to parse Gemini response as JSON');
    }

    // 验证响应结构
    if (!parsed.title || !Array.isArray(parsed.scenes) || parsed.scenes.length === 0) {
      throw new Error('Invalid Gemini response structure');
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

    console.log('✅ Gemini scenes generated successfully!');
    console.log('📖 Story title:', parsed.title);
    console.log('🎬 Scene count:', parsed.scenes.length);

    return parsed;
  } catch (error) {
    console.error('❌ Gemini scene generation failed:', error);
    throw error;
  }
}

/**
 * 为单个场景添加配乐提示词
 */
export function addMusicToPrompt(scenePrompt: string, musicPrompt?: string): string {
  if (!musicPrompt) {
    return scenePrompt;
  }

  // 在提示词末尾添加配乐描述
  return `${scenePrompt}, with ${musicPrompt} background music`;
}
