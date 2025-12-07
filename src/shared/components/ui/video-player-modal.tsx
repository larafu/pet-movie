"use client";

/**
 * 全屏视频播放器弹窗组件
 * Full-screen Video Player Modal Component
 *
 * 功能特性：
 * - 全屏暗色遮罩背景
 * - 视频播放控制（播放/暂停/进度条/音量）
 * - 下载、点赞、分享功能
 * - 支持键盘 ESC 关闭
 * - 点击外部区域关闭
 */

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/shared/lib/utils";
import {
  X,
  Heart,
  Download,
  Share2,
  Link2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "./button";

export interface VideoPlayerModalData {
  id: string;
  videoUrl: string;
  title?: string;
  user?: {
    name: string;
    avatarUrl?: string;
  };
  likeCount?: number;
  isLiked?: boolean;
  // 水印相关
  originalVideoUrl?: string;
  watermarkedVideoUrl?: string;
  isVIP?: boolean;
}

export interface VideoPlayerModalActions {
  onLike?: (id: string, newLikeCount?: number, isLiked?: boolean) => void;
  onDownload?: (id: string) => void;
  onShare?: (id: string) => void;
  onCopyLink?: (id: string) => void;
}

export interface VideoPlayerModalProps {
  open: boolean;
  onClose: () => void;
  data: VideoPlayerModalData;
  actions?: VideoPlayerModalActions;
}

export function VideoPlayerModal({
  open,
  onClose,
  data,
  actions,
}: VideoPlayerModalProps) {
  const t = useTranslations("landing.videoCard");
  const tToast = useTranslations("landing.toast");
  const tPlayer = useTranslations("landing.videoPlayer");

  const videoRef = useRef<HTMLVideoElement>(null);
  const [liked, setLiked] = useState(data.isLiked || false);
  const [likeCount, setLikeCount] = useState(data.likeCount || 0);
  const [isPlaying, setIsPlaying] = useState(false);

  // 处理键盘 ESC 关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      // 禁止页面滚动
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  // 打开弹窗时自动播放
  useEffect(() => {
    if (open && videoRef.current) {
      videoRef.current.play().catch(() => {
        // 自动播放可能被浏览器阻止，静默处理
      });
    }
  }, [open]);

  // 处理点赞
  const handleLike = async () => {
    const newLiked = !liked;
    const newCount = newLiked ? likeCount + 1 : likeCount - 1;

    // 乐观更新
    setLiked(newLiked);
    setLikeCount(newCount);

    try {
      await actions?.onLike?.(data.id, newCount, newLiked);
    } catch (error) {
      // 如果失败，回滚
      setLiked(liked);
      setLikeCount(likeCount);
      toast.error(tToast("likeFailed") || "Failed to like");
    }
  };

  // 处理下载
  const handleDownload = async () => {
    try {
      await actions?.onDownload?.(data.id);
    } catch (error) {
      toast.error(tToast("downloadFailed") || "Failed to download");
    }
  };

  // 处理分享
  const handleShare = async () => {
    try {
      await actions?.onShare?.(data.id);
    } catch (error) {
      toast.error(tToast("shareFailed") || "Failed to share");
    }
  };

  // 处理复制链接
  const handleCopyLink = async () => {
    try {
      await actions?.onCopyLink?.(data.id);
      toast.success(tToast("linkCopied") || "Link copied!");
    } catch (error) {
      toast.error(tToast("copyFailed") || "Failed to copy link");
    }
  };

  // 点击背景关闭
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // 处理视频播放状态变化
  const handlePlayStateChange = () => {
    if (videoRef.current) {
      setIsPlaying(!videoRef.current.paused);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      {/* 关闭按钮 */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 rounded-full bg-black/50 p-2 text-white transition-all hover:bg-black/70 hover:scale-110"
        aria-label="Close"
      >
        <X className="h-6 w-6" />
      </button>

      {/* 视频容器 */}
      <div className="relative w-full max-w-6xl mx-auto px-4">
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden shadow-2xl">
          {/* 视频播放器 */}
          <video
            ref={videoRef}
            src={data.watermarkedVideoUrl || data.videoUrl}
            controls
            controlsList="nodownload"
            className="w-full h-full"
            onPlay={handlePlayStateChange}
            onPause={handlePlayStateChange}
            playsInline
            preload="auto"
          />
        </div>

        {/* 底部操作栏 */}
        <div className="mt-4 flex items-center justify-between bg-black/50 backdrop-blur-sm rounded-lg p-4">
          {/* 左侧：用户信息 */}
          <div className="flex items-center gap-3">
            {data.user && (
              <>
                {data.user.avatarUrl && (
                  <img
                    src={data.user.avatarUrl}
                    alt={data.user.name}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                )}
                <div>
                  <p className="text-white font-medium">{data.user.name}</p>
                  {data.title && (
                    <p className="text-gray-400 text-sm">{data.title}</p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* 右侧：操作按钮 */}
          <div className="flex items-center gap-2">
            {/* 点赞按钮 */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              className={cn(
                "gap-2 text-white hover:bg-white/10",
                liked && "text-red-500"
              )}
            >
              <Heart className={cn("h-5 w-5", liked && "fill-current")} />
              <span>{likeCount}</span>
            </Button>

            {/* 下载按钮 */}
            {actions?.onDownload && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                className="gap-2 text-white hover:bg-white/10"
              >
                <Download className="h-5 w-5" />
                <span className="hidden sm:inline">{t("download")}</span>
              </Button>
            )}

            {/* 分享按钮 */}
            {actions?.onShare && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                className="gap-2 text-white hover:bg-white/10"
              >
                <Share2 className="h-5 w-5" />
                <span className="hidden sm:inline">{t("share")}</span>
              </Button>
            )}

            {/* 复制链接按钮 */}
            {actions?.onCopyLink && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyLink}
                className="gap-2 text-white hover:bg-white/10"
              >
                <Link2 className="h-5 w-5" />
                <span className="hidden sm:inline">{t("copyLink")}</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
