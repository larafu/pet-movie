'use client';

/**
 * 简单视频卡片组件
 * Simple Video Card Component
 *
 * 用于首页展示的简单视频卡片，支持自动播放和悬停控制
 * LCP优化：使用 Intersection Observer 延迟加载视频
 */

import { Play, Pause } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';
import { cn } from '@/shared/lib/utils';

interface SimpleVideoCardProps {
  src: string;
  title?: string;
  description?: string;
  poster?: string;
  className?: string;
}

export function SimpleVideoCard({
  src,
  title,
  description,
  poster,
  className,
}: SimpleVideoCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  // LCP优化：使用 Intersection Observer 延迟加载视频
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);

  // LCP优化：使用 Intersection Observer 检测组件进入视口
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setShouldLoadVideo(true);
          observer.disconnect(); // 只需触发一次
        }
      },
      { rootMargin: '100px' } // 提前100px开始加载
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // 自动播放 - 只在视频加载后执行
  useEffect(() => {
    if (!shouldLoadVideo) return;

    // 等待视频元素渲染
    const timer = setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(() => {
          // 自动播放被阻止，用户需要点击播放
        });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [shouldLoadVideo]);

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
      ref={containerRef}
      className={cn(
        'group relative overflow-hidden rounded-2xl bg-muted/50 backdrop-blur transition-all duration-300',
        'hover:shadow-xl hover:shadow-primary/10',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 视频容器 - LCP优化：进入视口后才加载 */}
      <div className="relative aspect-video w-full overflow-hidden bg-black">
        {/* 海报占位图 */}
        {poster && !shouldLoadVideo && (
          <img
            src={poster}
            alt={title || ''}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        )}
        {/* 视频：进入视口后加载 */}
        {shouldLoadVideo && (
          <video
            ref={videoRef}
            src={src}
            poster={poster}
            loop
            muted
            playsInline
            preload="none"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            onEnded={() => setIsPlaying(false)}
          />
        )}

        {/* 播放/暂停遮罩 */}
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

        {/* 底部渐变和文字 */}
        {(title || description) && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6">
            {title && (
              <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
            )}
            {description && (
              <p className="text-sm text-white/80 line-clamp-2">{description}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
