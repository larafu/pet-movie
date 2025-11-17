'use client';

import { motion } from 'framer-motion';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
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
        className={`relative overflow-hidden pt-16 pb-8 md:pb-8 ${hero.className} ${className}`}
      >
        {/* Pet Movie AI: Glow balls */}
        <div
          className="absolute w-[800px] h-[800px] rounded-full bg-primary/30 blur-[120px] animate-glow-pulse pointer-events-none"
          style={{
            left: `${mousePosition.x - 400}px`,
            top: `${mousePosition.y - 400}px`,
            transition: 'left 0.3s ease-out, top 0.3s ease-out',
          }}
        />
        <div
          className="absolute top-1/4 right-1/4 w-[600px] h-[600px] rounded-full bg-secondary/20 blur-[100px] animate-glow-pulse pointer-events-none"
          style={{ animationDelay: '2s' }}
        />

        {hero.announcement && (
          <motion.div {...createFadeInVariant(0)}>
            <Link
              href={getButtonUrl(hero.announcement.url || '')}
              target={hero.announcement.target || '_self'}
              className="glass hover:bg-white/5 group mx-auto mb-8 flex w-fit items-center gap-4 rounded-full border-transparent p-1 pl-4 shadow-md transition-colors duration-300 relative z-10"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <span className="text-foreground/80 text-sm">
                {hero.announcement.title}
              </span>
              <span className="dark:border-background block h-4 w-0.5 border-l bg-white/20 dark:bg-zinc-700"></span>

              <div className="bg-white/5 group-hover:bg-white/10 size-6 overflow-hidden rounded-full duration-500">
                <div className="flex w-12 -translate-x-1/2 duration-500 ease-in-out group-hover:translate-x-0">
                  <span className="flex size-6">
                    <ArrowRight className="m-auto size-3" />
                  </span>
                  <span className="flex size-6">
                    <ArrowRight className="m-auto size-3" />
                  </span>
                </div>
              </div>
            </Link>
          </motion.div>
        )}

        <div className="relative mx-auto max-w-5xl px-4 text-center z-10">
          <motion.div {...createFadeInVariant(0.15)}>
            {texts && texts.length > 0 ? (
              <h1 className="text-foreground font-bold leading-[0.9] tracking-tighter text-balance" style={{ fontSize: 'clamp(3rem, 12vw, 12rem)' }}>
                {texts[0]}
                <span className="text-gradient block">
                  {highlightText}
                </span>
                {texts[1]}
              </h1>
            ) : (
              <h1 className="text-foreground font-bold leading-[0.9] tracking-tighter text-balance" style={{ fontSize: 'clamp(3rem, 12vw, 12rem))' }}>
                {hero.title}
              </h1>
            )}
          </motion.div>

          <motion.p
            {...createFadeInVariant(0.3)}
            className="text-muted-foreground mt-8 mb-8 text-lg text-balance"
            dangerouslySetInnerHTML={{ __html: hero.description ?? '' }}
          />

          {hero.buttons && (
            <motion.div
              {...createFadeInVariant(0.45)}
              className="flex flex-col items-center justify-center gap-4"
            >
              <div className="flex items-center justify-center gap-4 flex-wrap">
                {hero.buttons.map((button, idx) => (
                  <Button
                    key={idx}
                    asChild
                    size={button.size || 'default'}
                    variant={button.variant || 'default'}
                    className="px-4 text-sm"
                  >
                    <Link
                      href={getButtonUrl(button.url ?? '')}
                      target={button.target ?? '_self'}
                    >
                      {button.icon && <SmartIcon name={button.icon as string} />}
                      <span>{button.title}</span>
                    </Link>
                  </Button>
                ))}
              </div>
              {hero.early_bird_badge && hero.early_bird_button && (
                <Link
                  href={getButtonUrl(hero.early_bird_button.url ?? '/pricing')}
                  target={hero.early_bird_button.target ?? '_self'}
                  className={cn(
                    "relative inline-flex items-center gap-3 h-12 px-6 overflow-hidden rounded-full",
                    "bg-zinc-900 dark:bg-zinc-100",
                    "transition-all duration-200",
                    "group shadow-lg hover:shadow-xl"
                  )}
                >
                  {/* Gradient background effect */}
                  <div
                    className={cn(
                      "absolute inset-0",
                      "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500",
                      "opacity-40 group-hover:opacity-80",
                      "blur transition-opacity duration-500"
                    )}
                  />

                  {/* Content */}
                  <div className="relative flex items-center gap-3">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-white dark:text-zinc-900 text-sm font-bold">
                        {hero.early_bird_badge}
                      </span>
                      <span className="text-white/70 dark:text-zinc-900/70">•</span>
                      <span className="text-white dark:text-zinc-900 text-sm font-medium">
                        {hero.early_bird_button.title}
                      </span>
                      <ArrowUpRight className="w-4 h-4 text-white/90 dark:text-zinc-900/90 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </div>
                  </div>
                </Link>
              )}
            </motion.div>
          )}

          {hero.tip && (
            <motion.p
              {...createFadeInVariant(0.6)}
              className="text-muted-foreground mt-6 block text-center text-sm"
              dangerouslySetInnerHTML={{ __html: hero.tip ?? '' }}
            />
          )}

          {hero.show_avatars && (
            <motion.div {...createFadeInVariant(0.75)}>
              <SocialAvatars tip={hero.avatars_tip || ''} />
            </motion.div>
          )}

          {/* Pet Movie AI: Stats cards */}
          {hero.stats && hero.stats.length > 0 && (
            <motion.div
              {...createFadeInVariant(0.8)}
              className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-16 max-w-3xl mx-auto"
            >
              {hero.stats.map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    duration: 0.6,
                    delay: 0.8 + i * 0.1,
                    ease: [0.22, 1, 0.36, 1] as const,
                  }}
                  className="glass rounded-2xl p-6 hover:bg-white/5 transition-all"
                >
                  <div className="text-4xl font-bold text-gradient mb-2">
                    {stat.value}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </section>
      {hero.image && (
        <motion.section
          className="border-foreground/10 relative mt-8 border-y sm:mt-16"
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            delay: 0.9,
            duration: 0.7,
            ease: [0.22, 1, 0.36, 1] as const,
          }}
        >
          <div className="relative z-10 mx-auto max-w-6xl border-x px-3">
            <div className="border-x">
              <div
                aria-hidden
                className="h-3 w-full bg-[repeating-linear-gradient(-45deg,var(--color-foreground),var(--color-foreground)_1px,transparent_1px,transparent_4px)] opacity-5"
              />
              <LazyImage
                className="border-border/25 relative z-2 hidden border dark:block"
                src={hero.image_invert?.src || hero.image?.src || ''}
                alt={hero.image_invert?.alt || hero.image?.alt || ''}
              />
              <LazyImage
                className="border-border/25 relative z-2 border dark:hidden"
                src={hero.image?.src || hero.image_invert?.src || ''}
                alt={hero.image?.alt || hero.image_invert?.alt || ''}
              />
            </div>
          </div>
        </motion.section>
      )}
    </>
  );
}
