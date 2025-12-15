/**
 * MasonryGrid - 瀑布流布局组件
 * 使用 JS 分配列 + CSS flex 实现横向排序的瀑布流
 * 排序规则：从左到右横向排列（1,2,3,4 -> 5,6,7,8 -> ...）
 */

'use client';

import { useMemo, useState, useEffect } from 'react';
import { FeedCard, type FeedItem } from '../feed-card';

interface MasonryGridProps {
  items: FeedItem[];
  onLike?: (id: string) => void;
  onRemix?: (item: FeedItem) => void;
  onItemClick?: (item: FeedItem) => void;
}

/**
 * 根据屏幕宽度获取列数
 */
function useColumnCount() {
  const [columnCount, setColumnCount] = useState(4);

  useEffect(() => {
    const updateColumnCount = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setColumnCount(1);
      } else if (width < 1024) {
        setColumnCount(2);
      } else if (width < 1280) {
        setColumnCount(3);
      } else {
        setColumnCount(4);
      }
    };

    updateColumnCount();
    window.addEventListener('resize', updateColumnCount);
    return () => window.removeEventListener('resize', updateColumnCount);
  }, []);

  return columnCount;
}

/**
 * 将 items 分配到各列（最短列优先算法）
 * 每次将新 item 放入当前高度最小的列，实现真正的瀑布流效果
 */
function distributeItemsToColumns(items: FeedItem[], columnCount: number): FeedItem[][] {
  const columns: FeedItem[][] = Array.from({ length: columnCount }, () => []);
  // 追踪每列的累计高度（使用 aspectRatio 的倒数作为高度估算）
  const columnHeights: number[] = Array(columnCount).fill(0);

  items.forEach((item) => {
    // 找到当前最短的列
    let shortestColumnIndex = 0;
    let minHeight = columnHeights[0];
    for (let i = 1; i < columnCount; i++) {
      if (columnHeights[i] < minHeight) {
        minHeight = columnHeights[i];
        shortestColumnIndex = i;
      }
    }

    // 将 item 放入最短列
    columns[shortestColumnIndex].push(item);

    // 更新该列高度（使用 1/aspectRatio 作为相对高度）
    const itemHeight = 1 / (item.aspectRatio || 1);
    columnHeights[shortestColumnIndex] += itemHeight;
  });

  return columns;
}

export function MasonryGrid({ items, onLike, onRemix, onItemClick }: MasonryGridProps) {
  const columnCount = useColumnCount();

  // 将 items 分配到各列（横向顺序）
  const columns = useMemo(
    () => distributeItemsToColumns(items, columnCount),
    [items, columnCount]
  );

  return (
    <div className="w-full mt-2 px-1">
      <div className="flex gap-1">
        {columns.map((columnItems, columnIndex) => (
          <div key={columnIndex} className="flex-1 flex flex-col gap-1">
            {columnItems.map((item) => (
              <div
                key={item.id}
                className="transition-transform duration-200 hover:-translate-y-0.5"
              >
                <FeedCard
                  item={item}
                  onLike={onLike}
                  onRemix={onRemix}
                  onClick={onItemClick}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
