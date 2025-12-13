/**
 * FeedDetailModal - Feed 详情弹窗
 * 展示图片/视频详情，支持点赞、Remix、分享、下载
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import {
  X,
  Heart,
  Repeat,
  Share2,
  Download,
  Copy,
  Check,
  Loader2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import type { FeedItem } from '@/shared/components/feed-card';
import { ShareModal } from '@/shared/components/ui/share-modal';
import { useAppContext } from '@/shared/contexts/app';
import { getModelByActualModel } from '@/extensions/ai/models/config';

interface FeedDetailModalProps {
  item: FeedItem | null;
  isOpen: boolean;
  onClose: () => void;
  onRemix?: (item: FeedItem) => void;
  onLike?: (id: string) => void;
}

export function FeedDetailModal({
  item,
  isOpen,
  onClose,
  onRemix,
  onLike,
}: FeedDetailModalProps) {
  const t = useTranslations('dashboard.detail');
  const { user } = useAppContext();
  const isPro = user?.isPro ?? false;
  const [isLiked, setIsLiked] = useState(item?.isLiked || false);
  const [likeCount, setLikeCount] = useState(item?.likes || 0);
  const [copied, setCopied] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [placeholderError, setPlaceholderError] = useState(false); // 占位图加载失败
  const [shareModalOpen, setShareModalOpen] = useState(false); // 分享弹窗状态
  const videoRef = useRef<HTMLVideoElement>(null);

  // 当 item 变化时重置状态
  useEffect(() => {
    if (item) {
      setIsLiked(item.isLiked || false);
      setLikeCount(item.likes || 0);
      setVideoReady(false);
      setPlaceholderError(false); // 重置占位图错误状态
    }
  }, [item]);

  // 弹窗打开时播放视频
  useEffect(() => {
    if (isOpen && item?.type === 'video' && videoRef.current && videoReady) {
      videoRef.current.play().catch(() => {});
    }
    if (!isOpen && videoRef.current) {
      videoRef.current.pause();
    }
  }, [isOpen, item?.type, videoReady]);

  // ESC 关闭弹窗
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !item) return null;

  const handleLike = async () => {
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
        toast.error(t('likeFailed'));
      } else {
        onLike?.(item.id);
      }
    } catch (error) {
      setIsLiked(!newIsLiked);
      setLikeCount(newIsLiked ? likeCount - 1 : likeCount + 1);
      toast.error(t('likeFailed'));
    }
  };

  const handleRemix = () => {
    onRemix?.(item);
    onClose();
  };

  const handleCopyPrompt = async () => {
    if (item.prompt) {
      await navigator.clipboard.writeText(item.prompt);
      setCopied(true);
      toast.success(t('promptCopied'));
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = async () => {
    try {
      let downloadUrl: string;
      let filename: string;

      if (item.type === 'image') {
        // 图片使用下载 API（会根据用户会员状态自动处理水印）
        downloadUrl = `/api/ai-tasks/${item.id}/download`;
        filename = `image-${item.id}.png`;
      } else {
        // 视频直接下载原文件
        downloadUrl = item.src;
        filename = `video-${item.id}.mp4`;
      }

      // 非会员提示：下载的图片将带有水印
      if (!isPro && item.type === 'image') {
        toast.info(t('downloadWithWatermark'), {
          duration: 4000,
        });
      }

      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(t('downloadStarted'));
    } catch (error) {
      toast.error(t('downloadFailed'));
    }
  };

  // 打开分享弹窗
  const handleShare = () => {
    setShareModalOpen(true);
  };

  // 获取分享链接（使用 /creations/[id] 格式）
  const getShareUrl = () => {
    return typeof window !== 'undefined'
      ? `${window.location.origin}/creations/${item.id}`
      : '';
  };

  // 占位图（如果加载失败则不使用）
  const placeholderImage = placeholderError ? undefined : (item.inputImage || item.videoThumbnail);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      onClick={onClose}
    >
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* 弹窗内容 */}
      <div
        className="relative z-10 flex max-h-[90vh] max-w-[90vw] lg:max-w-5xl w-full bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 左侧媒体区域 */}
        <div
          className="flex-1 bg-black flex items-center justify-center min-h-[300px] max-h-[90vh]"
          onContextMenu={(e) => e.preventDefault()}
        >
          {item.type === 'video' ? (
            <div className="relative w-full h-full flex items-center justify-center">
              <video
                ref={videoRef}
                src={item.src}
                className={`max-w-full max-h-[80vh] object-contain transition-opacity duration-300 select-none ${
                  videoReady ? 'opacity-100' : 'opacity-0'
                }`}
                controls
                autoPlay
                loop
                playsInline
                controlsList="nodownload"
                onLoadedData={() => setVideoReady(true)}
              />
              {/* 视频加载占位 */}
              {!videoReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                  {placeholderImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={placeholderImage}
                      alt={item.alt}
                      className="max-w-full max-h-[80vh] object-contain"
                      onError={() => setPlaceholderError(true)}
                    />
                  ) : (
                    <Loader2 className="w-10 h-10 text-gray-500 animate-spin" />
                  )}
                </div>
              )}
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.src}
              alt={item.alt}
              className="max-w-full max-h-[80vh] object-contain select-none"
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
            />
          )}
        </div>

        {/* 右侧信息区域 */}
        <div className="w-80 flex flex-col border-l border-gray-200 dark:border-gray-800">
          {/* 用户信息 */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                {item.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  @{item.username}
                </div>
                {item.createdAt && (
                  <div className="text-xs text-gray-500">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 提示词 */}
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('prompt')}
                </span>
                {/* 只有在提示词可见时才显示复制按钮 */}
                {item.prompt && !item.promptHidden && (
                  <button
                    onClick={handleCopyPrompt}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title={t('copyPrompt')}
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-500" />
                    )}
                  </button>
                )}
              </div>
              {/* 提示词隐藏时显示锁定提示 */}
              {item.promptHidden && !item.prompt ? (
                <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 italic">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <span>{t('promptHidden')}</span>
                </div>
              ) : (
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {item.prompt || '-'}
                </p>
              )}
            </div>

            {/* 模型信息 */}
            {item.model && (
              <div className="mb-4">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('model')}
                </span>
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                  {/* 使用 displayName 而不是实际模型名 */}
                  {getModelByActualModel(item.model, item.type)?.displayName || item.model}
                </p>
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-800">
            {/* 点赞数 */}
            <div className="flex items-center gap-2 mb-4">
              <Heart
                className={`w-5 h-5 ${isLiked ? 'fill-red-500 text-red-500' : 'text-gray-500'}`}
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {likeCount} {t('likes')}
              </span>
            </div>

            {/* 按钮组 */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleLike}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
                  isLiked
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                {t('like')}
              </button>

              {/* 提示词隐藏时禁用 Remix 按钮 */}
              <button
                onClick={handleRemix}
                disabled={item.promptHidden && !item.prompt}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
                  item.promptHidden && !item.prompt
                    ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:from-orange-600 hover:to-pink-600'
                }`}
                title={item.promptHidden && !item.prompt ? t('remixDisabled') : t('remix')}
              >
                <Repeat className="w-4 h-4" />
                {t('remix')}
              </button>

              <button
                onClick={handleShare}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
              >
                <Share2 className="w-4 h-4" />
                {t('share')}
              </button>

              <button
                onClick={handleDownload}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
              >
                <Download className="w-4 h-4" />
                {t('download')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 分享弹窗 */}
      <ShareModal
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
        shareData={{
          url: getShareUrl(),
          title: item.prompt?.slice(0, 50) || t('shareTitle'),
          description: item.prompt,
          scene: 'video',
        }}
      />
    </div>
  );
}
