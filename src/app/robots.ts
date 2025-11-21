import { MetadataRoute } from 'next';
import { envConfigs } from '@/config';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = envConfigs.app_url;

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
