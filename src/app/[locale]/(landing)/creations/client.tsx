/**
 * DashboardClient - Dashboard 客户端组件
 * 负责数据获取、状态管理和交互
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

import { LoggedInHeader } from '@/shared/components/logged-in-header';
import { MasonryGrid } from '@/shared/components/masonry-grid';
import { FloatingPromptBar } from '@/shared/components/floating-prompt-bar';
import { FeedDetailModal } from '@/shared/components/feed-detail-modal';
import type { FeedItem } from '@/shared/components/feed-card';
import { useAppContext } from '@/shared/contexts/app';

// 每页加载数量
const PAGE_SIZE = 20;

interface DashboardClientProps {
  title: string;
  emptyMessage: string;
  loadingMessage: string;
  errorMessage: string;
  initialItemId?: string; // 初始打开的作品 ID（用于 /creations/[id] 路由）
  initialModel?: string; // 初始选中的模型（用于 /creations/nanobanana 等 SEO 路由）
}

export function DashboardClient({
  emptyMessage,
  loadingMessage,
  errorMessage,
  initialItemId,
  initialModel,
}: DashboardClientProps) {
  const t = useTranslations('dashboard');
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, fetchUserCredits } = useAppContext();

  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'mine'>('all');
  const [hasMore, setHasMore] = useState(true);
  const offsetRef = useRef(0); // 使用 ref 避免循环依赖
  const [refreshKey, setRefreshKey] = useState(0); // 用于强制刷新

  // Remix 功能支持
  const [remixPrompt, setRemixPrompt] = useState('');
  const [remixImages, setRemixImages] = useState<string[]>([]);
  const [remixMode, setRemixMode] = useState<'image' | 'video'>('image');

  // 详情弹窗状态
  const [selectedItem, setSelectedItem] = useState<FeedItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 滚动加载的观察元素
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // 隐藏页面 footer（因为 dashboard 有自己的 FloatingPromptBar）
  useEffect(() => {
    // 查找并隐藏 footer
    const footer = document.querySelector('footer') as HTMLElement | null;
    const header = document.querySelector('header:not([data-dashboard])') as HTMLElement | null;
    if (footer) {
      footer.style.display = 'none';
    }
    if (header) {
      header.style.display = 'none';
    }
    return () => {
      // 恢复显示
      if (footer) {
        footer.style.display = '';
      }
      if (header) {
        header.style.display = '';
      }
    };
  }, []);

  // 从URL参数中读取 remix 信息
  useEffect(() => {
    const remixId = searchParams.get('remix');
    if (remixId) {
      const item = feedItems.find((i) => i.id === remixId);
      if (item) {
        setRemixPrompt(item.prompt || '');
        setRemixMode(item.type);
      }
    }
  }, [searchParams, feedItems]);

  // 获取 Feed 数据
  const fetchFeed = useCallback(async (isLoadMore = false) => {
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      offsetRef.current = 0; // 重置 offset
      setHasMore(true);
    }
    setError(null);

    try {
      const currentOffset = isLoadMore ? offsetRef.current : 0;
      const response = await fetch(
        `/api/dashboard/feed?tab=${activeTab}&limit=${PAGE_SIZE}&offset=${currentOffset}`
      );
      const data = await response.json();

      if (data.code === 0) {
        const newItems = data.data.items || [];
        if (isLoadMore) {
          setFeedItems((prev) => [...prev, ...newItems]);
        } else {
          setFeedItems(newItems);
        }
        // 使用 API 返回的 hasMore，而不是自己计算
        setHasMore(data.data.hasMore ?? newItems.length >= PAGE_SIZE);
        offsetRef.current = currentOffset + newItems.length; // 更新 ref
      } else {
        setError(data.message || errorMessage);
      }
    } catch (err) {
      console.error('Failed to fetch feed:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [activeTab, errorMessage]); // 移除 offset 依赖

  // 初始加载和 tab 切换时重新加载
  useEffect(() => {
    fetchFeed(false);
  }, [activeTab, refreshKey]);

  // 滚动加载 - IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && hasMore && !loading && !loadingMore) {
          fetchFeed(true);
        }
      },
      { threshold: 0.1, rootMargin: '100px' } // 提前 100px 触发
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasMore, loading, loadingMore, fetchFeed]);

  // 打开详情弹窗（同时更新 URL 为 /creations/[id]）
  const handleItemClick = useCallback((item: FeedItem) => {
    setSelectedItem(item);
    setIsModalOpen(true);
    // 更新 URL 为 /creations/[id] 格式，支持分享链接
    window.history.pushState({}, '', `/creations/${item.id}`);
  }, []);

  // 关闭详情弹窗（返回 /creations）
  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedItem(null);
    // 返回列表页
    window.history.pushState({}, '', '/creations');
  }, []);

  // 监听 initialItemId 或 URL 参数，自动打开弹窗
  useEffect(() => {
    // 优先使用路由参数 initialItemId（/creations/[id]）
    // 其次使用 query 参数（/creations?id=xxx，兼容旧链接）
    const itemId = initialItemId || searchParams.get('id');
    if (itemId && feedItems.length > 0 && !isModalOpen) {
      const item = feedItems.find((i) => i.id === itemId);
      if (item) {
        setSelectedItem(item);
        setIsModalOpen(true);
      }
    }
  }, [initialItemId, searchParams, feedItems, isModalOpen]);

  // 监听浏览器后退，关闭弹窗
  useEffect(() => {
    const handlePopState = () => {
      const url = new URL(window.location.href);
      const itemId = url.searchParams.get('id');
      if (!itemId && isModalOpen) {
        setIsModalOpen(false);
        setSelectedItem(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isModalOpen]);

  // 处理 Remix
  const handleRemix = useCallback(
    (item: FeedItem) => {
      // 未登录用户跳转登录页面
      if (!user) {
        router.push('/sign-in');
        return;
      }

      // 识别 create-pet-movie 生成的视频（通过 scene 字段判断）
      // scene === 'pet-video-generation' 或 'rainbow-bridge' 表示是故事版生成的宠物视频
      const isStoryboardVideo = item.scene === 'pet-video-generation' || item.scene === 'rainbow-bridge';

      if (isStoryboardVideo) {
        setIsModalOpen(false);
        setSelectedItem(null);
        toast.success(t('remix.storyboardRedirect'));
        router.push(`/create-pet-movie?remix=${item.id}`);
        return;
      }

      // 普通视频/图片：复制 prompt 到生成栏
      setRemixPrompt(item.prompt || '');
      setRemixMode(item.type);
      if (item.src && item.type === 'image') {
        setRemixImages([item.src]);
      }
      // 关闭弹窗（如果是从弹窗触发的）
      setIsModalOpen(false);
      setSelectedItem(null);
      toast.success(t('remix.success'));
    },
    [t, router, user]
  );

  // 处理点赞
  const handleLike = useCallback((id: string) => {
    setFeedItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            isLiked: !item.isLiked,
            likes: item.isLiked ? item.likes - 1 : item.likes + 1,
          };
        }
        return item;
      })
    );
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <main className="relative flex-1">
        <div className="flex min-h-screen flex-col">
          <LoggedInHeader
            username={user?.name}
            showTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            isLoggedIn={!!user}
          />

          {/* Feed 内容 */}
          <div className="px-2 pb-32">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                <span className="ml-3 text-gray-600 dark:text-gray-400">
                  {loadingMessage}
                </span>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <p className="text-red-500 mb-4">{error}</p>
                  <button
                    onClick={() => fetchFeed(false)}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    {t('retry')}
                  </button>
                </div>
              </div>
            ) : feedItems.length === 0 ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    {emptyMessage}
                  </p>
                  {activeTab === 'mine' && (
                    <button
                      onClick={() => {
                        window.scrollTo({
                          top: document.body.scrollHeight,
                          behavior: 'smooth',
                        });
                      }}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      {t('startCreate')}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                <MasonryGrid
                  items={feedItems}
                  onLike={handleLike}
                  onRemix={handleRemix}
                  onItemClick={handleItemClick}
                />

                {/* 滚动加载触发器 */}
                <div
                  ref={loadMoreRef}
                  className="flex items-center justify-center py-8"
                >
                  {loadingMore && (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                      <span className="text-sm text-gray-500">{loadingMessage}</span>
                    </div>
                  )}
                  {!hasMore && feedItems.length > 0 && (
                    <span className="text-sm text-gray-400">
                      {t('feed.noMore')}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {/* 浮动提示栏 - 仅登录用户显示 */}
      {user && (
        <FloatingPromptBar
          defaultPrompt={remixPrompt}
          defaultMode={remixMode}
          defaultImages={remixImages}
          defaultModelId={initialModel}
          onGenerate={async (params) => {
            // 解析宽高比
            let aspectRatio = 16 / 9;
            if (params.aspectRatio) {
              const parts = params.aspectRatio.split(':');
              if (parts.length === 2) {
                aspectRatio = parseInt(parts[0]) / parseInt(parts[1]);
              }
            }

            // 创建临时生成中卡片
            const tempId = `temp-${Date.now()}`;
            const generatingCard: FeedItem = {
              id: tempId,
              type: params.mode,
              src: '',
              alt: params.prompt.slice(0, 100),
              username: user?.name || 'Me',
              userId: user?.id || '',
              likes: 0,
              prompt: params.prompt,
              aspectRatio,
              isGenerating: true,
              model: params.model.actualModel,
            };

            // 添加到列表最前面
            setFeedItems((prev) => [generatingCard, ...prev]);

            try {
              // 1. 调用生成 API
              const response = await fetch('/api/ai/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  provider: 'evolink',
                  mediaType: params.mode,
                  model: params.model.actualModel,
                  prompt: params.prompt,
                  options: JSON.stringify({
                    aspectRatio: params.aspectRatio,
                    duration: params.duration?.seconds,
                    quality: params.quality?.id, // 图片质量 1K/2K/4K (仅部分模型支持)
                    guidanceScale: params.guidanceScale?.value, // 引导强度 (仅 doubao-seedream 支持)
                  }),
                  scene:
                    params.mode === 'image' ? 'text-to-image' : 'text-to-video',
                  image_urls: params.images,
                  isPublic: params.isPublic, // 是否公开
                  promptHidden: params.hidePrompt, // 是否隐藏提示词
                }),
              });
              const result = await response.json();

              if (result.code !== 0 || !result.data?.taskId) {
                throw new Error(result.message || 'Generation failed');
              }

              // 积分已扣除，立即刷新积分显示
              fetchUserCredits();

              const { taskId, id: taskRecordId } = result.data;

              // 更新卡片的 taskId
              setFeedItems((prev) =>
                prev.map((item) =>
                  item.id === tempId ? { ...item, taskId } : item
                )
              );

              // 2. 轮询任务状态
              const pollInterval = 3000; // 3秒轮询一次
              const maxAttempts = 120; // 最多轮询 6 分钟
              let attempts = 0;

              const poll = async (): Promise<void> => {
                attempts++;
                if (attempts > maxAttempts) {
                  throw new Error('Generation timeout');
                }

                const queryResponse = await fetch('/api/ai/query', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ taskId }),
                });
                const queryResult = await queryResponse.json();

                if (queryResult.code !== 0) {
                  throw new Error(queryResult.message || 'Query failed');
                }

                const status = queryResult.data?.status;

                // 提取进度信息 (从 taskResult 中解析)
                let progress = 0;
                try {
                  const taskResult = queryResult.data?.taskResult;
                  if (taskResult) {
                    const parsed = typeof taskResult === 'string' ? JSON.parse(taskResult) : taskResult;
                    progress = parsed?.progress ?? 0;
                  }
                } catch {
                  // 解析失败时使用默认进度
                }

                // 更新卡片进度
                if (progress > 0) {
                  setFeedItems((prev) =>
                    prev.map((item) =>
                      item.id === tempId ? { ...item, progress } : item
                    )
                  );
                }

                if (status === 'success' || status === 'completed') {
                  // 生成成功，移除临时卡片
                  setFeedItems((prev) => prev.filter((item) => item.id !== tempId));
                  // 等待一小段时间确保数据库同步
                  await new Promise((resolve) => setTimeout(resolve, 500));
                  // 刷新积分显示
                  fetchUserCredits();
                  // 切换到 "我的" tab 并强制刷新
                  setActiveTab('mine');
                  setRefreshKey((prev) => prev + 1);
                  toast.success(t('generateSuccess'));
                  return;
                } else if (status === 'failed') {
                  throw new Error('Generation failed');
                } else {
                  // 仍在处理中，继续轮询
                  await new Promise((resolve) => setTimeout(resolve, pollInterval));
                  return poll();
                }
              };

              await poll();
            } catch (error: any) {
              // 移除临时卡片
              setFeedItems((prev) => prev.filter((item) => item.id !== tempId));
              toast.error(error.message || t('generateError'));
            }
          }}
        />
      )}

      {/* 详情弹窗 */}
      <FeedDetailModal
        item={selectedItem}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onRemix={handleRemix}
        onLike={handleLike}
      />
    </div>
  );
}
