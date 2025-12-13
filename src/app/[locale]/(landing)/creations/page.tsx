/**
 * Creations 页面 - AI 作品社区
 * 展示用户的创作和社区公开作品
 */

import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';

import { DashboardClient } from './client';

export const metadata: Metadata = {
  title: 'AI Creations Gallery | AI Generated Videos & Images',
  description:
    'Explore amazing AI-generated videos and images created by our community. Create your own AI art with NanoBanana, Sora and more.',
  keywords: ['AI art', 'AI video', 'AI image', 'NanoBanana', 'AI creations', 'AI gallery'],
};

export default async function CreationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('dashboard');

  return (
    <DashboardClient
      title={t('title')}
      emptyMessage={t('feed.empty')}
      loadingMessage={t('feed.loading')}
      errorMessage={t('feed.error')}
    />
  );
}
