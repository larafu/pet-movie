import { Landing } from '@/shared/types/blocks/landing';
import {
  CTA,
  FAQ,
  Features,
  FeaturesAccordion,
  FeaturesList,
  FeaturesStep,
  Hero,
  Logos,
  Stats,
  Subscribe,
  Testimonials,
} from '@/themes/default/blocks';

export default async function LandingPage({
  locale,
  page,
}: {
  locale?: string;
  page: Landing;
}) {
  return (
    <>
      {page.hero && <Hero hero={page.hero} />}
      {page.introduce && <FeaturesList features={page.introduce} />}
      {page.logos && <Logos logos={page.logos} />}
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
      {/* {page.subscribe && (
        <Subscribe subscribe={page.subscribe} className="bg-muted" />
      )} */}
      {page.faq && <FAQ faq={page.faq} />}
      {page.cta && <CTA cta={page.cta} className="bg-muted" />}
    </>
  );
}
