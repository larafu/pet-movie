import Script from 'next/script';

import { Landing } from '@/shared/types/blocks/landing';
import {
  getWebsiteSchema,
  getSoftwareApplicationSchema,
  getFAQSchema,
  getOrganizationSchema,
} from '@/shared/lib/schema';
import {
  CTA,
  FAQ,
  Features,
  FeaturesAccordion,
  FeaturesStep,
  Hero,
  Logos,
  Stats,
  Subscribe,
  Testimonials,
} from '@/themes/default/blocks';
import { ImageToVideoReveal, VideoShowcaseCarousel } from '@/themes/default/blocks';
import { StickyCTA } from '@/themes/default/blocks/sticky-cta';

export default async function LandingPage({
  locale,
  page,
}: {
  locale?: string;
  page: Landing;
}) {
  // 生成 FAQ Schema（如果存在）
  const faqSchema = page.faq?.items
    ? getFAQSchema(
        page.faq.items
          .filter((item) => item.question && item.answer)
          .map((item) => ({
            question: item.question!,
            answer: item.answer!,
          }))
      )
    : null;

  return (
    <>
      {/* Schema.org 结构化数据 - 针对零点击搜索优化 */}
      <Script
        id="website-schema"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(getWebsiteSchema()),
        }}
      />
      <Script
        id="software-schema"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(getSoftwareApplicationSchema()),
        }}
      />
      <Script
        id="organization-schema"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(getOrganizationSchema()),
        }}
      />
      {faqSchema && (
        <Script
          id="faq-schema"
          type="application/ld+json"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(faqSchema),
          }}
        />
      )}

      {/* 现有页面内容 */}
      {page.hero && <Hero hero={page.hero} />}

      {/* Image to Video Reveal - Cinematic Transformation */}
      <ImageToVideoReveal
        beforeImage="/imgs/dog.avif"
        afterVideo="https://file.aiquickdraw.com/custom-page/akr/section-images/1759429390063fwmrwg93.mp4"
        videoPoster="https://images.unsplash.com/photo-1583337130417-3346a1be7dee?q=80&w=1200&auto=format&fit=crop"
        beforeLabel="Original Photo"
        afterLabel="Cinematic AI Result"
        autoRevealDelay={1500}
        revealDuration={2.5}
      />

      {/* SEO Section - Carousel with H1 and all keywords */}
      {page.showcases && <VideoShowcaseCarousel showcases={page.showcases} useH1={true} />}
      {page.logos && <Logos logos={page.logos} />}

      {/* Video Showcase Carousel - Auto-scrolling gallery */}

      {page.benefits && <FeaturesAccordion features={page.benefits} />}
      {page.usage && <FeaturesStep features={page.usage} />}
      {page.features && <Features features={page.features} />}
      {page.stats && page.stats.items && page.stats.items.length > 0 && (
        <Stats stats={page.stats} className="bg-muted" />
      )}
      {page.testimonials &&
        page.testimonials.items &&
        page.testimonials.items.length > 0 && (
          <Testimonials testimonials={page.testimonials} />
        )}
      {page.subscribe && (
        <Subscribe subscribe={page.subscribe} className="bg-muted" />
      )}
      {page.faq && <FAQ faq={page.faq} />}
      {page.cta && <CTA cta={page.cta} className="bg-muted" />}
      
      <StickyCTA />
    </>
  );
}
