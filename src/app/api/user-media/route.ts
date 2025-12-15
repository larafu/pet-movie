/**
 * User Media Library API
 * GET /api/user-media - 获取用户资源列表
 * POST /api/user-media - 上传资源到资源库
 */

import { v4 as uuidv4 } from 'uuid';
import { nanoid } from 'nanoid';
import { desc, eq, and } from 'drizzle-orm';

import { getAuth } from '@/core/auth';
import { db } from '@/core/db';
import { userMedia } from '@/config/db/schema';
import { respData, respErr } from '@/shared/lib/resp';
import { getStorageService } from '@/shared/services/storage';

/**
 * GET /api/user-media
 * 获取用户资源列表
 * Query params:
 *   - type: 'image' | 'video' | undefined (不传则获取全部)
 *   - limit: number (默认 20)
 *   - offset: number (默认 0)
 */
export async function GET(req: Request) {
  try {
    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user?.id) {
      return respErr('Unauthorized');
    }

    const url = new URL(req.url);
    const type = url.searchParams.get('type');
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    // 构建查询条件
    const conditions = [
      eq(userMedia.userId, session.user.id),
      eq(userMedia.status, 'active'),
    ];

    if (type && (type === 'image' || type === 'video')) {
      conditions.push(eq(userMedia.type, type));
    }

    // 查询数据
    const items = await db()
      .select()
      .from(userMedia)
      .where(and(...conditions))
      .orderBy(desc(userMedia.createdAt))
      .limit(limit)
      .offset(offset);

    return respData({
      items,
      pagination: {
        limit,
        offset,
        hasMore: items.length >= limit,
      },
    });
  } catch (e) {
    console.error('[User Media] GET error:', e);
    return respErr('Failed to get user media');
  }
}

/**
 * POST /api/user-media
 * 上传资源到资源库
 * FormData:
 *   - files: File[] (支持多文件上传)
 */
export async function POST(req: Request) {
  try {
    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user?.id) {
      return respErr('Unauthorized');
    }

    const formData = await req.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return respErr('No files provided');
    }

    const uploadResults = [];
    const storageService = await getStorageService();

    for (const file of files) {
      // 判断文件类型
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');

      if (!isImage && !isVideo) {
        return respErr(`Unsupported file type: ${file.type}`);
      }

      const mediaType = isImage ? 'image' : 'video';
      const folder = isImage ? 'media/images' : 'media/videos';

      // 生成唯一 key
      const ext = file.name.split('.').pop() || 'bin';
      const key = `${folder}/${Date.now()}-${uuidv4()}.${ext}`;

      // 上传到存储服务
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const result = await storageService.uploadFile({
        body: buffer,
        key: key,
        contentType: file.type,
        disposition: 'inline',
      });

      if (!result.success || !result.url) {
        console.error('[User Media] Upload failed:', result.error);
        return respErr(result.error || 'Upload failed');
      }

      // 保存到数据库
      const mediaId = nanoid();
      const now = new Date();

      await db().insert(userMedia).values({
        id: mediaId,
        userId: session.user.id,
        type: mediaType,
        url: result.url,
        key: result.key || key,
        filename: file.name,
        fileSize: file.size,
        mimeType: file.type,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      });

      uploadResults.push({
        id: mediaId,
        url: result.url,
        key: result.key || key,
        filename: file.name,
        type: mediaType,
      });
    }

    return respData({
      items: uploadResults,
      urls: uploadResults.map((r) => r.url),
    });
  } catch (e) {
    console.error('[User Media] POST error:', e);
    return respErr('Upload failed');
  }
}
