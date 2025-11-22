'use client';

import { SmartIcon } from '@/shared/blocks/common';
import { ScrollAnimation } from '@/shared/components/ui/scroll-animation';
import { VideoCard } from '@/shared/components/ui/video-card';
import { cn } from '@/shared/lib/utils';
import { Features as FeaturesType } from '@/shared/types/blocks/landing';

export function FeaturesList({
  features,
  className,
  useH1 = false,
}: {
  features: FeaturesType;
  className?: string;
  useH1?: boolean;
}) {
  const TitleTag = useH1 ? 'h1' : 'h2';

  return (
    <section id={features.id} className={cn('overflow-x-hidden py-16 md:py-24', className)}>
      <div className="container overflow-x-hidden">
        {/* Header Section */}
        <ScrollAnimation>
          <div className="mx-auto mb-12 max-w-3xl text-center">
            {features.label && (
              <div className="mb-4 inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
                {features.label}
              </div>
            )}
            <TitleTag className="text-foreground mb-4 text-4xl font-bold text-balance md:text-5xl">
              {features.title}
            </TitleTag>
            <p className="text-muted-foreground text-lg text-balance">
              {features.description}
            </p>
          </div>
        </ScrollAnimation>

        {/* Video Grid */}
        {features.items && features.items.length > 0 && (
          <ScrollAnimation delay={0.2}>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-2">
              {features.items.map((item, idx) => (
                <div key={idx}>
                  {item.video ? (
                    <VideoCard
                      src={item.video.src}
                      title={item.title}
                      description={item.description}
                      poster={item.video.poster}
                    />
                  ) : (
                    // Fallback card without video
                    <div className="glass min-w-0 space-y-4 break-words rounded-2xl p-6 transition-all duration-300 hover:bg-white/5 hover:glow">
                      <div className="flex min-w-0 items-center gap-3">
                        {item.icon && (
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                            <SmartIcon
                              name={item.icon as string}
                              size={20}
                              className="text-primary"
                            />
                          </div>
                        )}
                      </div>
                      <h3 className="min-w-0 break-words text-xl font-semibold">
                        {item.title}
                      </h3>
                      <p className="text-muted-foreground min-w-0 break-words text-sm">
                        {item.description ?? ''}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollAnimation>
        )}
      </div>
    </section>
  );
}
