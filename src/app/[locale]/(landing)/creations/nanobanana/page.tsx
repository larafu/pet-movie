/**
 * NanoBanana AI 作品页面
 * SEO 优化：专门展示 NanoBanana 模型生成的作品
 */

import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';

import { DashboardClient } from '../client';

export const metadata: Metadata = {
  title: 'NanoBanana AI Art Gallery | AI Generated Images',
  description:
    'Explore stunning AI-generated images created with NanoBanana. Create your own AI art with our advanced image generation model.',
  keywords: [
    'NanoBanana',
    'AI art',
    'AI image generator',
    'AI art gallery',
    'text to image',
    'AI generated images',
  ],
  openGraph: {
    title: 'NanoBanana AI Art Gallery',
    description: 'Create stunning AI images with NanoBanana',
    type: 'website',
  },
};

export default async function NanoBananaPage({
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
      initialModel="nanobanana"
    />
  );
}
