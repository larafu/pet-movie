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

// Background videos to play in sequence
const BACKGROUND_VIDEOS = [
  '/video/dog-funny-family.mp4',
  '/video/prairie-adventure.mp4',
];

const BACKGROUND_TRANSITION_MS = 1500;

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
    // If user is logged in and URL is /sign-up, redirect to pricing
    if (user && originalUrl === '/sign-up') {
      return '/pricing';
    }
    return originalUrl;
  };

  // 视频循环 + 性能优化
  const totalVideos = BACKGROUND_VIDEOS.length;
  const hasMultipleVideos = totalVideos > 1;
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isVideo1Active, setIsVideo1Active] = useState(true);
  const [videoIndices, setVideoIndices] = useState(() => ({
    video1: 0,
    video2: hasMultipleVideos ? 1 : 0,
  }));
  const [hasPreloadedSecondary, setHasPreloadedSecondary] = useState(
    !hasMultipleVideos
  );
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const video1Ref = useRef<HTMLVideoElement>(null);
  const video2Ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video1 = video1Ref.current;
    const video2 = video2Ref.current;
    if (!video1 || totalVideos === 0) {
      return;
    }

    const playVideo = (video?: HTMLVideoElement | null) => {
      if (!video) {
        return;
      }
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => null);
      }
    };

    const clearTransitionTimer = () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
        transitionTimeoutRef.current = null;
      }
    };

    const handleVideo1Ended = () => {
      if (!hasMultipleVideos || !video2) {
        video1.currentTime = 0;
        playVideo(video1);
        return;
      }

      setIsTransitioning(true);
      video2.currentTime = 0;
      playVideo(video2);

      setVideoIndices((prev) => ({
        video1: (prev.video2 + 1) % totalVideos,
        video2: prev.video2,
      }));

      clearTransitionTimer();
      transitionTimeoutRef.current = setTimeout(() => {
        setIsTransitioning(false);
        setIsVideo1Active(false);
      }, BACKGROUND_TRANSITION_MS);
    };

    const handleVideo2Ended = () => {
      if (!hasMultipleVideos || !video2 || !video1) {
        if (video2) {
          video2.currentTime = 0;
        }
        playVideo(video2);
        return;
      }

      setIsTransitioning(true);
      video1.currentTime = 0;
      playVideo(video1);

      setVideoIndices((prev) => ({
        video1: prev.video1,
        video2: (prev.video1 + 1) % totalVideos,
      }));

      clearTransitionTimer();
      transitionTimeoutRef.current = setTimeout(() => {
        setIsTransitioning(false);
        setIsVideo1Active(true);
      }, BACKGROUND_TRANSITION_MS);
    };

    const handleVideo1Playing = () => {
      if (!hasMultipleVideos || hasPreloadedSecondary) {
        return;
      }
      setHasPreloadedSecondary(true);
    };

    video1.addEventListener('ended', handleVideo1Ended);
    video1.addEventListener('playing', handleVideo1Playing);
    video2?.addEventListener('ended', handleVideo2Ended);

    return () => {
      clearTransitionTimer();
      video1.removeEventListener('ended', handleVideo1Ended);
      video1.removeEventListener('playing', handleVideo1Playing);
      video2?.removeEventListener('ended', handleVideo2Ended);
    };
  }, [hasMultipleVideos, totalVideos, hasPreloadedSecondary]);

  useEffect(() => {
    const video1 = video1Ref.current;
    if (!video1) {
      return;
    }
    video1.load();
  }, [videoIndices.video1]);

  useEffect(() => {
    if (!hasMultipleVideos || !hasPreloadedSecondary) {
      return;
    }
    const video2 = video2Ref.current;
    if (!video2) {
      return;
    }
    video2.load();
  }, [videoIndices.video2, hasMultipleVideos, hasPreloadedSecondary]);

  const video1Source = BACKGROUND_VIDEOS[videoIndices.video1] ?? '';
  const video2Source = hasMultipleVideos
    ? BACKGROUND_VIDEOS[videoIndices.video2] ?? ''
    : '';

  return (
    <>
      <section
        id={hero.id}
        className={`relative overflow-hidden pt-32 pb-20 md:pb-32 min-h-[90vh] flex items-center ${hero.className} ${className}`}
      >
        {/* Background Videos with Crossfade */}
        <div className="absolute inset-0 w-full h-full overflow-hidden z-0 bg-black">
          {video1Source && (
            <video
              ref={video1Ref}
              src={video1Source}
              autoPlay
              muted
              playsInline
              poster="/imgs/dog-funny-family-poster.jpg"
              preload="metadata"
              loop={!hasMultipleVideos}
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-[1500ms] ease-in-out"
              style={{
                opacity: isVideo1Active
                  ? isTransitioning
                    ? 0
                    : 1
                  : isTransitioning
                    ? 1
                    : 0,
                zIndex: isVideo1Active ? 2 : 1,
                pointerEvents: 'none',
              }}
            />
          )}

          {hasMultipleVideos && video2Source && (
            <video
              ref={video2Ref}
              src={video2Source}
              muted
              playsInline
              preload="none"
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-[1500ms] ease-in-out"
              style={{
                opacity: !isVideo1Active
                  ? isTransitioning
                    ? 0
                    : 1
                  : isTransitioning
                    ? 1
                    : 0,
                zIndex: !isVideo1Active ? 2 : 1,
                pointerEvents: 'none',
              }}
            />
          )}
        </div>

        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-transparent to-background/80 z-[3] pointer-events-none" />

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
              <div className="text-foreground font-cinzel font-bold leading-[0.9] tracking-tight text-balance drop-shadow-2xl" style={{ fontSize: 'clamp(3rem, 10vw, 8rem)' }}>
                {texts[0]}
                <span className="text-gradient block py-1" style={{ fontSize: 'clamp(2.5rem, 7vw, 6rem)' }}>
                  {highlightText}
                </span>
                {texts[1]}
              </div>
            ) : (
              <div className="text-foreground font-cinzel font-bold leading-[0.9] tracking-tight text-balance drop-shadow-2xl" style={{ fontSize: 'clamp(3rem, 10vw, 8rem)' }}>
                {hero.title}
              </div>
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
