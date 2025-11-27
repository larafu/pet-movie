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

## CRITICAL PET REFERENCE RULES (MUST FOLLOW)

**ALWAYS use "the same pet" or "the pet" to refer to the animal subject.**

NEVER use specific pet descriptions such as:
- NO breed names (golden retriever, persian cat, husky, corgi, etc.)
- NO color descriptions (orange cat, white dog, black puppy, etc.)
- NO size descriptions (small dog, big cat, tiny kitten, etc.)
- NO species details (fluffy dog, tabby cat, spotted puppy, etc.)

CORRECT examples:
- "the same pet looks up curiously"
- "the pet runs through the forest"
- "close-up on the pet's expressive eyes"

INCORRECT examples (DO NOT USE):
- "the golden retriever runs through the forest" ❌
- "the orange cat looks up curiously" ❌
- "the fluffy white puppy plays" ❌

The actual pet appearance comes from the user's uploaded photo via image-to-image generation. Your prompts must be pet-appearance-agnostic.

## OTHER IMPORTANT REQUIREMENTS

1. Scene 1 is the opening (establish setting and character)
2. Scene ${sceneCount} is the ending (satisfying emotional conclusion)
3. Describe camera movements and transitions between shots clearly
4. Include emotional beats and rhythm changes within each scene
5. Total content per scene should be ~12 seconds (leaving buffer for AI generation)
6. NEVER use copyrighted brand names (no Pixar, Disney, Ghibli, Marvel, specific song titles, artist names, etc.)
7. Use generic descriptive terms for style and music

## PROMPT STRUCTURE

Write each scene prompt as a continuous cinematographic description that flows through multiple shots:

"[Style description], SHOT 1: [camera type + movement], [setting], the same pet [action]. SHOT 2: [camera transition], [new angle/framing], the pet [continues action/new action], [environmental detail]. SHOT 3: [camera work], [close-up or detail shot], [emotion/expression], [atmosphere]. [Optional SHOT 4: transition element]."

## OUTPUT FORMAT (JSON only, no other text):

{
  "title": "Story Title in English",
  "scenes": [
    {
      "sceneNumber": 1,
      "prompt": "[Complete multi-shot scene description for VIDEO generation, 150-250 words]",
      "firstFramePrompt": "[First frame/keyframe prompt for IMAGE generation - describe ONLY the opening shot (Shot 1), single static image, 30-50 words, focus on: setting, pet pose/position, lighting, atmosphere. NO camera movements, NO transitions, NO multiple shots]",
      "description": "场景概述（中文）",
      "descriptionEn": "Scene overview (English)"
    }
  ]
}

IMPORTANT for firstFramePrompt:
- This is for generating a SINGLE STATIC IMAGE (the first frame/keyframe)
- Describe ONE moment in time, NOT a sequence
- Focus on: environment, pet's pose, expression, lighting, mood
- Do NOT include camera movements or transitions
- Keep it concise (30-50 words)
- MUST use "the same pet" or "the pet" - NEVER use breed/color/size descriptions

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

  // 根据场景数量动态计算 token 限制
  // 每个场景约需 500-800 tokens（包含 prompt + firstFramePrompt + descriptions）
  const sceneCount = durationSeconds / 15;
  const estimatedTokensPerScene = 800;
  const maxTokens = Math.max(8000, sceneCount * estimatedTokensPerScene + 1000);

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
      max_tokens: maxTokens, // 动态计算，确保足够容纳所有场景
    });

    const content = response.choices[0]?.message?.content?.trim();

    if (!content) {
      throw new Error('Gemini returned empty response');
    }

    console.log('📄 Gemini raw response length:', content.length);
    console.log('📄 Max tokens requested:', maxTokens);

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

    // 检查 JSON 是否被截断（没有正确闭合）
    const openBraces = (jsonContent.match(/\{/g) || []).length;
    const closeBraces = (jsonContent.match(/\}/g) || []).length;
    const openBrackets = (jsonContent.match(/\[/g) || []).length;
    const closeBrackets = (jsonContent.match(/\]/g) || []).length;

    if (openBraces !== closeBraces || openBrackets !== closeBrackets) {
      console.error('❌ JSON appears to be truncated (mismatched braces/brackets)');
      console.error(`Braces: ${openBraces} open, ${closeBraces} close`);
      console.error(`Brackets: ${openBrackets} open, ${closeBrackets} close`);
      console.error('Raw content (last 500 chars):', content.substring(content.length - 500));
      throw new Error('Gemini response was truncated - JSON incomplete');
    }

    let parsed: GeneratedScenes;
    try {
      parsed = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error('❌ Failed to parse Gemini response as JSON');
      console.error('Parse error:', parseError);
      console.error('Raw content (first 500):', content.substring(0, 500));
      console.error('Raw content (last 500):', content.substring(content.length - 500));
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
