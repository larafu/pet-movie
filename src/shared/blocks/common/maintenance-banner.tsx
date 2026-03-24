'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

import { cacheGet, cacheSet } from '@/shared/lib/cache';
import { getTimestamp } from '@/shared/lib/time';

const DISMISSED_KEY = 'maintenance-banner-dismissed';
const DISMISSED_EXPIRY_HOURS = 4; // 关闭后4小时内不再显示

/**
 * 全站维护横幅组件
 * 用于在系统升级/维护期间提示用户
 * 设置 enabled = false 即可关闭横幅
 */
export function MaintenanceBanner() {
  // ===== 维护模式开关 =====
  const enabled = true;
  // ========================

  const [showBanner, setShowBanner] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled) return;

    // 检查用户是否已关闭过横幅
    const dismissed = cacheGet(DISMISSED_KEY);
    if (!dismissed) {
      setShowBanner(true);
    }
  }, [enabled]);

  // 调整 header 和侧边栏位置（与 LocaleDetector 一致）
  useEffect(() => {
    if (showBanner && bannerRef.current) {
      const bannerHeight = bannerRef.current.offsetHeight;

      const header = document.querySelector('header');
      if (header) {
        header.style.top = `${bannerHeight}px`;
      }

      const sidebarContainer = document.querySelector(
        '[data-slot="sidebar-container"]'
      );
      if (sidebarContainer) {
        (sidebarContainer as HTMLElement).style.top = `${bannerHeight}px`;
        (sidebarContainer as HTMLElement).style.height =
          `calc(100vh - ${bannerHeight}px)`;
      }

      const sidebarWrapper = document.querySelector(
        '[data-slot="sidebar-wrapper"]'
      );
      if (sidebarWrapper) {
        (sidebarWrapper as HTMLElement).style.paddingTop = `${bannerHeight}px`;
      }
    }

    return () => {
      const header = document.querySelector('header');
      if (header) header.style.top = '0px';

      const sidebarContainer = document.querySelector(
        '[data-slot="sidebar-container"]'
      );
      if (sidebarContainer) {
        (sidebarContainer as HTMLElement).style.top = '0px';
        (sidebarContainer as HTMLElement).style.height = '100vh';
      }

      const sidebarWrapper = document.querySelector(
        '[data-slot="sidebar-wrapper"]'
      );
      if (sidebarWrapper) {
        (sidebarWrapper as HTMLElement).style.paddingTop = '0px';
      }
    };
  }, [showBanner]);

  const handleDismiss = () => {
    const expiresAt =
      getTimestamp() + DISMISSED_EXPIRY_HOURS * 60 * 60;
    cacheSet(DISMISSED_KEY, 'true', expiresAt);
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div
      ref={bannerRef}
      className="fixed top-0 right-0 left-0 z-[51] bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg"
    >
      <div className="container py-2.5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-1 items-center gap-3">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm font-medium">
              System Upgrade in Progress — Video generation is temporarily
              paused while we upgrade our systems. You can still browse and view
              existing content. We&apos;ll be back soon!
            </span>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 rounded bg-amber-700/30 p-1 transition-colors hover:bg-amber-700/50"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
