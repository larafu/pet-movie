'use client';

import { Play, Pause } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';

import { cn } from '@/shared/lib/utils';

interface VideoCardProps {
  src: string;
  title?: string;
  description?: string;
  poster?: string;
  className?: string;
}

export function VideoCard({
  src,
  title,
  description,
  poster,
  className,
}: VideoCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Auto-play on mount
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((error) => {
        // Auto-play was prevented, user will need to click play
        console.log('Auto-play prevented:', error);
      });
    }
  }, []);

  const togglePlay = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl bg-muted/50 backdrop-blur transition-all duration-300',
        'hover:shadow-xl hover:shadow-primary/10',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Video Container */}
      <div className="relative aspect-video w-full overflow-hidden bg-black">
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          loop
          muted
          playsInline
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          onEnded={() => setIsPlaying(false)}
        />

        {/* Play/Pause Overlay */}
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity duration-300',
            isPlaying && !isHovered ? 'opacity-0' : 'opacity-100'
          )}
        >
          <button
            onClick={togglePlay}
            className={cn(
              'flex h-16 w-16 items-center justify-center rounded-full bg-primary/90 text-white transition-all duration-300',
              'hover:scale-110 hover:bg-primary',
              'shadow-lg shadow-primary/50'
            )}
            aria-label={isPlaying ? 'Pause video' : 'Play video'}
          >
            {isPlaying ? (
              <Pause className="h-8 w-8" fill="currentColor" />
            ) : (
              <Play className="h-8 w-8 translate-x-0.5" fill="currentColor" />
            )}
          </button>
        </div>

        {/* Gradient Overlay at Bottom */}
        {(title || description) && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6">
            {title && (
              <h3 className="mb-2 text-xl font-semibold text-white">
                {title}
              </h3>
            )}
            {description && (
              <p className="text-sm text-white/80">{description}</p>
            )}
          </div>
        )}
      </div>

      {/* Info Section (if no overlay text) */}
      {!title && !description && (
        <div className="p-6">
          <div className="h-2 w-full rounded-full bg-muted">
            <div className="h-full w-0 rounded-full bg-primary transition-all duration-300" />
          </div>
        </div>
      )}
    </div>
  );
}
