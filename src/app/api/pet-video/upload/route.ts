/**
 * Pet Image Upload API
 * POST /api/pet-video/upload
 *
 * Uploads user's pet image to R2 storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { createR2ProviderFromDb } from '@/extensions/storage/db-config-loader';

// 配置请求体大小限制为 10MB（覆盖 Vercel 默认的 4.5MB 限制）
// 注意：App Router 使用 route segment config
export const maxDuration = 60; // 最大执行时间 60 秒

export async function POST(request: NextRequest) {
  console.log('\n📤 ========== Pet Image Upload ==========');

  try {
    console.log('📝 [Upload] Parsing form data...');
    const formData = await request.formData();
    const file = formData.get('file') as File;

    console.log('📋 [Upload] Form data keys:', Array.from(formData.keys()));

    if (!file) {
      console.error('❌ [Upload] No file provided in form data');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log('📁 [Upload] File info:', {
      name: file.name,
      type: file.type,
      size: file.size,
      sizeInMB: (file.size / 1024 / 1024).toFixed(2) + 'MB'
    });

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      console.error('❌ [Upload] Invalid file type:', file.type);
      return NextResponse.json(
        {
          error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
        },
        { status: 400 }
      );
    }

    console.log('✅ [Upload] File type valid:', file.type);

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      console.error('❌ [Upload] File too large:', file.size, 'bytes');
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      );
    }

    console.log('✅ [Upload] File size valid');

    // Generate unique filename
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const fileName = `${nanoid()}.${fileExtension}`;
    const key = `pet-images-temp/${fileName}`; // Temporary storage, auto-deleted after 24h

    console.log('🔑 [Upload] Generated key:', key);
    console.log('⏰ [Upload] Note: File will be auto-deleted after 24 hours (R2 lifecycle)');

    // Convert file to buffer
    console.log('🔄 [Upload] Converting file to buffer...');
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log('✅ [Upload] Buffer created, size:', buffer.length, 'bytes');

    // Upload to R2
    console.log('☁️  [Upload] Initializing R2 provider...');
    const r2Provider = await createR2ProviderFromDb();
    console.log('✅ [Upload] R2 provider initialized');

    console.log('⬆️  [Upload] Uploading to R2...');
    const result = await r2Provider.uploadFile({
      key,
      body: buffer,
      contentType: file.type,
      disposition: 'inline',
    });

    console.log('📊 [Upload] R2 upload result:', {
      success: result.success,
      hasUrl: !!result.url,
      url: result.url,
      error: result.error
    });

    if (!result.success || !result.url) {
      console.error('❌ [Upload] R2 upload failed:', result.error);
      return NextResponse.json(
        { error: result.error || 'Upload failed' },
        { status: 500 }
      );
    }

    console.log('🎉 [Upload] Upload successful!');
    console.log('🔗 [Upload] URL:', result.url);

    return NextResponse.json({
      success: true,
      url: result.url,
      key: result.key,
      filename: result.filename,
    });
  } catch (error) {
    console.error('❌ [Upload] Exception occurred:', error);
    console.error('❌ [Upload] Error stack:', error instanceof Error ? error.stack : 'No stack');

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Upload failed',
      },
      { status: 500 }
    );
  }
}
