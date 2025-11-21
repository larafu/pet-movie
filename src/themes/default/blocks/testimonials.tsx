'use client';

import { Star } from 'lucide-react';
import { ScrollAnimation } from '@/shared/components/ui/scroll-animation';
import { Image as ImageType } from '@/shared/types/blocks/common';
import { Testimonials as TestimonialsType } from '@/shared/types/blocks/landing';
import { cn } from '@/shared/lib/utils';

export function Testimonials({
  testimonials,
  className,
}: {
  testimonials: TestimonialsType;
  className?: string;
}) {
  const TestimonialCard = ({
    name,
    role,
    image,
    quote,
  }: {
    name?: string;
    role?: string;
    image?: ImageType;
    quote?: string;
  }) => {
    return (
      <div className="flex flex-col items-center text-center space-y-6 p-8 transition-all duration-300 hover:scale-105">
        <div className="flex gap-1 text-gold animate-pulse">
          {[...Array(5)].map((_, i) => (
            <Star key={i} size={24} fill="currentColor" className="drop-shadow-[0_0_8px_rgba(255,215,0,0.5)]" />
          ))}
        </div>
        
        <blockquote className="font-cinzel font-bold text-xl md:text-3xl text-foreground leading-tight">
          &ldquo;{quote}&rdquo;
        </blockquote>
        
        <div className="flex flex-col items-center gap-2">
          <div className="h-px w-12 bg-gold/50 mb-2" />
          <cite className="not-italic font-bold text-sm tracking-[0.2em] uppercase text-muted-foreground">
            {name}
          </cite>
          {role && (
            <span className="text-gold/60 text-[10px] uppercase tracking-[0.3em] font-bold">
              {role}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <section
      id={testimonials.id}
      className={cn("py-20 md:py-32 bg-black relative overflow-hidden", testimonials.className, className)}
    >
      {/* Background Elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,215,0,0.05),transparent_70%)] pointer-events-none" />
      
      <div className="container relative z-10">
        <ScrollAnimation>
          <div className="mx-auto max-w-3xl text-center mb-16">
            <div className="inline-block border border-gold/30 px-4 py-1 rounded-full mb-6 bg-black/50 backdrop-blur-sm">
              <span className="text-gold text-xs font-bold tracking-[0.2em] uppercase">
                Critical Acclaim
              </span>
            </div>
            <h2 className="text-foreground mb-6 text-4xl md:text-6xl font-cinzel font-bold tracking-tight">
              {testimonials.title}
            </h2>
            <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto">
              {testimonials.description}
            </p>
          </div>
        </ScrollAnimation>
        
        <ScrollAnimation delay={0.2}>
          <div className="grid gap-12 md:gap-16 md:grid-cols-3 items-start">
            {testimonials.items?.map((item, index) => (
              <TestimonialCard key={index} {...item} />
            ))}
          </div>
        </ScrollAnimation>
        
        {/* Trust Badges / Awards Row */}
        <ScrollAnimation delay={0.4}>
          <div className="mt-20 pt-12 border-t border-white/10 flex flex-wrap justify-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
             {/* Placeholder for Award Logos - using text for now as per requirements */}
             <div className="flex flex-col items-center gap-2">
               <div className="w-16 h-16 rounded-full border-2 border-gold/50 flex items-center justify-center">
                 <span className="text-gold font-bold text-xs text-center leading-none">BEST<br/>AI<br/>APP</span>
               </div>
               <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Product Hunt</span>
             </div>
             <div className="flex flex-col items-center gap-2">
               <div className="w-16 h-16 rounded-full border-2 border-gold/50 flex items-center justify-center">
                 <span className="text-gold font-bold text-xs text-center leading-none">#1<br/>PET<br/>TECH</span>
               </div>
               <span className="text-[10px] uppercase tracking-widest text-muted-foreground">TechCrunch</span>
             </div>
             <div className="flex flex-col items-center gap-2">
               <div className="w-16 h-16 rounded-full border-2 border-gold/50 flex items-center justify-center">
                 <span className="text-gold font-bold text-xs text-center leading-none">5<br/>STAR<br/>RATING</span>
               </div>
               <span className="text-[10px] uppercase tracking-widest text-muted-foreground">App Store</span>
             </div>
          </div>
        </ScrollAnimation>
      </div>
    </section>
  );
}
