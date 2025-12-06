/**
 * 单个草稿操作 API
 * GET /api/admin/script-creator/draft/[id] - 获取草稿详情
 * DELETE /api/admin/script-creator/draft/[id] - 删除草稿
 *
 * 草稿和正式模板统一存储在 scriptTemplate 表中，通过 status 字段区分
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';

import { getAuth } from '@/core/auth';
import { db } from '@/core/db';
import { scriptTemplate } from '@/config/db/schema';
import { checkScriptTemplateReadPermission, checkScriptTemplateDeletePermission } from '../../_lib/check-admin';

/**
 * 获取草稿详情
 */
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

    // 检查权限
    const permissionError = await checkScriptTemplateReadPermission(session.user.id);
    if (permissionError) return permissionError;

    const { id } = await params;
    const database = db();

    // 获取草稿（只能获取自己的草稿，且状态为 draft）
    const drafts = await database
      .select()
      .from(scriptTemplate)
      .where(
        and(
          eq(scriptTemplate.id, id),
          eq(scriptTemplate.createdBy, session.user.id),
          eq(scriptTemplate.status, 'draft')
        )
      )
      .limit(1);

    if (drafts.length === 0) {
      return NextResponse.json({ success: false, error: 'Draft not found' }, { status: 404 });
    }

    const draft = drafts[0];

    // 解析 JSON 字段
    const parsedDraft = {
      id: draft.id,
      name: draft.name,
      nameCn: draft.nameCn,
      description: draft.description,
      descriptionCn: draft.descriptionCn,
      tags: draft.tags ? JSON.parse(draft.tags) : [],
      styleId: draft.styleId,
      globalStylePrefix: draft.globalStylePrefix,
      durationSeconds: draft.durationSeconds,
      aspectRatio: draft.aspectRatio,
      musicPrompt: draft.musicPrompt,
      petImageUrl: draft.petImageUrl,
      scenes: draft.scenesJson ? JSON.parse(draft.scenesJson) : [],
      mergedVideoUrl: draft.mergedVideoUrl,
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt,
    };

    return NextResponse.json({
      success: true,
      draft: parsedDraft,
    });
  } catch (error) {
    console.error('Get draft error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * 删除草稿
 */
export async function DELETE(
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

    // 检查权限
    const permissionError = await checkScriptTemplateDeletePermission(session.user.id);
    if (permissionError) return permissionError;

    const { id } = await params;
    const database = db();

    // 删除草稿（只能删除自己的草稿，且状态为 draft）
    const result = await database
      .delete(scriptTemplate)
      .where(
        and(
          eq(scriptTemplate.id, id),
          eq(scriptTemplate.createdBy, session.user.id),
          eq(scriptTemplate.status, 'draft')
        )
      )
      .returning({ id: scriptTemplate.id });

    if (result.length === 0) {
      return NextResponse.json({ success: false, error: 'Draft not found or permission denied' }, { status: 404 });
    }

    console.log('✅ Draft deleted:', id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete draft error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
