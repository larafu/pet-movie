/**
 * 删除模板 API
 * POST /api/admin/script-templates/delete
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

import { getAuth } from '@/core/auth';
import { db } from '@/core/db';
import { scriptTemplate } from '@/config/db/schema';
import { hasPermission } from '@/shared/services/rbac';
import { PERMISSIONS } from '@/core/rbac/permission';

interface DeleteRequest {
  templateId: string;
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
    const hasDeletePermission = await hasPermission(session.user.id, PERMISSIONS.SCRIPT_TEMPLATES_DELETE);
    if (!hasDeletePermission) {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 });
    }

    const body: DeleteRequest = await request.json();
    const { templateId } = body;

    if (!templateId) {
      return NextResponse.json({ success: false, error: 'Missing templateId' }, { status: 400 });
    }

    const database = db();

    await database
      .delete(scriptTemplate)
      .where(eq(scriptTemplate.id, templateId));

    console.log(`✅ Template ${templateId} deleted`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete template error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
