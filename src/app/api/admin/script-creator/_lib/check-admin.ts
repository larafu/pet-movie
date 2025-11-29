/**
 * 管理员权限检查工具
 * 用于 script-creator 相关 API 的权限验证
 */

import { NextResponse } from 'next/server';
import { hasPermission } from '@/shared/services/rbac';
import { PERMISSIONS } from '@/core/rbac/permission';

/**
 * 检查用户是否有脚本模板写入权限
 * @param userId 用户ID
 * @returns 如果没有权限返回错误响应，否则返回 null
 */
export async function checkScriptTemplateWritePermission(
  userId: string
): Promise<NextResponse | null> {
  // 检查是否有脚本模板写入权限
  const hasWritePermission = await hasPermission(
    userId,
    PERMISSIONS.SCRIPT_TEMPLATES_WRITE
  );

  if (!hasWritePermission) {
    return NextResponse.json(
      { success: false, error: 'Permission denied: admin.script-templates.write required' },
      { status: 403 }
    );
  }

  return null;
}

/**
 * 检查用户是否有脚本模板读取权限
 * @param userId 用户ID
 * @returns 如果没有权限返回错误响应，否则返回 null
 */
export async function checkScriptTemplateReadPermission(
  userId: string
): Promise<NextResponse | null> {
  // 检查是否有脚本模板读取权限
  const hasReadPermission = await hasPermission(
    userId,
    PERMISSIONS.SCRIPT_TEMPLATES_READ
  );

  if (!hasReadPermission) {
    return NextResponse.json(
      { success: false, error: 'Permission denied: admin.script-templates.read required' },
      { status: 403 }
    );
  }

  return null;
}

/**
 * 检查用户是否有脚本模板删除权限
 * @param userId 用户ID
 * @returns 如果没有权限返回错误响应，否则返回 null
 */
export async function checkScriptTemplateDeletePermission(
  userId: string
): Promise<NextResponse | null> {
  // 检查是否有脚本模板删除权限
  const hasDeletePermission = await hasPermission(
    userId,
    PERMISSIONS.SCRIPT_TEMPLATES_DELETE
  );

  if (!hasDeletePermission) {
    return NextResponse.json(
      { success: false, error: 'Permission denied: admin.script-templates.delete required' },
      { status: 403 }
    );
  }

  return null;
}
