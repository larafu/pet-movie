/**
 * 纪念卡片组件
 * Memorial Card Component
 *
 * 用于列表展示的纪念卡片，显示宠物基本信息和蜡烛数量
 * 支持快捷点亮蜡烛功能
 */

'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Flame, Calendar, MapPin, Video } from 'lucide-react';
import { toast } from 'sonner';

import { Link } from '@/core/i18n/navigation';
import { Card, CardContent } from '@/shared/components/ui/card';
import { cn } from '@/shared/lib/utils';
import type { PetMemorialListItem } from '@/shared/services/pet-memorial/types';
import { CandleLightModal } from './candle-light-modal';

interface MemorialCardProps {
  memorial: PetMemorialListItem;
  className?: string;
}

/**
 * 格式化日期显示
 */
function formatDateRange(birthday: string | null, dateOfPassing: string | null): string {
  if (!birthday && !dateOfPassing) return '';

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (birthday && dateOfPassing) {
    return `${formatDate(birthday)} - ${formatDate(dateOfPassing)}`;
  }

  if (dateOfPassing) {
    return `✝ ${formatDate(dateOfPassing)}`;
  }

  return formatDate(birthday!);
}

/**
 * 获取地点显示
 */
function getLocation(city: string | null, state: string | null): string {
  if (city && state) return `${city}, ${state}`;
  return city || state || '';
}

export function MemorialCard({ memorial, className }: MemorialCardProps) {
  const t = useTranslations('pet-memorial.card');
  const tDetail = useTranslations('pet-memorial.detail');

  // 点亮蜡烛弹窗状态
  const [candleModalOpen, setCandleModalOpen] = useState(false);
  const [localCandleCount, setLocalCandleCount] = useState(memorial.candleCount);

  const {
    id,
    petName,
    species,
    birthday,
    dateOfPassing,
    message,
    ownerFirstName,
    ownerLastName,
    city,
    state,
    images,
    hasVideo,
  } = memorial;

  // 获取第一张图片作为封面
  const coverImage = images[0] || '/images/pet-placeholder.png';

  // 格式化日期
  const dateRange = formatDateRange(birthday, dateOfPassing);

  // 格式化地点
  const location = getLocation(city, state);

  // 所有者名称
  const ownerName =
    ownerFirstName && ownerLastName
      ? `${ownerFirstName} ${ownerLastName}`
      : ownerFirstName || ownerLastName || null;

  // 处理点亮蜡烛按钮点击（阻止事件冒泡，避免触发卡片链接）
  const handleCandleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCandleModalOpen(true);
  };

  // 点亮成功后更新本地蜡烛数量
  const handleCandleLit = () => {
    setLocalCandleCount((prev) => prev + 1);
    toast.success(tDetail('candleLit'));
  };

  return (
    <>
      <Link href={`/pet-memorial/${id}`}>
        <Card
          className={cn(
            'group overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer p-0 gap-0',
            className
          )}
        >
          {/* 图片区域 */}
          <div className="relative aspect-[4/3] overflow-hidden">
            <Image
              src={coverImage}
              alt={petName}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />

            {/* 视频标识 */}
            {hasVideo && (
              <div className="absolute top-3 right-3 bg-black/60 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
                <Video className="w-3 h-3" />
                <span>{t('hasVideo')}</span>
              </div>
            )}

            {/* 点亮蜡烛按钮 */}
            <button
              onClick={handleCandleClick}
              className="absolute bottom-3 right-3 bg-black/60 hover:bg-orange-500/80 text-white px-3 py-1.5 rounded-full text-sm flex items-center gap-1.5 transition-colors"
            >
              <Flame className="w-4 h-4 text-orange-400" />
              <span>{localCandleCount}</span>
            </button>
          </div>

          {/* 内容区域 */}
          <CardContent className="p-4 space-y-2">
            {/* 宠物名称和物种 */}
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg truncate">{petName}</h3>
              {species && (
                <span className="text-xs text-muted-foreground capitalize">
                  {t(`species.${species}`)}
                </span>
              )}
            </div>

            {/* 日期 */}
            {dateRange && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" />
                <span>{dateRange}</span>
              </div>
            )}

            {/* 地点 */}
            {location && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="w-3.5 h-3.5" />
                <span>{location}</span>
              </div>
            )}

            {/* 留言预览 */}
            {message && (
              <p className="text-sm text-muted-foreground line-clamp-2 italic">
                "{message}"
              </p>
            )}

            {/* 所有者 */}
            {ownerName && (
              <p className="text-xs text-muted-foreground">
                {t('submittedBy', { name: ownerName })}
              </p>
            )}
          </CardContent>
        </Card>
      </Link>

      {/* 点亮蜡烛弹窗 */}
      <CandleLightModal
        open={candleModalOpen}
        onOpenChange={setCandleModalOpen}
        memorialId={id}
        petName={petName}
        petImage={coverImage}
        message={message}
        hasVideo={hasVideo}
        showViewDetail={true}
        onSuccess={handleCandleLit}
      />
    </>
  );
}
