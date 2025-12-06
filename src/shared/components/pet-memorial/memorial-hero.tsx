/**
 * 纪念墙 Hero 组件
 * Memorial Wall Hero Component
 *
 * 展示纪念墙顶部区域，包含标题、描述、CTA按钮和浮动的宠物头像气泡
 * 参考 lapoflove-source/ClientApp/components/Pages/PetMemorial/PetMemorialHead.tsx
 *
 * 特性：
 * - 彩虹桥背景：星空 + 彩虹桥图片
 * - 随机位置：每次渲染时位置有轻微随机偏移
 * - 自适应：根据屏幕大小调整气泡数量和大小
 * - 星星闪烁效果：气泡会淡入淡出，轮换展示不同宠物数据
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { PlusCircle, ChevronDown } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { getMemorialList } from '@/shared/services/pet-memorial/api';
import { cn } from '@/shared/lib/utils';
import { MemorialFormModal } from './memorial-form-modal';
import { CandleLightModal } from './candle-light-modal';

/**
 * 背景图片 URL
 * 图片已上传至 R2，向下扩展了 30px 以隐藏水印
 */
const BG_IMAGE_URL = 'https://media.petmovie.ai/imgs/pet-memorial/rainbow-bridge-bg.png';

/**
 * 气泡槽位数量
 */
const SLOT_COUNT = 8;

/**
 * 轮换间隔（毫秒）- 每隔多久换一个气泡
 */
const ROTATION_INTERVAL = 3000;

/**
 * 位置区域配置
 * 定义气泡可以出现的区域范围，避免遮挡中心内容
 */
const POSITION_ZONES = {
  // 左侧区域
  left: { xMin: 3, xMax: 20, yMin: 10, yMax: 80 },
  // 右侧区域
  right: { xMin: 80, xMax: 97, yMin: 10, yMax: 80 },
  // 左上角
  topLeft: { xMin: 20, xMax: 35, yMin: 5, yMax: 25 },
  // 右上角
  topRight: { xMin: 65, xMax: 80, yMin: 5, yMax: 25 },
  // 左下角
  bottomLeft: { xMin: 15, xMax: 35, yMin: 65, yMax: 85 },
  // 右下角
  bottomRight: { xMin: 65, xMax: 85, yMin: 65, yMax: 85 },
};

/**
 * 气泡大小范围
 */
const SIZE_RANGE = { min: 55, max: 85 };

interface BubbleData {
  id: string;
  petName: string;
  images: string[];
}

interface SlotState {
  dataIndex: number; // 当前显示的数据索引
  isVisible: boolean; // 是否可见（用于淡入淡出）
  position: {
    top: string;
    left?: string;
    right?: string;
    size: number;
  };
  floatDuration: number;
  floatDelay: number;
}

interface FloatingBubbleProps {
  data: BubbleData | null;
  slot: SlotState;
  onBubbleClick: (data: BubbleData) => void;
}

/**
 * 在指定区域内生成随机位置
 */
function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * 生成完全随机的位置（在指定区域内）
 */
function generateRandomPosition(zoneIndex: number): SlotState['position'] {
  const zones = Object.values(POSITION_ZONES);
  const zone = zones[zoneIndex % zones.length];

  const x = randomInRange(zone.xMin, zone.xMax);
  const y = randomInRange(zone.yMin, zone.yMax);
  const size = Math.round(randomInRange(SIZE_RANGE.min, SIZE_RANGE.max));

  // 随机决定使用 left 还是 right
  const useLeft = x < 50;

  return {
    top: `${y}%`,
    left: useLeft ? `${x}%` : undefined,
    right: !useLeft ? `${100 - x}%` : undefined,
    size,
  };
}

/**
 * 生成完全随机的新位置（避开中心区域）
 */
function generateNewRandomPosition(): SlotState['position'] {
  // 随机选择一个区域
  const zones = Object.values(POSITION_ZONES);
  const randomZone = zones[Math.floor(Math.random() * zones.length)];

  const x = randomInRange(randomZone.xMin, randomZone.xMax);
  const y = randomInRange(randomZone.yMin, randomZone.yMax);
  const size = Math.round(randomInRange(SIZE_RANGE.min, SIZE_RANGE.max));

  const useLeft = x < 50;

  return {
    top: `${y}%`,
    left: useLeft ? `${x}%` : undefined,
    right: !useLeft ? `${100 - x}%` : undefined,
    size,
  };
}

/**
 * 单个浮动气泡组件
 * 带有淡入淡出和浮动效果
 * 点击打开点亮蜡烛弹窗
 */
function FloatingBubble({ data, slot, onBubbleClick }: FloatingBubbleProps) {
  if (!data || !data.images[0]) return null;

  const coverImage = data.images[0];

  return (
    <button
      onClick={() => onBubbleClick(data)}
      className={cn(
        'absolute rounded-full overflow-hidden',
        'hover:scale-110',
        'cursor-pointer z-30',
        'transition-[opacity,transform,box-shadow]',
        'duration-1000 ease-in-out',
        'outline-none focus:outline-none'
      )}
      style={{
        top: slot.position.top,
        left: slot.position.left,
        right: slot.position.right,
        width: slot.position.size,
        height: slot.position.size,
        opacity: slot.isVisible ? 1 : 0,
        transform: slot.isVisible ? 'scale(1)' : 'scale(0.8)',
        animation: slot.isVisible
          ? `float ${slot.floatDuration}s ease-in-out ${slot.floatDelay}s infinite`
          : 'none',
        boxShadow: slot.isVisible
          ? '0 0 0 4px rgba(255, 255, 255, 0.6), 0 0 20px rgba(255, 255, 255, 0.4), 0 0 40px rgba(255, 255, 255, 0.2)'
          : 'none',
        border: 'none',
        padding: 0,
        background: 'transparent',
      }}
      title={data.petName}
    >
      <Image
        src={coverImage}
        alt={data.petName}
        fill
        className="object-cover"
        sizes={`${slot.position.size}px`}
      />
    </button>
  );
}

export function MemorialHero() {
  const t = useTranslations('pet-memorial');
  const [allData, setAllData] = useState<BubbleData[]>([]);
  const [slots, setSlots] = useState<SlotState[]>([]);
  const [visibleCount, setVisibleCount] = useState(8);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const rotationIndexRef = useRef(0); // 下一个要轮换的槽位

  // 点亮蜡烛弹窗状态
  const [candleModalOpen, setCandleModalOpen] = useState(false);
  const [selectedBubble, setSelectedBubble] = useState<BubbleData | null>(null);

  // 处理气泡点击 - 打开点亮蜡烛弹窗
  const handleBubbleClick = useCallback((data: BubbleData) => {
    setSelectedBubble(data);
    setCandleModalOpen(true);
  }, []);

  // 初始化槽位状态 - 每个槽位分配到不同区域
  const initializeSlots = useCallback(() => {
    return Array.from({ length: SLOT_COUNT }, (_, index) => ({
      dataIndex: index,
      isVisible: false,
      position: generateRandomPosition(index),
      floatDuration: 3 + Math.random() * 2,
      floatDelay: Math.random() * 2,
    }));
  }, []);

  // 自适应：根据屏幕宽度调整显示数量
  useEffect(() => {
    const updateVisibleCount = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setVisibleCount(4);
      } else if (width < 1024) {
        setVisibleCount(6);
      } else {
        setVisibleCount(8);
      }
    };

    updateVisibleCount();
    window.addEventListener('resize', updateVisibleCount);
    return () => window.removeEventListener('resize', updateVisibleCount);
  }, []);

  // 获取最新的纪念数据（获取 12 条用于轮换）
  useEffect(() => {
    const fetchRecentMemorials = async () => {
      try {
        const response = await getMemorialList({ limit: 12, sort: 'latest' });
        if (response.success && response.data.list.length > 0) {
          const data: BubbleData[] = response.data.list
            .filter((m) => m.images.length > 0 && m.images[0])
            .map((m) => ({
              id: m.id,
              petName: m.petName,
              images: m.images,
            }));
          setAllData(data);

          // 初始化槽位
          const initialSlots = initializeSlots();
          setSlots(initialSlots);

          // 延迟后依次显示气泡
          initialSlots.forEach((_, index) => {
            setTimeout(() => {
              setSlots(prev => prev.map((slot, i) =>
                i === index ? { ...slot, isVisible: true } : slot
              ));
            }, index * 300 + 500);
          });
        }
      } catch {
        console.error('Failed to fetch memorials for hero');
      }
    };

    fetchRecentMemorials();
  }, [initializeSlots]);

  // 轮换逻辑：每隔一段时间，淡出一个气泡，换成新数据后淡入
  useEffect(() => {
    if (allData.length <= SLOT_COUNT) return; // 数据不够轮换

    const rotationTimer = setInterval(() => {
      const slotIndex = rotationIndexRef.current % visibleCount;

      // 1. 先淡出当前气泡
      setSlots(prev => prev.map((slot, i) =>
        i === slotIndex ? { ...slot, isVisible: false } : slot
      ));

      // 2. 等淡出完成后，更换数据并在新的随机位置淡入
      setTimeout(() => {
        setSlots(prev => {
          // 找到下一个未显示的数据索引
          const currentIndices = prev.map(s => s.dataIndex);
          let nextDataIndex = prev[slotIndex].dataIndex;

          // 循环找到一个不在当前显示中的数据
          for (let i = 0; i < allData.length; i++) {
            nextDataIndex = (nextDataIndex + 1) % allData.length;
            if (!currentIndices.includes(nextDataIndex)) {
              break;
            }
          }

          return prev.map((slot, i) => {
            if (i === slotIndex) {
              return {
                ...slot,
                dataIndex: nextDataIndex,
                isVisible: true,
                // 生成完全随机的新位置
                position: generateNewRandomPosition(),
                floatDuration: 3 + Math.random() * 2,
                floatDelay: Math.random() * 0.5,
              };
            }
            return slot;
          });
        });
      }, 1000); // 等待淡出动画完成

      rotationIndexRef.current++;
    }, ROTATION_INTERVAL);

    return () => clearInterval(rotationTimer);
  }, [allData.length, visibleCount]);

  return (
    <div className="relative min-h-[500px] md:min-h-[600px] lg:min-h-[700px] xl:min-h-[800px] 2xl:min-h-[900px] flex items-center justify-center overflow-hidden">
      {/* 彩虹桥背景图片 - 使用 background-image 方式 */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${BG_IMAGE_URL})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 30%', // 稍微往上偏移，展示更多彩虹
          backgroundRepeat: 'no-repeat',
        }}
      />
      {/* 顶部渐变遮罩 - 与页面背景融合 */}
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-background to-transparent z-[1]" />
      {/* 底部渐变遮罩 - 与下方内容融合，遮盖水印 */}
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent z-[1]" />

      {/* 浮动的宠物头像气泡 - 星星闪烁轮换效果 */}
      {slots.length > 0 && allData.length > 0 && (
        <div className="absolute inset-0 pointer-events-none z-30">
          {slots.slice(0, visibleCount).map((slot, index) => (
            <div key={`slot-${index}`} className="pointer-events-auto">
              <FloatingBubble
                data={allData[slot.dataIndex] || null}
                slot={slot}
                onBubbleClick={handleBubbleClick}
              />
            </div>
          ))}
        </div>
      )}

      {/* 中心内容 */}
      <div className="relative z-20 text-center px-4 max-w-3xl mx-auto">
        {/* 标题 - 使用白色以在深色背景上更清晰 */}
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 text-white drop-shadow-lg">
          {t('hero.title')}
        </h1>

        {/* 副标题 */}
        <p className="text-lg md:text-xl text-white/90 mb-8 max-w-2xl mx-auto drop-shadow-md">
          {t('hero.description')}
        </p>

        {/* CTA 按钮 - 打开弹窗 */}
        <Button
          size="lg"
          className="text-lg px-8 py-6 bg-primary hover:bg-primary/90"
          onClick={() => setIsModalOpen(true)}
        >
          <PlusCircle className="w-5 h-5 mr-2" />
          {t('hero.createButton')}
        </Button>
      </div>

      {/* 创建纪念弹窗 */}
      <MemorialFormModal open={isModalOpen} onOpenChange={setIsModalOpen} />

      {/* 点亮蜡烛弹窗 */}
      {selectedBubble && (
        <CandleLightModal
          open={candleModalOpen}
          onOpenChange={setCandleModalOpen}
          memorialId={selectedBubble.id}
          petName={selectedBubble.petName}
          petImage={selectedBubble.images[0] || ''}
          showViewDetail={true}
        />
      )}

      {/* 向下滚动提示 */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center text-white/70 animate-bounce">
        <span className="text-sm mb-2">{t('hero.scrollHint')}</span>
        <ChevronDown className="w-5 h-5" />
      </div>

      {/* CSS 动画 */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) rotate(0deg) scale(1);
          }
          20% {
            transform: translateY(-12px) rotate(2deg) scale(1.02);
          }
          40% {
            transform: translateY(-6px) rotate(-1deg) scale(0.98);
          }
          60% {
            transform: translateY(-18px) rotate(1.5deg) scale(1.01);
          }
          80% {
            transform: translateY(-8px) rotate(-0.5deg) scale(0.99);
          }
        }

        @keyframes glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
          }
          50% {
            box-shadow: 0 0 30px rgba(255, 255, 255, 0.5);
          }
        }

        @keyframes pulse-soft {
          0%, 100% {
            opacity: 0.7;
          }
          50% {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
