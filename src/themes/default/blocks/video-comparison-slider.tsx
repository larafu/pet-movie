'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GripVertical, Play, Pause } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface MediaItem {
  type: 'image' | 'video';
  src: string;
  poster?: string; // 视频封面图
}

interface VideoComparisonSliderProps {
  before: MediaItem;
  after: MediaItem;
  beforeLabel?: string;
  afterLabel?: string;
  title?: string;
  description?: string;
  className?: string;
}

export function VideoComparisonSlider({
  before,
  after,
  beforeLabel = 'Original',
  afterLabel = 'Cinematic AI',
  title = 'Transform Your Pet into a Movie Star',
  description = 'See the magic happen. Drag the slider to compare.',
  className,
}: VideoComparisonSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const beforeVideoRef = useRef<HTMLVideoElement>(null);
  const afterVideoRef = useRef<HTMLVideoElement>(null);

  // 同步两个视频的播放状态
  useEffect(() => {
    const beforeVideo = beforeVideoRef.current;
    const afterVideo = afterVideoRef.current;

    if (beforeVideo && afterVideo) {
      if (isPlaying) {
        beforeVideo.play();
        afterVideo.play();
      } else {
        beforeVideo.pause();
        afterVideo.pause();
      }
    }
  }, [isPlaying]);

  // 自动播放视频
  useEffect(() => {
    const beforeVideo = beforeVideoRef.current;
    const afterVideo = afterVideoRef.current;

    if (beforeVideo) {
      beforeVideo.play().catch(() => {
        setIsPlaying(false);
      });
    }
    if (afterVideo) {
      afterVideo.play().catch(() => {
        setIsPlaying(false);
      });
    }
  }, []);

  const handleMove = (event: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if (!containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;

    const position = ((clientX - containerRect.left) / containerRect.width) * 100;
    setSliderPosition(Math.min(Math.max(position, 0), 100));
  };

  const handleMouseDown = () => setIsDragging(true);
  const handleMouseUp = () => setIsDragging(false);

  useEffect(() => {
    const handleGlobalMove = (e: MouseEvent | TouchEvent) => {
      if (isDragging) {
        handleMove(e);
      }
    };

    const handleGlobalUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleGlobalMove);
    window.addEventListener('touchmove', handleGlobalMove);
    window.addEventListener('mouseup', handleGlobalUp);
    window.addEventListener('touchend', handleGlobalUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMove);
      window.removeEventListener('touchmove', handleGlobalMove);
      window.removeEventListener('mouseup', handleGlobalUp);
      window.removeEventListener('touchend', handleGlobalUp);
    };
  }, [isDragging]);

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const renderMedia = (media: MediaItem, ref?: React.RefObject<HTMLVideoElement>) => {
    if (media.type === 'video') {
      return (
        <video
          ref={ref}
          src={media.src}
          poster={media.poster}
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
          draggable={false}
        />
      );
    }
    return (
      <img
        src={media.src}
        alt=""
        className="w-full h-full object-cover"
        draggable={false}
      />
    );
  };

  return (
    <div className={cn("w-full max-w-6xl mx-auto px-4 py-16", className)}>
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

      {/* Slider Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2 }}
      >
        <div
          ref={containerRef}
          className="relative w-full aspect-[16/9] md:aspect-[21/9] rounded-2xl overflow-hidden cursor-ew-resize select-none shadow-2xl shadow-black/50 border border-white/10 group"
          onMouseDown={handleMouseDown}
          onTouchStart={handleMouseDown}
        >
          {/* After Media (Background) */}
          <div className="absolute inset-0 w-full h-full">
            {renderMedia(after, afterVideoRef)}
            <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-md text-gold px-3 py-1.5 rounded-full text-xs font-bold tracking-wider border border-gold/30 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
              {afterLabel}
            </div>
          </div>

          {/* Before Media (Clipped) */}
          <div
            className="absolute inset-0 w-full h-full overflow-hidden"
            style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
          >
            {renderMedia(before, beforeVideoRef)}
            <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-md text-white/90 px-3 py-1.5 rounded-full text-xs font-bold tracking-wider border border-white/20">
              {beforeLabel}
            </div>
          </div>

          {/* Slider Handle */}
          <div
            className="absolute inset-y-0 w-1 bg-gold cursor-ew-resize z-20 shadow-[0_0_20px_rgba(212,175,55,0.6)]"
            style={{ left: `${sliderPosition}%` }}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-gold rounded-full flex items-center justify-center shadow-lg text-black transition-transform group-hover:scale-110">
              <GripVertical size={24} strokeWidth={3} />
            </div>
          </div>

          {/* Play/Pause Button (Only show if videos exist) */}
          {(before.type === 'video' || after.type === 'video') && (
            <button
              onClick={togglePlayPause}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md text-white px-4 py-2 rounded-full text-sm font-medium border border-white/20 hover:bg-black/90 hover:border-gold/30 transition-all z-30 flex items-center gap-2"
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
          )}

          {/* Overlay Gradient for depth */}
          <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-white/10 rounded-2xl" />
        </div>
      </motion.div>

      {/* Instructions */}
      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.4 }}
        className="text-center text-muted-foreground text-sm mt-6"
      >
        👆 Drag the slider left or right to compare
      </motion.p>
    </div>
  );
}
