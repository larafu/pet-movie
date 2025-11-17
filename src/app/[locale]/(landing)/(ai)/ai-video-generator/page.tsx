import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PageHeader } from '@/shared/blocks/common';
import { VideoGenerator } from '@/shared/blocks/generator';
import { getMetadata } from '@/shared/lib/seo';
import { CTA, FAQ } from '@/themes/default/blocks';

export const generateMetadata = getMetadata({
  metadataKey: 'ai.video.metadata',
  canonicalUrl: '/ai-video-generator',
});

export default async function AiVideoGeneratorPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('landing');
  const tt = await getTranslations('ai.video');

  return (
    <>
      <PageHeader
        title={tt.raw('page.title')}
        description={tt.raw('page.description')}
        className="mt-8 py-8 md:py-12 -mb-16"
      />
      <VideoGenerator srOnlyTitle={tt.raw('generator.title')} />
      <FAQ faq={t.raw('faq')} />
      <CTA cta={t.raw('cta')} className="bg-muted" />
    </>
  );
}
