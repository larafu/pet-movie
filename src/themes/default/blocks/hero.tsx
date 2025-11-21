'use client';

import { motion } from 'framer-motion';
import { ArrowRight, ArrowUpRight, Play } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Link } from '@/core/i18n/navigation';
import { LazyImage, SmartIcon } from '@/shared/blocks/common';
import { Button } from '@/shared/components/ui/button';
import { Hero as HeroType } from '@/shared/types/blocks/landing';
import { cn } from '@/shared/lib/utils';
import { useAppContext } from '@/shared/contexts/app';

import { SocialAvatars } from './social-avatars';

const createFadeInVariant = (delay: number) => ({
  initial: {
    opacity: 0,
    y: 20,
    filter: 'blur(6px)',
  },
  animate: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
  },
  transition: {
    duration: 0.6,
    delay,
    ease: [0.22, 1, 0.36, 1] as const,
  },
});

export function Hero({
  hero,
  className,
}: {
  hero: HeroType;
  className?: string;
}) {
  const { user } = useAppContext();
  const highlightText = hero.highlight_text ?? '';
  let texts = null;
  if (highlightText) {
    texts = hero.title?.split(highlightText, 2);
  }

  // Helper function to get correct URL based on login status
  const getButtonUrl = (originalUrl: string) => {
    // If user is logged in and URL is /sign-up, redirect to video generator
    if (user && originalUrl === '/sign-up') {
      return '/ai-video-generator';
    }
    return originalUrl;
  };

  // Pet Movie AI: Mouse tracking for glow effect
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!heroRef.current) return;
      const rect = heroRef.current.getBoundingClientRect();
      setMousePosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <>
      <section
        ref={heroRef}
        id={hero.id}
        className={`relative overflow-hidden pt-32 pb-20 md:pb-32 min-h-[90vh] flex items-center ${hero.className} ${className}`}
      >
        {/* Background Video */}
        <div className="absolute inset-0 w-full h-full overflow-hidden z-0">
          <video
            autoPlay
            loop
            muted
            playsInline
            poster="https://images.unsplash.com/photo-1552053831-71594a27632d?q=80&w=2524&auto=format&fit=crop"
            className="w-full h-full object-cover opacity-100"
          >
            <source src="/video/prairie-adventure.mp4" type="video/mp4" />
          </video>
        </div>

        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-transparent to-background/80 z-0" />

        {/* Pet Movie AI: Glow balls */}
        <div
          className="absolute w-[800px] h-[800px] rounded-full bg-primary/20 blur-[120px] animate-glow-pulse pointer-events-none z-0"
          style={{
            left: `${mousePosition.x - 400}px`,
            top: `${mousePosition.y - 400}px`,
            transition: 'left 0.3s ease-out, top 0.3s ease-out',
          }}
        />

        <div className="relative mx-auto max-w-5xl px-4 text-center z-10">
          {hero.announcement && (
            <motion.div {...createFadeInVariant(0)}>
              <Link
                href={getButtonUrl(hero.announcement.url || '')}
                target={hero.announcement.target || '_self'}
                className="glass-frosted hover:bg-white/10 group mx-auto mb-8 flex w-fit items-center gap-4 rounded-full p-1 pl-4 shadow-gold/20 transition-colors duration-300"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                <span className="text-foreground/90 text-sm font-medium">
                  {hero.announcement.title}
                </span>
                <span className="block h-4 w-0.5 border-l border-white/20"></span>

                <div className="bg-white/10 group-hover:bg-white/20 size-6 overflow-hidden rounded-full duration-500 flex items-center justify-center">
                  <ArrowRight className="size-3 text-primary" />
                </div>
              </Link>
            </motion.div>
          )}

          <motion.div {...createFadeInVariant(0.15)}>
            {texts && texts.length > 0 ? (
              <h1 className="text-foreground font-cinzel font-bold leading-[0.9] tracking-tight text-balance drop-shadow-2xl" style={{ fontSize: 'clamp(3rem, 10vw, 8rem)' }}>
                {texts[0]}
                <span className="text-gradient block py-1" style={{ fontSize: 'clamp(2.5rem, 7vw, 6rem)' }}>
                  {highlightText}
                </span>
                {texts[1]}
              </h1>
            ) : (
              <h1 className="text-foreground font-cinzel font-bold leading-[0.9] tracking-tight text-balance drop-shadow-2xl" style={{ fontSize: 'clamp(3rem, 10vw, 8rem)' }}>
                {hero.title}
              </h1>
            )}
          </motion.div>

          <motion.p
            {...createFadeInVariant(0.3)}
            className="text-white mt-8 mb-10 text-xl text-balance max-w-2xl mx-auto font-light"
            dangerouslySetInnerHTML={{ __html: hero.description ?? '' }}
          />

          {hero.buttons && (
            <motion.div
              {...createFadeInVariant(0.45)}
              className="flex flex-col items-center justify-center gap-6"
            >
              <div className="flex items-center justify-center gap-6 flex-wrap">
                {hero.buttons.map((button, idx) => (
                  <Button
                    key={idx}
                    asChild
                    size="lg"
                    className={cn(
                      "rounded-full px-8 h-14 text-base font-semibold transition-all duration-300",
                      button.variant === 'outline' 
                        ? "glass-frosted border-white/20 hover:bg-white/10 text-foreground hover:scale-105" 
                        : "bg-gold text-black hover:opacity-90 shadow-gold hover:shadow-gold/80 hover:scale-105"
                    )}
                  >
                    <Link
                      href={getButtonUrl(button.url ?? '')}
                      target={button.target ?? '_self'}
                    >
                      {button.icon && <SmartIcon name={button.icon as string} className="mr-2 size-5" />}
                      <span>{button.title}</span>
                    </Link>
                  </Button>
                ))}
              </div>

              {/* Trust Badges */}
              <div className="flex items-center gap-6 mt-4 opacity-80">
                <div className="flex items-center gap-2 text-xs font-medium text-gold uppercase tracking-widest">
                  <span className="size-1.5 rounded-full bg-gold" />
                  Award Winning AI
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-gold uppercase tracking-widest">
                  <span className="size-1.5 rounded-full bg-gold" />
                  Cinema Grade 4K
                </div>
              </div>
            </motion.div>
          )}

          {hero.tip && (
            <motion.p
              {...createFadeInVariant(0.6)}
              className="text-muted-foreground mt-8 block text-center text-sm opacity-60"
              dangerouslySetInnerHTML={{ __html: hero.tip ?? '' }}
            />
          )}

          {hero.show_avatars && (
            <motion.div {...createFadeInVariant(0.75)} className="mt-12">
              <SocialAvatars tip={hero.avatars_tip || ''} />
            </motion.div>
          )}
        </div>
      </section>
    </>
  );
}
