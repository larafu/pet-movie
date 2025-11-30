import { MetadataRoute } from 'next';
import { envConfigs } from '@/config';

export default function sitemap(): MetadataRoute.Sitemap {
  // 移除 baseUrl 末尾的斜杠，避免生成双斜杠 URL
  const baseUrl = envConfigs.app_url.replace(/\/+$/, '');
  const locales = ['en', 'zh'];
  const currentDate = new Date();

  // Homepage - highest priority, frequent updates
  const homepageUrls = locales.map((locale) => ({
    url: locale === 'en' ? baseUrl : `${baseUrl}/${locale}`,
    lastModified: currentDate,
    changeFrequency: 'daily' as const,
    priority: 1.0,
    alternates: {
      languages: {
        en: baseUrl,
        zh: `${baseUrl}/zh`,
      },
    },
  }));

  // Key landing pages - high priority
  const keyPages = [
    { path: 'pricing', priority: 0.9, changeFrequency: 'weekly' as const },
    { path: 'showcases', priority: 0.8, changeFrequency: 'weekly' as const },
    { path: 'blog', priority: 0.7, changeFrequency: 'weekly' as const },
  ];

  const keyPageUrls = keyPages.flatMap((page) =>
    locales.map((locale) => ({
      url: locale === 'en' ? `${baseUrl}/${page.path}` : `${baseUrl}/${locale}/${page.path}`,
      lastModified: currentDate,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
      alternates: {
        languages: {
          en: `${baseUrl}/${page.path}`,
          zh: `${baseUrl}/zh/${page.path}`,
        },
      },
    }))
  );

  // Authentication pages - medium-low priority
  const authPages = ['sign-in', 'sign-up'];
  const authUrls = authPages.flatMap((page) =>
    locales.map((locale) => ({
      url: locale === 'en' ? `${baseUrl}/${page}` : `${baseUrl}/${locale}/${page}`,
      lastModified: currentDate,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    }))
  );

  // AI generator pages - high priority for SEO
  const aiPages = ['video', 'image', 'music', 'chat'];
  const aiUrls = aiPages.flatMap((page) =>
    locales.map((locale) => ({
      url: locale === 'en' ? `${baseUrl}/ai/${page}` : `${baseUrl}/${locale}/ai/${page}`,
      lastModified: currentDate,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
      alternates: {
        languages: {
          en: `${baseUrl}/ai/${page}`,
          zh: `${baseUrl}/zh/ai/${page}`,
        },
      },
    }))
  );

  // Legal pages - low priority
  const legalPages = ['privacy', 'terms'];
  const legalUrls = legalPages.flatMap((page) =>
    locales.map((locale) => ({
      url: locale === 'en' ? `${baseUrl}/legal/${page}` : `${baseUrl}/${locale}/legal/${page}`,
      lastModified: currentDate,
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    }))
  );

  return [...homepageUrls, ...keyPageUrls, ...aiUrls, ...authUrls, ...legalUrls];
}
