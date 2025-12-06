/**
 * 纪念详情组件
 * Memorial Detail Component
 *
 * 展示纪念完整信息、视频、图片、蜡烛列表
 */

'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  Flame,
  Calendar,
  MapPin,
  Share2,
  Play,
  ChevronLeft,
  ChevronRight,
  Video,
  Loader2,
} from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
import { useMemorialDetail, useGenerateVideo } from '@/shared/services/pet-memorial/hooks';
import { cn } from '@/shared/lib/utils';
import { PetVideoList } from './pet-video-list';
import { ShareModal, type ShareData } from '@/shared/components/ui/share-modal';
import { CandleLightModal } from './candle-light-modal';

interface MemorialDetailProps {
  id: string;
}

/**
 * 格式化日期
 */
function formatDate(date: string | null): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * 计算年龄
 */
function calculateAge(birthday: string | null, dateOfPassing: string | null): string {
  if (!birthday) return '';

  const start = new Date(birthday);
  const end = dateOfPassing ? new Date(dateOfPassing) : new Date();
  const years = end.getFullYear() - start.getFullYear();

  if (years < 1) {
    const months = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth();
    return `${months} months`;
  }

  return `${years} years`;
}

export function MemorialDetail({ id }: MemorialDetailProps) {
  const t = useTranslations('pet-memorial.detail');
  const tVideos = useTranslations('pet-memorial.videos');
  const router = useRouter();

  // 数据获取
  const { data: memorial, isLoading, error, refresh } = useMemorialDetail(id);

  // 图片轮播状态
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // 点蜡烛弹窗状态
  const [candleModalOpen, setCandleModalOpen] = useState(false);
  // 本地蜡烛数量（用于乐观更新）
  const [localCandleCount, setLocalCandleCount] = useState<number | null>(null);

  // 生成视频
  const { isLoading: isGeneratingVideo, generate: generateVideo } = useGenerateVideo();
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);

  // 分享弹窗
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // 加载状态
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // 错误状态
  if (error || !memorial) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-4">{t('error')}</p>
        <Button variant="outline" onClick={refresh}>
          {t('retry')}
        </Button>
      </div>
    );
  }

  const {
    petName,
    species,
    birthday,
    dateOfPassing,
    message,
    story,
    ownerFirstName,
    ownerLastName,
    city,
    state,
    images,
    candleCount,
    hasVideo,
    videoUrl,
    videoThumbnail,
    isOwner,
    candles,
    totalCandles,
  } = memorial;

  // 图片导航
  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  // 点蜡烛成功处理
  const handleCandleLit = () => {
    // 乐观更新本地蜡烛数量
    setLocalCandleCount((prev) => (prev ?? candleCount) + 1);
    toast.success(t('candleLit'));
    // 刷新数据
    refresh();
  };

  // 生成视频处理 - 跳转到 create-pet-movie 页面并带上首张图片
  const handleGenerateVideo = () => {
    const firstImage = images?.[0];
    if (firstImage) {
      // 跳转到视频生成页，带上首张图片作为初始图片
      const encodedImage = encodeURIComponent(firstImage);
      router.push(`/create-pet-movie?image=${encodedImage}`);
      setVideoDialogOpen(false);
    } else {
      // 没有图片时直接跳转
      router.push('/create-pet-movie');
      setVideoDialogOpen(false);
    }
  };

  // 分享处理 - 打开分享弹窗
  const handleShare = () => {
    setShareModalOpen(true);
  };

  // 分享数据 - 使用纪念场景
  const getShareData = (): ShareData => ({
    url: typeof window !== 'undefined' ? window.location.href : '',
    title: t('shareTitle', { name: petName }),
    description: message || '',
    scene: 'memorial',
    hashtags: ['RainbowBridge', 'PetMemorial', 'ForeverLoved'],
  });

  // 所有者名称
  const ownerName =
    ownerFirstName && ownerLastName
      ? `${ownerFirstName} ${ownerLastName}`
      : ownerFirstName || ownerLastName || null;

  // 地点
  const location = city && state ? `${city}, ${state}` : city || state || '';

  // 年龄
  const age = calculateAge(birthday, dateOfPassing);

  return (
    <div className="space-y-8">
      {/* 返回链接 */}
      <Link
        href="/pet-memorial"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="w-4 h-4 mr-1" />
        {t('backToList')}
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 左侧：图片和视频 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 图片轮播 */}
          <Card className="overflow-hidden p-0">
            <div className="relative aspect-video">
              {images.length > 0 ? (
                <>
                  <Image
                    src={images[currentImageIndex]}
                    alt={petName}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 66vw"
                    priority
                  />
                  {images.length > 1 && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                        onClick={prevImage}
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                        onClick={nextImage}
                      >
                        <ChevronRight className="w-5 h-5" />
                      </Button>
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                        {images.map((_, index) => (
                          <button
                            key={index}
                            className={cn(
                              'w-2 h-2 rounded-full transition-colors',
                              index === currentImageIndex
                                ? 'bg-white'
                                : 'bg-white/50'
                            )}
                            onClick={() => setCurrentImageIndex(index)}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <p className="text-muted-foreground">{t('noImage')}</p>
                </div>
              )}
            </div>
          </Card>

          {/* 视频区域 */}
          {videoUrl && (
            <Card className="p-0 overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="w-5 h-5" />
                  {t('memorialVideo')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <video
                  src={videoUrl}
                  poster={videoThumbnail || undefined}
                  controls
                  className="w-full aspect-video"
                />
              </CardContent>
            </Card>
          )}

          {/* 故事 */}
          {story && (
            <Card>
              <CardHeader>
                <CardTitle>{t('story')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-muted-foreground">
                  {story}
                </p>
              </CardContent>
            </Card>
          )}

          {/* 我的宠物视频 - 仅对纪念所有者显示 */}
          {isOwner && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="w-5 h-5" />
                  {tVideos('title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PetVideoList />
              </CardContent>
            </Card>
          )}
        </div>

        {/* 右侧：信息和操作 */}
        <div className="space-y-6">
          {/* 基本信息卡片 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">{petName}</CardTitle>
              {species && (
                <p className="text-sm text-muted-foreground capitalize">
                  {t(`species.${species}`)}
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 日期和年龄 */}
              {(birthday || dateOfPassing) && (
                <div className="flex items-start gap-2">
                  <Calendar className="w-4 h-4 mt-0.5 text-muted-foreground" />
                  <div>
                    {birthday && (
                      <p className="text-sm">
                        {t('born')}: {formatDate(birthday)}
                      </p>
                    )}
                    {dateOfPassing && (
                      <p className="text-sm">
                        {t('passed')}: {formatDate(dateOfPassing)}
                      </p>
                    )}
                    {age && (
                      <p className="text-sm text-muted-foreground">{age}</p>
                    )}
                  </div>
                </div>
              )}

              {/* 地点 */}
              {location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span>{location}</span>
                </div>
              )}

              {/* 留言 */}
              {message && (
                <p className="text-sm italic text-muted-foreground border-l-2 pl-3">
                  "{message}"
                </p>
              )}

              {/* 提交者 */}
              {ownerName && (
                <p className="text-xs text-muted-foreground">
                  {t('submittedBy', { name: ownerName })}
                </p>
              )}
            </CardContent>
          </Card>

          {/* 操作按钮 */}
          <div className="flex flex-col gap-3">
            {/* 点蜡烛按钮 */}
            <Button size="lg" className="w-full" onClick={() => setCandleModalOpen(true)}>
              <Flame className="w-5 h-5 mr-2 text-orange-400" />
              {t('lightCandle')} ({localCandleCount ?? candleCount})
            </Button>

            {/* 点蜡烛弹窗 */}
            <CandleLightModal
              open={candleModalOpen}
              onOpenChange={setCandleModalOpen}
              memorialId={id}
              petName={petName}
              petImage={images[0] || '/images/pet-placeholder.png'}
              message={message}
              hasVideo={hasVideo}
              showViewDetail={false}
              onSuccess={handleCandleLit}
            />

            {/* 生成视频（仅所有者可见） */}
            {isOwner && !hasVideo && (
              <Dialog open={videoDialogOpen} onOpenChange={setVideoDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="lg" className="w-full">
                    <Play className="w-5 h-5 mr-2" />
                    {t('createVideo')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('createVideoTitle')}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {t('createVideoDescription')}
                    </p>
                    <Button
                      onClick={handleGenerateVideo}
                      disabled={isGeneratingVideo}
                      className="w-full"
                    >
                      {isGeneratingVideo ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Video className="w-4 h-4 mr-2" />
                      )}
                      {t('startGenerating')}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {/* 分享 */}
            <Button variant="outline" size="lg" className="w-full" onClick={handleShare}>
              <Share2 className="w-5 h-5 mr-2" />
              {t('share')}
            </Button>

            {/* 分享弹窗 */}
            <ShareModal
              open={shareModalOpen}
              onOpenChange={setShareModalOpen}
              shareData={getShareData()}
            />
          </div>

          {/* 蜡烛列表 */}
          {candles.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-400" />
                  {t('recentCandles')} ({totalCandles})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {candles.map((candle) => (
                  <div
                    key={candle.id}
                    className="border-b last:border-0 pb-3 last:pb-0"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{candle.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(candle.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    {candle.message && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {candle.message}
                      </p>
                    )}
                  </div>
                ))}

                {totalCandles > candles.length && (
                  <Button variant="ghost" size="sm" className="w-full">
                    {t('viewAllCandles')}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
