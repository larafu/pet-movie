'use client';

import { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import Image from 'next/image';

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
  const [isMuted, setIsMuted] = useState(true);
  const [isVideoInView, setIsVideoInView] = useState(false);
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  // 视频懒加载 - 使用 Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVideoInView(true);
          // 延迟200ms加载视频，优先加载其他资源
          setTimeout(() => setShouldLoadVideo(true), 200);
          observer.disconnect();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px' // 提前50px开始加载
      }
    );

    if (videoContainerRef.current) {
      observer.observe(videoContainerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (video && shouldLoadVideo) {
      if (isPlaying) {
        video.play().catch(() => setIsPlaying(false));
      } else {
        video.pause();
      }
    }
  }, [isPlaying, shouldLoadVideo]);

  useEffect(() => {
    const video = videoRef.current;
    if (video && shouldLoadVideo) {
      video.play().catch(() => setIsPlaying(false));
    }
  }, [shouldLoadVideo]);

  // 同步音量状态
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = isMuted;
    }
  }, [isMuted]);

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
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
              <Image
                src={beforeImage}
                alt="Original Photo"
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover"
                loading="eager"
                quality={85}
              />
              <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-md text-white/90 px-4 py-2 rounded-full text-sm font-bold tracking-wider border border-white/20">
                {beforeLabel}
              </div>
              <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-white/10 rounded-2xl" />
            </div>
          </motion.div>

          {/* After - Video */}
          <motion.div
            ref={videoContainerRef}
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="relative group"
          >
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-white/10">
              {videoPoster && !shouldLoadVideo && (
                <Image
                  src={videoPoster}
                  alt="Video preview"
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover"
                  loading="eager"
                  quality={85}
                />
              )}
              <video
                ref={videoRef}
                poster={videoPoster}
                loop
                muted
                playsInline
                preload={shouldLoadVideo ? 'auto' : 'none'}
                className="w-full h-full object-cover"
                style={{ opacity: shouldLoadVideo ? 1 : 0 }}
              >
                {shouldLoadVideo && (
                  <>
                    <source src={afterVideo} type="video/mp4" />
                    <source src={afterVideo.replace('.mp4', '.webm')} type="video/webm" />
                  </>
                )}
              </video>
              <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-md text-gold px-4 py-2 rounded-full text-sm font-bold tracking-wider border border-gold/30 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gold animate-pulse" />
                {afterLabel}
              </div>

              {/* Control Buttons */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 opacity-0 group-hover:opacity-100">
                {/* Play/Pause Button */}
                <button
                  onClick={togglePlayPause}
                  className="bg-black/80 backdrop-blur-md text-white px-4 py-2 rounded-full text-sm font-medium border border-white/20 hover:bg-black/90 hover:border-gold/30 transition-all flex items-center gap-2"
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

                {/* Volume Button */}
                <button
                  onClick={toggleMute}
                  className="bg-black/80 backdrop-blur-md text-white p-2 rounded-full text-sm font-medium border border-white/20 hover:bg-black/90 hover:border-gold/30 transition-all flex items-center justify-center"
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
              </div>

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
