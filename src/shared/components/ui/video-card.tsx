'use client';

import { useRef, useEffect, useState, memo } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

import { cn } from '@/shared/lib/utils';

interface VideoCardProps {
  src: string;
  title?: string;
  description?: string;
  poster?: string;
  className?: string;
}

export const VideoCard = memo(function VideoCard({
  src,
  title,
  description,
  poster,
  className,
}: VideoCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);

  // Auto-play on mount and when src changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Only play if video is paused or hasn't started
    if (video.paused || video.currentTime === 0) {
      video.play().catch((error) => {
        // Auto-play was prevented
        console.log('Auto-play prevented:', error);
      });
    }
  }, [src]);

  // 同步音量状态
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = isMuted;
    }
  }, [isMuted]);

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl bg-muted/50 backdrop-blur transition-all duration-300',
        'hover:shadow-xl hover:shadow-primary/10',
        className
      )}
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
        />

        {/* Volume Control Button */}
        <button
          onClick={toggleMute}
          className="absolute top-4 right-4 bg-black/60 backdrop-blur-md text-white p-2 rounded-full border border-white/20 hover:bg-black/80 hover:border-gold/30 transition-all opacity-0 group-hover:opacity-100 z-10"
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>

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
});
