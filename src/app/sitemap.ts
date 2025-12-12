import { MetadataRoute } from 'next';
import { and, eq, isNull } from 'drizzle-orm';

import { db } from '@/core/db';
import { envConfigs } from '@/config';
import { petMemorial, post } from '@/config/db/schema';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 移除 baseUrl 末尾的斜杠，避免生成双斜杠 URL
  const baseUrl = envConfigs.app_url.replace(/\/+$/, '');
  const locales = ['en', 'zh', 'ja']; // 添加日语支持
  const currentDate = new Date();

  // Homepage - highest priority, frequent updates
  // 注意：移除 alternates 属性，避免生成 xhtml 命名空间导致浏览器无法渲染 XML 树形结构
  const homepageUrls = locales.map((locale) => ({
    url: locale === 'en' ? baseUrl : `${baseUrl}/${locale}`,
    lastModified: currentDate,
    changeFrequency: 'daily' as const,
    priority: 1.0,
  }));

  // Key landing pages - high priority
  const keyPages = [
    { path: 'pricing', priority: 0.9, changeFrequency: 'weekly' as const },
    { path: 'showcases', priority: 0.8, changeFrequency: 'weekly' as const },
    { path: 'pet-memorial', priority: 0.8, changeFrequency: 'daily' as const },
    { path: 'blog', priority: 0.7, changeFrequency: 'weekly' as const },
  ];

  const keyPageUrls = keyPages.flatMap((page) =>
    locales.map((locale) => ({
      url:
        locale === 'en'
          ? `${baseUrl}/${page.path}`
          : `${baseUrl}/${locale}/${page.path}`,
      lastModified: currentDate,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
    }))
  );

  // Authentication pages - medium-low priority
  const authPages = ['sign-in', 'sign-up'];
  const authUrls = authPages.flatMap((page) =>
    locales.map((locale) => ({
      url:
        locale === 'en' ? `${baseUrl}/${page}` : `${baseUrl}/${locale}/${page}`,
      lastModified: currentDate,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    }))
  );

  // AI generator pages - high priority for SEO
  // 包含所有公开的 AI 生成器落地页
  const aiGeneratorPages = [{ path: 'create-pet-movie', priority: 0.9 }];
  const aiUrls = aiGeneratorPages.flatMap((page) =>
    locales.map((locale) => ({
      url:
        locale === 'en'
          ? `${baseUrl}/${page.path}`
          : `${baseUrl}/${locale}/${page.path}`,
      lastModified: currentDate,
      changeFrequency: 'weekly' as const,
      priority: page.priority,
    }))
  );

  // Legal pages - low priority
  const legalPages = ['privacy', 'terms', 'content-policy', 'refund'];
  const legalUrls = legalPages.flatMap((page) =>
    locales.map((locale) => ({
      url:
        locale === 'en'
          ? `${baseUrl}/legal/${page}`
          : `${baseUrl}/${locale}/legal/${page}`,
      lastModified: currentDate,
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    }))
  );

  // Blog 动态页面 - 从数据库获取所有已发布的博客文章
  let blogUrls: MetadataRoute.Sitemap = [];
  try {
    const database = db();
    const posts = await database
      .select({
        slug: post.slug,
        updatedAt: post.updatedAt,
      })
      .from(post)
      .where(
        and(
          eq(post.type, 'blog'),
          eq(post.status, 'published'),
          isNull(post.deletedAt)
        )
      );

    blogUrls = posts.flatMap((blogPost) =>
      locales.map((locale) => ({
        url:
          locale === 'en'
            ? `${baseUrl}/blog/${blogPost.slug}`
            : `${baseUrl}/${locale}/blog/${blogPost.slug}`,
        lastModified: blogPost.updatedAt || currentDate,
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      }))
    );
  } catch (error) {
    // 数据库查询失败时不影响其他 sitemap 条目
    console.error('Failed to fetch blog posts for sitemap:', error);
  }

  // Pet Memorial 动态页面 - 从数据库获取所有公开的纪念
  let memorialUrls: MetadataRoute.Sitemap = [];
  try {
    const database = db();
    const memorials = await database
      .select({
        id: petMemorial.id,
        updatedAt: petMemorial.updatedAt,
      })
      .from(petMemorial)
      .where(
        and(
          eq(petMemorial.isPublic, true),
          eq(petMemorial.status, 'approved'),
          isNull(petMemorial.deletedAt)
        )
      );

    memorialUrls = memorials.flatMap((memorial) =>
      locales.map((locale) => ({
        url:
          locale === 'en'
            ? `${baseUrl}/pet-memorial/${memorial.id}`
            : `${baseUrl}/${locale}/pet-memorial/${memorial.id}`,
        lastModified: memorial.updatedAt || currentDate,
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      }))
    );
  } catch (error) {
    // 数据库查询失败时不影响其他 sitemap 条目
    console.error('Failed to fetch pet memorials for sitemap:', error);
  }

  return [
    ...homepageUrls,
    ...keyPageUrls,
    ...aiUrls,
    ...authUrls,
    ...legalUrls,
    ...blogUrls,
    ...memorialUrls,
  ];
}
