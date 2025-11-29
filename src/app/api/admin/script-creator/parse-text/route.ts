/**
 * 解析文本并生成模板结构
 * POST /api/admin/script-creator/parse-text
 * 使用 Gemini 从用户输入的长文本（故事、剧本）中提取信息，生成标准模板 JSON
 */

import { NextRequest, NextResponse } from 'next/server';

import { getAuth } from '@/core/auth';
import { createEvolinkClient } from '@/extensions/ai/providers/evolink/client';
import { checkScriptTemplateWritePermission } from '../_lib/check-admin';

// 目标表单结构（与前端 SceneData、CharacterData 一致）
interface TargetCharacter {
  id: string;
  role: 'primary' | 'secondary';
  name: string;
  nameCn: string;
  description: string;
  descriptionCn: string;
}

interface TargetShot {
  shotNumber: number;
  durationSeconds: number;
  prompt: string;
  cameraMovement: string;
}

interface TargetScene {
  sceneNumber: number;
  characterIds: string[];
  firstFramePrompt: string;
  shots: TargetShot[];
  description: string;
  descriptionEn: string;
}

interface TargetConfig {
  name: string;
  nameCn: string;
  description: string;
  descriptionCn: string;
  tags: string[];
  styleId: string;
  globalStylePrefix: string;
  characters: TargetCharacter[];
  characterSheetUrl: string;
  durationSeconds: number;
  aspectRatio: '16:9' | '9:16';
  musicPrompt: string;
}

interface TargetTemplate {
  config: TargetConfig;
  scenes: TargetScene[];
}

interface ParseTextRequest {
  textContent: string; // 用户输入的长文本（故事、剧本等）
  durationSeconds?: 60 | 120; // 可选：指定时长
  aspectRatio?: '16:9' | '9:16'; // 可选：指定比例
}

/**
 * 构建 Gemini 提示词，从长文本中提取并生成模板结构
 *
 * 设计要点：
 * 1. 明确角色定位：专业宠物视频编剧 + 分镜师
 * 2. 用户输入可能不完整，需要 AI 补充细节
 * 3. 严格约束输出格式，确保 JSON 有效
 * 4. 提供具体示例帮助 AI 理解期望输出
 */
function buildTextToTemplatePrompt(
  textContent: string,
  durationSeconds: 60 | 120,
  aspectRatio: '16:9' | '9:16'
): string {
  const sceneCount = durationSeconds / 15;
  const orientationNote = aspectRatio === '9:16'
    ? '竖屏模式，适合手机观看，构图更聚焦于角色'
    : '横屏模式，适合电脑/电视观看，可以展示更多环境';

  return `# 角色设定
你是一位专业的宠物视频编剧和分镜师，擅长将简单的故事想法转化为完整的视频分镜脚本。你的工作是：
1. 理解用户的故事创意（可能很简短或不完整）
2. 补充缺失的细节（角色外观、场景描述、情节发展）
3. 创建专业的分镜脚本，适合 AI 视频生成

# 用户输入的故事创意
"""
${textContent}
"""

# 你的任务
将上述创意转化为一个 ${durationSeconds} 秒的视频模板，包含 ${sceneCount} 个场景。
画面比例：${aspectRatio}（${orientationNote}）

# 重要补充规则
如果用户输入缺少以下信息，你需要合理补充：

## 角色补充
- 如果没有描述宠物外观 → 根据故事氛围设计（如：温馨故事用橘猫，冒险故事用边牧）
- 如果没有描述人类角色 → 设计符合故事的角色（如：主人、小孩、消防员）
- 每个角色都需要详细的外观描述（毛色、体型、服装等）

## 故事结构补充
- ${sceneCount} 个场景需要有完整的故事弧线：
  - 场景 1-${Math.ceil(sceneCount * 0.25)}: 开场/日常/铺垫
  - 场景 ${Math.ceil(sceneCount * 0.25) + 1}-${Math.ceil(sceneCount * 0.75)}: 冲突/高潮/转折
  - 场景 ${Math.ceil(sceneCount * 0.75) + 1}-${sceneCount}: 解决/结局/情感升华

## 细节补充
- 补充场景环境（室内/室外、天气、时间、灯光）
- 补充角色动作和表情
- 补充情感氛围

# 输出格式（严格遵守）

你必须输出一个有效的 JSON 对象，格式如下：

{
  "config": {
    "name": "英文模板名称（简洁有吸引力，如 Christmas Cat Rescue）",
    "nameCn": "中文模板名称（如 圣诞猫咪救援）",
    "description": "英文故事简介（1-2句话概括故事）",
    "descriptionCn": "中文故事简介",
    "tags": ["cat/dog", "主题标签", "情感标签"],
    "styleId": "pixar-3d",
    "globalStylePrefix": "Pixar-style 3D animation, cinematic lighting, vibrant colors, soft rounded character designs, consistent character appearance throughout all scenes",
    "characters": [
      {
        "id": "pet",
        "role": "primary",
        "name": "英文名（如 Milo）",
        "nameCn": "中文名（如 米洛）",
        "description": "详细英文外观描述，50-80字。包括：毛色、花纹、眼睛颜色、体型、特征、服装配饰。示例：A fluffy orange tabby cat with big round amber eyes, small pink nose, white chest patch, wearing a red Christmas sweater with golden jingle bell collar",
        "descriptionCn": "中文外观描述"
      }
    ],
    "characterSheetUrl": "",
    "durationSeconds": ${durationSeconds},
    "aspectRatio": "${aspectRatio}",
    "musicPrompt": "背景音乐风格描述（如 Heartwarming orchestral, building tension, triumphant finale）"
  },
  "scenes": [
    {
      "sceneNumber": 1,
      "characterIds": ["pet", "owner"],
      "firstFramePrompt": "首帧图提示词（重要！）。这是一个静态画面描述，用于生成场景的第一帧图片。要求：1）描述环境和灯光 2）描述角色位置和姿态 3）描述情绪氛围 4）不要包含动作或镜头运动词汇。30-50字。示例：Cozy living room with warm afternoon sunlight. Christmas tree with fairy lights by the window. Boy kneeling on rug, cat sitting beside him looking up adoringly. Peaceful holiday atmosphere.",
      "shots": [
        {
          "shotNumber": 1,
          "durationSeconds": 3,
          "prompt": "镜头1动作（简短！只描述一个动作，15字以内）。示例：Wide shot of cozy living room. Boy reaches up to place star on tree top.",
          "cameraMovement": "wide"
        },
        {
          "shotNumber": 2,
          "durationSeconds": 3,
          "prompt": "镜头2动作。示例：Cat watches curiously, head tilted, tail swishing gently.",
          "cameraMovement": "medium"
        },
        {
          "shotNumber": 3,
          "durationSeconds": 3,
          "prompt": "镜头3动作（通常是特写/反应）。示例：Close-up of cat's face, eyes sparkling with interest.",
          "cameraMovement": "close-up"
        },
        {
          "shotNumber": 4,
          "durationSeconds": 3,
          "prompt": "镜头4动作。示例：Boy kneels down, scratches behind cat's ears lovingly.",
          "cameraMovement": "medium"
        },
        {
          "shotNumber": 5,
          "durationSeconds": 3,
          "prompt": "镜头5动作（场景收尾/过渡）。示例：Cat purrs contentedly, leaning into boy's hand.",
          "cameraMovement": "close-up"
        }
      ],
      "description": "场景中文描述（20-40字，概括这个场景讲什么）",
      "descriptionEn": "Scene description in English"
    }
  ]
}

# 关键规则

## 角色 ID 规则
- 宠物主角必须用 id="pet"，role="primary"
- 人类主人用 id="owner"
- 其他人类用描述性 id：如 "child"、"firefighter"、"veterinarian"
- characterIds 数组列出该场景中出现的所有角色

## 镜头 (shots) 规则
- 每个场景固定 5 个镜头，每个 3 秒
- 每个镜头只描述一个简单动作
- prompt 必须简短（15-25 字英文）
- cameraMovement 可选值：wide, medium, close-up, extreme close-up, low angle, high angle, tracking, handheld, POV

## firstFramePrompt 规则（非常重要！）
- 这是用于图生图的静态画面描述
- 必须描述：环境 + 角色位置 + 姿态 + 灯光 + 氛围
- 不能包含：动作动词（running, jumping）、镜头词汇（pan, zoom）
- 长度：30-50 个英文单词

## 标签 (tags) 规则
- 必须包含宠物类型：cat, dog
- 包含主题：christmas, adventure, rescue, family, friendship
- 包含情感：heartwarming, funny, exciting, emotional

# 输出要求
直接输出 JSON 对象，不要有任何解释、markdown 代码块或其他文字。
确保 JSON 语法正确，可以被直接解析。
从 { 开始，以 } 结束。`;
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

    const body: ParseTextRequest = await request.json();
    const {
      textContent,
      durationSeconds = 60,
      aspectRatio = '16:9'
    } = body;

    if (!textContent || textContent.trim().length === 0) {
      return NextResponse.json({ success: false, error: '请输入故事或剧本内容' }, { status: 400 });
    }

    if (textContent.trim().length < 50) {
      return NextResponse.json({ success: false, error: '内容太短，请输入更详细的故事描述（至少50字）' }, { status: 400 });
    }

    console.log('\n📄 ========== Parse Text to Template ==========');
    console.log('📝 Input length:', textContent.length);
    console.log('⏱️  Duration:', durationSeconds, 'seconds');
    console.log('📐 Aspect ratio:', aspectRatio);

    // 调用 Gemini 进行文本转模板
    const evolinkClient = createEvolinkClient();
    const prompt = buildTextToTemplatePrompt(textContent, durationSeconds, aspectRatio);

    console.log('🤖 Calling Gemini for text-to-template conversion...');

    const response = await evolinkClient.chatCompletion({
      model: 'gemini-2.5-flash',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.5, // 中等温度，平衡创意和稳定性
      max_tokens: 16000, // 大模板需要更多 token
    });

    const content = response.choices[0]?.message?.content?.trim();

    if (!content) {
      throw new Error('Gemini returned empty response');
    }

    console.log('📄 Gemini response length:', content.length);

    // 解析 Gemini 返回的 JSON
    let jsonResult = content;

    // 移除可能的 markdown 代码块
    if (jsonResult.includes('```json')) {
      jsonResult = jsonResult.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    } else if (jsonResult.includes('```')) {
      jsonResult = jsonResult.replace(/```\s*/g, '');
    }

    // 提取 JSON 对象
    const jsonStart = jsonResult.indexOf('{');
    const jsonEnd = jsonResult.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      jsonResult = jsonResult.substring(jsonStart, jsonEnd + 1);
    }

    let parsedTemplate: TargetTemplate;
    try {
      parsedTemplate = JSON.parse(jsonResult);
    } catch (parseError) {
      console.error('❌ Failed to parse Gemini response:', parseError);
      console.error('Raw response (first 1000):', content.substring(0, 1000));
      console.error('Raw response (last 500):', content.substring(content.length - 500));
      return NextResponse.json({
        success: false,
        error: 'AI 生成的格式有误，请重试',
      }, { status: 500 });
    }

    // 验证结构
    if (!parsedTemplate.config || !parsedTemplate.scenes || !Array.isArray(parsedTemplate.scenes)) {
      return NextResponse.json({
        success: false,
        error: '生成的模板结构不完整，请重试',
      }, { status: 500 });
    }

    // 验证场景数量
    const expectedSceneCount = durationSeconds / 15;
    if (parsedTemplate.scenes.length !== expectedSceneCount) {
      console.warn(`⚠️  Expected ${expectedSceneCount} scenes, got ${parsedTemplate.scenes.length}`);
    }

    // 验证并修复 scenes
    for (let i = 0; i < parsedTemplate.scenes.length; i++) {
      const scene = parsedTemplate.scenes[i];

      // 确保 sceneNumber 正确
      scene.sceneNumber = i + 1;

      // 确保 characterIds 存在
      if (!scene.characterIds || scene.characterIds.length === 0) {
        scene.characterIds = ['pet']; // 默认包含主角
      }

      // 确保 shots 存在且有效
      if (!scene.shots || scene.shots.length === 0) {
        console.warn(`⚠️  Scene ${i + 1} missing shots, generating default`);
        scene.shots = [
          { shotNumber: 1, durationSeconds: 3, prompt: 'Scene establishing shot', cameraMovement: 'wide' },
          { shotNumber: 2, durationSeconds: 3, prompt: 'Main action begins', cameraMovement: 'medium' },
          { shotNumber: 3, durationSeconds: 3, prompt: 'Character reaction', cameraMovement: 'close-up' },
          { shotNumber: 4, durationSeconds: 3, prompt: 'Action continues', cameraMovement: 'medium' },
          { shotNumber: 5, durationSeconds: 3, prompt: 'Scene conclusion', cameraMovement: 'wide' },
        ];
      }

      // 修复 shot numbers 和默认值
      scene.shots.forEach((shot, j) => {
        shot.shotNumber = j + 1;
        if (!shot.durationSeconds) shot.durationSeconds = 3;
        if (!shot.cameraMovement) shot.cameraMovement = 'medium';
        if (!shot.prompt) shot.prompt = `Shot ${j + 1} action`;
      });

      // 确保有 firstFramePrompt
      if (!scene.firstFramePrompt) {
        scene.firstFramePrompt = scene.shots[0]?.prompt || 'Scene establishing shot';
      }

      // 确保有描述
      if (!scene.description) scene.description = `场景 ${i + 1}`;
      if (!scene.descriptionEn) scene.descriptionEn = `Scene ${i + 1}`;
    }

    // 确保 characters 存在
    if (!parsedTemplate.config.characters || parsedTemplate.config.characters.length === 0) {
      parsedTemplate.config.characters = [{
        id: 'pet',
        role: 'primary',
        name: 'Main Character',
        nameCn: '主角',
        description: 'The main character of the story',
        descriptionCn: '故事的主角',
      }];
    }

    // 确保 config 字段完整
    parsedTemplate.config.durationSeconds = durationSeconds;
    parsedTemplate.config.aspectRatio = aspectRatio;
    if (!parsedTemplate.config.characterSheetUrl) {
      parsedTemplate.config.characterSheetUrl = '';
    }
    if (!parsedTemplate.config.styleId) {
      parsedTemplate.config.styleId = 'pixar-3d';
    }
    if (!parsedTemplate.config.tags || parsedTemplate.config.tags.length === 0) {
      parsedTemplate.config.tags = ['pet'];
    }

    console.log('✅ Text-to-template conversion successful!');
    console.log('📋 Template name:', parsedTemplate.config.name);
    console.log('👥 Characters:', parsedTemplate.config.characters.length);
    console.log('🎬 Scenes:', parsedTemplate.scenes.length);
    console.log('⏱️  Duration:', durationSeconds, 'seconds');

    return NextResponse.json({
      success: true,
      template: parsedTemplate,
      message: `成功生成模板：${parsedTemplate.scenes.length} 个场景，${durationSeconds} 秒`,
    });

  } catch (error) {
    console.error('Parse text error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '解析失败，请重试' },
      { status: 500 }
    );
  }
}
