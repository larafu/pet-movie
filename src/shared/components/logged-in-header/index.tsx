/**
 * LoggedInHeader - 登录后的顶部导航
 * 功能: Logo、积分显示、升级按钮、用户菜单、通知
 */

'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Crown, Sparkles, Bell, Menu, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/core/i18n/navigation';
import { useAppContext } from '@/shared/contexts/app';

interface LoggedInHeaderProps {
  username?: string;
  // Tab 切换支持
  activeTab?: 'all' | 'mine';
  onTabChange?: (tab: 'all' | 'mine') => void;
  showTabs?: boolean;
  isLoggedIn?: boolean; // 是否已登录（未登录时隐藏 My Works tab）
}

export function LoggedInHeader({
  username: propUsername,
  activeTab = 'all',
  onTabChange,
  showTabs = false,
  isLoggedIn: propIsLoggedIn,
}: LoggedInHeaderProps) {
  const t = useTranslations('dashboard.header');
  const { user } = useAppContext();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // 判断是否登录（优先使用 prop，否则根据 user 判断）
  const isLoggedIn = propIsLoggedIn ?? !!user;
  const username = propUsername || user?.name || 'user';
  const credits = user?.credits?.remainingCredits ?? 0;

  return (
    <>
      <div className="sticky top-0 z-50 w-full">
        <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border-b border-white/20 dark:border-gray-700/50 shadow-lg shadow-black/5 dark:shadow-black/20 transition-colors duration-200">
          <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 h-14">
            {/* Logo */}
            <div className="flex-shrink-0">
              <Link href="/" className="flex items-center gap-1 group">
                <Image
                  alt="Logo"
                  src="/logo.png"
                  width={32}
                  height={32}
                  className="transition-transform group-hover:scale-105"
                />
                <span className="hidden sm:inline font-display text-lg font-semibold tracking-tight text-foreground group-hover:text-foreground/80 transition-colors">
                  {t('appName')}
                </span>
              </Link>
            </div>

            {/* Tab 切换 - 紧凑样式 */}
            {showTabs && onTabChange && (
              <div className="flex items-center">
                <div className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 p-0.5">
                  <button
                    onClick={() => onTabChange('all')}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-all duration-200 ${
                      activeTab === 'all'
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {t('tabs.community')}
                  </button>
                  {/* 已登录用户才显示 My Works tab */}
                  {isLoggedIn && (
                    <button
                      onClick={() => onTabChange('mine')}
                      className={`px-3 py-1 text-xs font-medium rounded-full transition-all duration-200 ${
                        activeTab === 'mine'
                          ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      {t('tabs.myWorks')}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 右侧按钮 */}
            <div className="flex items-center gap-2 relative">
              {isLoggedIn ? (
                <>
                  {/* 升级按钮 / Pro 徽章 */}
                  {user?.isPro ? (
                    <Link href="/settings/billing">
                      <div className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-all duration-200 group relative overflow-hidden bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md hover:from-amber-600 hover:to-orange-600 hover:shadow-lg hover:scale-105 active:scale-95 transform">
                        <Crown className="h-3.5 w-3.5 transition-all duration-200" />
                        <span className="group-hover:scale-105 transition-transform duration-200 relative z-10">
                          Pro
                        </span>
                      </div>
                    </Link>
                  ) : (
                    <Link href="/pricing">
                      <div className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-all duration-200 group relative overflow-hidden bg-gradient-to-r from-slate-700 to-slate-800 text-white shadow-md hover:from-slate-800 hover:to-slate-900 hover:shadow-lg hover:scale-105 active:scale-95 transform">
                        <Crown className="h-3.5 w-3.5 group-hover:animate-pulse transition-all duration-200" />
                        <span className="group-hover:scale-105 transition-transform duration-200 relative z-10">
                          {t('upgrade')}
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 to-amber-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                      </div>
                    </Link>
                  )}

                  {/* 积分显示 - 桌面端 */}
                  <div className="hidden md:block">
                    <Link href="/settings/credits">
                      <div className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-all duration-200 group bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-md hover:from-gray-700 hover:to-gray-800 hover:shadow-lg hover:scale-105 active:scale-95 transform relative overflow-hidden">
                        <Sparkles className="h-3.5 w-3.5 group-hover:animate-pulse transition-all duration-200" />
                        <span className="group-hover:scale-105 transition-transform duration-200 relative z-10">
                          {credits}
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 to-amber-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                      </div>
                    </Link>
                  </div>

                  {/* 桌面端导航 */}
                  <div className="hidden md:flex items-center gap-1">
                    <Link
                      href="/settings/profile"
                      className="px-2.5 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white/20 dark:hover:bg-gray-700/20 rounded-lg transition-all duration-200"
                    >
                      {t('profile')}
                    </Link>
                    <button
                      className="p-1.5 hover:bg-white/20 dark:hover:bg-gray-700/20 rounded-lg transition-all duration-200"
                      title={t('notifications')}
                    >
                      <Bell className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                    </button>
                  </div>

                  {/* 移动端菜单按钮 */}
                  <div className="relative md:hidden">
                    <button
                      className="p-2 hover:bg-white/20 dark:hover:bg-gray-700/20 rounded-lg transition-all duration-200"
                      onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                      aria-label="Toggle mobile menu"
                    >
                      <Menu className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                    </button>
                  </div>
                </>
              ) : (
                /* 未登录时显示登录按钮 */
                <Link href="/sign-in">
                  <div className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-all duration-200 bg-blue-500 text-white shadow-md hover:bg-blue-600 hover:shadow-lg hover:scale-105 active:scale-95 transform">
                    {t('signIn')}
                  </div>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 移动端菜单 */}
      <div
        className={`fixed inset-0 z-50 md:hidden transition-all duration-300 ease-in-out ${
          mobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!mobileMenuOpen}
      >
        <div className="absolute inset-0 bg-white dark:bg-gray-900"></div>
        <div className="relative h-full flex flex-col">
          <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('appName')}
            </span>
            <button
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              aria-label="Close mobile menu"
              onClick={() => setMobileMenuOpen(false)}
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 flex flex-col justify-center px-6">
            <div className="space-y-6">
              {/* 移动端积分 */}
              <Link
                href="/settings/credits"
                className="flex items-center gap-3 text-xl font-semibold text-gray-900 dark:text-white hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Sparkles className="h-5 w-5" />
                <span>
                  {credits} {t('credits')}
                </span>
              </Link>
              <Link
                href="/settings/profile"
                className="block text-xl font-semibold text-gray-900 dark:text-white hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('profile')}
              </Link>
              {user?.isPro ? (
                <Link
                  href="/settings/billing"
                  className="flex items-center gap-2 text-xl font-semibold text-amber-500 hover:text-amber-600 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Crown className="h-5 w-5" />
                  <span>Pro</span>
                </Link>
              ) : (
                <Link
                  href="/pricing"
                  className="block text-xl font-semibold text-gray-900 dark:text-white hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('upgrade')}
                </Link>
              )}
              <button
                className="block text-xl font-semibold text-gray-900 dark:text-white hover:text-gray-600 dark:hover:text-gray-300 transition-colors text-left"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('notifications')}
              </button>
            </div>
          </nav>
        </div>
      </div>
    </>
  );
}
