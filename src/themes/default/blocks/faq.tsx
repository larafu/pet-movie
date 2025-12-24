'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/shared/components/ui/accordion';
import { ScrollAnimation } from '@/shared/components/ui/scroll-animation';
import { FAQ as FAQType } from '@/shared/types/blocks/landing';

export function FAQ({ faq, className }: { faq: FAQType; className?: string }) {
  return (
    <section id={faq.id} className={`relative overflow-hidden py-16 md:py-24 ${className}`}>
      {/* Background Video */}
      <div className="absolute inset-0 w-full h-full overflow-hidden z-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover opacity-30"
          style={{ filter: 'brightness(0.6)' }}
        >
          <source src="https://media.petmovie.ai/petmovie/videos/prairie-adventure.mp4" type="video/mp4" />
        </video>
      </div>

      {/* Overlay Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black/80 z-0" />

      <div className={`relative z-10 mx-auto max-w-full px-4 md:max-w-3xl md:px-8`}>
        <ScrollAnimation>
          <div className="mx-auto max-w-2xl text-center text-balance">
            <h2 className="text-foreground font-cinzel mb-4 text-3xl font-bold tracking-tight md:text-4xl drop-shadow-lg">
              {faq.title}
            </h2>
            <p className="text-muted-foreground mb-6 md:mb-12 lg:mb-16 text-lg">
              {faq.description}
            </p>
          </div>
        </ScrollAnimation>

        <ScrollAnimation delay={0.2}>
          <div className="mx-auto mt-12 max-w-full">
            <Accordion
              type="single"
              collapsible
              className="glass-frosted w-full rounded-2xl p-2 border border-white/10"
            >
              {faq.items?.map((item, idx) => (
                <div className="group" key={idx}>
                  <AccordionItem
                    value={item.question ?? ''}
                    className="data-[state=open]:bg-white/5 rounded-xl border-none px-4 md:px-7 py-1 transition-colors duration-300 hover:bg-white/5"
                  >
                    <AccordionTrigger className="cursor-pointer text-base md:text-lg font-medium hover:no-underline hover:text-gold transition-colors text-left">
                      {item.question ?? ''}
                    </AccordionTrigger>
                    <AccordionContent>
                      <p className="text-base text-muted-foreground leading-relaxed">{item.answer ?? ''}</p>
                    </AccordionContent>
                  </AccordionItem>
                  <div className="mx-7 border-b border-white/5 group-last:hidden my-2" />
                </div>
              ))}
            </Accordion>

            <p
              className="text-muted-foreground mt-6 px-8 text-center text-sm opacity-60"
              dangerouslySetInnerHTML={{ __html: faq.tip ?? '' }}
            />
          </div>
        </ScrollAnimation>
      </div>
    </section>
  );
}
