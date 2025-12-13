import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getThemePage } from '@/core/theme';
import { getMetadata } from '@/shared/lib/seo';
import { Landing } from '@/shared/types/blocks/landing';

export const generateMetadata = getMetadata({
  metadataKey: 'landing.metadata',
  canonicalUrl: '/',
  imageUrl: '/logo.png',
});

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // load page data
  const t = await getTranslations('landing');

  // build page params
  const page: Landing = {
    hero: t.raw('hero'),
    logos: t.raw('logos'),
    introduce: t.raw('introduce'),
    benefits: t.raw('benefits'),
    showcases: t.raw('showcases'),
    usage: t.raw('usage'),
    features: t.raw('features'),
    stats: t.raw('stats'),
    subscribe: t.raw('subscribe'),
    testimonials: t.raw('testimonials'),
    faq: t.raw('faq'),
    cta: t.raw('cta'),
    // 图片转视频展示区域的翻译
    imageToVideoReveal: t.raw('imageToVideoReveal'),
  };

  // load page component
  const Page = await getThemePage('landing');

  return <Page locale={locale} page={page} />;
}
