/**
 * 更新模板 API
 * POST /api/admin/script-templates/update
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

import { getAuth } from '@/core/auth';
import { db } from '@/core/db';
import { scriptTemplate } from '@/config/db/schema';
import { hasPermission } from '@/shared/services/rbac';
import { PERMISSIONS } from '@/core/rbac/permission';

interface SceneTemplate {
  sceneNumber: number;
  prompt: string;
  firstFramePrompt: string;
  description: string;
  descriptionEn: string;
}

interface UpdateTemplateRequest {
  templateId: string;
  config: {
    name: string;
    nameCn: string;
    description: string;
    descriptionCn: string;
    tags: string[];
    styleId: string;
    globalStylePrefix: string;
    durationSeconds: number;
    aspectRatio: string;
    musicPrompt: string;
  };
  scenes: SceneTemplate[];
  previewVideoUrl?: string; // 可选，如果提供则更新
  thumbnailUrl?: string; // 可选，如果提供则更新
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
    const hasWritePermission = await hasPermission(session.user.id, PERMISSIONS.SCRIPT_TEMPLATES_WRITE);
    if (!hasWritePermission) {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 });
    }

    const body: UpdateTemplateRequest = await request.json();
    const { templateId, config, scenes, previewVideoUrl, thumbnailUrl } = body;

    if (!templateId) {
      return NextResponse.json({ success: false, error: 'Missing templateId' }, { status: 400 });
    }

    if (!config.name || !scenes || scenes.length === 0) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const database = db();

    // 检查模板是否存在
    const existing = await database
      .select({ id: scriptTemplate.id })
      .from(scriptTemplate)
      .where(eq(scriptTemplate.id, templateId))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });
    }

    // 构建 scenesJson
    const scenesJson = JSON.stringify({
      scenes: scenes.map(s => ({
        sceneNumber: s.sceneNumber,
        prompt: s.prompt,
        firstFramePrompt: s.firstFramePrompt,
        description: s.description,
        descriptionEn: s.descriptionEn,
      })),
    });

    // 从 tags 推断主分类
    const tags = config.tags || [];
    const hasCatTag = tags.some(tag => tag.toLowerCase() === 'cat');
    const hasDogTag = tags.some(tag => tag.toLowerCase() === 'dog');
    const primaryCategory = hasCatTag ? 'cat' : hasDogTag ? 'dog' : 'other';

    // 构建更新数据
    const updateData: Record<string, unknown> = {
      name: config.name,
      nameCn: config.nameCn || null,
      description: config.description || null,
      descriptionCn: config.descriptionCn || null,
      category: primaryCategory,
      tags: tags.length > 0 ? JSON.stringify(tags) : null,
      styleId: config.styleId || 'pixar-3d',
      globalStylePrefix: config.globalStylePrefix || null,
      durationSeconds: config.durationSeconds || 60,
      aspectRatio: config.aspectRatio || '16:9',
      musicPrompt: config.musicPrompt || null,
      scenesJson,
    };

    // 如果提供了新的预览视频/缩略图，则更新
    if (previewVideoUrl !== undefined) {
      updateData.previewVideoUrl = previewVideoUrl || null;
    }
    if (thumbnailUrl !== undefined) {
      updateData.thumbnailUrl = thumbnailUrl || null;
    }

    // 更新模板
    await database
      .update(scriptTemplate)
      .set(updateData)
      .where(eq(scriptTemplate.id, templateId));

    console.log('✅ Template updated:', templateId);

    return NextResponse.json({
      success: true,
      templateId,
    });
  } catch (error) {
    console.error('Update template error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
