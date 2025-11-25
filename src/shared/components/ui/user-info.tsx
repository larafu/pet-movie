"use client";

/**
 * 用户信息展示组件
 * User Information Display Component
 *
 * 支持头像和用户名显示，自动处理超长文本省略
 */

import Image from "next/image";
import { cn } from "@/shared/lib/utils";

interface UserInfoProps {
  /** 用户名 */
  name: string;
  /** 头像URL（可选，不传则显示首字母） */
  avatarUrl?: string;
  /** 头像背景色（当没有avatarUrl时使用） */
  avatarColor?: string;
  /** 显示尺寸 */
  size?: "sm" | "md" | "lg";
  /** 自定义类名 */
  className?: string;
  /** 是否显示用户名 */
  showName?: boolean;
}

const sizeConfig = {
  sm: {
    avatar: "h-5 w-5",
    text: "text-[10px]",
    initial: "text-[8px]",
  },
  md: {
    avatar: "h-6 w-6",
    text: "text-xs",
    initial: "text-[10px]",
  },
  lg: {
    avatar: "h-8 w-8",
    text: "text-sm",
    initial: "text-xs",
  },
};

/**
 * 生成头像颜色（基于用户名哈希）
 */
function generateAvatarColor(name: string): string {
  const gradients = [
    "from-zinc-700 to-zinc-800",
    "from-zinc-600 to-zinc-700",
    "from-neutral-700 to-neutral-800",
    "from-stone-700 to-stone-800",
    "from-gray-700 to-gray-800",
    "from-slate-700 to-slate-800",
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  return gradients[Math.abs(hash) % gradients.length];
}

/**
 * 获取用户名首字母
 */
function getInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}

export function UserInfo({
  name,
  avatarUrl,
  avatarColor,
  size = "md",
  className,
  showName = true,
}: UserInfoProps) {
  const config = sizeConfig[size];
  const bgColor = avatarColor || generateAvatarColor(name);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* 头像 */}
      <div
        className={cn(
          "rounded-full border border-white/80 flex items-center justify-center text-white font-semibold flex-shrink-0",
          config.avatar,
          config.initial,
          !avatarUrl && `bg-gradient-to-br ${bgColor}`
        )}
      >
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={name}
            width={32}
            height={32}
            className="rounded-full object-cover w-full h-full"
          />
        ) : (
          getInitial(name)
        )}
      </div>

      {/* 用户名 */}
      {showName && (
        <span
          className={cn(
            "text-white font-medium drop-shadow-lg truncate max-w-[120px]",
            config.text
          )}
          title={name}
        >
          {name}
        </span>
      )}
    </div>
  );
}
