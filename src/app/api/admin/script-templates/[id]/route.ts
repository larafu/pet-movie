/**
 * 获取单个模板详情 API
 * GET /api/admin/script-templates/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

import { getAuth } from '@/core/auth';
import { db } from '@/core/db';
import { scriptTemplate } from '@/config/db/schema';
import { hasPermission } from '@/shared/services/rbac';
import { PERMISSIONS } from '@/core/rbac/permission';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 验证用户登录
    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // 验证管理员权限
    const hasReadPermission = await hasPermission(session.user.id, PERMISSIONS.SCRIPT_TEMPLATES_READ);
    if (!hasReadPermission) {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 });
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing template id' }, { status: 400 });
    }

    const database = db();

    // 查询模板详情
    const templates = await database
      .select()
      .from(scriptTemplate)
      .where(eq(scriptTemplate.id, id))
      .limit(1);

    if (templates.length === 0) {
      return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });
    }

    const template = templates[0];

    // 解析 scenesJson、tags 和 characters
    let scenes = [];
    let tags: string[] = [];
    let characters: Array<{
      id: string;
      role: 'primary' | 'secondary';
      name: string;
      nameCn: string;
      description: string;
      descriptionCn: string;
    }> = [];

    try {
      if (template.scenesJson) {
        console.log('📄 Raw scenesJson:', template.scenesJson.substring(0, 200)); // 调试日志
        const scenesData = JSON.parse(template.scenesJson);
        // 兼容两种格式：直接数组 或 { scenes: [...] }
        scenes = Array.isArray(scenesData) ? scenesData : (scenesData.scenes || []);
        console.log('📄 Parsed scenes count:', scenes.length); // 调试日志
      } else {
        console.log('📄 scenesJson is empty or null'); // 调试日志
      }
    } catch (e) {
      console.error('Parse scenesJson error:', e);
    }

    try {
      if (template.tags) {
        tags = JSON.parse(template.tags);
      }
    } catch (e) {
      console.error('Parse tags error:', e);
    }

    // 解析角色数组
    try {
      if (template.charactersJson) {
        characters = JSON.parse(template.charactersJson);
      }
    } catch (e) {
      console.error('Parse charactersJson error:', e);
    }

    return NextResponse.json({
      success: true,
      template: {
        id: template.id,
        status: template.status,
        name: template.name,
        nameCn: template.nameCn,
        description: template.description,
        descriptionCn: template.descriptionCn,
        thumbnailUrl: template.thumbnailUrl,
        previewVideoUrl: template.previewVideoUrl,
        category: template.category,
        tags,
        styleId: template.styleId,
        globalStylePrefix: template.globalStylePrefix,
        characters, // 角色数组
        characterSheetUrl: template.characterSheetUrl, // 角色参考卡
        durationSeconds: template.durationSeconds,
        aspectRatio: template.aspectRatio,
        musicPrompt: template.musicPrompt,
        scenes,
        petImageUrl: template.petImageUrl,
        mergedVideoUrl: template.mergedVideoUrl,
        sortOrder: template.sortOrder,
        useCount: template.useCount,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
      },
    });
  } catch (error) {
    console.error('Get template error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
