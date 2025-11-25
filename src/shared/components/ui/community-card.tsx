'use client';

/**
 * 社区卡片组件 - 紧凑版本，完全去掉padding
 * Community card component with no padding, hover play, like, share, and download
 */

import { useState, useRef } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Heart, Download, Share2, Link2, Flag, MoreVertical } from 'lucide-react';
import type { ShareResponse } from '@/shared/services/community/types';

interface CommunityCardProps {
  share: ShareResponse;
  onLike?: (shareId: string) => void;
  onDownload?: (shareId: string) => void;
  onShare?: (shareId: string) => void;
  onCopyLink?: (shareId: string) => void;
  onReport?: (shareId: string) => void;
}

export function CommunityCard({
  share,
  onLike,
  onDownload,
  onShare,
  onCopyLink,
  onReport,
}: CommunityCardProps) {
  const t = useTranslations('landing.videoCard');
  const [isHovered, setIsHovered] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isLiked, setIsLiked] = useState(share.isLiked || false);
  const [likeCount, setLikeCount] = useState(share.likeCount);
  const videoRef = useRef<HTMLVideoElement>(null);

  // 处理鼠标悬停
  const handleMouseEnter = () => {
    setIsHovered(true);
    // 播放视频
    if (videoRef.current && share.aiTask?.finalVideoUrl) {
      videoRef.current.play().catch(() => {
        // 静默失败，某些浏览器可能阻止自动播放
      });
    }
  };

  // 处理鼠标离开
  const handleMouseLeave = () => {
    setIsHovered(false);
    setShowMenu(false);
    // 暂停视频并重置到开始
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  // 处理点赞
  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newIsLiked = !isLiked;
    setIsLiked(newIsLiked);
    setLikeCount((prev) => (newIsLiked ? prev + 1 : prev - 1));
    onLike?.(share.id);
  };

  // 处理下载
  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    onDownload?.(share.id);
  };

  // 处理分享
  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    onShare?.(share.id);
  };

  // 处理复制链接
  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    onCopyLink?.(share.id);
  };

  // 处理举报
  const handleReport = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    onReport?.(share.id);
  };

  // 获取媒体URL（视频或图片）
  const mediaUrl = share.aiTask?.finalVideoUrl || share.aiTask?.frameImageUrl;
  const isVideo = !!share.aiTask?.finalVideoUrl;
  const aspectRatio = share.aiTask?.aspectRatio || '16:9';

  return (
    <div
      className={`group relative overflow-hidden rounded-lg bg-zinc-900 cursor-pointer break-inside-avoid mb-2 ${
        aspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-[16/9]'
      }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 媒体内容 */}
      <div className="relative w-full h-full">
        {isVideo ? (
          <video
            ref={videoRef}
            src={mediaUrl || ''}
            className="h-full w-full object-cover"
            loop
            muted
            playsInline
            poster={share.aiTask?.frameImageUrl || ''}
          />
        ) : (
          <Image
            src={mediaUrl || '/placeholder.jpg'}
            alt={share.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        )}

        {/* 渐变遮罩 - 底部 */}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />

        {/* 渐变遮罩 - 顶部（hover时显示） */}
        {isHovered && (
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 via-black/20 to-transparent pointer-events-none animate-in fade-in duration-200" />
        )}

        {/* 左下角用户信息 */}
        <div className="absolute bottom-3 left-3 flex items-center gap-2 z-10">
          {share.user?.image ? (
            <Image
              src={share.user.image}
              alt={share.user.name}
              width={24}
              height={24}
              className="rounded-full border border-white/80"
            />
          ) : (
            <div className="h-6 w-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 border border-white/80 flex items-center justify-center text-white text-[10px] font-semibold">
              {share.user?.name.charAt(0).toUpperCase() || 'U'}
            </div>
          )}
          <span className="text-white text-xs font-medium drop-shadow-lg">
            {share.user?.name || 'Unknown'}
          </span>
        </div>

        {/* 右下角点赞按钮 */}
        <div className="absolute bottom-3 right-3 flex flex-col items-center gap-1 z-10">
          <button
            onClick={handleLike}
            className={`flex flex-col items-center gap-0.5 transition-transform hover:scale-110 active:scale-95 ${
              isLiked ? 'text-red-500' : 'text-white'
            }`}
          >
            <Heart
              className={`h-6 w-6 drop-shadow-lg ${isLiked ? 'fill-current' : ''}`}
            />
            {likeCount > 0 && (
              <span className="text-[10px] font-bold drop-shadow-lg">{likeCount}</span>
            )}
          </button>
        </div>

        {/* Hover时显示的操作菜单和标题 */}
        {isHovered && (
          <>
            {/* 右上角菜单按钮 */}
            <div className="absolute top-3 right-3 z-10">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="flex items-center justify-center h-8 w-8 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors backdrop-blur-sm"
              >
                <MoreVertical className="h-4 w-4" />
              </button>

              {/* 下拉菜单 */}
              {showMenu && (
                <div className="absolute top-10 right-0 flex flex-col gap-0.5 bg-black/90 backdrop-blur-md rounded-lg p-1.5 min-w-[120px] shadow-xl">
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-2.5 py-1.5 text-white text-xs hover:bg-white/10 rounded transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>{t('download')}</span>
                  </button>
                  <button
                    onClick={handleShare}
                    className="flex items-center gap-2 px-2.5 py-1.5 text-white text-xs hover:bg-white/10 rounded transition-colors"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    <span>{t('share')}</span>
                  </button>
                  <button
                    onClick={handleCopyLink}
                    className="flex items-center gap-2 px-2.5 py-1.5 text-white text-xs hover:bg-white/10 rounded transition-colors"
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    <span>{t('copyLink')}</span>
                  </button>
                  <div className="h-px bg-white/20 my-0.5" />
                  <button
                    onClick={handleReport}
                    className="flex items-center gap-2 px-2.5 py-1.5 text-red-400 text-xs hover:bg-white/10 rounded transition-colors"
                  >
                    <Flag className="h-3.5 w-3.5" />
                    <span>{t('report')}</span>
                  </button>
                </div>
              )}
            </div>

            {/* 左上角标题和描述 */}
            {share.title && (
              <div className="absolute top-3 left-3 max-w-[60%] z-10">
                <h3 className="text-white text-sm font-bold drop-shadow-lg line-clamp-2">
                  {share.title}
                </h3>
                {share.description && (
                  <p className="text-white/90 text-[11px] drop-shadow-lg line-clamp-2 mt-0.5">
                    {share.description}
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
