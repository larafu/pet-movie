import { MetadataRoute } from 'next';
import { envConfigs } from '@/config';

export default function robots(): MetadataRoute.Robots {
  // 移除 baseUrl 末尾的斜杠，保持 URL 一致性
  const baseUrl = envConfigs.app_url.replace(/\/+$/, '');

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/settings/',
          '/admin/',
          '/activity/',
          '/*?*utm_*', // Disallow URLs with UTM parameters to avoid duplicate content
        ],
      },
      {
        // Special rules for AI crawlers (if needed in future)
        userAgent: ['GPTBot', 'ChatGPT-User', 'Google-Extended'],
        allow: '/',
        disallow: ['/api/', '/settings/', '/admin/', '/activity/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
