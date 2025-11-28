/**
 * Pet Image Presigned URL API
 * POST /api/pet-video/presign
 *
 * 生成 R2 预签名上传 URL，允许前端直接上传到 R2
 * 这样可以绑过 Vercel 的 4.5MB 请求体限制
 */

import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { createR2ProviderFromDb } from '@/extensions/storage/db-config-loader';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contentType, fileExtension } = body;

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!contentType || !allowedTypes.includes(contentType)) {
      return NextResponse.json(
        { error: 'Invalid content type' },
        { status: 400 }
      );
    }

    // 生成唯一文件名
    const ext = fileExtension || contentType.split('/')[1] || 'jpg';
    const fileName = `${nanoid()}.${ext}`;
    // 使用 pet-images 目录，长期存储供用户后续创作使用
    const key = `pet-images/${fileName}`;

    // 获取 R2 provider 并生成预签名 URL
    const r2Provider = await createR2ProviderFromDb();
    const { url: presignedUrl, publicUrl } = await r2Provider.getPresignedUploadUrl(
      key,
      contentType,
      3600 // 1 小时有效期
    );

    return NextResponse.json({
      success: true,
      presignedUrl,
      publicUrl,
      key,
    });
  } catch (error) {
    console.error('Presign URL generation error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to generate upload URL',
      },
      { status: 500 }
    );
  }
}
