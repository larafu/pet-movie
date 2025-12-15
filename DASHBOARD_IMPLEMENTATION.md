# Dashboard 实现文档

## 📋 实现概述

本次实现完整还原了参考项目（RemixMart）的 Dashboard 页面设计，集成了社区Feed、AI创作、Remix功能等核心特性。

## 🎯 实现功能

### 1. 核心页面

#### Dashboard 主页 (`/dashboard`)
- ✅ 社区广场 Tab：展示所有公开的AI创作作品
- ✅ 我的作品 Tab：展示用户自己的作品（公开+私密）
- ✅ 瀑布流布局（响应式：1/2/3/4列）
- ✅ 实时点赞交互
- ✅ Remix 功能（一键复用提示词）
- ✅ 登录后的顶部导航

#### 作品详情页 (`/dashboard/[id]`)
- ✅ 完整的提示词展示
- ✅ 模型信息、宽高比、创建时间
- ✅ 点赞、Remix、分享、下载功能
- ✅ 权限控制（私密作品仅作者可见）

### 2. 核心组件

#### FloatingPromptBar（浮动提示栏）
**文件位置**: `src/shared/components/floating-prompt-bar/`

**功能**:
- 图片/视频模式切换
- 模型选择（支持新增的7个图片模型 + 2个视频模型）
- 高级设置：
  - 图片：宽高比、分辨率、自定义宽高
  - 视频：宽高比、时长、运动幅度
- 图片上传（最多10张）
- 多语言切换（中文/英文）
- **免费用户隐私限制**:
  - 免费用户强制公开分享
  - 显示锁图标 + Tooltip 提示
  - 点击跳转到订阅页面

**免费用户判定逻辑**:
```typescript
const isFreeUser = !user?.hasSubscription;
```

#### MasonryGrid（瀑布流布局）
**文件位置**: `src/shared/components/masonry-grid/`

**特性**:
- CSS column 实现
- 响应式断点：
  - 移动端：1列
  - sm（640px）：2列
  - lg（1024px）：3列
  - xl（1280px）：4列
- 4px 间距

#### FeedCard（作品卡片）
**文件位置**: `src/shared/components/feed-card/`

**功能**:
- 支持图片和视频展示
- Hover 显示操作按钮（点赞、Remix）
- 显示作者、点赞数
- 图片懒加载 + 渐入动画
- 视频自动播放（muted, loop）

#### LoggedInHeader（登录后导航）
**文件位置**: `src/shared/components/logged-in-header/`

**功能**:
- Logo + 应用名称
- 积分显示（点击跳转到积分页面）
- 升级按钮（跳转到定价页面）
- 个人主页链接
- 通知按钮
- 移动端响应式菜单

### 3. API 路由

#### Feed API (`GET /api/dashboard/feed`)
**文件位置**: `src/app/api/dashboard/feed/route.ts`

**参数**:
- `tab`: `all`（社区）| `mine`（我的作品）
- `type`: `video` | `image` | `all`
- `limit`: 每页数量（默认50）
- `offset`: 分页偏移量

**返回**:
```json
{
  "code": 0,
  "data": {
    "items": [
      {
        "id": "xxx",
        "type": "image|video",
        "src": "媒体URL",
        "alt": "描述",
        "username": "用户名",
        "userId": "用户ID",
        "likes": 0,
        "prompt": "提示词",
        "aspectRatio": 1.77,
        "isLiked": false,
        "model": "模型名称",
        "createdAt": "ISO时间"
      }
    ],
    "total": 50,
    "hasMore": true
  }
}
```

#### 点赞 API (`POST /api/ai-tasks/[id]/like`)
**文件位置**: `src/app/api/ai-tasks/[id]/like/route.ts`

**请求体**:
```json
{
  "liked": true  // true=点赞, false=取消点赞
}
```

**返回**:
```json
{
  "code": 0,
  "data": {
    "liked": true,
    "likeCount": 123
  }
}
```

### 4. 模型配置

#### 模型配置文件
**文件位置**: `src/extensions/ai/models/config.ts`

**新增模型**:

**视频模型**:
- VidGen-10s（10积分，10秒）
- VidGen-15s（15积分，15秒）

**图片模型**:
- ImgGen-Standard（2积分）- 默认
- ImgGen-Pro（5积分）- Pro标签
- NanoBanana（3积分）
- NanoBanana Pro（5积分）- Pro标签
- NanoBanana 2（4积分）- New标签
- Gemini Flash Image（3积分）
- Gemini Pro Image（5积分）- Pro标签

**字段映射**:
```typescript
interface AIModel {
  id: string;              // 前端显示ID
  displayName: string;     // UI展示名称
  actualModel: string;     // 后端实际调用的模型名
  credits: number;         // 消耗积分
  supportedRatios: AspectRatio[];
  supportedInputs: InputType[];
  badge?: 'pro' | 'new';   // 标签
  description: string;      // 多语言key
}
```

### 5. 多语言配置

#### 新增文件:
- `src/config/locale/messages/zh/dashboard.json`
- `src/config/locale/messages/en/dashboard.json`
- `src/config/locale/messages/zh/models.json`
- `src/config/locale/messages/en/models.json`

**已更新**: `src/config/locale/index.ts` 添加了 `dashboard` 和 `models` 路径

## 🚀 使用指南

### 访问 Dashboard
```
/dashboard
```

### Remix 功能使用
1. 在 Feed 中点击任意作品的 "Remix" 按钮
2. 或访问详情页点击 "Remix" 按钮
3. 自动跳转到 Dashboard，提示词自动填充到 FloatingPromptBar
4. 调整参数后点击生成

### API 调用示例

**获取社区 Feed**:
```typescript
const response = await fetch('/api/dashboard/feed?tab=all&limit=50');
const data = await response.json();
```

**点赞作品**:
```typescript
const response = await fetch('/api/ai-tasks/task_id/like', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ liked: true }),
});
```

## 📂 文件结构

```
src/
├── app/
│   ├── [locale]/(landing)/
│   │   └── dashboard/
│   │       ├── page.tsx           # Dashboard 服务端页面
│   │       ├── client.tsx         # Dashboard 客户端逻辑
│   │       └── [id]/
│   │           ├── page.tsx       # 详情页服务端
│   │           └── client.tsx     # 详情页客户端
│   └── api/
│       ├── dashboard/
│       │   └── feed/
│       │       └── route.ts       # Feed API
│       └── ai-tasks/
│           └── [id]/
│               └── like/
│                   └── route.ts   # 点赞 API
│
├── shared/
│   └── components/
│       ├── floating-prompt-bar/
│       │   ├── index.tsx          # 主组件
│       │   ├── dropdown-menu.tsx  # 下拉菜单
│       │   └── image-upload-modal.tsx  # 图片上传
│       ├── masonry-grid/
│       │   └── index.tsx          # 瀑布流
│       ├── feed-card/
│       │   └── index.tsx          # Feed卡片
│       └── logged-in-header/
│           └── index.tsx          # 登录导航
│
├── extensions/
│   └── ai/
│       └── models/
│           └── config.ts          # 模型配置
│
└── config/
    └── locale/
        ├── index.ts               # 更新路径配置
        └── messages/
            ├── zh/
            │   ├── dashboard.json
            │   └── models.json
            └── en/
                ├── dashboard.json
                └── models.json
```

## 🔧 技术要点

### 1. 免费用户隐私控制
```typescript
// FloatingPromptBar 中的实现
const isFreeUser = !user?.hasSubscription;

<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        onClick={() => {
          if (!isFreeUser) {
            setIsPublic(!isPublic);
          }
        }}
        disabled={isFreeUser}
      >
        {isPublic ? <LockOpen /> : <Lock />}
        {isFreeUser && <Crown className="h-3 w-3" />}
      </button>
    </TooltipTrigger>
    {isFreeUser && (
      <TooltipContent>
        <p>免费用户的作品将自动公开分享</p>
        <Link href="/pricing">升级会员解锁私密模式</Link>
      </TooltipContent>
    )}
  </Tooltip>
</TooltipProvider>
```

### 2. Remix 功能实现
```typescript
// 方式1: URL参数
router.push(`/dashboard?remix=${taskId}`);

// Dashboard 读取参数
const remixId = searchParams.get('remix');
if (remixId) {
  const item = feedItems.find((i) => i.id === remixId);
  setRemixPrompt(item.prompt);
  setRemixMode(item.type);
}

// 方式2: 直接回调
const handleRemix = (item: FeedItem) => {
  setRemixPrompt(item.prompt || '');
  setRemixMode(item.type);
  // 滚动到 FloatingPromptBar
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
};
```

### 3. 瀑布流性能优化
- 使用 CSS column 而非 JS 计算
- 图片懒加载（Next.js Image 组件）
- 视频 autoPlay + muted（避免自动播放限制）
- transform 动画（GPU加速）

## ⚠️ 注意事项

1. **数据库字段**:
   - `aiTask` 表已有 `isPublic` 和 `likeCount` 字段
   - `videoLike` 表用于记录点赞关系

2. **图片/视频 URL 提取**:
   - 视频：优先使用 `watermarkedVideoUrl`，回退到 `finalVideoUrl`
   - 图片：从 `taskResult` JSON 中提取

3. **SEO**: Dashboard 页面设置 `robots: noindex, nofollow`（不需要被索引）

4. **性能**:
   - Feed 默认加载50条，支持分页
   - 考虑后续增加虚拟滚动（如果数据量>100）

## 🔜 后续优化建议

1. **缓存策略**: 使用 SWR 或 React Query 缓存 Feed 数据
2. **视频缩略图**: 生成视频缩略图提升加载体验
3. **无限滚动**: 替代分页，提升用户体验
4. **图片优化**: 使用 Next.js Image 的 blur placeholder
5. **实时更新**: WebSocket 推送新作品
6. **搜索过滤**: 按关键词、模型、时间范围筛选

## 📝 测试清单

- [ ] Dashboard 页面正常加载
- [ ] 社区/我的作品 Tab 切换
- [ ] FloatingPromptBar 所有功能
- [ ] 免费用户隐私限制（锁图标 + Tooltip）
- [ ] 点赞功能（本地状态 + API同步）
- [ ] Remix 功能（URL参数 + 直接回调）
- [ ] 详情页展示
- [ ] 多语言切换（中文/英文）
- [ ] 响应式布局（移动端/桌面端）
- [ ] 图片/视频正确显示

## 🎉 完成状态

✅ 所有核心功能已实现
✅ 多语言配置已完成
✅ API 路由已创建
✅ 组件已模块化
✅ 符合项目规范（中文注释、错误处理、多语言）

---

**实现日期**: 2025-12-12
**参考项目**: RemixMart Clone App
**实现人员**: Claude Opus 4.5
