/**
 * 纪念详情页 V2 - 基于 v0 设计
 * Memorial Detail Component V2 - Based on v0 Design
 *
 * 采用单列纵向布局，包含以下区块：
 * 1. Hero Section - 宠物基本信息（In Loving Memory）
 * 2. Video Gallery Section - 纪念视频展示（The Film / World Premiere）
 * 3. Story Section - 纪念故事（Remembering {name}）
 * 4. Photo Gallery Section - 照片网格（6张照片）
 * 5. Tribute Section - 蜡烛和留言墙（Light a Candle & Messages of Love）
 * 6. CTA Section - 创建纪念电影推广
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
  Heart,
  Share2,
  Download,
  Loader2,
  Sparkles,
  Star,
} from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Textarea } from '@/shared/components/ui/textarea';
import { Input } from '@/shared/components/ui/input';
import { useMemorialDetail } from '@/shared/services/pet-memorial/hooks';
import { cn } from '@/shared/lib/utils';
import { ShareModal, type ShareData } from '@/shared/components/ui/share-modal';
import { VideoPlayerModal } from '@/shared/components/ui/video-player-modal';

interface MemorialDetailV2Props {
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

export function MemorialDetailV2({ id }: MemorialDetailV2Props) {
  const t = useTranslations('pet-memorial.detail');
  const router = useRouter();

  // 数据获取
  const { data: memorial, isLoading, error, refresh } = useMemorialDetail(id);

  // 点蜡烛表单状态
  const [candleName, setCandleName] = useState('');
  const [candleMessage, setCandleMessage] = useState('');
  const [isLightingCandle, setIsLightingCandle] = useState(false);

  // 本地蜡烛数量（用于乐观更新）
  const [localCandleCount, setLocalCandleCount] = useState<number | null>(null);

  // 分享弹窗
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // 视频播放弹窗
  const [videoModalOpen, setVideoModalOpen] = useState(false);

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
    images,
    candleCount,
    videoUrl,
    videoThumbnail,
    candles,
  } = memorial;

  // 解析图片数组
  const imageList = typeof images === 'string' ? JSON.parse(images || '[]') : images || [];
  const coverImage = imageList[0] || '/images/pet-placeholder.png';

  // 所有者名称
  const ownerName =
    ownerFirstName && ownerLastName
      ? `${ownerFirstName} ${ownerLastName}`
      : ownerFirstName || ownerLastName || 'A loving friend';

  // 日期格式化
  const birthDate = formatDate(birthday);
  const passDate = formatDate(dateOfPassing);

  // 年龄
  const age = calculateAge(birthday, dateOfPassing);

  // 物种显示
  const speciesDisplay = species ? t(`species.${species}`) : '';

  // 点蜡烛处理
  const handleLightCandle = async () => {
    setIsLightingCandle(true);
    try {
      const response = await fetch(`/api/pet-memorial/${id}/candles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: candleName || 'Anonymous',
          message: candleMessage,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to light candle');
      }

      // 乐观更新
      setLocalCandleCount((prev) => (prev ?? candleCount) + 1);
      toast.success(t('candleLit'));

      // 清空表单
      setCandleName('');
      setCandleMessage('');

      // 刷新数据
      refresh();
    } catch (err) {
      toast.error(t('candleError'));
    } finally {
      setIsLightingCandle(false);
    }
  };

  // 分享处理
  const handleShare = () => {
    setShareModalOpen(true);
  };

  // 分享数据
  const getShareData = (): ShareData => ({
    url: typeof window !== 'undefined' ? window.location.href : '',
    title: t('shareTitle', { name: petName }),
    description: message || '',
    scene: 'memorial',
    hashtags: ['RainbowBridge', 'PetMemorial', 'ForeverLoved'],
  });

  // 播放视频
  const handlePlayVideo = () => {
    setVideoModalOpen(true);
  };

  // 跳转到创建页面
  const handleCreateMemorial = () => {
    router.push('/create-pet-movie');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section - In Loving Memory */}
      <section className="relative bg-gradient-to-b from-muted/50 to-background py-16 md:py-24">
        <div className="container max-w-4xl mx-auto px-4">
          <div className="text-center space-y-6">
            {/* 宠物头像 */}
            <div className="relative mx-auto w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-white dark:border-gray-800 shadow-2xl ring-4 ring-primary/10">
              <Image
                src={coverImage}
                alt={petName}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 128px, 160px"
                priority
              />
            </div>

            {/* 标题：In Loving Memory */}
            <div>
              <p className="text-sm uppercase tracking-wider text-muted-foreground mb-2">
                {t('inLovingMemory')}
              </p>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-foreground">
                {petName}
              </h1>
            </div>

            {/* 日期信息 */}
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <p className="text-sm md:text-base">
                {birthDate && passDate
                  ? `${birthDate} - ${passDate}`
                  : birthDate || passDate || ''}
              </p>
            </div>

            {/* 物种和年龄 */}
            {(speciesDisplay || age) && (
              <p className="text-sm text-muted-foreground">
                {[speciesDisplay, age].filter(Boolean).join(' • ')}
              </p>
            )}

            {/* 留言 */}
            {message && (
              <blockquote className="text-lg md:text-xl italic text-muted-foreground max-w-2xl mx-auto border-l-4 border-primary/50 pl-4">
                "{message}"
              </blockquote>
            )}

            {/* 提交者 */}
            <p className="text-sm text-muted-foreground">
              {t('submittedBy', { name: ownerName })}
            </p>

            {/* 操作按钮 */}
            <div className="flex flex-wrap justify-center gap-3 pt-4">
              <Button
                size="lg"
                onClick={() => {
                  document.getElementById('tribute-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="gap-2 shadow-lg hover:shadow-xl transition-shadow"
              >
                <Flame className="w-5 h-5 text-orange-400" />
                {t('lightCandle')}
              </Button>
              <Button size="lg" variant="outline" onClick={handleShare} className="gap-2">
                <Share2 className="w-5 h-5" />
                {t('share')}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Video Gallery Section - The Film */}
      {videoUrl && (
        <section className="py-16 md:py-20 bg-muted/30">
          <div className="container max-w-5xl mx-auto px-4">
            <div className="text-center mb-8">
              <p className="text-sm uppercase tracking-wider text-primary mb-2">
                {t('videoGallery.subtitle')}
              </p>
              <h2 className="text-3xl md:text-4xl font-serif font-bold">
                {t('videoGallery.title')}
              </h2>
            </div>

            {/* 视频播放器 */}
            <Card className="overflow-hidden">
              <div className="relative aspect-video bg-black group cursor-pointer" onClick={handlePlayVideo}>
                {videoThumbnail ? (
                  <Image
                    src={videoThumbnail}
                    alt={`${petName} Memorial Video`}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <video
                    src={videoUrl}
                    className="w-full h-full object-cover"
                    preload="metadata"
                  />
                )}
                {/* 播放按钮覆盖层 */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/60 transition-all duration-300">
                  <div className="w-20 h-20 rounded-full bg-white/90 group-hover:bg-white group-hover:scale-110 flex items-center justify-center transition-all duration-300 shadow-2xl">
                    <div className="w-0 h-0 border-t-[12px] border-t-transparent border-l-[20px] border-l-black border-b-[12px] border-b-transparent ml-1" />
                  </div>
                </div>
              </div>
            </Card>

            {/* 下载按钮 */}
            <div className="flex justify-center gap-3 mt-6">
              <Button variant="outline" asChild>
                <a href={videoUrl} download>
                  <Download className="w-4 h-4 mr-2" />
                  {t('videos.download')}
                </a>
              </Button>
              <Button variant="outline" onClick={handleShare}>
                <Share2 className="w-4 h-4 mr-2" />
                {t('share')}
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Story Section - Remembering */}
      {story && (
        <section className="py-16 md:py-20">
          <div className="container max-w-3xl mx-auto px-4">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-serif font-bold">
                {t('rememberingName', { name: petName })}
              </h2>
            </div>

            <div className="prose prose-lg max-w-none">
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {story}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Photo Gallery Section - Cherished Moments */}
      {imageList.length > 0 && (
        <section className="py-16 md:py-20 bg-muted/30">
          <div className="container max-w-6xl mx-auto px-4">
            <div className="text-center mb-8">
              <p className="text-sm uppercase tracking-wider text-muted-foreground mb-2">
                {t('photoGallery.subtitle')}
              </p>
              <h2 className="text-3xl md:text-4xl font-serif font-bold">
                {t('photoGallery.title')}
              </h2>
            </div>

            {/* 照片网格 - 6张照片 */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {imageList.slice(0, 6).map((img: string, index: number) => (
                <Card key={index} className="overflow-hidden group cursor-pointer hover:shadow-lg transition-shadow">
                  <div className="relative aspect-square">
                    <Image
                      src={img}
                      alt={`${petName} - Photo ${index + 1}`}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
                      sizes="(max-width: 768px) 50vw, 33vw"
                    />
                    {/* 暗色遮罩层 hover 效果 */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Tribute Section - Candles & Messages */}
      <section id="tribute-section" className="py-16 md:py-20">
        <div className="container max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">
              {t('payTribute')}
            </h2>
            <p className="text-lg text-muted-foreground flex items-center justify-center gap-2">
              <Flame className="w-5 h-5 text-orange-400" />
              {localCandleCount ?? candleCount} {t('candlesLit')}
            </p>
          </div>

          {/* Light a Candle 表单 */}
          <Card className="p-6 md:p-8 mb-12">
            <h3 className="text-xl font-semibold mb-4">{t('lightCandleFor', { name: petName })}</h3>
            <div className="space-y-4">
              <div>
                <Input
                  placeholder={t('yourName')}
                  value={candleName}
                  onChange={(e) => setCandleName(e.target.value)}
                />
              </div>
              <div>
                <Textarea
                  placeholder={t('yourMessage')}
                  value={candleMessage}
                  onChange={(e) => setCandleMessage(e.target.value)}
                  rows={4}
                />
              </div>
              <Button
                size="lg"
                className="w-full"
                onClick={handleLightCandle}
                disabled={isLightingCandle}
              >
                {isLightingCandle ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Flame className="w-5 h-5 mr-2 text-orange-400" />
                )}
                {t('lightCandleButton')}
              </Button>
            </div>
          </Card>

          {/* Messages of Love */}
          {candles.length > 0 && (
            <div>
              <h3 className="text-2xl font-serif font-bold mb-6">{t('messagesOfLove')}</h3>
              <div className="space-y-4">
                {candles.map((candle) => (
                  <Card key={candle.id} className="p-4 md:p-6">
                    <div className="flex items-start gap-3">
                      <Heart className="w-5 h-5 text-red-500 mt-1 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-semibold">{candle.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(candle.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        {candle.message && (
                          <p className="text-muted-foreground">{candle.message}</p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section - Create Your Pet's Movie */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-primary/5 to-background relative overflow-hidden">
        {/* 背景装饰 */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 left-10 w-40 h-40 bg-primary rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-60 h-60 bg-primary rounded-full blur-3xl" />
        </div>

        <div className="container max-w-4xl mx-auto px-4 relative z-10">
          <Card className="p-8 md:p-12 text-center shadow-xl border-2 border-primary/10 hover:border-primary/20 transition-all duration-300">
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="inline-block p-4 rounded-full bg-primary/10">
                <Sparkles className="w-12 h-12 mx-auto text-primary animate-pulse" />
              </div>
              <h2 className="text-3xl md:text-4xl font-serif font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                Create Your Pet's Memorial Movie
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Transform your cherished photos into a beautiful AI-generated memorial film.
                Honor their memory with a cinematic tribute that captures their spirit.
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Star className="w-4 h-4 fill-current text-yellow-500" />
                <span>Trusted by 50,000+ pet parents • 4.9★ rated</span>
              </div>
              <Button
                size="lg"
                onClick={handleCreateMemorial}
                className="text-lg px-8 shadow-lg hover:shadow-xl transition-shadow"
              >
                Create Memorial Movie
              </Button>
            </div>
          </Card>
        </div>
      </section>

      {/* 分享弹窗 */}
      <ShareModal
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
        shareData={getShareData()}
      />

      {/* 视频播放弹窗 */}
      {videoUrl && (
        <VideoPlayerModal
          open={videoModalOpen}
          onClose={() => setVideoModalOpen(false)}
          data={{
            id: id,
            videoUrl: videoUrl,
            title: `${petName} Memorial Video`,
          }}
        />
      )}
    </div>
  );
}
