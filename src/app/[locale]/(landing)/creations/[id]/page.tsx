/**
 * 作品详情页 - 通过 ID 直接访问
 * SEO 友好的独立页面，自动打开弹窗展示详情
 */

import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { eq, and, or, isNull } from 'drizzle-orm';

import { db } from '@/core/db';
import { aiTask, user as userTable } from '@/config/db/schema';
import { DashboardClient } from '../client';

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

// 动态生成 metadata
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;

  // 获取作品信息用于 SEO
  const task = await db()
    .select({
      prompt: aiTask.prompt,
      mediaType: aiTask.mediaType,
      model: aiTask.model,
      userName: userTable.name,
    })
    .from(aiTask)
    .leftJoin(userTable, eq(aiTask.userId, userTable.id))
    .where(
      and(
        eq(aiTask.id, id),
        or(eq(aiTask.status, 'success'), eq(aiTask.status, 'completed')),
        isNull(aiTask.deletedAt)
      )
    )
    .limit(1);

  if (!task[0]) {
    return {
      title: 'Creation Not Found',
    };
  }

  const { prompt, mediaType, model, userName } = task[0];
  const title = prompt?.slice(0, 60) || 'AI Creation';
  const mediaTypeLabel = mediaType === 'video' ? 'Video' : 'Image';

  return {
    title: `${title} | AI ${mediaTypeLabel} by @${userName || 'Creator'}`,
    description: prompt?.slice(0, 160) || `AI-generated ${mediaType} created with ${model}`,
    openGraph: {
      title: `${title} | AI ${mediaTypeLabel}`,
      description: prompt?.slice(0, 160) || `AI-generated ${mediaType}`,
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | AI ${mediaTypeLabel}`,
      description: prompt?.slice(0, 160) || `AI-generated ${mediaType}`,
    },
  };
}

export default async function CreationDetailPage({ params }: PageProps) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  // 验证作品是否存在且公开
  const task = await db()
    .select({ id: aiTask.id, isPublic: aiTask.isPublic })
    .from(aiTask)
    .where(
      and(
        eq(aiTask.id, id),
        or(eq(aiTask.status, 'success'), eq(aiTask.status, 'completed')),
        isNull(aiTask.deletedAt)
      )
    )
    .limit(1);

  if (!task[0]) {
    notFound();
  }

  const t = await getTranslations('dashboard');

  return (
    <DashboardClient
      title={t('title')}
      emptyMessage={t('feed.empty')}
      loadingMessage={t('feed.loading')}
      errorMessage={t('feed.error')}
      initialItemId={id}
    />
  );
}
