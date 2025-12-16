"use client";

/**
 * 视频分享展示组件
 * Video Share Display Component
 *
 * 用于公开分享页面的视频展示，采用沉浸式全屏设计
 * 点赞功能需要用户登录，未登录时引导登录
 */

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/shared/lib/utils";
import {
  Heart,
  Download,
  Share2,
  Play,
  Pause,
  Clock,
  Calendar,
  Sparkles,
  Film,
} from "lucide-react";
import { UserInfo } from "./user-info";
import { ShareModal, type ShareData } from "./share-modal";

export interface VideoShareDisplayProps {
  videoId: string;
  videoUrl: string;
  thumbnailUrl?: string;
  aspectRatio: "16:9" | "9:16";
  likeCount: number;
  isLiked?: boolean; // 当前用户是否已点赞（服务端传入）
  user: {
    name: string;
    avatarUrl?: string;
  };
  metadata?: {
    templateType: string;
    petDescription: string;
    duration: number;
    createdAt: string;
  };
}

export function VideoShareDisplay({
  videoId,
  videoUrl,
  thumbnailUrl,
  aspectRatio,
  likeCount: initialLikeCount,
  isLiked: initialIsLiked = false,
  user,
  metadata,
}: VideoShareDisplayProps) {
  const t = useTranslations("landing.videoShare");
  const router = useRouter();
  const [isPlaying, setIsPlaying] = useState(false);
  const [liked, setLiked] = useState(initialIsLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [isLiking, setIsLiking] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // 同步服务端传入的点赞状态
  useEffect(() => {
    setLiked(initialIsLiked);
  }, [initialIsLiked]);

  // 处理播放/暂停
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // 处理点赞 - 调用真实 API，未登录时引导登录
  const handleLike = async () => {
    if (isLiking) return;

    setIsLiking(true);
    const newLiked = !liked;

    // 乐观更新 UI
    setLiked(newLiked);
    setLikeCount((prev) => (newLiked ? prev + 1 : prev - 1));

    try {
      const response = await fetch("/api/pet-video/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId }),
      });

      if (response.status === 401) {
        // 未登录，回滚 UI 并引导登录
        setLiked(!newLiked);
        setLikeCount((prev) => (newLiked ? prev - 1 : prev + 1));
        // 跳转登录页，登录后返回当前页面
        const currentPath = window.location.pathname;
        router.push(`/sign-in?callbackUrl=${encodeURIComponent(currentPath)}`);
        return;
      }

      if (!response.ok) {
        // 其他错误，回滚 UI
        setLiked(!newLiked);
        setLikeCount((prev) => (newLiked ? prev - 1 : prev + 1));
        return;
      }

      // 使用服务端返回的真实数据更新
      const data = await response.json();
      if (data.success) {
        setLiked(data.isLiked);
        setLikeCount(data.likeCount);
      }
    } catch (error) {
      // 网络错误，回滚 UI
      console.error("Like failed:", error);
      setLiked(!newLiked);
      setLikeCount((prev) => (newLiked ? prev - 1 : prev + 1));
    } finally {
      setIsLiking(false);
    }
  };

  // 处理下载
  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = `pet-video-${Date.now()}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // 处理分享 - 打开分享弹窗
  const handleShare = () => {
    setShareModalOpen(true);
  };

  // 分享数据 - 使用视频场景
  const shareData: ShareData = {
    url: typeof window !== "undefined" ? window.location.href : "",
    title: metadata?.petDescription
      ? t("adventure", { name: metadata.petDescription })
      : t("amazingPetVideo"),
    description: t("watchDescription"),
    scene: "video",
    hashtags: ["PetMovie", "AIPetVideo", "PetLove"],
  };

  // 格式化日期
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // 格式化时长
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  // 是否竖屏视频
  const isVertical = aspectRatio === "9:16";

  return (
    <div className="min-h-[calc(100vh-80px)] w-full">
      {/* 背景装饰 */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div
          className={cn(
            "grid gap-8 lg:gap-12",
            isVertical
              ? "grid-cols-1 lg:grid-cols-[1fr_400px_1fr]"
              : "grid-cols-1 lg:grid-cols-2"
          )}
        >
          {/* 竖屏视频时的左侧装饰区域 */}
          {isVertical && (
            <div className="hidden lg:flex flex-col justify-center items-end pr-8">
              <div className="space-y-6 text-right">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary/20 to-primary/10 rounded-full">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">{t("aiGenerated")}</span>
                </div>
                <h2 className="text-2xl font-bold text-foreground/80">
                  {t("createdWithMagic")}
                </h2>
                <p className="text-muted-foreground max-w-xs">
                  {t("aiDescription")}
                </p>
              </div>
            </div>
          )}

          {/* 视频播放器区域 */}
          <div
            className={cn(
              "flex items-start justify-center",
              isVertical ? "lg:items-center" : ""
            )}
          >
            <div
              className={cn(
                "relative w-full bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10",
                isVertical
                  ? "max-w-[360px] aspect-[9/16]"
                  : "max-w-2xl aspect-[16/9]"
              )}
            >
              {/* 视频元素 */}
              <video
                ref={videoRef}
                src={videoUrl}
                poster={thumbnailUrl}
                className="w-full h-full object-cover"
                loop
                playsInline
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />

              {/* 播放/暂停按钮覆盖层 */}
              <div
                className="absolute inset-0 flex items-center justify-center cursor-pointer group"
                onClick={togglePlay}
              >
                <div
                  className={cn(
                    "w-20 h-20 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center transition-all duration-300",
                    isPlaying
                      ? "opacity-0 group-hover:opacity-100"
                      : "opacity-100"
                  )}
                >
                  {isPlaying ? (
                    <Pause className="w-8 h-8 text-white" />
                  ) : (
                    <Play className="w-8 h-8 text-white ml-1" />
                  )}
                </div>
              </div>

              {/* 顶部渐变和标签 */}
              <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
              <div className="absolute top-4 left-4 z-10 flex gap-2">
                <span className="px-3 py-1 bg-black/40 backdrop-blur-sm text-white rounded-full text-xs font-medium flex items-center gap-1">
                  <Film className="w-3 h-3" />
                  {aspectRatio}
                </span>
                {metadata?.duration && metadata.duration > 0 && (
                  <span className="px-3 py-1 bg-black/40 backdrop-blur-sm text-white rounded-full text-xs font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDuration(metadata.duration)}
                  </span>
                )}
              </div>

              {/* 底部渐变 */}
              <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />

              {/* 底部用户信息和点赞 */}
              <div className="absolute bottom-4 left-4 right-4 z-10 flex items-end justify-between">
                <UserInfo
                  name={user.name}
                  avatarUrl={user.avatarUrl}
                  size="lg"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLike();
                  }}
                  disabled={isLiking}
                  className="flex flex-col items-center gap-1"
                  aria-label={liked ? "Unlike" : "Like"}
                >
                  <div
                    className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center transition-all",
                      liked
                        ? "bg-red-500 text-white scale-110"
                        : "bg-white/20 backdrop-blur-sm text-white hover:bg-white/30",
                      isLiking && "opacity-50"
                    )}
                  >
                    <Heart
                      className={cn("w-6 h-6", liked && "fill-current")}
                    />
                  </div>
                  {likeCount > 0 && (
                    <span className="text-white text-xs font-medium">
                      {likeCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* 右侧信息区域 */}
          <div
            className={cn(
              "flex flex-col",
              isVertical ? "justify-center lg:pl-8" : "justify-center"
            )}
          >
            {/* 标题和描述 */}
            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-full text-xs font-semibold uppercase tracking-wider">
                  {metadata?.templateType || t("petVideo")}
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">
                {metadata?.petDescription
                  ? t("adventure", { name: metadata.petDescription })
                  : t("amazingPetVideo")}
              </h1>
              <p className="text-muted-foreground text-lg leading-relaxed">
                {t("watchDescription")}
              </p>
            </div>

            {/* 视频信息卡片 */}
            <div className="bg-muted/50 rounded-2xl p-6 mb-8 space-y-4">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
                {t("videoDetails")}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Film className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("format")}</p>
                    <p className="text-sm font-medium text-foreground">
                      {aspectRatio === "16:9" ? "Landscape" : "Portrait"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("duration")}</p>
                    <p className="text-sm font-medium text-foreground">
                      {metadata?.duration
                        ? formatDuration(metadata.duration)
                        : "N/A"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("type")}</p>
                    <p className="text-sm font-medium text-foreground">
                      {metadata?.templateType || t("aiGenerated")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("created")}</p>
                    <p className="text-sm font-medium text-foreground">
                      {metadata?.createdAt
                        ? formatDate(metadata.createdAt)
                        : t("recently")}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleDownload}
                className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-6 py-4 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/25"
              >
                <Download className="w-5 h-5" />
                <span>{t("download")}</span>
              </button>

              <button
                onClick={handleShare}
                className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-6 py-4 bg-muted text-foreground rounded-xl font-semibold hover:bg-muted/80 transition-all"
              >
                <Share2 className="w-5 h-5" />
                <span>{t("share")}</span>
              </button>
            </div>

            {/* 分享弹窗 */}
            <ShareModal
              open={shareModalOpen}
              onOpenChange={setShareModalOpen}
              shareData={shareData}
            />

            {/* 创建自己的视频 CTA */}
            <div className="mt-8 p-6 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-2xl border border-primary/20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-1">
                    {t("createYourOwn")}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t("createDescription")}
                  </p>
                </div>
                <a
                  href="/creations"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-all whitespace-nowrap"
                >
                  {t("tryNow")}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
