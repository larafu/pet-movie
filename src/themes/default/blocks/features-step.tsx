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
    }, 4000); // Change step every 4 seconds for better readability

    return () => clearInterval(interval);
  }, [features.items?.length]);

  return (
    <section
      id={features.id}
      className={cn('py-16 md:py-24 bg-black/50', features.className, className)}
    >
      <div className="m-4 rounded-[2rem]">
        <div className="@container relative container">
          <ScrollAnimation>
            <div className="mx-auto max-w-2xl text-center mb-16">
              <span className="text-gold font-cinzel font-bold tracking-widest uppercase text-sm">
                {features.label}
              </span>
              <h2 className="text-foreground mt-4 text-4xl md:text-5xl font-cinzel font-bold leading-tight">
                {features.title}
              </h2>
              <p className="text-muted-foreground mt-6 text-lg text-balance">
                {features.description}
              </p>
            </div>
          </ScrollAnimation>

          <ScrollAnimation delay={0.2}>
            {/* Pet Movie AI: Vertical timeline with auto-carousel */}
            <div className="mx-auto max-w-4xl space-y-8">
              {features.items?.map((item, idx) => (
                <div
                  className={cn(
                    'relative flex items-start gap-8 transition-all duration-500 group cursor-pointer',
                    activeStep === idx ? 'opacity-100' : 'opacity-40 hover:opacity-60'
                  )}
                  key={idx}
                  onClick={() => setActiveStep(idx)}
                >
                  {/* Timeline line */}
                  {idx < (features.items?.length ?? 0) - 1 && (
                    <div className="absolute left-6 top-14 h-full w-0.5 bg-gradient-to-b from-gold/30 to-transparent" />
                  )}

                  {/* Step number with glow effect */}
                  <div
                    className={cn(
                      'relative z-10 flex size-12 flex-shrink-0 items-center justify-center rounded-full font-bold font-cinzel transition-all duration-500',
                      activeStep === idx
                        ? 'bg-gold text-black shadow-[0_0_20px_rgba(255,215,0,0.4)] scale-110'
                        : 'bg-black border border-gold/30 text-gold'
                    )}
                  >
                    {idx + 1}
                  </div>

                  {/* Content */}
                  <div className={cn(
                    "flex-1 p-6 rounded-2xl transition-all duration-500 border border-transparent",
                    activeStep === idx ? "bg-white/5 border-gold/10 shadow-lg" : "bg-transparent"
                  )}>
                    <div className="flex items-center gap-4 mb-3">
                      {item.icon && (
                        <div
                          className={cn(
                            'flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-500',
                            activeStep === idx
                              ? 'bg-gold/20 text-gold'
                              : 'bg-white/5 text-muted-foreground'
                          )}
                        >
                          <SmartIcon
                            name={item.icon as string}
                            size={20}
                          />
                        </div>
                      )}
                      <h3
                        className={cn(
                          'font-cinzel font-bold transition-all duration-500',
                          activeStep === idx ? 'text-2xl text-gold' : 'text-xl text-foreground'
                        )}
                      >
                        {item.title}
                      </h3>
                    </div>
                    <p
                      className={cn(
                        'text-muted-foreground transition-all duration-500 leading-relaxed',
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
            <div className="mx-auto mt-12 flex justify-center gap-3">
              {features.items?.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveStep(idx)}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-500',
                    activeStep === idx
                      ? 'w-12 bg-gold shadow-[0_0_10px_rgba(255,215,0,0.5)]'
                      : 'w-2 bg-white/20 hover:bg-gold/50'
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
