'use client';

import { useEffect, useState } from 'react';

import { SmartIcon } from '@/shared/blocks/common/smart-icon';
import { ScrollAnimation } from '@/shared/components/ui/scroll-animation';
import { cn } from '@/shared/lib/utils';
import { Features as FeaturesType } from '@/shared/types/blocks/landing';

export function FeaturesStep({
  features,
  className,
}: {
  features: FeaturesType;
  className?: string;
}) {
  // Pet Movie AI: Auto-carousel for steps
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % (features.items?.length ?? 1));
    }, 3000); // Change step every 3 seconds

    return () => clearInterval(interval);
  }, [features.items?.length]);

  return (
    <section
      id={features.id}
      className={cn('py-16 md:py-24', features.className, className)}
    >
      <div className="m-4 rounded-[2rem]">
        <div className="@container relative container">
          <ScrollAnimation>
            <div className="mx-auto max-w-2xl text-center">
              <span className="text-primary font-semibold tracking-wider">
                {features.label}
              </span>
              <h2 className="text-foreground mt-4 text-4xl font-bold">
                {features.title}
              </h2>
              <p className="text-muted-foreground mt-4 text-lg text-balance">
                {features.description}
              </p>
            </div>
          </ScrollAnimation>

          <ScrollAnimation delay={0.2}>
            {/* Pet Movie AI: Vertical timeline with auto-carousel */}
            <div className="mx-auto mt-20 max-w-3xl space-y-8">
              {features.items?.map((item, idx) => (
                <div
                  className={cn(
                    'relative flex items-start gap-6 transition-all duration-500',
                    activeStep === idx ? 'opacity-100' : 'opacity-40'
                  )}
                  key={idx}
                  onClick={() => setActiveStep(idx)}
                >
                  {/* Timeline line */}
                  {idx < (features.items?.length ?? 0) - 1 && (
                    <div className="absolute left-6 top-14 h-full w-0.5 bg-gradient-to-b from-primary/50 to-transparent" />
                  )}

                  {/* Step number with glow effect */}
                  <div
                    className={cn(
                      'relative z-10 flex size-12 flex-shrink-0 items-center justify-center rounded-full font-bold transition-all duration-500',
                      activeStep === idx
                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/50 scale-110'
                        : 'bg-primary/20 text-primary'
                    )}
                  >
                    {idx + 1}
                  </div>

                  {/* Content */}
                  <div className="flex-1 space-y-3 pb-8">
                    <div className="flex items-center gap-3">
                      {item.icon && (
                        <div
                          className={cn(
                            'flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-500',
                            activeStep === idx
                              ? 'bg-primary/20'
                              : 'bg-primary/10'
                          )}
                        >
                          <SmartIcon
                            name={item.icon as string}
                            size={20}
                            className="text-primary"
                          />
                        </div>
                      )}
                      <h3
                        className={cn(
                          'font-semibold transition-all duration-500',
                          activeStep === idx ? 'text-2xl' : 'text-xl'
                        )}
                      >
                        {item.title}
                      </h3>
                    </div>
                    <p
                      className={cn(
                        'text-muted-foreground transition-all duration-500',
                        activeStep === idx ? 'text-base' : 'text-sm'
                      )}
                    >
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Progress indicators */}
            <div className="mx-auto mt-8 flex justify-center gap-2">
              {features.items?.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveStep(idx)}
                  className={cn(
                    'h-2 rounded-full transition-all duration-500',
                    activeStep === idx
                      ? 'w-8 bg-primary'
                      : 'w-2 bg-primary/30 hover:bg-primary/50'
                  )}
                  aria-label={`Go to step ${idx + 1}`}
                />
              ))}
            </div>
          </ScrollAnimation>
        </div>
      </div>
    </section>
  );
}
