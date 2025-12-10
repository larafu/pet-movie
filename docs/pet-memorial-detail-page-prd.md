# Pet Memorial Detail Page - Product Requirements Document (PRD)

## 1. 概述

### 1.1 目标
为宠物纪念页面创建一个优雅、温馨、功能完善的详情页，用于展示已逝宠物的纪念内容，让主人和访客能够缅怀、致敬和分享对宠物的爱。

### 1.2 设计灵感
基于 v0 设计（https://v0-pet-memorial-page-design.vercel.app/），采用单列纵向布局，注重情感表达和用户体验。

### 1.3 核心价值
- **情感共鸣**: 提供一个温馨的空间让用户表达对宠物的思念
- **社交互动**: 允许访客点蜡烛、留言，共同纪念
- **内容展示**: 优雅地展示宠物的照片、视频和故事
- **病毒传播**: 鼓励用户分享纪念页面和创建自己的纪念电影

---

## 2. 页面结构与功能

### 2.1 Hero Section - "In Loving Memory"

#### 设计要求
- **布局**: 全宽区域，渐变背景（from-muted/50 to-background）
- **内容居中**: 所有元素垂直居中排列
- **间距**: py-16 md:py-24

#### 元素清单
1. **宠物头像**
   - 尺寸: 128px x 128px (移动端), 160px x 160px (桌面端)
   - 样式: 圆形，4px 白色边框，阴影效果
   - 定位: 居中

2. **标题区域**
   - 小标签: "IN LOVING MEMORY" (uppercase, tracking-wider, 小号字体, muted-foreground)
   - 宠物名字:
     - 字体: font-serif (Playfair Display 或类似)
     - 大小: text-4xl md:text-5xl lg:text-6xl
     - 加粗: font-bold
     - 颜色: text-foreground

3. **日期信息**
   - 图标: Calendar icon (w-4 h-4)
   - 格式: "Born: Month Day, Year - Passed: Month Day, Year"
   - 颜色: text-muted-foreground
   - 大小: text-sm md:text-base

4. **物种和年龄**
   - 格式: "Dog • 5 years" 或 "Cat • 3 years"
   - 颜色: text-muted-foreground
   - 大小: text-sm
   - 分隔符: "•"

5. **纪念留言**
   - 样式: blockquote, italic
   - 大小: text-lg md:text-xl
   - 颜色: text-muted-foreground
   - 左边框: 4px border-primary/50
   - 内边距: pl-4
   - 最大宽度: max-w-2xl

6. **提交者信息**
   - 格式: "Submitted by {name}"
   - 大小: text-sm
   - 颜色: text-muted-foreground

7. **操作按钮**
   - 点蜡烛按钮 (Primary Button)
     - 图标: Flame icon (text-orange-400)
     - 文字: "Light a Candle"
     - 大小: size="lg"
     - 功能: 平滑滚动到 Tribute Section
   - 分享按钮 (Outline Button)
     - 图标: Share2 icon
     - 文字: "Share Memorial"
     - 大小: size="lg"
     - 功能: 打开分享弹窗

#### 交互行为
- 按钮 hover 效果
- 平滑滚动到指定区域
- 分享弹窗支持多平台（Twitter, Facebook, 复制链接）

---

### 2.2 Video Gallery Section - "The Film"

#### 设计要求
- **显示条件**: 仅当 videoUrl 存在时显示
- **布局**: 全宽区域，背景 bg-muted/30
- **间距**: py-16 md:py-20
- **容器**: max-w-5xl

#### 元素清单
1. **Section Header**
   - 小标签: "WORLD PREMIERE" (uppercase, tracking-wider, text-primary)
   - 标题: "The Film"
     - 字体: font-serif
     - 大小: text-3xl md:text-4xl
     - 加粗: font-bold

2. **视频播放器**
   - 容器: Card 组件, overflow-hidden
   - 比例: aspect-video
   - 背景: bg-black
   - 功能:
     - 显示缩略图或视频首帧
     - 播放按钮覆盖层
       - 大小: 80px x 80px 圆形
       - 背景: bg-white/90, hover:bg-white
       - 图标: 三角形播放图标 (CSS border 实现)
       - 背景遮罩: bg-black/40, hover:bg-black/60
     - 点击打开全屏视频播放弹窗

3. **操作按钮**
   - 下载按钮 (Outline)
     - 图标: Download icon
     - 文字: "Download"
     - 链接: videoUrl (download 属性)
   - 分享按钮 (Outline)
     - 图标: Share2 icon
     - 文字: "Share"
     - 功能: 打开分享弹窗

#### 交互行为
- 鼠标悬停时播放按钮和遮罩变化
- 点击视频区域打开 VideoPlayerModal
- 下载功能直接触发浏览器下载
- 分享功能打开分享弹窗

---

### 2.3 Story Section - "Remembering {name}"

#### 设计要求
- **显示条件**: 仅当 story 存在时显示
- **布局**: 全宽区域，背景默认
- **间距**: py-16 md:py-20
- **容器**: max-w-3xl

#### 元素清单
1. **标题**
   - 文字: "Remembering {petName}"
   - 字体: font-serif
   - 大小: text-3xl md:text-4xl
   - 加粗: font-bold
   - 居中: text-center

2. **故事内容**
   - 样式: prose prose-lg
   - 颜色: text-muted-foreground
   - 行高: leading-relaxed
   - 保留换行: whitespace-pre-wrap
   - 最大宽度: max-w-none

#### 交互行为
- 无特殊交互，纯展示内容

---

### 2.4 Photo Gallery Section - "Cherished Moments"

#### 设计要求
- **显示条件**: 仅当 images 数组有内容时显示
- **布局**: 全宽区域，背景 bg-muted/30
- **间距**: py-16 md:py-20
- **容器**: max-w-6xl

#### 元素清单
1. **Section Header**
   - 小标签: "CHERISHED MOMENTS" (uppercase, tracking-wider, text-muted-foreground)
   - 标题: "Photo Gallery"
     - 字体: font-serif
     - 大小: text-3xl md:text-4xl
     - 加粗: font-bold

2. **照片网格**
   - 布局: grid grid-cols-2 md:grid-cols-3
   - 间距: gap-4
   - 最多显示: 6 张照片
   - 单个照片:
     - 容器: Card, overflow-hidden
     - 比例: aspect-square
     - hover 效果: scale-105, duration-300
     - 图片: object-cover, fill

#### 交互行为
- Hover 时图片轻微放大
- 可选: 点击图片打开 Lightbox（未来功能）

---

### 2.5 Tribute Section - "Pay Tribute"

#### 设计要求
- **布局**: 全宽区域，背景默认
- **间距**: py-16 md:py-20
- **容器**: max-w-4xl
- **锚点**: id="tribute-section" (用于 Hero Section 的滚动跳转)

#### 元素清单
1. **Section Header**
   - 标题: "Pay Tribute"
     - 字体: font-serif
     - 大小: text-3xl md:text-4xl
     - 加粗: font-bold
     - 居中: text-center
   - 蜡烛计数:
     - 图标: Flame icon (text-orange-400)
     - 文字: "{count} candles lit in loving memory"
     - 大小: text-lg
     - 颜色: text-muted-foreground

2. **点蜡烛表单卡片**
   - 容器: Card, p-6 md:p-8, mb-12
   - 标题: "Light a Candle for {petName}"
     - 大小: text-xl
     - 加粗: font-semibold
   - 表单字段:
     - 姓名输入框:
       - Placeholder: "Your Name (optional)"
       - 组件: Input
     - 留言输入框:
       - Placeholder: "Your Message (optional)"
       - 组件: Textarea
       - 行数: 4
   - 提交按钮:
     - 大小: size="lg", w-full
     - 图标: Flame icon (text-orange-400) 或 Loader2 (loading 时)
     - 文字: "Light Candle"
     - 状态: disabled 当 isLightingCandle

3. **留言墙 - "Messages of Love"**
   - 显示条件: candles.length > 0
   - 标题: "Messages of Love"
     - 字体: font-serif
     - 大小: text-2xl
     - 加粗: font-bold
   - 留言卡片列表:
     - 容器: Card, p-4 md:p-6
     - 间距: space-y-4
     - 单个留言:
       - 图标: Heart icon (text-red-500, mt-1, flex-shrink-0)
       - 姓名: font-semibold
       - 日期: text-sm text-muted-foreground
       - 留言: text-muted-foreground

#### 交互行为
- **表单提交**:
  - 点击"Light Candle"按钮
  - 显示 loading 状态（按钮 disabled，显示 Loader2 图标）
  - 调用 API: `POST /api/pet-memorial/{id}/candles`
  - 成功后:
    - 显示 toast 通知："Your candle has been lit"
    - 乐观更新蜡烛计数（+1）
    - 清空表单
    - 刷新数据显示新留言
  - 失败后:
    - 显示 toast 错误："Failed to light candle. Please try again."
- **防重复提交**: 按钮 disabled 状态
- **即时反馈**: Toast 通知
- **乐观更新**: 先更新 UI，再刷新数据

---

### 2.6 CTA Section - "Create Your Pet's Memorial Movie"

#### 设计要求
- **布局**: 全宽区域，渐变背景 from-primary/5 to-background
- **间距**: py-16 md:py-24
- **容器**: max-w-4xl

#### 元素清单
1. **CTA 卡片**
   - 容器: Card, p-8 md:p-12, text-center
   - 内容容器: max-w-2xl mx-auto, space-y-6

2. **图标**
   - 组件: Sparkles icon
   - 大小: w-12 h-12
   - 颜色: text-primary
   - 位置: mx-auto

3. **标题**
   - 文字: "Create Your Pet's Memorial Movie"
   - 字体: font-serif
   - 大小: text-3xl md:text-4xl
   - 加粗: font-bold

4. **描述**
   - 文字: "Transform your cherished photos into a beautiful AI-generated memorial film. Honor their memory with a cinematic tribute that captures their spirit."
   - 大小: text-lg
   - 颜色: text-muted-foreground

5. **社交证明**
   - 图标: Star icon (fill, text-yellow-500)
   - 文字: "Trusted by 50,000+ pet parents • 4.9★ rated"
   - 大小: text-sm
   - 颜色: text-muted-foreground

6. **CTA 按钮**
   - 文字: "Create Memorial Movie"
   - 大小: size="lg"
   - 样式: text-lg px-8
   - 功能: 跳转到 /create-pet-movie 页面

#### 交互行为
- 点击按钮跳转到视频创建页面
- Hover 效果

---

## 3. 技术实现要求

### 3.1 数据获取
- 使用现有的 `useMemorialDetail(id)` hook
- 数据包含:
  - 宠物基本信息 (petName, species, birthday, dateOfPassing)
  - 纪念内容 (message, story)
  - 媒体资源 (images, videoUrl, videoThumbnail)
  - 互动数据 (candleCount, candles 列表)
  - 所有权信息 (isOwner, ownerFirstName, ownerLastName)

### 3.2 API 接口
1. **点蜡烛**
   - 接口: `POST /api/pet-memorial/{id}/candles`
   - 请求体:
     ```json
     {
       "name": "string (optional)",
       "message": "string (optional)"
     }
     ```
   - 响应: 201 Created
   - 错误处理: 显示 toast 错误

2. **获取详情**
   - 通过 `useMemorialDetail` hook 自动获取
   - 包含分页的蜡烛列表（默认最新10条）

### 3.3 状态管理
- **本地状态**:
  - `candleName`: 点蜡烛表单姓名
  - `candleMessage`: 点蜡烛表单留言
  - `isLightingCandle`: 提交状态
  - `localCandleCount`: 乐观更新的蜡烛数量
  - `shareModalOpen`: 分享弹窗状态
  - `videoModalOpen`: 视频播放弹窗状态

- **数据刷新**:
  - 点蜡烛成功后调用 `refresh()` 刷新数据
  - 乐观更新蜡烛计数以提供即时反馈

### 3.4 组件复用
- `ShareModal`: 分享功能弹窗
- `VideoPlayerModal`: 全屏视频播放器
- `Card`, `Button`, `Input`, `Textarea`: shadcn/ui 组件
- Lucide React Icons: Flame, Calendar, Heart, Share2, Download 等

### 3.5 多语言支持
- 使用 `useTranslations('pet-memorial.detail')` hook
- 复用现有翻译配置
- 所有文案通过 translation keys 获取

### 3.6 响应式设计
- 移动端优先
- 断点:
  - sm: 640px
  - md: 768px
  - lg: 1024px
- 关键响应式调整:
  - 字体大小: text-4xl → text-5xl → text-6xl
  - 间距: py-16 → py-20 → py-24
  - 网格: grid-cols-2 → grid-cols-3
  - 容器内边距: p-6 → p-8 → p-12

---

## 4. UI/UX 设计规范

### 4.1 字体系统
- **标题 (Headings)**: font-serif (Playfair Display 或类似衬线字体)
- **正文 (Body)**: font-sans (Inter 或系统默认无衬线字体)
- **代码/特殊**: font-mono

### 4.2 颜色方案
- **主色 (Primary)**: --primary
- **前景色 (Foreground)**: --foreground
- **次要文字 (Muted)**: --muted-foreground
- **背景 (Background)**: --background
- **卡片 (Card)**: --card
- **边框 (Border)**: --border
- **特殊色**:
  - 蜡烛/火焰: text-orange-400
  - 心形: text-red-500
  - 星星: text-yellow-500
  - 渐变: from-muted/50 to-background, from-primary/5 to-background

### 4.3 间距系统
- **Section 间距**: py-16 md:py-20 或 py-16 md:py-24
- **容器内边距**: px-4
- **卡片内边距**: p-6 md:p-8 或 p-8 md:p-12
- **元素间距**: space-y-4, space-y-6
- **按钮间距**: gap-3

### 4.4 阴影与圆角
- **卡片**: 默认 Card 组件阴影
- **圆角**: rounded-full (头像), 默认 rounded (卡片)
- **边框**: border-4 (头像边框), border-l-4 (引用边框)

### 4.5 动画与过渡
- **Hover 效果**:
  - 图片放大: `hover:scale-105 transition-transform duration-300`
  - 按钮: 默认按钮 hover 效果
  - 播放按钮: `group-hover:bg-white`, `group-hover:bg-black/60`
- **平滑滚动**: `scrollIntoView({ behavior: 'smooth' })`
- **加载状态**: Loader2 图标旋转动画 `animate-spin`

---

## 5. 性能优化要求

### 5.1 图片优化
- 使用 Next.js Image 组件
- 设置正确的 sizes 属性
- priority 用于首屏图片 (头像)
- object-cover 确保图片裁剪适当

### 5.2 代码分割
- 懒加载弹窗组件 (ShareModal, VideoPlayerModal)
- 条件渲染大型组件 (Video Section, Photo Gallery)

### 5.3 数据获取
- 使用 SWR 或类似库进行缓存
- 乐观更新减少感知延迟
- 防抖/节流表单提交

---

## 6. SEO 优化要求

### 6.1 元数据
- 动态生成 title: "{petName} | Pet Memorial"
- 动态生成 description: 使用 message 或默认文案
- Open Graph 图片: 使用宠物头像
- Twitter Card: summary_large_image

### 6.2 结构化数据
- Schema.org Markup (未来考虑)
- 语义化 HTML 标签

### 6.3 Sitemap
- 确保所有纪念详情页包含在 sitemap.xml 中
- 设置合适的 priority 和 changefreq

---

## 7. 可访问性要求

### 7.1 键盘导航
- 所有交互元素可通过 Tab 键访问
- 按钮和链接有清晰的 focus 状态

### 7.2 ARIA 标签
- 按钮有描述性的 aria-label
- 表单有正确的 label 关联
- 弹窗有 role="dialog"

### 7.3 颜色对比
- 文字与背景对比度符合 WCAG AA 标准
- 不仅依赖颜色传达信息

---

## 8. 错误处理

### 8.1 数据加载错误
- 显示友好的错误信息
- 提供"重试"按钮
- 记录错误日志（未来考虑）

### 8.2 表单提交错误
- Toast 通知显示具体错误
- 保留用户已输入的内容
- 网络错误提示用户检查连接

### 8.3 边界情况
- 无图片时显示占位符
- 无视频时隐藏视频区块
- 无故事时隐藏故事区块
- 无蜡烛时隐藏留言墙

---

## 9. 未来功能扩展

### 9.1 短期 (1-2 周)
- [ ] Lightbox 图片查看器
- [ ] 蜡烛列表分页加载
- [ ] 留言审核系统 (如果 mod_required = true)
- [ ] 点赞功能（为留言点赞）

### 9.2 中期 (1-2 月)
- [ ] 视频多语言字幕
- [ ] 纪念页面背景音乐
- [ ] 3D 蜡烛动画效果
- [ ] 虚拟花环功能
- [ ] 纪念时间线（timeline events）

### 9.3 长期 (3-6 月)
- [ ] AR/VR 纪念体验
- [ ] 社交媒体集成（自动分享到 Facebook/Instagram）
- [ ] 纪念页面主题定制
- [ ] 年度纪念报告

---

## 10. 验收标准

### 10.1 功能完整性
- ✅ 所有 6 个 Section 都正确渲染
- ✅ 点蜡烛表单提交成功
- ✅ 分享功能正常工作
- ✅ 视频播放功能正常
- ✅ 响应式设计在所有设备上正常
- ✅ 多语言切换正常

### 10.2 视觉还原度
- ✅ 与 v0 设计高度一致（90%+）
- ✅ 字体、颜色、间距符合设计规范
- ✅ 动画效果流畅自然

### 10.3 性能指标
- ✅ Lighthouse Performance > 90
- ✅ FCP < 1.5s
- ✅ LCP < 2.5s
- ✅ CLS < 0.1

### 10.4 兼容性
- ✅ Chrome, Firefox, Safari, Edge 最新版本
- ✅ iOS Safari, Android Chrome
- ✅ 平板和移动设备

---

## 11. 开发检查清单

### 11.1 开发阶段
- [x] 创建 MemorialDetailV2 组件
- [x] 实现 Hero Section
- [x] 实现 Video Gallery Section
- [x] 实现 Story Section
- [x] 实现 Photo Gallery Section
- [x] 实现 Tribute Section
- [x] 实现 CTA Section
- [ ] 优化样式细节（字体、间距、颜色）
- [ ] 添加动画效果
- [ ] 完善响应式设计
- [ ] 测试所有交互功能

### 11.2 测试阶段
- [ ] 单元测试（表单提交、数据获取）
- [ ] 集成测试（API 调用）
- [ ] E2E 测试（用户流程）
- [ ] 视觉回归测试
- [ ] 性能测试
- [ ] 可访问性测试

### 11.3 部署阶段
- [ ] 代码审查
- [ ] 更新文档
- [ ] 创建 PR
- [ ] 合并到主分支
- [ ] 部署到生产环境
- [ ] 监控错误日志

---

## 12. 参考资料

- **v0 设计**: https://v0-pet-memorial-page-design.vercel.app/
- **shadcn/ui 文档**: https://ui.shadcn.com/
- **Next.js 文档**: https://nextjs.org/docs
- **Tailwind CSS 文档**: https://tailwindcss.com/docs
- **项目 CLAUDE.md**: 开发规范和架构说明
