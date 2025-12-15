"use client";

/**
 * 统一分享弹窗组件
 * Unified Share Modal Component
 *
 * 支持多平台分享：TikTok、Instagram、X/Twitter、YouTube、WhatsApp、Facebook
 * 优先使用 Web Share API（移动端最佳体验），降级到自定义分享菜单
 * 支持不同分享场景：纪念分享（memorial）和普通视频分享（video）
 */

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { cn } from "@/shared/lib/utils";
import {
  Copy,
  Check,
  Share2,
} from "lucide-react";

// 平台类型定义
export type SharePlatform =
  | "tiktok"
  | "instagram"
  | "twitter"
  | "youtube"
  | "whatsapp"
  | "facebook"
  | "copy"
  | "native";

// 分享场景类型
export type ShareScene = "memorial" | "video" | "default";

// 分享数据接口
export interface ShareData {
  url: string;
  title?: string;
  description?: string;
  hashtags?: string[];
  /** 分享场景，用于选择不同的文案风格 */
  scene?: ShareScene;
  /** 自定义分享文案（优先级最高） */
  customText?: string;
}

// 组件属性接口
export interface ShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shareData: ShareData;
  onShare?: (platform: SharePlatform) => void; // 分享成功回调（用于统计）
  className?: string;
}

// ============================================
// 平台图标组件
// ============================================

// TikTok 图标
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  );
}

// Instagram 图标
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
    >
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

// X/Twitter 图标
function TwitterIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

// YouTube 图标
function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
    >
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

// WhatsApp 图标
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

// Facebook 图标
function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
    >
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

// ============================================
// 平台配置
// ============================================

interface PlatformConfig {
  name: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  hoverBgColor: string;
  getShareUrl: (data: ShareData) => string;
}

/**
 * 生成各平台分享链接
 */
function createPlatformConfigs(): Record<Exclude<SharePlatform, "native" | "copy">, PlatformConfig> {
  return {
    tiktok: {
      name: "TikTok",
      icon: <TikTokIcon className="w-5 h-5" />,
      color: "text-white",
      bgColor: "bg-black",
      hoverBgColor: "hover:bg-zinc-800",
      getShareUrl: () => {
        // TikTok 不支持直接网页分享，跳转到 TikTok 主页
        // 用户需要手动在 TikTok 中分享（链接会被复制到剪贴板）
        return `https://www.tiktok.com/`;
      },
    },
    instagram: {
      name: "Instagram",
      icon: <InstagramIcon className="w-5 h-5" />,
      color: "text-white",
      // Instagram 渐变色背景
      bgColor: "bg-gradient-to-tr from-[#FCAF45] via-[#E1306C] to-[#833AB4]",
      hoverBgColor: "hover:opacity-90",
      getShareUrl: (data) => {
        // Instagram 不支持直接网页分享，但可以通过复制链接后跳转到 Instagram
        // 这里提供跳转到 Instagram 主页的链接，用户可以手动分享
        // 或者在移动端尝试打开 Instagram App
        return `https://www.instagram.com/`;
      },
    },
    twitter: {
      name: "X",
      icon: <TwitterIcon className="w-5 h-5" />,
      color: "text-white",
      bgColor: "bg-black",
      hoverBgColor: "hover:bg-zinc-800",
      getShareUrl: (data) => {
        const params = new URLSearchParams({
          url: data.url,
          text: data.customText || data.title || "",
        });
        if (data.hashtags?.length) {
          params.set("hashtags", data.hashtags.join(","));
        }
        return `https://twitter.com/intent/tweet?${params.toString()}`;
      },
    },
    youtube: {
      name: "YouTube",
      icon: <YouTubeIcon className="w-5 h-5" />,
      color: "text-white",
      bgColor: "bg-[#FF0000]",
      hoverBgColor: "hover:bg-[#CC0000]",
      getShareUrl: (data) => {
        // YouTube 社区分享
        return `https://www.youtube.com/redirect?q=${encodeURIComponent(data.url)}`;
      },
    },
    whatsapp: {
      name: "WhatsApp",
      icon: <WhatsAppIcon className="w-5 h-5" />,
      color: "text-white",
      bgColor: "bg-[#25D366]",
      hoverBgColor: "hover:bg-[#20BD5C]",
      getShareUrl: (data) => {
        const text = data.customText || data.title
          ? `${data.customText || data.title}\n${data.url}`
          : data.url;
        return `https://wa.me/?text=${encodeURIComponent(text)}`;
      },
    },
    facebook: {
      name: "Facebook",
      icon: <FacebookIcon className="w-5 h-5" />,
      color: "text-white",
      bgColor: "bg-[#1877F2]",
      hoverBgColor: "hover:bg-[#166FE5]",
      getShareUrl: (data) => {
        const params = new URLSearchParams({
          u: data.url,
        });
        if (data.customText || data.title) {
          params.set("quote", data.customText || data.title || "");
        }
        return `https://www.facebook.com/sharer/sharer.php?${params.toString()}`;
      },
    },
  };
}

/**
 * 复制文本到剪贴板的辅助函数（带后备方案）
 */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const successful = document.execCommand("copy");
      document.body.removeChild(textarea);
      return successful;
    } catch {
      return false;
    }
  }
}

/**
 * 检测是否支持 Web Share API
 */
function canUseNativeShare(): boolean {
  return typeof navigator !== "undefined" && !!navigator.share;
}

/**
 * 根据场景获取增强的分享数据
 */
function getEnhancedShareData(
  data: ShareData,
  t: ReturnType<typeof useTranslations>
): ShareData {
  const scene = data.scene || "default";

  if (data.customText) {
    return data;
  }

  const sceneText = t(`scenes.${scene}.text`, { name: data.title || "" });
  const sceneHashtags = t(`scenes.${scene}.hashtags`).split(",");

  return {
    ...data,
    customText: sceneText,
    hashtags: data.hashtags || sceneHashtags,
  };
}

/**
 * 分享弹窗组件
 */
export function ShareModal({
  open,
  onOpenChange,
  shareData,
  onShare,
  className,
}: ShareModalProps) {
  const t = useTranslations("common.share");
  const [copied, setCopied] = useState(false);

  // 获取增强的分享数据
  const enhancedShareData = getEnhancedShareData(shareData, t);

  // 获取平台配置
  const platformConfigs = createPlatformConfigs();

  // 处理平台分享
  const handlePlatformShare = useCallback(
    (platform: Exclude<SharePlatform, "native" | "copy">) => {
      const config = platformConfigs[platform];

      // TikTok 和 Instagram 特殊处理：先复制链接，再跳转
      // 因为这两个平台不支持直接网页分享
      if (platform === "tiktok") {
        copyToClipboard(enhancedShareData.url).then((success) => {
          if (success) {
            toast.success(t("linkCopiedForTikTok"));
          }
        });
      } else if (platform === "instagram") {
        copyToClipboard(enhancedShareData.url).then((success) => {
          if (success) {
            toast.success(t("linkCopiedForInstagram"));
          }
        });
      }

      const shareUrl = config.getShareUrl(enhancedShareData);
      window.open(
        shareUrl,
        "_blank",
        "width=600,height=400,scrollbars=yes,resizable=yes"
      );

      onShare?.(platform);
    },
    [platformConfigs, enhancedShareData, onShare, t]
  );

  // 处理复制链接
  const handleCopyLink = useCallback(async () => {
    const success = await copyToClipboard(enhancedShareData.url);
    if (success) {
      setCopied(true);
      toast.success(t("linkCopied"));
      setTimeout(() => setCopied(false), 2000);
      onShare?.("copy");
    } else {
      toast.error(t("copyFailed"));
    }
  }, [enhancedShareData.url, t, onShare]);

  // 处理原生分享
  const handleNativeShare = useCallback(async () => {
    if (!canUseNativeShare()) return;

    try {
      await navigator.share({
        title: enhancedShareData.title,
        text: enhancedShareData.customText || enhancedShareData.description,
        url: enhancedShareData.url,
      });
      onShare?.("native");
      onOpenChange(false);
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        console.error("Native share failed:", error);
      }
    }
  }, [enhancedShareData, onShare, onOpenChange]);

  // 平台列表（按优先级排序）：TikTok, Instagram, X, YouTube, WhatsApp, Facebook
  const platforms: (Exclude<SharePlatform, "native" | "copy">)[] = [
    "tiktok",
    "instagram",
    "twitter",
    "youtube",
    "whatsapp",
    "facebook",
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "sm:max-w-md z-[110]", // 确保层级高于 FeedDetailModal (z-[100])
          className
        )}
        overlayClassName="z-[105]" // 遮罩层也需要更高的层级
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            {t("title")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 原生分享按钮（移动端优先显示） */}
          {canUseNativeShare() && (
            <Button
              onClick={handleNativeShare}
              className="w-full"
              size="lg"
            >
              <Share2 className="w-5 h-5 mr-2" />
              {t("shareNow")}
            </Button>
          )}

          {/* 分享平台网格 - 6个平台使用 grid-cols-6 */}
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t("shareTo")}
            </p>
            <div className="grid grid-cols-6 gap-2">
              {platforms.map((platform) => {
                const config = platformConfigs[platform];
                return (
                  <button
                    key={platform}
                    onClick={() => handlePlatformShare(platform)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-2 rounded-xl transition-all",
                      "hover:scale-105 active:scale-95",
                      "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    )}
                  >
                    <div
                      className={cn(
                        "w-11 h-11 rounded-full flex items-center justify-center",
                        config.bgColor,
                        config.hoverBgColor,
                        config.color
                      )}
                    >
                      {config.icon}
                    </div>
                    <span className="text-[10px] text-muted-foreground truncate w-full text-center">
                      {config.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 复制链接区域 */}
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t("orCopyLink")}
            </p>
            <div className="flex gap-2">
              <Input
                value={enhancedShareData.url}
                readOnly
                className="flex-1 bg-muted text-sm"
              />
              <Button
                onClick={handleCopyLink}
                variant="outline"
                size="icon"
                className="shrink-0"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * 分享按钮组件（简化使用）
 */
export interface ShareButtonProps {
  shareData: ShareData;
  onShare?: (platform: SharePlatform) => void;
  children?: React.ReactNode;
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export function ShareButton({
  shareData,
  onShare,
  children,
  className,
  variant = "outline",
  size = "default",
}: ShareButtonProps) {
  const t = useTranslations("common.share");
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant={variant}
        size={size}
        className={className}
      >
        {children || (
          <>
            <Share2 className="w-4 h-4 mr-2" />
            {t("share")}
          </>
        )}
      </Button>
      <ShareModal
        open={open}
        onOpenChange={setOpen}
        shareData={shareData}
        onShare={onShare}
      />
    </>
  );
}

/**
 * 快捷分享函数
 */
export async function quickShare(
  data: ShareData,
  options?: {
    onSuccess?: (platform: SharePlatform) => void;
    onError?: (error: Error) => void;
    fallbackMessage?: string;
  }
): Promise<boolean> {
  if (canUseNativeShare()) {
    try {
      await navigator.share({
        title: data.title,
        text: data.description,
        url: data.url,
      });
      options?.onSuccess?.("native");
      return true;
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        return false;
      }
    }
  }

  const success = await copyToClipboard(data.url);
  if (success) {
    options?.onSuccess?.("copy");
  } else {
    options?.onError?.(new Error("Copy failed"));
  }
  return success;
}
