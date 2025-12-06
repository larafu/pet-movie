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
  durationSeconds: number; // 镜头时长（秒），支持小数如 1.2, 3.5
  prompt: string; // 详细镜头描述，支持占位符 [PET] [OWNER]
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
 * 构建 Gemini 提示词，从长文本中提取并生成专业分镜脚本
 *
 * 设计要点：
 * 1. 使用占位符 [PET] [OWNER] 支持模板复用
 * 2. 每个镜头使用 durationSeconds 控制时长（支持小数如 1.2, 3.5）
 * 3. 每个镜头 prompt 需要详细描述（60-80字）
 * 4. 镜头描述需要逻辑连贯，解释角色状态
 */
function buildTextToTemplatePrompt(
  textContent: string,
  durationSeconds: 60 | 120,
  aspectRatio: '16:9' | '9:16'
): string {
  // 每个场景15秒，总时长/15 = 场景数（60秒=4场景，120秒=8场景）
  const sceneCount = durationSeconds / 15;
  const orientationNote =
    aspectRatio === '9:16'
      ? '竖屏模式，适合手机观看，构图更聚焦于角色'
      : '横屏模式，适合电脑/电视观看，可以展示更多环境';

  return `# 角色设定
你是一位专业的宠物视频编剧和分镜师，擅长创建高质量的 AI 视频生成分镜脚本。

你的工作目标是创建【可复用的模板】：
- 使用占位符 [PET] 和 [OWNER] 代替具体角色描述
- 运行时会将这些占位符替换为角色的完整外观描述
- 这样同一个模板可以用于不同的宠物和主人

# 用户输入的故事创意
"""
${textContent}
"""

# 你的任务
将上述创意转化为一个 ${durationSeconds} 秒的视频模板，包含 ${sceneCount} 个场景。
画面比例：${aspectRatio}（${orientationNote}）
每个场景 15 秒，对应一次 Sora2 API 调用。
**重要**：每个场景必须包含 5 个镜头（shot），确保 60 秒视频有约 20 个分镜，120 秒视频有约 40 个分镜。

# 关键概念：镜头 (Shot) 是分镜描述而非视频切片

**重要理解**：每个 15 秒场景是一次完整的 AI 视频生成调用。
Shots（镜头）的作用是将 15 秒分解为 5 个时间段的详细描述，让 AI 更好理解每个时间点应该发生什么。
所有 shots 的描述会合并成一个连贯的 15 秒视频。

# 占位符系统

使用以下占位符，运行时会被替换：
- [PET] → 宠物的完整外观描述（如 "fluffy orange tabby cat with big amber eyes and red Christmas sweater"）
- [OWNER] → 主人的完整外观描述（如 "young boy with brown hair wearing blue pajamas"）

示例占位符用法：
- "[PET] sits by the Christmas tree, ears perked up"
- "[OWNER] kneels down beside [PET], hand reaching out"

# 重要补充规则

## 角色定义
- characters 数组定义角色的完整外观描述
- 这些描述会在运行时替换对应的占位符
- 每个角色都需要详细的外观描述（50-80字）

## 故事结构
- ${sceneCount} 个场景需要有完整的故事弧线：
  - 场景 1-${Math.ceil(sceneCount * 0.25)}: 开场/日常/铺垫
  - 场景 ${Math.ceil(sceneCount * 0.25) + 1}-${Math.ceil(sceneCount * 0.75)}: 冲突/高潮/转折
  - 场景 ${Math.ceil(sceneCount * 0.75) + 1}-${sceneCount}: 解决/结局/情感升华
  - 保证故事连贯，有起承转合，每个scenes链接画面需要自然过渡。
  - 画面合理，逻辑自洽。

# 输出格式（严格遵守）

{
  "config": {
    "name": "英文模板名称（简洁有吸引力）",
    "nameCn": "中文模板名称",
    "description": "英文故事简介（1-2句话）",
    "descriptionCn": "中文故事简介",
    "tags": ["cat/dog", "主题标签", "情感标签"],
    "styleId": "pixar-3d",
    "globalStylePrefix": "Pixar-style 3D animation, cinematic lighting, vibrant colors, soft rounded character designs, consistent character appearance throughout all scenes",
    "characters": [
      {
        "id": "pet",
        "role": "primary",
        "name": "英文名",
        "nameCn": "中文名",
        "description": "详细英文外观描述，50-80字。这是 [PET] 占位符的替换值。包括：毛色、花纹、眼睛颜色、体型、特征、服装配饰",
        "descriptionCn": "中文外观描述"
      },
      {
        "id": "owner",
        "role": "secondary",
        "name": "英文名",
        "nameCn": "中文名",
        "description": "详细英文外观描述。这是 [OWNER] 占位符的替换值。包括：年龄、发型、服装、特征",
        "descriptionCn": "中文外观描述"
      }
    ],
    "characterSheetUrl": "",
    "durationSeconds": ${durationSeconds},
    "aspectRatio": "${aspectRatio}",
    "musicPrompt": "背景音乐风格描述"
  },
  "scenes": [
    {
      "sceneNumber": 1,
      "characterIds": ["pet", "owner"],
      "firstFramePrompt": "【首帧图 50-80 字，必须包含 [PET] 和 [OWNER] 占位符！】静态画面。必须详细描述：1)环境场景+灯光 2)[PET]的位置、姿态、表情、眼神、耳朵尾巴状态 3)[OWNER]的位置、姿态、表情、眼神 4)角色间空间关系 5)整体氛围。示例：Warm cozy living room bathed in golden afternoon sunlight streaming through frost-edged windows, soft shadows on wooden floor. Christmas tree in right corner with twinkling lights. [OWNER] kneels on beige carpet center-frame, body leaning forward eagerly, eyes sparkling with wonder, gentle smile, gazing up at tree. [PET] sits close beside him on left, fluffy tail wrapped around paws, head tilted upward, round amber eyes wide with curiosity, ears perked forward, whiskers twitching. Peaceful holiday warmth radiates through the scene.",
      "shots": [
        {
          "shotNumber": 1,
          "durationSeconds": 2.0,
          "prompt": "【详细分镜描述 60-80 字】使用占位符。描述：1)画面构图 2)角色动作 3)角色状态原因 4)环境细节 5)情绪氛围。示例：Wide establishing shot of a cozy living room bathed in warm afternoon sunlight. [OWNER] reaches up on tiptoes to place a golden star on top of the Christmas tree.",
          "cameraMovement": "wide"
        },
        {
          "shotNumber": 2,
          "durationSeconds": 2.0,
          "prompt": "【详细分镜描述】Medium shot focusing on [PET]. The cat's ears perk up slightly, head tilting to one side with innocent curiosity, watching [OWNER]'s movements.",
          "cameraMovement": "medium"
        },
        {
          "shotNumber": 3,
          "durationSeconds": 2.0,
          "prompt": "【详细分镜描述】Close-up on [PET]'s face showing curious expression, eyes tracking the swinging ornaments on the tree.",
          "cameraMovement": "close-up"
        },
        {
          "shotNumber": 4,
          "durationSeconds": 2.0,
          "prompt": "【详细分镜描述】Medium shot of [OWNER] stepping back to admire the decorated tree, a satisfied smile on the face.",
          "cameraMovement": "medium"
        },
        {
          "shotNumber": 5,
          "durationSeconds": 2.0,
          "prompt": "【详细分镜描述】Wide shot showing both [OWNER] and [PET] together in the warm living room, establishing the peaceful holiday atmosphere.",
          "cameraMovement": "wide"
        }
      ],
      "description": "场景中文描述（20-40字）",
      "descriptionEn": "Scene description in English"
    }
  ]
}

# 关键规则

## 角色 ID 和占位符对应
- id="pet" → 使用 [PET] 占位符
- id="owner" → 使用 [OWNER] 占位符
- 其他角色如 id="firefighter" → 使用 [FIREFIGHTER] 占位符

## 镜头 (shots) 规则 - 非常重要！

### 时长规则
- 每个场景总时长 10 秒
- 使用 durationSeconds 定义每个镜头的时长
- 支持小数点（如 1.5, 2.0, 2.5 秒）
- 每个场景固定 5 个镜头（确保 60 秒约 30 个分镜）
- 所有镜头的 durationSeconds 之和应等于 10 秒
- 建议时长分配：2s + 2s + 2s + 2s + 2s 或 1.5s + 2s + 2.5s + 2s + 2s

### Prompt 详细描述规则（最重要！）
每个 shot.prompt 必须包含以下要素，60-80 个英文单词：

1. **画面构图**：描述镜头类型和视角
2. **角色动作**：具体描述角色正在做什么
3. **状态原因**：如果角色应该注意到某事但没有，必须解释为什么
   - 例如：为什么没注意到火？→ 背对着、戴着耳机、专注于其他事
   - 例如：为什么没听到声音？→ 音乐太大声、睡着了
4. **环境细节**：光线、氛围、周围物品
5. **情绪表达**：角色的表情和情绪状态

### Prompt 示例
✓ 好的描述（详细、有逻辑）：
"Medium shot of the kitchen. [PET] sits on the counter near the stove, back turned to the pot, completely absorbed in watching a bird through the window. Steam rises from the pot behind the cat, but [PET] doesn't notice because their attention is captured by the fluttering sparrow outside. Warm sunlight streams through the window, creating a cozy but subtly tense atmosphere."

✗ 差的描述（太简短、无逻辑）：
"Cat sits on counter. Steam rises from pot."

## cameraMovement 可选值
wide, medium, close-up, extreme close-up, low angle, high angle, tracking, handheld, POV, over-the-shoulder

## firstFramePrompt 规则（最重要！强制约束！）

首帧图决定了整个场景的视觉基调，必须极其详细！50-80 个英文单词。

### 强制要求：
- **必须包含 [PET] 占位符**：描述宠物的位置、姿态、表情、眼神
- **如果场景有主人，必须包含 [OWNER] 占位符**：描述主人的位置、姿态、表情、眼神
- **占位符必须与 characterIds 数组对应**：characterIds 中的每个角色都必须在 firstFramePrompt 中用占位符描述

### 必须包含的 6 个要素：

1. **环境场景**：具体描述场景细节（家具、装饰、物品摆放、背景元素）
2. **灯光氛围**：光源位置、光线质感、色温、阴影效果（如 golden sunlight streaming through windows, soft warm glow from fireplace）
3. **[PET] 角色描述**：
   - 具体位置（在画面哪里：左侧、中央、前景）
   - 身体姿态（坐着、站着、趴着、蜷缩）
   - 面部表情（好奇、开心、担忧、警觉）
   - 眼神方向（看向哪里、眼睛状态）
   - 身体细节（耳朵、尾巴、爪子的状态）
4. **[OWNER] 角色描述**（如有）：
   - 具体位置和身体姿态
   - 面部表情和眼神方向
   - 与宠物的空间关系
5. **角色间互动暗示**：两个角色之间的视觉联系（是否对视、距离远近）
6. **整体情绪氛围**：画面传达的情感基调（温馨、紧张、欢乐、悲伤）

### firstFramePrompt 示例

✓ 好的首帧描述（详细、有占位符）：
"Warm cozy living room bathed in golden afternoon sunlight streaming through frost-edged windows, casting long soft shadows across the wooden floor. A tall Christmas tree stands in the right corner, decorated with twinkling fairy lights and red ornaments. [OWNER] kneels on the soft beige carpet in the center, body leaning forward with eager anticipation, eyes sparkling with childlike wonder, gentle smile on face, gazing lovingly up at the tree top. [PET] sits close beside him on the left, fluffy tail wrapped contentedly around front paws, head tilted slightly upward, round amber eyes wide with innocent curiosity, small ears perked forward attentively, whiskers twitching slightly. The warm atmosphere radiates peaceful holiday joy and the tender bond between pet and owner."

✗ 差的首帧描述（太简单、缺少细节）：
"Living room with Christmas tree. [OWNER] and [PET] near the tree. Cozy atmosphere."

✗ 错误的首帧描述（缺少占位符）：
"A boy kneels in the living room. A cat sits beside him." ← 必须使用 [PET] [OWNER] 占位符！

## 标签 (tags) 规则
- 必须包含宠物类型：cat, dog
- 包含主题：christmas, adventure, rescue, family
- 包含情感：heartwarming, funny, exciting

# 输出要求
直接输出 JSON 对象，不要有任何解释、markdown 代码块或其他文字。
确保 JSON 语法正确，从 { 开始，以 } 结束。`;
}

export async function POST(request: NextRequest) {
  try {
    // 验证用户登录
    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 验证管理员权限
    const permissionError = await checkScriptTemplateWritePermission(
      session.user.id
    );
    if (permissionError) return permissionError;

    const body: ParseTextRequest = await request.json();
    const { textContent, durationSeconds = 60, aspectRatio = '16:9' } = body;

    if (!textContent || textContent.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: '请输入故事或剧本内容' },
        { status: 400 }
      );
    }

    if (textContent.trim().length < 50) {
      return NextResponse.json(
        {
          success: false,
          error: '内容太短，请输入更详细的故事描述（至少50字）',
        },
        { status: 400 }
      );
    }

    console.log('\n📄 ========== Parse Text to Template ==========');
    console.log('📝 Input length:', textContent.length);
    console.log('⏱️  Duration:', durationSeconds, 'seconds');
    console.log('📐 Aspect ratio:', aspectRatio);

    // 调用 Gemini 进行文本转模板
    const evolinkClient = createEvolinkClient();
    const prompt = buildTextToTemplatePrompt(
      textContent,
      durationSeconds,
      aspectRatio
    );

    console.log('🤖 Calling Gemini for text-to-template conversion...');

    const response = await evolinkClient.chatCompletion({
      model: 'gemini-2.5-pro',
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
      console.error(
        'Raw response (last 500):',
        content.substring(content.length - 500)
      );
      return NextResponse.json(
        {
          success: false,
          error: 'AI 生成的格式有误，请重试',
        },
        { status: 500 }
      );
    }

    // 验证结构
    if (
      !parsedTemplate.config ||
      !parsedTemplate.scenes ||
      !Array.isArray(parsedTemplate.scenes)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: '生成的模板结构不完整，请重试',
        },
        { status: 500 }
      );
    }

    // 验证场景数量（每个场景15秒）
    const expectedSceneCount = durationSeconds / 15;
    if (parsedTemplate.scenes.length !== expectedSceneCount) {
      console.warn(
        `⚠️  Expected ${expectedSceneCount} scenes, got ${parsedTemplate.scenes.length}`
      );
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
          {
            shotNumber: 1,
            durationSeconds: 3,
            prompt: '[PET] in scene establishing shot',
            cameraMovement: 'wide',
          },
          {
            shotNumber: 2,
            durationSeconds: 3,
            prompt: 'Main action begins with [PET]',
            cameraMovement: 'medium',
          },
          {
            shotNumber: 3,
            durationSeconds: 3,
            prompt: '[PET] reaction shot',
            cameraMovement: 'close-up',
          },
          {
            shotNumber: 4,
            durationSeconds: 3,
            prompt: 'Action continues with [PET]',
            cameraMovement: 'medium',
          },
          {
            shotNumber: 5,
            durationSeconds: 3,
            prompt: 'Scene conclusion with [PET]',
            cameraMovement: 'wide',
          },
        ];
      }

      // 修复 shot numbers 和默认值
      scene.shots.forEach((shot, j) => {
        shot.shotNumber = j + 1;
        if (!shot.durationSeconds) shot.durationSeconds = 3;
        if (!shot.cameraMovement) shot.cameraMovement = 'medium';
        if (!shot.prompt) shot.prompt = `Shot ${j + 1} action with [PET]`;
      });

      // 确保有 firstFramePrompt
      if (!scene.firstFramePrompt) {
        scene.firstFramePrompt =
          scene.shots[0]?.prompt || '[PET] in scene establishing shot';
      }

      // 确保有描述
      if (!scene.description) scene.description = `场景 ${i + 1}`;
      if (!scene.descriptionEn) scene.descriptionEn = `Scene ${i + 1}`;
    }

    // 确保 characters 存在
    if (
      !parsedTemplate.config.characters ||
      parsedTemplate.config.characters.length === 0
    ) {
      parsedTemplate.config.characters = [
        {
          id: 'pet',
          role: 'primary',
          name: 'Main Character',
          nameCn: '主角',
          description: 'The main character of the story',
          descriptionCn: '故事的主角',
        },
      ];
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
    if (
      !parsedTemplate.config.tags ||
      parsedTemplate.config.tags.length === 0
    ) {
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
      {
        success: false,
        error: error instanceof Error ? error.message : '解析失败，请重试',
      },
      { status: 500 }
    );
  }
}
