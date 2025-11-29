/**
 * 保存/发布模板 API
 * POST /api/admin/script-creator/save-template
 *
 * 支持两种场景：
 * 1. 从草稿发布为正式模板（提供 draftId）
 * 2. 直接创建新的正式模板（不提供 draftId）
 */

import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';

import { getAuth } from '@/core/auth';
import { db } from '@/core/db';
import { scriptTemplate } from '@/config/db/schema';
import { checkScriptTemplateWritePermission } from '../_lib/check-admin';

interface SceneTemplate {
  sceneNumber: number;
  prompt: string;
  firstFramePrompt: string;
  description: string;
  descriptionEn: string;
}

interface SaveTemplateRequest {
  draftId?: string; // 如果提供，则从草稿发布；否则创建新模板
  config: {
    name: string;
    nameCn: string;
    description: string;
    descriptionCn: string;
    tags: string[]; // 标签数组，用于分类（如 dog, cat, christmas 等）
    styleId: string;
    globalStylePrefix: string;
    durationSeconds: number;
    aspectRatio: string;
    musicPrompt: string;
  };
  scenes: SceneTemplate[];
  previewVideoUrl: string;
  thumbnailUrl: string;
}

export async function POST(request: NextRequest) {
  try {
    // 验证用户登录
    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // 验证管理员权限
    const permissionError = await checkScriptTemplateWritePermission(userId);
    if (permissionError) return permissionError;

    const body: SaveTemplateRequest = await request.json();
    const { draftId, config, scenes, previewVideoUrl, thumbnailUrl } = body;

    if (!config.name || !scenes || scenes.length === 0) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const database = db();

    // 构建 scenesJson（发布时只保留核心字段，去掉生成状态）
    const scenesJson = JSON.stringify({
      scenes: scenes.map(s => ({
        sceneNumber: s.sceneNumber,
        prompt: s.prompt,
        firstFramePrompt: s.firstFramePrompt,
        description: s.description,
        descriptionEn: s.descriptionEn,
      })),
    });

    // 从 tags 推断主分类（优先级：cat > dog > 默认 other）
    const tags = config.tags || [];
    const hasCatTag = tags.some(tag => tag.toLowerCase() === 'cat');
    const hasDogTag = tags.some(tag => tag.toLowerCase() === 'dog');
    const primaryCategory = hasCatTag ? 'cat' : hasDogTag ? 'dog' : 'other';

    let templateId: string;

    if (draftId) {
      // 从草稿发布：更新现有草稿记录为正式模板
      const existingDraft = await database
        .select({ id: scriptTemplate.id, createdBy: scriptTemplate.createdBy, status: scriptTemplate.status })
        .from(scriptTemplate)
        .where(eq(scriptTemplate.id, draftId))
        .limit(1);

      if (existingDraft.length === 0) {
        return NextResponse.json({ success: false, error: 'Draft not found' }, { status: 404 });
      }

      if (existingDraft[0].createdBy !== userId) {
        return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 });
      }

      if (existingDraft[0].status !== 'draft') {
        return NextResponse.json({ success: false, error: 'Template is already published' }, { status: 400 });
      }

      // 更新草稿为正式模板
      await database
        .update(scriptTemplate)
        .set({
          status: 'published', // 发布状态
          name: config.name,
          nameCn: config.nameCn || null,
          description: config.description || null,
          descriptionCn: config.descriptionCn || null,
          thumbnailUrl: thumbnailUrl || null,
          previewVideoUrl: previewVideoUrl || null,
          category: primaryCategory,
          tags: tags.length > 0 ? JSON.stringify(tags) : null,
          styleId: config.styleId || 'pixar-3d',
          globalStylePrefix: config.globalStylePrefix || null,
          durationSeconds: config.durationSeconds || 60,
          aspectRatio: config.aspectRatio || '16:9',
          musicPrompt: config.musicPrompt || null,
          scenesJson,
          // 清空草稿专用字段
          petImageUrl: null,
          mergedVideoUrl: null,
        })
        .where(eq(scriptTemplate.id, draftId));

      templateId = draftId;
      console.log('✅ Draft published as template:', templateId);
    } else {
      // 直接创建新的正式模板
      templateId = nanoid();

      await database.insert(scriptTemplate).values({
        id: templateId,
        status: 'published', // 直接发布
        name: config.name,
        nameCn: config.nameCn || null,
        description: config.description || null,
        descriptionCn: config.descriptionCn || null,
        thumbnailUrl: thumbnailUrl || null,
        previewVideoUrl: previewVideoUrl || null,
        category: primaryCategory,
        tags: tags.length > 0 ? JSON.stringify(tags) : null,
        styleId: config.styleId || 'pixar-3d',
        globalStylePrefix: config.globalStylePrefix || null,
        durationSeconds: config.durationSeconds || 60,
        aspectRatio: config.aspectRatio || '16:9',
        musicPrompt: config.musicPrompt || null,
        scenesJson,
        sortOrder: 0,
        useCount: 0,
        creditsRequired: null,
        createdBy: userId,
      });

      console.log('✅ New template created:', templateId);
    }

    console.log('📝 Template name:', config.name);

    return NextResponse.json({
      success: true,
      templateId,
    });
  } catch (error) {
    console.error('Save template error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
