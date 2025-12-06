# 角色一致性解决方案 v2

## 问题背景

在生成多场景视频时，人物外观一致性是核心挑战：
- 不同场景中同一角色的发型、肤色、服装可能发生变化
- 某些场景只需要部分角色出现，但统一的主体描述会导致不该出现的角色也被生成
- 用户上传宠物照片后，需要自动融入剧本故事

## 解决方案：角色参考卡 + 后台自动化

### 核心流程

```
用户上传宠物图片 + 选择/输入剧本
        ↓
AI 分析生成：globalStylePrefix + characters[]
        ↓
生成角色参考卡（Character Reference Sheet）
        ↓
存储到数据库，后续所有生成都引用此参考卡
        ↓
每个场景：参考卡 + 指定角色 + 场景描述 → 首帧图
        ↓
首帧图 + 合并后的视频提示词 → 视频
```

### 设计原则

1. **对用户透明**：用户不需要看到/编辑复杂的提示词，只看到场景描述
2. **后台自动化**：角色提取、参考卡生成、提示词拼接都在后台完成
3. **结构化存储**：所有数据结构化存储，便于 AI 解析和生成

---

## 数据结构设计

### 1. 模板配置 (TemplateConfig)

```typescript
interface TemplateConfig {
  // === 基础信息 ===
  name: string;                    // 模板英文名称
  nameCn: string;                  // 模板中文名称
  description: string;             // 英文描述（展示给用户）
  descriptionCn: string;           // 中文描述（展示给用户）
  tags: string[];                  // 标签：用于筛选

  // === 视频配置 ===
  durationSeconds: 60 | 120;       // 总时长
  aspectRatio: '16:9' | '9:16';    // 画面比例

  // === 风格配置（后台使用，不展示给用户） ===
  styleId: string;                 // 风格ID标识
  globalStylePrefix: string;       // 全局风格前缀（AI生成/管理员编辑）
  musicPrompt: string;             // 配乐提示词

  // === 角色配置 ===
  characters: Character[];         // 角色列表
  characterSheetPrompt: string;    // 角色参考卡生成提示词（自动拼接）
  characterSheetUrl?: string;      // 角色参考卡图片 URL（生成后保存）
}
```

### 2. 角色定义 (Character)

```typescript
interface Character {
  id: string;              // 角色唯一标识：如 "pet", "owner", "firefighter"
  role: 'primary' | 'secondary';  // 角色类型：主角/配角
  name: string;            // 角色名称（英文）：如 "Milo the Cat"
  nameCn: string;          // 角色名称（中文）：如 "猫咪米洛"
  description: string;     // 角色外观描述（英文，用于生成）
  descriptionCn: string;   // 角色外观描述（中文，展示给用户）
  sourceImageUrl?: string; // 来源图片（用户上传的宠物图片）
}
```

### 3. 场景定义 (Scene)

```typescript
interface Scene {
  id: string;
  sceneNumber: number;           // 场景序号

  // === 展示给用户的描述 ===
  description: string;           // 中文描述（简短，展示给用户）
  descriptionEn: string;         // 英文描述（简短，展示给用户）

  // === 角色配置 ===
  characterIds: string[];        // 该场景出场角色 ID 列表

  // === 首帧图（后台使用） ===
  firstFramePrompt: string;      // 首帧静态画面描述（后台拼接，不展示）
  frameStatus: 'pending' | 'generating' | 'completed' | 'failed';
  frameImageUrl?: string;

  // === 视频分镜 ===
  shots: Shot[];                 // 镜头列表（拆分后的多个镜头）

  // === 视频生成（后台使用） ===
  videoStatus: 'pending' | 'generating' | 'completed' | 'failed';
  videoUrl?: string;
}
```

### 4. 镜头定义 (Shot) - 新增

每个场景包含多个镜头，每个镜头有独立的时长和描述：

```typescript
interface Shot {
  id: string;
  shotNumber: number;            // 镜头序号（场景内）
  durationSeconds: number;       // 该镜头时长（秒），如 5, 7, 3
  prompt: string;                // 该镜头的动作/画面描述（英文）
  cameraMovement?: string;       // 镜头运动描述（可选）：如 "tracking shot", "close-up"
}
```

### 5. 场景 shots 示例

原来的单一 prompt：
```
"Christmas Eve night in a modern apartment, wide handheld establishing shot of a cozy living room. The boy lies on the sofa with headphones. The cat plays with yarn ball.
Cut to medium shot at cat level. The cat pads over and stands with front paws on cushion, meowing softly.
Cut to close-up of overloaded power strip. One plug glows faintly orange. A tiny spark jumps."
```

拆分为 shots：
```typescript
{
  sceneNumber: 1,
  shots: [
    {
      shotNumber: 1,
      durationSeconds: 6,
      prompt: "Wide handheld establishing shot of cozy living room. The boy lies on sofa with headphones, focused on laptop. The cat plays with yarn ball on rug, batting at it with soft paws.",
      cameraMovement: "establishing wide shot"
    },
    {
      shotNumber: 2,
      durationSeconds: 5,
      prompt: "Medium shot at cat level near sofa. The cat loses interest in yarn ball, pads over to sofa, stands with front paws on cushion, big eyes shining, meowing softly, bell jingling.",
      cameraMovement: "medium shot, cat POV"
    },
    {
      shotNumber: 3,
      durationSeconds: 4,
      prompt: "Close-up at floor level behind Christmas tree. Camera pushes in on overloaded power strip. One plug glows faintly orange. A tiny spark jumps, ember appears where curtain brushes plug.",
      cameraMovement: "slow push-in close-up"
    }
  ]
}
```

### 6. 视频生成时合并 shots

生成 15 秒视频时，自动合并：

```typescript
function buildVideoPrompt(scene: Scene, globalStylePrefix: string): string {
  const { shots } = scene;

  // 验证总时长
  const totalDuration = shots.reduce((sum, s) => sum + s.durationSeconds, 0);
  if (totalDuration !== 15) {
    console.warn(`Scene ${scene.sceneNumber} total duration is ${totalDuration}s, expected 15s`);
  }

  // 合并提示词
  const shotPrompts = shots.map((shot, index) => {
    const prefix = index === 0 ? '' : 'Cut to ';
    const duration = `(${shot.durationSeconds}s)`;
    return `${prefix}${shot.prompt} ${duration}`;
  });

  return `${globalStylePrefix}. Total duration 15 seconds.\n\n${shotPrompts.join('\n\n')}`;
}
```

输出示例：
```
Pixar-style 3D animated feature film look, full CG animation. Total duration 15 seconds.

Wide handheld establishing shot of cozy living room. The boy lies on sofa with headphones, focused on laptop. The cat plays with yarn ball on rug, batting at it with soft paws. (6s)

Cut to medium shot at cat level near sofa. The cat loses interest in yarn ball, pads over to sofa, stands with front paws on cushion, big eyes shining, meowing softly, bell jingling. (5s)

Cut to close-up at floor level behind Christmas tree. Camera pushes in on overloaded power strip. One plug glows faintly orange. A tiny spark jumps, ember appears where curtain brushes plug. (4s)
```

---

## 数据库 Schema 设计

```typescript
// src/config/db/schema.ts

export const scriptTemplate = pgTable('script_template', {
  id: text('id').primaryKey(),
  status: text('status').notNull().default('draft'),

  // === 基础信息 ===
  name: text('name').notNull().default(''),
  nameCn: text('name_cn'),
  description: text('description'),
  descriptionCn: text('description_cn'),
  tags: text('tags'),                    // JSON: string[]

  // === 视频配置 ===
  durationSeconds: integer('duration_seconds').notNull().default(60),
  aspectRatio: text('aspect_ratio').notNull().default('16:9'),

  // === 风格配置 ===
  styleId: text('style_id').notNull().default('pixar-3d'),
  globalStylePrefix: text('global_style_prefix'),
  musicPrompt: text('music_prompt'),

  // === 角色配置（新增） ===
  charactersJson: text('characters_json'),           // JSON: Character[]
  characterSheetPrompt: text('character_sheet_prompt'),
  characterSheetUrl: text('character_sheet_url'),

  // === 场景数据 ===
  // 包含 shots 结构
  // { scenes: [{ id, sceneNumber, description, descriptionEn, characterIds, firstFramePrompt, shots: [...], frameStatus, frameImageUrl, videoStatus, videoUrl }] }
  scenesJson: text('scenes_json'),

  // === 预览 ===
  thumbnailUrl: text('thumbnail_url'),
  previewVideoUrl: text('preview_video_url'),

  // === 草稿专用 ===
  petImageUrl: text('pet_image_url'),
  mergedVideoUrl: text('merged_video_url'),

  // === 其他 ===
  sortOrder: integer('sort_order').notNull().default(0),
  useCount: integer('use_count').notNull().default(0),
  creditsRequired: integer('credits_required'),
  createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()).notNull(),
});
```

---

## AI 解析剧本输出格式

当用户上传宠物图片 + 输入剧本描述时，AI 需要输出以下结构化 JSON：

### 输入

```
用户上传：宠物图片
用户输入：一个关于猫咪在圣诞节救主人的故事，主人是一个13岁的男孩
选择风格：Pixar 3D 动画
选择时长：60秒
```

### AI 输出格式

```json
{
  "globalStylePrefix": "Pixar-style 3D animated feature film look, full CG animation, not live-action, not photorealistic, fully stylized 3D characters with soft rounded shapes and appealing proportions, cinematic lighting, vibrant saturated colors, consistent character appearance across all shots",

  "characters": [
    {
      "id": "pet",
      "role": "primary",
      "name": "Hero Cat",
      "nameCn": "英雄猫咪",
      "description": "a small fluffy orange tabby cat with soft orange-and-cream striped fur, big expressive round eyes, a tiny pink nose, wearing a red Christmas knitted sweater with a tiny jingle bell collar, Pixar-style appealing character design",
      "descriptionCn": "一只毛茸茸的橘色虎斑猫，柔软的橙奶油色条纹毛发，大而有表现力的圆眼睛，小巧的粉色鼻子，穿着红色圣诞毛衣，戴着小铃铛项圈"
    },
    {
      "id": "owner",
      "role": "primary",
      "name": "The Boy",
      "nameCn": "男孩",
      "description": "a 13-year-old American boy with short dark brown hair, friendly face, wearing a white hoodie and comfortable dark jogger pants, stylized Pixar 3D animated character",
      "descriptionCn": "一个13岁的美国男孩，深棕色短发，友善的面容，穿着白色连帽衫和深色运动裤"
    },
    {
      "id": "firefighter",
      "role": "secondary",
      "name": "Firefighter",
      "nameCn": "消防员",
      "description": "a kind-looking firefighter in full gear with helmet, warm smile, stylized Pixar character",
      "descriptionCn": "一位穿戴整齐的消防员，戴着头盔，温暖的微笑"
    }
  ],

  "scenes": [
    {
      "sceneNumber": 1,
      "description": "平静的圣诞夜，男孩沉浸在游戏中，猫咪独自玩耍后想要陪伴却被拒绝。电源板悄悄过载。",
      "descriptionEn": "A peaceful Christmas Eve. The boy games while the cat plays alone, then seeks attention but is rejected. The power strip silently overloads.",
      "characterIds": ["pet", "owner"],
      "firstFramePrompt": "Christmas Eve night in modern apartment. Wide establishing shot of cozy living room with decorated Christmas tree, golden fairy lights, wrapped gifts. The boy lies on sofa with gaming headphones and laptop. The cat plays with red yarn ball on fluffy rug. Warm peaceful atmosphere.",
      "shots": [
        {
          "shotNumber": 1,
          "durationSeconds": 6,
          "prompt": "Wide handheld establishing shot of cozy living room with Christmas tree beside large window, light snow falling outside. The boy lies on sofa with headphones, focused on laptop. The cat happily plays with yarn ball on rug.",
          "cameraMovement": "establishing wide shot"
        },
        {
          "shotNumber": 2,
          "durationSeconds": 5,
          "prompt": "Medium shot at cat level. The cat pads over to sofa, stands with front paws on cushion, meowing softly, bell jingling. The boy glances down briefly, nudges cat away, reaches to plug more lights into power strip.",
          "cameraMovement": "medium shot"
        },
        {
          "shotNumber": 3,
          "durationSeconds": 4,
          "prompt": "Close-up behind Christmas tree. Camera pushes in on overloaded power strip. One plug glows orange. A tiny spark jumps, ember appears where curtain brushes plug. Thin smoke rises.",
          "cameraMovement": "slow push-in"
        }
      ]
    },
    {
      "sceneNumber": 2,
      "description": "猫咪发现火光，拼命警告男孩却被忽视，最终咬住袖子强行拉起他。",
      "descriptionEn": "The cat spots the fire glow, desperately warns the boy but is ignored, finally bites his sleeve to pull him up.",
      "characterIds": ["pet", "owner"],
      "firstFramePrompt": "Apartment corner, medium low-angle shot. The cat lying relaxed on rug near yarn ball, eyes half-closed. Boy on sofa with headphones in background. Peaceful moment before tension.",
      "shots": [
        {
          "shotNumber": 1,
          "durationSeconds": 4,
          "prompt": "Medium low-angle shot. The cat on rug suddenly lifts head, ears twitching. Faint orange glow reflects on wall. Cat stands up, body tense, tail puffing, pupils dilating.",
          "cameraMovement": "low angle"
        },
        {
          "shotNumber": 2,
          "durationSeconds": 5,
          "prompt": "Handheld medium shot. Cat rushes to sofa, jumps up meowing urgently, pawing at boy's arm. Boy frowns, pushes cat down. Cat jumps up again more desperate.",
          "cameraMovement": "handheld medium"
        },
        {
          "shotNumber": 3,
          "durationSeconds": 6,
          "prompt": "Dynamic shot showing curtain with growing flame. Camera whips to cat leaping onto coffee table, knocking over drink. Cat bites boy's sleeve, tugging hard. Boy jolts, finally looks up, coughs.",
          "cameraMovement": "dynamic whip pan"
        }
      ]
    },
    {
      "sceneNumber": 3,
      "description": "烟雾报警器响起，男孩看到火焰惊恐万分。他们逃向门口，但猫咪返回叼起珍贵的全家福。",
      "descriptionEn": "Smoke alarm blares. The boy sees flames in terror. They flee to the door, but the cat returns to save the precious family photo.",
      "characterIds": ["pet", "owner", "firefighter"],
      "firstFramePrompt": "Apartment tight close-up on boy's face in profile, head beginning to turn toward tree direction. Confused expression. Gaming headphones around neck. Faint haze in air. Tense atmosphere.",
      "shots": [
        {
          "shotNumber": 1,
          "durationSeconds": 4,
          "prompt": "Tight close-up on boy's face turning toward tree. Smoke alarm shrieks with strobe flashing. His eyes widen with terror as he sees burning tree. Gasps 'Oh no'.",
          "cameraMovement": "close-up"
        },
        {
          "shotNumber": 2,
          "durationSeconds": 5,
          "prompt": "Smoky handheld tracking shot in hallway. Boy stumbles toward front door, arm covering nose. Cat trots ahead gripping his sleeve, tugging him forward, bell jingling.",
          "cameraMovement": "tracking shot"
        },
        {
          "shotNumber": 3,
          "durationSeconds": 6,
          "prompt": "Low angle at open door. Boy stumbles out guided by firefighter. Cat skids to stop at threshold, sees framed family photo on console. Eyes narrow with determination. Darts back, jumps to console, bites photo frame.",
          "cameraMovement": "low angle"
        }
      ]
    },
    {
      "sceneNumber": 4,
      "description": "男孩在街边绝望等待。消防员抱着叼着照片的猫咪英雄走出，男孩含泪拥抱。「是你保护了我，我的小英雄。」",
      "descriptionEn": "The boy waits in despair on the curb. The firefighter emerges with the hero cat holding the photo. They embrace. 'It was you who protected me, my little hero.'",
      "characterIds": ["owner"],
      "firstFramePrompt": "Outside apartment building at night. Cinematic wide shot with light snow falling, red and blue emergency lights. The boy alone sitting on curb wrapped in silver emergency blanket, head bowed, clutching red cat collar, tear on cheek. Somber atmosphere.",
      "shots": [
        {
          "shotNumber": 1,
          "durationSeconds": 5,
          "prompt": "Cinematic crane shot of building exterior. Light snow falls through flashing emergency lights. Camera glides down to boy on curb wrapped in emergency blanket, clutching cat collar, tear rolling down cheek.",
          "cameraMovement": "crane shot"
        },
        {
          "shotNumber": 2,
          "durationSeconds": 5,
          "prompt": "Medium shot of building entrance, hazy with smoke. Firefighter steps out carrying sooty but bright-eyed cat still holding photo frame. Boy looks up in disbelief hearing the bell jingle. Firefighter kneels, transfers cat to boy's arms.",
          "cameraMovement": "medium shot"
        },
        {
          "shotNumber": 3,
          "durationSeconds": 5,
          "prompt": "Later in cozy temporary room with small Christmas tree. TV shows 'HERO CAT' news. Boy on sofa with medal-wearing cat beside him. Camera pulls back. Text fades in: 'It was you who protected me, my little hero.' Cat purrs, pushing head under boy's chin.",
          "cameraMovement": "slow pull back"
        }
      ]
    }
  ]
}
```

---

## 首帧图生成逻辑

### 输入
- `characterSheetUrl`：角色参考卡图片
- `characterIds`：该场景出场角色
- `characters`：所有角色定义
- `firstFramePrompt`：场景首帧描述
- `globalStylePrefix`：全局风格

### 提示词构建

```typescript
function buildFirstFramePrompt(
  globalStylePrefix: string,
  characterIds: string[],
  characters: Character[],
  firstFramePrompt: string
): string {
  // 获取出场角色
  const activeCharacters = characters
    .filter(c => characterIds.includes(c.id))
    .map(c => `"${c.name.toUpperCase()}"`)
    .join(' and ');

  // 获取不出场角色
  const excludedCharacters = characters
    .filter(c => !characterIds.includes(c.id))
    .map(c => c.name);

  let prompt = `${globalStylePrefix} scene.\n\n`;
  prompt += `Use ONLY the following character(s) from the reference image: ${activeCharacters}\n\n`;
  prompt += firstFramePrompt;

  if (excludedCharacters.length > 0) {
    prompt += `\n\nDO NOT include: ${excludedCharacters.join(', ')}`;
  }

  return prompt;
}
```

### 示例输出（场景4只有男孩）

```
Pixar-style 3D animated feature film look, full CG animation scene.

Use ONLY the following character(s) from the reference image: "THE BOY"

Outside apartment building at night. Cinematic wide shot with light snow falling, red and blue emergency lights. The boy alone sitting on curb wrapped in silver emergency blanket, head bowed, clutching red cat collar, tear on cheek. Somber atmosphere.

DO NOT include: Hero Cat, Firefighter
```

---

## 视频生成逻辑

### 输入
- `frameImageUrl`：首帧图
- `shots`：镜头列表
- `globalStylePrefix`：全局风格
- `characterIds`：出场角色（用于日志/调试）

### 提示词构建

```typescript
function buildVideoPrompt(
  globalStylePrefix: string,
  shots: Shot[]
): string {
  const totalDuration = shots.reduce((sum, s) => sum + s.durationSeconds, 0);

  const shotPrompts = shots.map((shot, index) => {
    const prefix = index === 0 ? '' : 'Cut to ';
    return `${prefix}${shot.prompt} (${shot.durationSeconds}s)`;
  });

  return `${globalStylePrefix}. Total duration ${totalDuration} seconds.\n\n${shotPrompts.join('\n\n')}`;
}
```

---

## 前端界面设计

### 管理员视角（script-creator）

1. **角色管理区**
   - 显示角色列表（名称、描述、来源图片）
   - 角色参考卡预览
   - 生成/重新生成参考卡按钮

2. **场景编辑区**
   - 显示场景描述（用户可见）
   - 出场角色多选（复选框）
   - 镜头列表：
     - 每个镜头：时长输入 + 描述文本框
     - 时长总计显示（需等于15秒）
     - 添加/删除镜头按钮
   - 首帧图预览 + 生成按钮
   - 视频预览 + 生成按钮

3. **隐藏字段（后台使用）**
   - globalStylePrefix
   - firstFramePrompt
   - 完整的 shots 数据

### 用户视角（生成页面）

1. **上传宠物图片**
2. **选择剧本模板**（只看到描述，不看到提示词）
3. **预览场景**（只看到中文描述）
4. **生成视频**

---

## 附录：角色参考卡生成提示词模板

```typescript
function buildCharacterSheetPrompt(
  globalStylePrefix: string,
  characters: Character[]
): string {
  const characterRows = characters.map((char, index) => {
    const rowLabel = `ROW ${index + 1} - "${char.name.toUpperCase()}"`;
    return `${rowLabel}:\nFront view, side view, and 3/4 view of ${char.description}. Appealing character design with consistent proportions.`;
  });

  return `${globalStylePrefix} character reference sheet, white background, clean layout with labeled sections.

${characterRows.join('\n\n')}

Character names clearly labeled below each row. Consistent lighting across all views. Professional character design sheet layout.`;
}
```

---

## 提示词模板规范（供 AI 解析使用）

### 核心原则

1. **用户可见字段**：只有描述（description），不含角色指令
2. **后台生成字段**：包含角色指令的完整提示词，由系统自动拼接
3. **AI 输出约束**：AI 生成的场景描述中不要写角色名，用通用指代

### 数据分层

```
┌─────────────────────────────────────────────────────────────────────┐
│  层级           │  内容                      │  谁编辑/生成          │
├─────────────────────────────────────────────────────────────────────┤
│  用户可见层      │  description (中/英文)     │  AI 生成 / 管理员编辑  │
│                 │  characterIds (出场角色)   │  AI 生成 / 管理员选择  │
├─────────────────────────────────────────────────────────────────────┤
│  后台生成层      │  firstFramePrompt          │  系统自动拼接          │
│                 │  完整视频提示词             │  系统自动拼接          │
└─────────────────────────────────────────────────────────────────────┘
```

### AI 输出格式约束

AI 解析剧本时，输出的 JSON 需要遵循以下规则：

#### 1. 场景描述（description）规则

```
✓ 正确：使用通用指代
  "男孩在街边绝望等待，手握项圈泪流满面。"
  "The boy waits in despair on the curb, clutching the collar."

✗ 错误：使用具体角色名或外观描述
  "Jake 在街边等待"
  "穿白色连帽衫的男孩在等待"
```

#### 2. firstFramePrompt 规则

AI 生成的 `firstFramePrompt` 应该是**纯场景画面描述**，不包含角色指令：

```
✓ 正确（AI 输出）：
  "Outside apartment building at night. Cinematic wide shot with light snow
   falling, red and blue emergency lights. The boy sitting on curb wrapped
   in silver emergency blanket, head bowed, clutching red cat collar, tear
   on cheek. Somber atmosphere."

✗ 错误（不应出现角色指令）：
  "Use ONLY THE BOY..."
  "DO NOT include cat..."
```

系统会自动拼接角色指令，最终生成完整提示词。

#### 3. Shot prompt 规则

每个 shot 的 prompt 也是**纯动作/画面描述**：

```
✓ 正确：
  {
    "shotNumber": 1,
    "durationSeconds": 5,
    "prompt": "Cinematic crane shot of building exterior. Light snow falls
               through flashing emergency lights. Camera glides down to boy
               on curb wrapped in emergency blanket, clutching cat collar."
  }
```

### 提示词拼接模板

#### 模板1：角色参考卡生成

```typescript
const TEMPLATE_CHARACTER_SHEET = `
{globalStylePrefix} character reference sheet, white background, clean layout with labeled sections.

{FOR EACH character}
ROW {index} - "{character.name.toUpperCase()}":
Front view, side view, and 3/4 view of {character.description}. Appealing character design with consistent proportions.
{END FOR}

Character names clearly labeled below each row. Consistent lighting across all views. Professional character design sheet layout.
`;
```

**示例输出：**
```
Pixar-style 3D animated feature film look, full CG animation character reference sheet, white background, clean layout with labeled sections.

ROW 1 - "HERO CAT":
Front view, side view, and 3/4 view of a small fluffy orange tabby cat with soft orange-and-cream striped fur, big expressive round eyes, a tiny pink nose, wearing a red Christmas knitted sweater with a tiny jingle bell collar. Appealing character design with consistent proportions.

ROW 2 - "THE BOY":
Front view, side view, and 3/4 view of a 13-year-old American boy with short dark brown hair, friendly face, wearing a white hoodie and comfortable dark jogger pants. Appealing character design with consistent proportions.

Character names clearly labeled below each row. Consistent lighting across all views. Professional character design sheet layout.
```

#### 模板2：首帧图生成

```typescript
const TEMPLATE_FIRST_FRAME = `
{globalStylePrefix} scene.

Use ONLY the following character(s) from the reference image: {activeCharacterNames}

{firstFramePrompt}

{IF hasExcludedCharacters}
DO NOT include: {excludedCharacterNames}
{END IF}
`;
```

**示例输出（只有男孩）：**
```
Pixar-style 3D animated feature film look, full CG animation scene.

Use ONLY the following character(s) from the reference image: "THE BOY"

Outside apartment building at night. Cinematic wide shot with light snow falling, red and blue emergency lights. The boy sitting on curb wrapped in silver emergency blanket, head bowed, clutching red cat collar, tear on cheek. Somber atmosphere.

DO NOT include: Hero Cat, Firefighter
```

**示例输出（猫和男孩）：**
```
Pixar-style 3D animated feature film look, full CG animation scene.

Use ONLY the following character(s) from the reference image: "HERO CAT" and "THE BOY"

Christmas Eve night in modern apartment. Wide establishing shot of cozy living room with decorated Christmas tree, golden fairy lights glowing. The boy lies on sofa with gaming headphones and laptop. The cat plays with red yarn ball on fluffy rug. Warm peaceful atmosphere.

DO NOT include: Firefighter
```

#### 模板3：视频生成

```typescript
const TEMPLATE_VIDEO = `
{globalStylePrefix}. Total duration {totalDuration} seconds.

{FOR EACH shot, index}
{IF index > 0}Cut to {END IF}{shot.prompt} ({shot.durationSeconds}s)
{END FOR}
`;
```

**示例输出：**
```
Pixar-style 3D animated feature film look, full CG animation. Total duration 15 seconds.

Cinematic crane shot of building exterior. Light snow falls through flashing emergency lights. Camera glides down to boy on curb wrapped in emergency blanket, clutching cat collar, tear rolling down cheek. (5s)

Cut to medium shot of building entrance, hazy with smoke. Firefighter steps out carrying sooty but bright-eyed cat still holding photo frame. Boy looks up in disbelief hearing the bell jingle. Firefighter kneels, transfers cat to boy's arms. (5s)

Cut to later in cozy temporary room with small Christmas tree. TV shows 'HERO CAT' news. Boy on sofa with medal-wearing cat beside him. Camera pulls back. Text fades in: 'It was you who protected me, my little hero.' (5s)
```

### AI 解析剧本的完整 Prompt

当用户输入剧本描述时，使用以下 system prompt 让 AI 输出结构化 JSON：

```
你是一个专业的动画剧本分析师。请根据用户的剧本描述，输出结构化的 JSON 数据。

## 输出格式要求

1. globalStylePrefix: 全局风格描述，包含动画风格、画面质感、光影特点
2. characters: 角色列表，每个角色包含：
   - id: 唯一标识（如 "pet", "owner"）
   - role: "primary" 或 "secondary"
   - name: 英文名称（如 "Hero Cat"）
   - nameCn: 中文名称
   - description: 详细外观描述（英文，用于生成图片）
   - descriptionCn: 中文外观描述（用于展示）
3. scenes: 场景列表，每个场景包含：
   - sceneNumber: 场景序号
   - description: 中文简短描述（展示给用户，不含角色名）
   - descriptionEn: 英文简短描述
   - characterIds: 该场景出场角色 ID 数组
   - firstFramePrompt: 首帧静态画面描述（英文，纯场景描述，不含角色指令）
   - shots: 镜头列表，每个镜头包含：
     - shotNumber: 镜头序号
     - durationSeconds: 时长（秒），所有镜头时长之和必须等于 15
     - prompt: 该镜头的动作/画面描述（英文）
     - cameraMovement: 镜头运动类型（可选）

## 重要规则

1. 每个场景的 shots 时长总和必须等于 15 秒
2. description 中使用通用指代（"男孩"、"猫咪"），不要用具体名字
3. firstFramePrompt 和 shot.prompt 中可以用 "the boy"、"the cat" 等通用指代
4. 不要在任何提示词中写角色指令（如 "Use ONLY"、"DO NOT include"），这些由系统自动添加
5. 主角（primary）一般是宠物和主人，配角（secondary）是其他人物

## 示例输入
"一个关于猫咪在圣诞节救主人的故事，主人是一个13岁的男孩，猫咪发现火灾后救了他"

## 示例输出格式
{
  "globalStylePrefix": "...",
  "characters": [...],
  "scenes": [...]
}
```

---

## 迁移计划

### Phase 1：数据结构
- [ ] 更新数据库 schema（添加 charactersJson, characterSheetUrl 等字段）
- [ ] 更新 TypeScript 类型定义
- [ ] 迁移现有模板数据

### Phase 2：后台功能
- [ ] 角色参考卡生成 API
- [ ] 修改首帧图生成 API（支持参考卡 + 指定角色）
- [ ] 修改视频生成 API（支持 shots 合并）

### Phase 3：前端界面
- [ ] 角色管理区
- [ ] 场景编辑区（支持 shots）
- [ ] 场景角色选择

### Phase 4：AI 集成
- [ ] AI 解析用户剧本输出结构化 JSON
- [ ] AI 识别用户宠物生成角色描述
