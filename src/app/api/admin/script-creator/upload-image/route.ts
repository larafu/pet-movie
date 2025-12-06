/**
 * 上传测试图片 API
 * POST /api/admin/script-creator/upload-image
 */

import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';

import { getAuth } from '@/core/auth';
import { createR2ProviderFromDb } from '@/extensions/storage/db-config-loader';
import { checkScriptTemplateWritePermission } from '../_lib/check-admin';

export async function POST(request: NextRequest) {
  try {
    // 验证用户登录
    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // 验证管理员权限
    const permissionError = await checkScriptTemplateWritePermission(session.user.id);
    if (permissionError) return permissionError;

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    // 获取文件扩展名
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
    const key = `admin/script-creator/test-images/${nanoid()}.${ext}`;

    // 读取文件内容
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 上传到 R2
    const r2Provider = await createR2ProviderFromDb();
    const result = await r2Provider.uploadFile({
      body: buffer,
      key,
      contentType: file.type || 'image/png',
      disposition: 'inline',
    });

    if (!result.success || !result.url) {
      return NextResponse.json({ success: false, error: result.error || 'Upload failed' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      url: result.url,
      key,
    });
  } catch (error) {
    console.error('Upload image error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
