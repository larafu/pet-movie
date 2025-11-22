'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface ImageToVideoRevealProps {
  beforeImage: string;
  afterVideo: string;
  videoPoster?: string;
  beforeLabel?: string;
  afterLabel?: string;
  title?: string;
  description?: string;
  autoRevealDelay?: number; // 自动开始过渡的延迟时间（毫秒）
  revealDuration?: number; // 过渡动画时长（秒）
  className?: string;
}

export function ImageToVideoReveal({
  beforeImage,
  afterVideo,
  videoPoster,
  beforeLabel = 'Original Photo',
  afterLabel = 'Cinematic AI Result',
  title = 'Transform Your Pet into a Movie Star',
  description = 'Watch the AI transformation happen in real-time',
  autoRevealDelay = 1000, // 1秒后开始
  revealDuration = 2.5, // 过渡持续2.5秒
  className,
}: ImageToVideoRevealProps) {
  const [revealProgress, setRevealProgress] = useState(0); // 0 = 原图, 100 = 视频
  const [showThumbnail, setShowThumbnail] = useState(false); // 是否显示右下角缩略图
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  // 自动触发过渡动画
  useEffect(() => {
    const timer = setTimeout(() => {
      setRevealProgress(100);
      // 过渡完成后显示缩略图
      setTimeout(() => {
        setShowThumbnail(true);
      }, revealDuration * 1000);
    }, autoRevealDelay);

    return () => clearTimeout(timer);
  }, [autoRevealDelay, revealDuration]);

  // 控制视频播放
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // 当过渡到50%时开始播放视频
    if (revealProgress >= 50) {
      if (isPlaying) {
        video.play().catch(() => setIsPlaying(false));
      } else {
        video.pause();
      }
    }
  }, [revealProgress, isPlaying]);

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
      <div className="container max-w-6xl mx-auto">
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

        {/* Main Reveal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="relative"
        >
          <div className="relative w-full aspect-[16/9] md:aspect-[21/9] rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-white/10 group">
            {/* Background Video Layer */}
            <div className="absolute inset-0 w-full h-full">
              <video
                ref={videoRef}
                src={afterVideo}
                poster={videoPoster}
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              {/* Video Label */}
              <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-md text-gold px-4 py-2 rounded-full text-sm font-bold tracking-wider border border-gold/30 flex items-center gap-2 z-10">
                <div className="w-2 h-2 rounded-full bg-gold animate-pulse" />
                {afterLabel}
              </div>
            </div>

            {/* Foreground Image Layer with Circular Mask Reveal */}
            <motion.div
              className="absolute inset-0 w-full h-full"
              initial={{ clipPath: 'circle(100% at 50% 50%)' }}
              animate={{
                clipPath:
                  revealProgress === 0
                    ? 'circle(100% at 50% 50%)'
                    : 'circle(0% at 50% 50%)',
              }}
              transition={{
                duration: revealDuration,
                ease: [0.32, 0.72, 0, 1], // Custom easing for smooth reveal
              }}
            >
              <img
                src={beforeImage}
                alt="Original"
                className="w-full h-full object-cover"
              />
              {/* Image Label */}
              <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-md text-white/90 px-4 py-2 rounded-full text-sm font-bold tracking-wider border border-white/20">
                {beforeLabel}
              </div>
            </motion.div>

            {/* Control Buttons */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20 opacity-0 group-hover:opacity-100">
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

            {/* Overlay Ring */}
            <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-white/10 rounded-2xl" />
          </div>

          {/* Thumbnail Reference (appears after transition) */}
          <AnimatePresence>
            {showThumbnail && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="absolute bottom-4 right-4 w-32 h-20 md:w-40 md:h-24 rounded-lg overflow-hidden shadow-xl border-2 border-white/20 backdrop-blur-sm z-30"
              >
                <img
                  src={beforeImage}
                  alt="Original reference"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-2">
                  <span className="text-white text-xs font-medium">
                    Original
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Progress Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="text-center mt-8 space-y-4"
        >
          {/* Progress Text */}
          {revealProgress < 100 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-muted-foreground text-sm"
            >
              🎬 AI transformation in progress...
            </motion.p>
          )}
          {revealProgress === 100 && showThumbnail && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-muted-foreground text-sm"
            >
              ✨ Transformation complete! Original photo in bottom-right corner
            </motion.p>
          )}
        </motion.div>
      </div>
    </div>
  );
}
