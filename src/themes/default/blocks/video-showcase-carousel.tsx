'use client';

import { motion } from 'framer-motion';
import { InfiniteSlider } from '@/shared/components/ui/infinite-slider';
import { VideoCard } from '@/shared/components/ui/video-card';
import { cn } from '@/shared/lib/utils';
import { Showcases } from '@/shared/types/blocks/landing';

export function VideoShowcaseCarousel({ showcases }: { showcases: Showcases }) {
  const { id, label, title, description, items, className } = showcases;
  if (!items || items.length === 0) return null;

  return (
    <section id={id} className={cn('relative py-24 md:py-32 overflow-hidden bg-background', className)}>
      {/* Background Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.03),transparent_70%)] pointer-events-none" />

      <div className="container relative z-10 mb-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto space-y-6"
        >
          {label && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gold/30 bg-gold/5">
              <div className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
              <span className="font-cinzel font-bold tracking-widest text-gold/80 uppercase text-xs">
                {label}
              </span>
            </div>
          )}

          {title && (
            <h2 className="font-cinzel text-4xl md:text-6xl font-bold leading-tight">
              {title}
            </h2>
          )}

          {description && (
            <p className="text-muted-foreground text-lg">
              {description}
            </p>
          )}
        </motion.div>
      </div>

      {/* Infinite Scrolling Carousel */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2 }}
        className="relative"
      >
        <InfiniteSlider
          speed={50}
          speedOnHover={0}
          direction="horizontal"
          gap={24}
        >
          {items.map((item, index) => (
            <div
              key={index}
              className="flex-shrink-0 w-[400px] md:w-[500px]"
            >
              {item.video && (
                <VideoCard
                  src={item.video.src}
                  title={item.title}
                  description={item.description}
                  poster={item.video.poster}
                />
              )}
            </div>
          ))}
        </InfiniteSlider>

        {/* Fade Edges */}
        <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-background to-transparent pointer-events-none z-10" />
        <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-background to-transparent pointer-events-none z-10" />
      </motion.div>

      {/* Instruction */}
      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.4 }}
        className="text-center text-muted-foreground text-sm mt-12"
      >
        👆 Hover to pause the carousel
      </motion.p>
    </section>
  );
}
