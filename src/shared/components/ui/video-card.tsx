"use client";

/**
 * 视频卡片组件 - 统一封装
 * Video Card Component - Unified Implementation
 *
 * 支持三种变体：inspiration（示例）、user（用户自己）、community（社区）
 */

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/shared/lib/utils";
import {
  Heart,
  MoreVertical,
  Download,
  Share2,
  Link2,
  Flag,
  Lock,
  Globe,
  AlertCircle,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { UserInfo } from "./user-info";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "./dropdown-menu";
import { ShareModal, type ShareData } from "./share-modal";
import { VideoPlayerModal } from "./video-player-modal";

export type AspectRatio = "16:9" | "9:16";

export type VideoCardVariant = "inspiration" | "user" | "community";

export interface VideoCardUser {
  name: string;
  avatarUrl?: string;
  avatarColor?: string;
}

export interface VideoCardData {
  id: string;
  videoUrl: string;  // 默认显示的视频URL（带水印版本）
  thumbnailUrl?: string;
  title?: string;
  description?: string;
  user: VideoCardUser;
  likeCount?: number;
  isLiked?: boolean;
  aspectRatio?: AspectRatio;
  isShared?: boolean; // 仅user变体使用
  isPublic?: boolean; // 是否已公开分享
  isLoading?: boolean; // 加载状态
  progress?: number; // 加载进度
  loadingText?: string; // 加载文本
  isFailed?: boolean; // 是否生成失败
  // 水印相关字段
  originalVideoUrl?: string;    // 原始无水印视频URL
  watermarkedVideoUrl?: string; // 带水印视频URL
  isVIP?: boolean;              // 用户是否是VIP
}

export interface VideoCardActions {
  onLike?: (id: string, newLikeCount?: number, isLiked?: boolean) => void;
  onDownload?: (id: string) => void;
  onShare?: (id: string) => void;
  onCopyLink?: (id: string) => void;
  onMakePrivate?: (id: string) => void; // 取消公开分享回调
  onReport?: (id: string) => void;
  onDelete?: (id: string) => void; // 删除失败任务回调
  onRetry?: (id: string) => void; // 重试失败任务回调
}

export interface VideoCardProps {
  data: VideoCardData;
  variant: VideoCardVariant;
  actions?: VideoCardActions;
  className?: string;
}

export function VideoCard({ data, variant, actions, className }: VideoCardProps) {
  const t = useTranslations("landing.videoCard");
  const tToast = useTranslations("landing.toast");

  const [isHovered, setIsHovered] = useState(false);
  const [liked, setLiked] = useState(data.isLiked || false);
  const [likeCount, setLikeCount] = useState(data.likeCount || 0);
  const [isPublic, setIsPublic] = useState(data.isPublic || false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [playerModalOpen, setPlayerModalOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const aspectRatio = data.aspectRatio || "16:9";

  // 清理单击定时器
  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
    };
  }, []);

  // 处理双击事件：打开全屏播放器
  const handleDoubleClick = (e: React.MouseEvent) => {
    // 清除单击定时器
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }

    // 阻止事件冒泡
    e.stopPropagation();

    // 打开播放器弹窗
    setPlayerModalOpen(true);
  };

  // 处理单击事件：保留原有交互
  const handleClick = (e: React.MouseEvent) => {
    // 如果点击的是按钮或菜单，不处理
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('[role="menuitem"]') ||
      target.closest('[data-radix-collection-item]')
    ) {
      return;
    }

    // 延迟执行单击事件，等待可能的双击
    clickTimeoutRef.current = setTimeout(() => {
      // 这里可以添加原有的单击逻辑
      // 目前保持空实现，保留原有单击交互
    }, 250);
  };

  // 加载状态渲染
  if (data.isLoading) {
    const loadingAspectRatioClass =
      aspectRatio === "9:16" ? "aspect-[9/16]" : "aspect-[16/9]";

    return (
      <div className={cn("bg-background/50 overflow-hidden rounded-xl mb-2 relative", className)}>
        <div
          className={cn(
            "relative w-full flex flex-col items-center justify-center bg-gradient-to-tr from-primary/5 via-transparent to-transparent",
            loadingAspectRatioClass
          )}
        >
          <div className="flex flex-col items-center gap-4 p-4 text-center w-full">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
              <div
                className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin"
                style={{ animationDuration: "1.5s" }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[10px] font-bold text-primary">
                  {Math.round(data.progress || 0)}%
                </span>
              </div>
            </div>

            <div className="space-y-1 max-w-[150px]">
              <h3 className="text-xs font-medium text-foreground animate-pulse">
                {data.loadingText}
              </h3>
              <p className="text-[10px] text-muted-foreground">{t("creating") ?? "Creating..."}</p>
            </div>

            <div className="w-full max-w-[100px] h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300 ease-out"
                style={{ width: `${data.progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 失败状态渲染
  if (data.isFailed) {
    const failedAspectRatioClass =
      aspectRatio === "9:16" ? "aspect-[9/16]" : "aspect-[16/9]";

    const handleDelete = () => {
      actions?.onDelete?.(data.id);
    };

    const handleRetry = () => {
      actions?.onRetry?.(data.id);
    };

    return (
      <div className={cn("bg-background/50 overflow-hidden rounded-xl mb-2 relative", className)}>
        <div
          className={cn(
            "relative w-full flex flex-col items-center justify-center bg-gradient-to-tr from-red-500/5 via-transparent to-transparent",
            failedAspectRatioClass
          )}
        >
          {/* 背景缩略图（如果有） */}
          {data.thumbnailUrl && (
            <div
              className="absolute inset-0 bg-cover bg-center opacity-20"
              style={{ backgroundImage: `url(${data.thumbnailUrl})` }}
            />
          )}

          <div className="relative flex flex-col items-center gap-4 p-4 text-center w-full">
            {/* 失败图标 */}
            <div className="relative w-12 h-12 flex items-center justify-center rounded-full bg-red-500/10 border-2 border-red-500/30">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>

            {/* 失败提示文本 */}
            <div className="space-y-1 max-w-[180px]">
              <h3 className="text-sm font-medium text-red-400">
                {t("failed")}
              </h3>
              <p className="text-[10px] text-muted-foreground">
                {t("failedDescription")}
              </p>
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center gap-3 mt-2">
              {/* 删除按钮 */}
              <button
                onClick={handleDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {t("delete")}
              </button>

              {/* 重试按钮（如果提供了回调） */}
              {actions?.onRetry && (
                <button
                  onClick={handleRetry}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  {t("retry")}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 处理鼠标悬停 - 自动播放视频（不重置进度）
  const handleMouseEnter = () => {
    setIsHovered(true);
    if (videoRef.current && data.videoUrl) {
      videoRef.current.play().catch(() => { });
    }
  };

  // 处理鼠标离开 - 暂停播放（不重置进度，继续播放时从当前位置开始）
  const handleMouseLeave = () => {
    setIsHovered(false);
    if (videoRef.current) {
      videoRef.current.pause();
      // 注意：不再重置 currentTime，这样重新移入时可以继续播放
    }
  };

  // 处理点赞 - 调用API持久化
  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // 乐观更新UI
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount((prev) => (newLiked ? prev + 1 : Math.max(0, prev - 1)));

    // 调用API持久化点赞状态
    try {
      const response = await fetch('/api/pet-video/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: data.id }),
      });

      if (!response.ok) {
        // API失败时回滚UI
        setLiked(!newLiked);
        setLikeCount((prev) => (newLiked ? prev - 1 : prev + 1));
        console.error('Like API failed');
      } else {
        const result = await response.json();
        // 使用服务端返回的准确数值
        setLiked(result.isLiked);
        setLikeCount(result.likeCount);
      }
    } catch (error) {
      // 网络错误时回滚UI
      setLiked(!newLiked);
      setLikeCount((prev) => (newLiked ? prev - 1 : prev + 1));
      console.error('Like error:', error);
    }

    // 传递最新的点赞数和状态给父组件
    actions?.onLike?.(data.id, likeCount + (newLiked ? 1 : -1), newLiked);
  };

  // 处理下载（带水印版本）
  const handleDownload = () => {
    // 使用带水印版本或默认视频URL
    const downloadUrl = data.watermarkedVideoUrl || data.videoUrl;
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `${data.title || 'video'}.mp4`;
    link.click();

    actions?.onDownload?.(data.id);
  };

  // 处理下载原始无水印版本（仅VIP）
  const handleDownloadOriginal = () => {
    if (!data.originalVideoUrl) {
      toast.error(tToast('originalNotAvailable'));
      return;
    }

    const link = document.createElement("a");
    link.href = data.originalVideoUrl;
    link.download = `${data.title || 'video'}-original.mp4`;
    link.click();

    toast.success(tToast('downloadingOriginal'));
  };

  // 复制文本到剪贴板的辅助函数（带后备方案）
  const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
      // 尝试使用现代 Clipboard API
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      // 后备方案：使用 textarea
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textarea);
        return successful;
      } catch (fallbackErr) {
        console.error('Fallback copy failed:', fallbackErr);
        return false;
      }
    }
  };

  // 生成分享链接
  const getShareLink = () => {
    const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return `${appUrl}/share/${data.id}`;
  };

  // 处理分享 - 打开分享弹窗（分享和公开状态分离）
  const handleShare = () => {
    // 直接打开分享弹窗，不自动设置公开状态
    setShareModalOpen(true);
    actions?.onShare?.(data.id);
  };

  // 分享数据 - 使用视频场景
  const getShareData = (): ShareData => ({
    url: getShareLink(),
    title: data.title || t("share"),
    description: data.description,
    scene: "video",
    hashtags: ["PetMovie", "AIPetVideo", "PetLove"],
  });

  // 处理复制链接 - 仅复制链接，不改变公开状态
  const handleCopyLink = async () => {
    // 统一使用分享页链接
    const shareLink = getShareLink();

    // 复制链接
    const copied = await copyToClipboard(shareLink);
    if (copied) {
      toast.success(tToast('linkCopied'));
    } else {
      toast.error(tToast('copyFailed'));
    }

    actions?.onCopyLink?.(data.id);
  };

  // 处理设为公开（乐观更新）
  const handleMakePublic = async () => {
    // 乐观更新UI
    setIsPublic(true);
    toast.success(tToast('setToPublic'));

    // 后台调用API，失败时回滚
    try {
      const response = await fetch('/api/pet-video/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: data.id, setPublic: true }),
      });
      if (!response.ok) {
        // 回滚
        setIsPublic(false);
        toast.error(tToast('makePublicFailed'));
      }
    } catch (error) {
      // 回滚
      setIsPublic(false);
      toast.error(tToast('makePublicFailed'));
      console.error('Make public API error:', error);
    }
  };

  // 处理取消公开（乐观更新）
  const handleMakePrivate = async () => {
    // 乐观更新UI
    setIsPublic(false);
    toast.success(tToast('setToPrivate'));
    actions?.onMakePrivate?.(data.id);

    // 后台调用API，失败时回滚
    try {
      const response = await fetch('/api/pet-video/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: data.id, setPublic: false }),
      });
      if (!response.ok) {
        // 回滚
        setIsPublic(true);
        toast.error(tToast('makePrivateFailed'));
      }
    } catch (error) {
      // 回滚
      setIsPublic(true);
      toast.error(tToast('makePrivateFailed'));
      console.error('Make private API error:', error);
    }
  };

  // 处理举报
  const handleReport = () => {
    actions?.onReport?.(data.id);
  };

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg bg-zinc-900 cursor-pointer break-inside-avoid mb-2",
        aspectRatio === "9:16" ? "aspect-[9/16]" : "aspect-[16/9]",
        className
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      {/* 视频内容 */}
      <div className="relative w-full h-full">
        {/*
          不使用 poster 属性，让浏览器通过 preload="metadata" 自动加载视频首帧
          这样可以避免缩略图 URL 失效导致的黑屏问题
        */}
        <video
          ref={videoRef}
          src={data.videoUrl}
          preload="metadata"
          className="h-full w-full object-cover"
          loop
          muted
          playsInline
        />

        {/* 渐变遮罩 - 底部 */}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />

        {/* 渐变遮罩 - 顶部（hover时显示） */}
        {isHovered && (
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 via-black/20 to-transparent pointer-events-none animate-in fade-in duration-200" />
        )}

        {/* 右上角：公开分享标记（仅user变体且已公开时显示）- 简洁绿点 */}
        {variant === "user" && (data.isPublic || isPublic) && (
          <div
            className="absolute top-3 right-3 z-10 w-3 h-3 rounded-full bg-green-500 shadow-lg shadow-green-500/50"
            title={t("sharedPublicly")}
          />
        )}

        {/* 左下角用户信息 */}
        <div className="absolute bottom-4 left-4 z-10">
          <UserInfo
            name={data.user.name}
            avatarUrl={data.user.avatarUrl}
            avatarColor={data.user.avatarColor}
            size="lg"
          />
        </div>

        {/* 右下角：操作按钮组 - 横向排列 */}
        <div className="absolute bottom-4 right-4 flex flex-row items-center gap-4 z-10">
          {/* 三个点菜单按钮 - hover时显示 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "flex items-center justify-center h-10 w-10 rounded-full bg-zinc-800/80 text-white hover:bg-zinc-700/80 transition-all backdrop-blur-sm",
                  isHovered ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                )}
              >
                <MoreVertical className="h-5 w-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              side="bottom"
              className="bg-zinc-800/95 backdrop-blur-md border-zinc-700 min-w-[140px]"
            >
              {/* 下载 */}
              <DropdownMenuItem
                onClick={handleDownload}
                className="text-white hover:bg-white/10 focus:bg-white/10 cursor-pointer"
              >
                <Download className="h-4 w-4 mr-2" />
                {t("download")}
              </DropdownMenuItem>

              {/* VIP用户专属：下载无水印版本 */}
              {data.isVIP && data.originalVideoUrl && (
                <DropdownMenuItem
                  onClick={handleDownloadOriginal}
                  className="text-amber-400 hover:bg-white/10 focus:bg-white/10 cursor-pointer"
                >
                  <Download className="h-4 w-4 mr-2" />
                  <span className="flex items-center gap-1">
                    {t("noWatermark")}
                    <span className="text-[10px] bg-amber-400/20 px-1 rounded">{t("vip")}</span>
                  </span>
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator className="bg-zinc-700" />

              {/* 分享 */}
              <DropdownMenuItem
                onClick={handleShare}
                className="text-white hover:bg-white/10 focus:bg-white/10 cursor-pointer"
              >
                <Share2 className="h-4 w-4 mr-2" />
                {t("share")}
              </DropdownMenuItem>

              {/* 公开/私密状态切换 - 仅用户自己的视频 */}
              {variant === "user" && (
                <>
                  <DropdownMenuSeparator className="bg-zinc-700" />
                  {(data.isPublic || isPublic) ? (
                    <DropdownMenuItem
                      onClick={handleMakePrivate}
                      className="text-orange-400 hover:bg-white/10 focus:bg-white/10 cursor-pointer"
                    >
                      <Lock className="h-4 w-4 mr-2" />
                      {t("makePrivate")}
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      onClick={handleMakePublic}
                      className="text-green-400 hover:bg-white/10 focus:bg-white/10 cursor-pointer"
                    >
                      <Globe className="h-4 w-4 mr-2" />
                      {t("makePublic")}
                    </DropdownMenuItem>
                  )}
                </>
              )}

            </DropdownMenuContent>
          </DropdownMenu>

          {/* 点赞按钮 - 始终显示 */}
          <button
            onClick={handleLike}
            className={cn(
              "flex flex-row items-center gap-1.5 transition-transform hover:scale-110 active:scale-95",
              liked ? "text-red-500" : "text-white"
            )}
          >
            <Heart className={cn("h-7 w-7 drop-shadow-lg", liked ? "fill-current" : "")} />
            {likeCount > 0 && (
              <span className="text-base font-bold drop-shadow-lg">{likeCount}</span>
            )}
          </button>
        </div>

      </div>

      {/* 分享弹窗 */}
      <ShareModal
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
        shareData={getShareData()}
      />

      {/* 全屏视频播放器弹窗 */}
      <VideoPlayerModal
        open={playerModalOpen}
        onClose={() => setPlayerModalOpen(false)}
        data={{
          id: data.id,
          videoUrl: data.videoUrl,
          title: data.title,
          user: {
            name: data.user.name,
            avatarUrl: data.user.avatarUrl,
          },
          likeCount,
          isLiked: liked,
          originalVideoUrl: data.originalVideoUrl,
          watermarkedVideoUrl: data.watermarkedVideoUrl,
          isVIP: data.isVIP,
        }}
        actions={{
          onLike: async (id, newCount, isLiked) => {
            setLiked(isLiked || false);
            setLikeCount(newCount || 0);
            await actions?.onLike?.(id, newCount, isLiked);
          },
          onDownload: handleDownload,
          onShare: () => {
            // 关闭播放器弹窗，打开分享弹窗
            setPlayerModalOpen(false);
            setShareModalOpen(true);
            actions?.onShare?.(data.id);
          },
          onCopyLink: handleCopyLink,
        }}
      />
    </div>
  );
}
