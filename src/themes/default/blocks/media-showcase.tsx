'use client';

import { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface MediaShowcaseProps {
  beforeImage: string;
  afterVideo: string;
  videoPoster?: string;
  beforeLabel?: string;
  afterLabel?: string;
  title?: string;
  description?: string;
  className?: string;
}

export function MediaShowcase({
  beforeImage,
  afterVideo,
  videoPoster,
  beforeLabel = 'Original Photo',
  afterLabel = 'Cinematic AI Result',
  title = 'Transform Your Pet into a Movie Star',
  description = 'From a simple photo to a stunning cinematic video',
  className,
}: MediaShowcaseProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      if (isPlaying) {
        video.play().catch(() => setIsPlaying(false));
      } else {
        video.pause();
      }
    }
  }, [isPlaying]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.play().catch(() => setIsPlaying(false));
    }
  }, []);

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <div className={cn('w-full px-4 py-16 md:py-24', className)}>
      <div className="container max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12 space-y-4"
        >
          <h2 className="font-cinzel text-3xl md:text-5xl font-bold text-foreground">
            {title.split('Movie Star')[0]}
            <span className="text-gold">Movie Star</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {description}
          </p>
        </motion.div>

        {/* Media Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          {/* Before - Image */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="relative group"
          >
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-white/10">
              <img
                src={beforeImage}
                alt="Original"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-md text-white/90 px-4 py-2 rounded-full text-sm font-bold tracking-wider border border-white/20">
                {beforeLabel}
              </div>
              <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-white/10 rounded-2xl" />
            </div>
          </motion.div>

          {/* After - Video */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="relative group"
          >
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-white/10">
              <video
                ref={videoRef}
                src={afterVideo}
                poster={videoPoster}
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-md text-gold px-4 py-2 rounded-full text-sm font-bold tracking-wider border border-gold/30 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gold animate-pulse" />
                {afterLabel}
              </div>

              {/* Play/Pause Button */}
              <button
                onClick={togglePlayPause}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md text-white px-4 py-2 rounded-full text-sm font-medium border border-white/20 hover:bg-black/90 hover:border-gold/30 transition-all flex items-center gap-2 opacity-0 group-hover:opacity-100"
              >
                {isPlaying ? (
                  <>
                    <Pause size={16} />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play size={16} />
                    <span>Play</span>
                  </>
                )}
              </button>

              <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-white/10 rounded-2xl" />
            </div>
          </motion.div>
        </div>

        {/* Arrow Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          className="text-center mt-8"
        >
          <div className="inline-flex items-center gap-3 text-muted-foreground text-sm">
            <span className="hidden lg:inline">{beforeLabel}</span>
            <svg
              className="w-8 h-8 text-gold"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
            <span className="hidden lg:inline">{afterLabel}</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
