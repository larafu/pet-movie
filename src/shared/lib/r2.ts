/**
 * Cloudflare R2 资源 URL 工具
 *
 * 提供统一的媒体资源访问接口，支持本地/R2存储无缝切换
 *
 * 使用示例:
 * ```typescript
 * import { getVideoUrl, getImageUrl } from '@/shared/lib/r2';
 *
 * // 视频
 * const videoUrl = getVideoUrl('/video/hero.mp4'); // 自动切换 MP4/WebM
 *
 * // 图片
 * const imageUrl = getImageUrl('/imgs/cat.png'); // 自动使用 WebP
 * ```
 *
 * 环境变量:
 * - NEXT_PUBLIC_R2_DOMAIN: R2 自定义域名 (如: https://media.petmovie.ai)
 * - NEXT_PUBLIC_USE_R2: 是否启用 R2 (true/false)
 */

// 配置
const R2_DOMAIN = process.env.NEXT_PUBLIC_R2_DOMAIN || '';
const USE_R2 = process.env.NEXT_PUBLIC_USE_R2 === 'true';

// 开发环境日志
const isDev = process.env.NODE_ENV === 'development';

/**
 * 获取基础媒体 URL
 * @param path - 资源路径 (如: '/video/hero.mp4' 或 'imgs/cat.png')
 * @returns 完整的资源 URL
 */
export function getMediaUrl(path: string): string {
  // 移除开头的 /
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;

  if (USE_R2 && R2_DOMAIN) {
    const url = `${R2_DOMAIN}/${cleanPath}`;

    if (isDev) {
      console.log('[R2] Using R2 URL:', url);
    }

    return url;
  }

  // 降级到本地
  const localUrl = `/${cleanPath}`;

  if (isDev && R2_DOMAIN) {
    console.log('[R2] Fallback to local:', localUrl);
  }

  return localUrl;
}

/**
 * 获取视频 URL (支持多格式)
 * @param path - 视频路径
 * @param format - 视频格式 ('mp4' | 'webm')
 * @returns 视频 URL
 *
 * @example
 * ```typescript
 * <video>
 *   <source src={getVideoUrl('/video/hero.mp4', 'webm')} type="video/webm" />
 *   <source src={getVideoUrl('/video/hero.mp4', 'mp4')} type="video/mp4" />
 * </video>
 * ```
 */
export function getVideoUrl(path: string, format: 'mp4' | 'webm' = 'mp4'): string {
  // 移除已有扩展名
  const basePath = path.replace(/\.(mp4|webm)$/i, '');

  // 添加新格式
  const fullPath = `${basePath}.${format}`;

  return getMediaUrl(fullPath);
}

/**
 * 获取图片 URL (自动使用 WebP)
 * @param path - 图片路径
 * @param useWebP - 是否尝试使用 WebP 格式 (默认: true)
 * @returns 图片 URL
 *
 * @example
 * ```typescript
 * <Image
 *   src={getImageUrl('/imgs/cat.png')}
 *   alt="Cat"
 * />
 * ```
 */
export function getImageUrl(path: string, useWebP = true): string {
  // 如果请求 WebP 且原图是常见格式，转换为 WebP
  if (useWebP && path.match(/\.(png|jpg|jpeg)$/i)) {
    const webpPath = path.replace(/\.(png|jpg|jpeg)$/i, '.webp');
    return getMediaUrl(webpPath);
  }

  return getMediaUrl(path);
}

/**
 * 获取 Logo URL (优化尺寸)
 * @param path - Logo 路径
 * @param size - 尺寸 (用于文件名后缀，如 '-small')
 * @returns Logo URL
 */
export function getLogoUrl(path: string, size?: 'small' | 'medium' | 'large'): string {
  if (size) {
    const ext = path.match(/\.\w+$/)?.[0] || '';
    const basePath = path.replace(/\.\w+$/, '');
    return getMediaUrl(`${basePath}-${size}${ext}`);
  }

  return getMediaUrl(path);
}

/**
 * 获取 Poster 图片 URL (视频缩略图)
 * @param videoPath - 视频路径
 * @returns Poster 图片 URL
 *
 * @example
 * ```typescript
 * <video poster={getPosterUrl('/video/hero.mp4')}>
 * ```
 */
export function getPosterUrl(videoPath: string): string {
  const posterPath = videoPath
    .replace(/\.(mp4|webm)$/i, '-poster.jpg')
    .replace('/video/', '/imgs/');

  return getImageUrl(posterPath);
}

/**
 * 预加载媒体资源
 * @param urls - 资源 URL 数组
 * @param type - 资源类型 ('video' | 'image')
 *
 * @example
 * ```typescript
 * // 在组件中预加载关键资源
 * useEffect(() => {
 *   preloadMedia([
 *     getVideoUrl('/video/hero.mp4'),
 *     getImageUrl('/imgs/hero-bg.jpg')
 *   ], 'video');
 * }, []);
 * ```
 */
export function preloadMedia(urls: string[], type: 'video' | 'image' = 'image'): void {
  if (typeof window === 'undefined') return;

  urls.forEach((url) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = url;
    link.as = type;

    if (type === 'video') {
      link.type = url.endsWith('.webm') ? 'video/webm' : 'video/mp4';
    } else if (type === 'image') {
      link.type = url.endsWith('.webp') ? 'image/webp' : 'image/*';
    }

    document.head.appendChild(link);
  });
}

/**
 * 检查 R2 配置状态
 * @returns R2 配置信息
 */
export function getR2Config() {
  return {
    enabled: USE_R2,
    domain: R2_DOMAIN,
    isConfigured: !!(USE_R2 && R2_DOMAIN),
  };
}

/**
 * React Hook: 使用 R2 资源
 * @returns R2 工具函数
 */
export function useR2() {
  return {
    getMediaUrl,
    getVideoUrl,
    getImageUrl,
    getLogoUrl,
    getPosterUrl,
    preloadMedia,
    config: getR2Config(),
  };
}
