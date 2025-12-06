"use client";

/**
 * 统一分享弹窗组件
 * Unified Share Modal Component
 *
 * 支持多平台分享：Twitter/X、Facebook、WhatsApp、YouTube、Email、复制链接
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
  Mail,
  Share2,
} from "lucide-react";

// 平台类型定义
export type SharePlatform =
  | "twitter"
  | "facebook"
  | "whatsapp"
  | "youtube"
  | "email"
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

// 平台图标组件（使用 SVG 以获得最佳显示效果）
// X/Twitter 图标 - 黑色背景上使用白色图标
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

// 分享平台配置
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
function createPlatformConfigs(t: ReturnType<typeof useTranslations>): Record<Exclude<SharePlatform, "native" | "copy">, PlatformConfig> {
  return {
    twitter: {
      name: "X",
      // X 图标：黑色背景 + 白色图标
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
        // Facebook 会自动抓取 OG 标签，quote 参数可以添加自定义文案
        if (data.customText || data.title) {
          params.set("quote", data.customText || data.title || "");
        }
        return `https://www.facebook.com/sharer/sharer.php?${params.toString()}`;
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
    youtube: {
      name: "YouTube",
      icon: <YouTubeIcon className="w-5 h-5" />,
      color: "text-white",
      bgColor: "bg-[#FF0000]",
      hoverBgColor: "hover:bg-[#CC0000]",
      // YouTube 分享实际上是打开 YouTube 的分享对话框（如果用户想分享到 YouTube 社区）
      // 或者可以直接跳转到 YouTube 搜索相关内容
      getShareUrl: (data) => {
        // YouTube 没有直接的分享 URL scheme，使用通用的社区分享方式
        // 用户可以通过这个链接分享到 YouTube 社区帖子
        const text = data.customText || data.title
          ? `${data.customText || data.title}\n${data.url}`
          : data.url;
        // 使用 YouTube 的通用分享意图（实际上会打开 YouTube app 或网页）
        return `https://www.youtube.com/redirect?q=${encodeURIComponent(data.url)}`;
      },
    },
    email: {
      name: t("email"),
      icon: <Mail className="w-5 h-5" />,
      color: "text-white",
      bgColor: "bg-gray-600",
      hoverBgColor: "hover:bg-gray-500",
      getShareUrl: (data) => {
        const subject = encodeURIComponent(data.title || "");
        const body = encodeURIComponent(
          data.customText || data.description
            ? `${data.customText || data.description}\n\n${data.url}`
            : data.url
        );
        return `mailto:?subject=${subject}&body=${body}`;
      },
    },
  };
}

/**
 * 复制文本到剪贴板的辅助函数（带后备方案）
 */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    // 尝试使用现代 Clipboard API
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // 后备方案：使用 textarea
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
 * 如果用户未提供 customText，则使用场景默认文案
 */
function getEnhancedShareData(
  data: ShareData,
  t: ReturnType<typeof useTranslations>
): ShareData {
  const scene = data.scene || "default";

  // 如果用户已经提供了自定义文案，直接使用
  if (data.customText) {
    return data;
  }

  // 根据场景获取默认文案
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

  // 获取增强的分享数据（带场景文案）
  const enhancedShareData = getEnhancedShareData(shareData, t);

  // 获取平台配置
  const platformConfigs = createPlatformConfigs(t);

  // 处理平台分享（打开新窗口）
  const handlePlatformShare = useCallback(
    (platform: Exclude<SharePlatform, "native" | "copy">) => {
      const config = platformConfigs[platform];
      const shareUrl = config.getShareUrl(enhancedShareData);

      // 打开分享窗口
      window.open(
        shareUrl,
        "_blank",
        "width=600,height=400,scrollbars=yes,resizable=yes"
      );

      // 触发回调
      onShare?.(platform);
    },
    [platformConfigs, enhancedShareData, onShare]
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

  // 处理原生分享（Web Share API）
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
      // 用户取消分享不算错误
      if ((error as Error).name !== "AbortError") {
        console.error("Native share failed:", error);
      }
    }
  }, [enhancedShareData, onShare, onOpenChange]);

  // 平台列表（显示顺序）- 5个平台使用 grid-cols-5
  const platforms: (Exclude<SharePlatform, "native" | "copy">)[] = [
    "twitter",
    "facebook",
    "whatsapp",
    "youtube",
    "email",
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "sm:max-w-md",
          className
        )}
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

          {/* 分享平台网格 */}
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t("shareTo")}
            </p>
            <div className="grid grid-cols-5 gap-2">
              {platforms.map((platform) => {
                const config = platformConfigs[platform];
                return (
                  <button
                    key={platform}
                    onClick={() => handlePlatformShare(platform)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-xl transition-all",
                      "hover:scale-105 active:scale-95",
                      "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    )}
                  >
                    <div
                      className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center",
                        config.bgColor,
                        config.hoverBgColor,
                        config.color
                      )}
                    >
                      {config.icon}
                    </div>
                    <span className="text-xs text-muted-foreground">
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
 * 可直接作为触发器使用，内部管理弹窗状态
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
 * 快捷分享函数（直接调用，适合已知要分享的场景）
 * 优先使用 Web Share API，不支持时直接复制链接
 */
export async function quickShare(
  data: ShareData,
  options?: {
    onSuccess?: (platform: SharePlatform) => void;
    onError?: (error: Error) => void;
    fallbackMessage?: string;
  }
): Promise<boolean> {
  // 优先使用原生分享
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
        // 用户取消，不算错误
        return false;
      }
      // 继续执行后备方案
    }
  }

  // 后备方案：复制链接
  const success = await copyToClipboard(data.url);
  if (success) {
    options?.onSuccess?.("copy");
  } else {
    options?.onError?.(new Error("Copy failed"));
  }
  return success;
}
