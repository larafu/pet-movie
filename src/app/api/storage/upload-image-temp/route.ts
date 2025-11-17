import { respData, respErr } from '@/shared/lib/resp';

/**
 * Temporary image upload that converts images to base64 data URLs
 * No external storage needed - images are embedded as data URLs
 * Only for temporary use, not recommended for production
 */
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];

    console.log('[API] Received files for temp upload:', files.length);

    if (!files || files.length === 0) {
      return respErr('No files provided');
    }

    const uploadResults = [];

    for (const file of files) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        return respErr(`File ${file.name} is not an image`);
      }

      // Validate file size (max 10MB for base64)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        return respErr(
          `File ${file.name} is too large. Maximum size is 10MB.`
        );
      }

      // Convert to base64
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString('base64');
      const dataUrl = `data:${file.type};base64,${base64}`;

      console.log('[API] Converted to data URL:', {
        name: file.name,
        type: file.type,
        size: file.size,
        dataUrlLength: dataUrl.length,
      });

      uploadResults.push({
        url: dataUrl,
        filename: file.name,
        size: file.size,
        type: file.type,
      });
    }

    return respData({
      urls: uploadResults.map((r) => r.url),
      results: uploadResults,
    });
  } catch (e: any) {
    console.error('upload temp image failed:', e);
    return respErr(e.message || 'upload temp image failed');
  }
}
