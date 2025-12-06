/**
 * 纪念列表组件
 * Memorial List Component
 *
 * 展示纪念网格列表，支持搜索、排序和无限滚动加载
 * 搜索功能：支持宠物名和主人名的模糊检索
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Search, SlidersHorizontal, Loader2, PlusCircle } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { useMemorialList } from '@/shared/services/pet-memorial/hooks';
import type { MemorialSortType } from '@/shared/services/pet-memorial/types';
import { MemorialCard } from './memorial-card';
import { MemorialFormModal } from './memorial-form-modal';

interface MemorialListProps {
  initialSearch?: string;
  initialSort?: MemorialSortType;
}

/**
 * 自定义 debounce hook
 */
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function MemorialList({
  initialSearch = '',
  initialSort = 'latest',
}: MemorialListProps) {
  const t = useTranslations('pet-memorial.list');

  // 搜索状态 - 通用模糊搜索（同时搜索宠物名和主人名）
  const [search, setSearch] = useState(initialSearch);
  const debouncedSearch = useDebouncedValue(search, 500);
  const [sort, setSort] = useState<MemorialSortType>(initialSort);

  // 创建弹窗状态
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // 列表数据 - 使用通用搜索参数
  const {
    list,
    count,
    hasMore,
    isLoading,
    isLoadingMore,
    error,
    loadMore,
    refresh,
  } = useMemorialList({
    search: debouncedSearch || undefined,
    sort,
    limit: 12,
  });

  // 无限滚动监听
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !isLoading) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, isLoading, loadMore]);

  // 排序选项
  const sortOptions: { value: MemorialSortType; label: string }[] = [
    { value: 'latest', label: t('sort.latest') },
    { value: 'popular', label: t('sort.popular') },
  ];

  return (
    <div className="space-y-6">
      {/* 顶部操作栏 */}
      <div className="flex flex-col gap-4">
        {/* 搜索和操作栏 - 左右布局 */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          {/* 通用搜索框 - 支持宠物名和主人名模糊搜索 */}
          <div className="relative w-full sm:w-72">
            <Input
              placeholder={t('searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-12"
            />
            <Button
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
              variant="secondary"
              type="button"
            >
              <Search className="w-4 h-4" />
            </Button>
          </div>

          {/* 排序和创建按钮 */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* 排序选择器 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <SlidersHorizontal className="w-4 h-4 mr-2" />
                  {sortOptions.find((o) => o.value === sort)?.label}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {sortOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => setSort(option.value)}
                    className={sort === option.value ? 'bg-accent' : ''}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* 创建按钮 - 打开弹窗 */}
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <PlusCircle className="w-4 h-4 mr-2" />
              {t('createButton')}
            </Button>
          </div>
        </div>
      </div>

      {/* 创建纪念弹窗 */}
      <MemorialFormModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} />

      {/* 结果统计 */}
      {!isLoading && count > 0 && (
        <p className="text-sm text-muted-foreground">
          {t('resultCount', { count })}
        </p>
      )}

      {/* 加载状态 */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {/* 错误状态 */}
      {error && !isLoading && (
        <div className="text-center py-12">
          <p className="text-destructive mb-4">{t('error')}</p>
          <Button variant="outline" onClick={refresh}>
            {t('retry')}
          </Button>
        </div>
      )}

      {/* 空状态 */}
      {!isLoading && !error && list.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">{t('empty')}</p>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <PlusCircle className="w-4 h-4 mr-2" />
            {t('createFirst')}
          </Button>
        </div>
      )}

      {/* 纪念网格 */}
      {!isLoading && list.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {list.map((memorial) => (
            <MemorialCard key={memorial.id} memorial={memorial} />
          ))}
        </div>
      )}

      {/* 加载更多指示器 */}
      {hasMore && (
        <div
          ref={observerTarget}
          className="flex items-center justify-center py-8"
        >
          {isLoadingMore && (
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          )}
        </div>
      )}
    </div>
  );
}
