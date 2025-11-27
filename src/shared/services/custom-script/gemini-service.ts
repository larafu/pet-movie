/**
 * Gemini Scene Generation Service
 * 使用 Gemini 将用户提示词转换为分镜提示词
 */

import { createEvolinkClient } from '@/extensions/ai/providers/evolink/client';
import type { GeneratedScenes, VideoStyleId } from './types';
import { getStylePrefix, getVideoStyleById } from './types';

/**
 * 生成分镜提示词的 Gemini prompt
 *
 * 结构说明：
 * - 每个 scene 是一个 15 秒的场景段落
 * - 每个场景段落内包含 3-4 个分镜（shots）设计
 * - 分镜之间有自然的过渡和节奏变化
 * - 整个场景控制在约 12 秒的实际内容（留有余量）
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
    ? `\nBackground Music Style: ${musicPrompt} (use generic music style descriptions, avoid specific song names or artist names)`
    : '';

  // 获取风格前缀
  const stylePrefix = getStylePrefix(styleId, customStyle);
  const styleName = styleId === 'custom'
    ? 'custom style'
    : (getVideoStyleById(styleId)?.name || '3D Animation');

  return `You are a professional pet video storyboard artist and cinematographer specializing in ${styleName}. A user wants to create a ${durationSeconds}-second custom pet video.

User's Creative Description:
"${userPrompt}"

Visual Style: ${stylePrefix}

${orientationNote}
${musicNote}

Please split this story into ${sceneCount} scene segments, each approximately 12-15 seconds long.

## SCENE STRUCTURE REQUIREMENTS

Each scene segment (15 seconds) should contain 3-4 SHOTS (分镜) with:
- **Shot 1 (0-3s)**: Establishing shot or transition from previous scene
- **Shot 2 (3-7s)**: Main action or key moment
- **Shot 3 (7-11s)**: Reaction, detail, or secondary action
- **Shot 4 (11-15s)**: Conclusion or lead-in to next scene (optional)

## SHOT DESIGN ELEMENTS

For each shot within a scene, include:
1. **Camera type**: wide/medium/close-up/extreme close-up/aerial/low angle/tracking/pan/zoom
2. **Camera movement**: static/dolly in/dolly out/pan left-right/tilt up-down/crane/handheld/orbit
3. **Subject action**: specific pet movements and expressions
4. **Environment details**: background elements, lighting changes
5. **Timing cues**: pace indicators (slow motion, normal speed, quick cuts)

## IMPORTANT REQUIREMENTS

1. Each scene prompt MUST include "the same pet" to maintain character consistency
2. Scene 1 is the opening (establish setting and character)
3. Scene ${sceneCount} is the ending (satisfying emotional conclusion)
4. Describe camera movements and transitions between shots clearly
5. Include emotional beats and rhythm changes within each scene
6. Total content per scene should be ~12 seconds (leaving buffer for AI generation)
7. NEVER use copyrighted brand names (no Pixar, Disney, Ghibli, Marvel, specific song titles, artist names, etc.)
8. Use generic descriptive terms for style and music

## PROMPT STRUCTURE

Write each scene prompt as a continuous cinematographic description that flows through multiple shots:

"[Style description], SHOT 1: [camera type + movement], [setting], the same pet [action]. SHOT 2: [camera transition], [new angle/framing], the pet [continues action/new action], [environmental detail]. SHOT 3: [camera work], [close-up or detail shot], [emotion/expression], [atmosphere]. [Optional SHOT 4: transition element]."

## OUTPUT FORMAT (JSON only, no other text):

{
  "title": "Story Title in English",
  "scenes": [
    {
      "sceneNumber": 1,
      "prompt": "[Complete multi-shot scene description in English, 150-250 words, describing 3-4 shots with camera work and transitions]",
      "description": "场景概述（中文，一句话描述这个场景的主要内容和情感）",
      "descriptionEn": "Scene overview (English, one sentence describing the main content and emotion)"
    }
  ]
}

Generate exactly ${sceneCount} scenes. Each prompt should read like a mini-screenplay with clear visual directions. Output ONLY the JSON, nothing else.`;
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
