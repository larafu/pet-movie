/**
 * FeedCard - Feed 卡片组件
 * 支持图片和视频展示，带点赞和Remix功能
 * 性能优化：视频懒加载、可见时播放、不可见时暂停
 */

'use client';

import Image from 'next/image';
import { useState, useRef, useEffect } from 'react';
import { Heart, Repeat, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

export interface FeedItem {
  id: string;
  type: 'image' | 'video';
  src: string; // 图片/视频URL
  alt: string;
  username: string;
  userId: string;
  likes: number;
  prompt?: string; // 提示词
  aspectRatio?: number; // width / height
  videoThumbnail?: string; // 视频缩略图（视频首帧）
  inputImage?: string; // 用户上传的首帧图（图生视频场景）
  isLiked?: boolean; // 当前用户是否已点赞
  model?: string; // 使用的模型
  scene?: string; // 场景类型：custom-script = create-pet-movie 生成的视频
  createdAt?: string; // 创建时间
  promptHidden?: boolean; // 是否隐藏提示词（Pro功能）
  isOwner?: boolean; // 当前用户是否是作品所有者
  // 生成中状态
  isGenerating?: boolean; // 是否正在生成中
  taskId?: string; // 用于轮询的任务ID
  progress?: number; // 生成进度 0-100
}

interface FeedCardProps {
  item: FeedItem;
  onLike?: (id: string) => void;
  onRemix?: (item: FeedItem) => void;
  onClick?: (item: FeedItem) => void; // 点击卡片打开详情弹窗
}

export function FeedCard({ item, onLike, onRemix, onClick }: FeedCardProps) {
  const t = useTranslations('dashboard.feed');
  const [isLiked, setIsLiked] = useState(item.isLiked || false);
  const [likeCount, setLikeCount] = useState(item.likes);
  const [imageLoaded, setImageLoaded] = useState(false);

  // 视频性能优化：懒加载和 hover 播放
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoReady, setVideoReady] = useState(false); // 视频是否准备好播放
  const [isHovering, setIsHovering] = useState(false);
  const [placeholderError, setPlaceholderError] = useState(false); // 占位图加载失败

  // 获取占位图：优先用户上传的首帧图，其次视频缩略图
  // 如果加载失败则不使用
  const placeholderImage = placeholderError ? undefined : (item.inputImage || item.videoThumbnail);

  // 视频可见性检测 - 仅用于懒加载，不自动播放
  useEffect(() => {
    if (item.type !== 'video') return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsVisible(entry.isIntersecting);
          // 可见时预加载视频（但不播放）
          if (entry.isIntersecting && !videoLoaded) {
            setVideoLoaded(true);
          }
          // 不可见时暂停
          if (!entry.isIntersecting && videoRef.current) {
            videoRef.current.pause();
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '200px', // 提前 200px 开始加载
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [item.type, videoLoaded]);

  // Hover 播放控制
  const handleMouseEnter = () => {
    setIsHovering(true);
    if (videoRef.current && videoLoaded) {
      videoRef.current.play().catch(() => {
        // 自动播放被阻止时静默处理
      });
    }
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    if (videoRef.current) {
      videoRef.current.pause();
    }
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const newIsLiked = !isLiked;
    setIsLiked(newIsLiked);
    setLikeCount(newIsLiked ? likeCount + 1 : likeCount - 1);

    try {
      const response = await fetch(`/api/ai-tasks/${item.id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ liked: newIsLiked }),
      });

      if (!response.ok) {
        setIsLiked(!newIsLiked);
        setLikeCount(newIsLiked ? likeCount - 1 : likeCount + 1);
        toast.error(t('errors.likeFailed'));
      } else {
        onLike?.(item.id);
      }
    } catch (error) {
      setIsLiked(!newIsLiked);
      setLikeCount(newIsLiked ? likeCount - 1 : likeCount + 1);
      toast.error(t('errors.likeFailed'));
    }
  };

  const handleRemix = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onRemix?.(item);
  };

  const handleClick = () => {
    onClick?.(item);
  };

  // 生成中状态的渲染
  if (item.isGenerating) {
    // 进度显示: 优先使用 API 返回的进度，否则显示不确定状态
    const progress = item.progress ?? 0;
    const hasProgress = progress > 0;

    return (
      <div className="masonry-item p-0.5" ref={containerRef}>
        <div className="relative break-inside-avoid overflow-hidden rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
          <div
            className="relative w-full flex flex-col items-center justify-center"
            style={{ aspectRatio: item.aspectRatio || 16 / 9 }}
          >
            {/* 加载动画 */}
            <div className="relative">
              {hasProgress ? (
                // 有进度时显示进度圆环
                <div className="relative w-16 h-16">
                  <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                    {/* 背景圆环 */}
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                      className="text-gray-300 dark:text-gray-600"
                    />
                    {/* 进度圆环 */}
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeLinecap="round"
                      className="text-blue-500"
                      strokeDasharray={`${progress * 1.76} 176`}
                      style={{ transition: 'stroke-dasharray 0.5s ease-out' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                      {Math.round(progress)}%
                    </span>
                  </div>
                </div>
              ) : (
                // 无进度时显示旋转动画
                <>
                  <div className="w-16 h-16 rounded-full border-4 border-gray-300 dark:border-gray-600 border-t-blue-500 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    {item.type === 'video' ? (
                      <span className="text-lg">🎬</span>
                    ) : (
                      <span className="text-lg">🎨</span>
                    )}
                  </div>
                </>
              )}
            </div>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              {t('generating') || 'Generating...'}
            </p>
            {/* 进度条 (有进度时显示) */}
            {hasProgress && (
              <div className="w-3/4 mt-3 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
            {/* 显示提示词预览 */}
            {item.prompt && (
              <p className="mt-2 px-4 text-xs text-gray-400 dark:text-gray-500 text-center line-clamp-2">
                {item.prompt.slice(0, 60)}...
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="masonry-item p-0.5 cursor-pointer"
      ref={containerRef}
      onClick={handleClick}
      onMouseEnter={item.type === 'video' ? handleMouseEnter : undefined}
      onMouseLeave={item.type === 'video' ? handleMouseLeave : undefined}
    >
      <div className="group relative break-inside-avoid overflow-hidden cursor-pointer bg-transparent rounded-lg transition-all duration-300 ease-out hover:shadow-lg hover:shadow-black/10">
        <div className="relative overflow-hidden rounded-lg bg-gray-100">
          {item.type === 'video' ? (
            <div
              className="relative w-full transition-all duration-700 ease-out"
              style={{ aspectRatio: item.aspectRatio || 16 / 9 }}
            >
              <video
                ref={videoRef}
                className={`w-full h-full object-cover transition-opacity duration-500 ${
                  videoReady ? 'opacity-100' : 'opacity-0'
                }`}
                src={videoLoaded ? item.src : undefined}
                muted
                loop
                playsInline
                preload="metadata"
                onLoadedData={() => setVideoReady(true)}
              />
              {!videoReady && (
                <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800">
                  {placeholderImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={placeholderImage}
                      alt={item.alt}
                      className="w-full h-full object-cover"
                      onError={() => setPlaceholderError(true)}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
                      <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div
              className="relative"
              onContextMenu={(e) => e.preventDefault()} // 禁止右键保存
            >
              <Image
                alt={item.alt}
                src={item.src}
                width={400}
                height={Math.round(400 / (item.aspectRatio || 1))}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                loading="lazy"
                draggable={false} // 禁止拖拽保存
                className={`w-full h-auto object-cover block select-none pointer-events-none transition-all duration-700 ease-out ${
                  imageLoaded
                    ? 'opacity-100 scale-100 blur-0'
                    : 'opacity-0 scale-95 blur-sm'
                }`}
                onLoad={() => setImageLoaded(true)}
              />
              {!imageLoaded && (
                <div className="absolute inset-0 bg-gray-200 animate-pulse" />
              )}
            </div>
          )}

          {/* 渐变遮罩 */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-black/5 to-transparent group-hover:from-black/40 group-hover:via-black/10 transition-all duration-300" />

          {/* Hover 内容 */}
          <div className="absolute inset-0 flex flex-col justify-between p-3 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {/* 顶部操作按钮 */}
            <div className="flex justify-end gap-2">
              <button
                onClick={handleLike}
                className={`relative bg-black/30 backdrop-blur-sm border border-white/20 rounded-full p-2 transition-all duration-200 hover:bg-black/50 hover:scale-110 ${
                  isLiked ? 'text-red-500' : 'text-white/80 hover:text-red-400'
                }`}
                title={t('actions.like')}
              >
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
              </button>
              {/* 提示词隐藏时禁用 Remix 按钮 */}
              <button
                onClick={handleRemix}
                disabled={item.promptHidden && !item.prompt}
                className={`bg-black/30 backdrop-blur-sm border border-white/20 rounded-full p-2 transition-all duration-200 ${
                  item.promptHidden && !item.prompt
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:scale-110 hover:text-orange-400 text-white/80 hover:bg-black/50'
                }`}
                title={item.promptHidden && !item.prompt ? t('actions.remixDisabled') : t('actions.remix')}
              >
                <Repeat className="w-4 h-4" />
              </button>
            </div>

            {/* 底部信息 */}
            <div className="flex flex-col gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                className="text-left text-sm font-medium hover:underline transition-all duration-200"
              >
                @{item.username}
              </button>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs text-white/80">
                  <span className="flex items-center gap-1">
                    <Heart className="w-3 h-3" />
                    {likeCount}
                  </span>
                </div>
                {item.type === 'video' && (
                  <div className="bg-black/30 backdrop-blur-sm border border-white/20 rounded-full px-2 py-1 text-xs font-medium flex items-center gap-1">
                    <span role="img" aria-label="video">
                      🎬
                    </span>
                    <span>{t('types.video')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
