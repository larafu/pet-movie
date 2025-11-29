/**
 * 切换模板状态 API
 * POST /api/admin/script-templates/toggle
 *
 * 在 published 和 disabled 之间切换
 * 注意：草稿（draft）状态的模板不能通过此 API 切换
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

import { getAuth } from '@/core/auth';
import { db } from '@/core/db';
import { scriptTemplate } from '@/config/db/schema';
import { hasPermission } from '@/shared/services/rbac';
import { PERMISSIONS } from '@/core/rbac/permission';

interface ToggleRequest {
  templateId: string;
  status: 'published' | 'disabled'; // 目标状态
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

    const body: ToggleRequest = await request.json();
    const { templateId, status } = body;

    if (!templateId) {
      return NextResponse.json({ success: false, error: 'Missing templateId' }, { status: 400 });
    }

    if (!status || !['published', 'disabled'].includes(status)) {
      return NextResponse.json({ success: false, error: 'Invalid status. Must be "published" or "disabled"' }, { status: 400 });
    }

    const database = db();

    // 检查模板是否存在且不是草稿
    const existing = await database
      .select({ id: scriptTemplate.id, status: scriptTemplate.status })
      .from(scriptTemplate)
      .where(eq(scriptTemplate.id, templateId))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });
    }

    if (existing[0].status === 'draft') {
      return NextResponse.json({ success: false, error: 'Cannot toggle draft templates. Please publish first.' }, { status: 400 });
    }

    await database
      .update(scriptTemplate)
      .set({ status })
      .where(eq(scriptTemplate.id, templateId));

    console.log(`✅ Template ${templateId} status changed to ${status}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Toggle template error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
