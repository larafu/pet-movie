/**
 * 点亮蜡烛弹窗组件
 * Candle Light Modal Component
 *
 * 展示宠物信息并支持点亮蜡烛功能
 * 点亮成功后展示视频引导
 * 使用深蓝色星空背景，与纪念墙主题一致
 */

'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Flame, Loader2, Star, Play, Sparkles, Check } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Textarea } from '@/shared/components/ui/textarea';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { useLightCandle } from '@/shared/services/pet-memorial/hooks';
import type { LightCandleRequest } from '@/shared/services/pet-memorial/types';

// 默认模版视频 URL
const DEFAULT_TEMPLATE_VIDEO = 'https://media.petmovie.ai/pet-videos/watermarked/gXWSM9BOMzSUPGQM9Lhsp.mp4';

interface CandleLightModalProps {
  /** 弹窗开关状态 */
  open: boolean;
  /** 弹窗开关回调 */
  onOpenChange: (open: boolean) => void;
  /** 纪念ID */
  memorialId: string;
  /** 宠物名称 */
  petName: string;
  /** 宠物图片 */
  petImage: string;
  /** 留言（可选） */
  message?: string | null;
  /** 是否有关联视频 */
  hasVideo?: boolean;
  /** 是否显示"查看详情"按钮（从列表卡片打开时为true） */
  showViewDetail?: boolean;
  /** 点亮成功回调 */
  onSuccess?: () => void;
}

export function CandleLightModal({
  open,
  onOpenChange,
  memorialId,
  petName,
  petImage,
  message,
  hasVideo,
  showViewDetail = false,
  onSuccess,
}: CandleLightModalProps) {
  const t = useTranslations('pet-memorial.detail');
  const tCandle = useTranslations('pet-memorial.candle');
  const router = useRouter();

  // 点蜡烛表单状态
  const [candleForm, setCandleForm] = useState<LightCandleRequest>({
    name: '',
    message: '',
  });

  // 成功状态
  const [isSuccess, setIsSuccess] = useState(false);

  // 点蜡烛 hook
  const { isLoading, light: lightCandle } = useLightCandle();

  // 使用默认模版视频
  const videoUrl = DEFAULT_TEMPLATE_VIDEO;

  // 弹窗关闭时重置状态
  useEffect(() => {
    if (!open) {
      // 延迟重置，避免关闭动画中看到内容变化
      const timer = setTimeout(() => {
        setIsSuccess(false);
        setCandleForm({ name: '', message: '' });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // 处理点亮蜡烛
  const handleLightCandle = async () => {
    const result = await lightCandle(memorialId, candleForm);
    if (result.success) {
      onSuccess?.();
      setIsSuccess(true);
    }
  };

  // 跳转到创建视频页面
  const handleCreateVideo = () => {
    onOpenChange(false);
    router.push('/create-pet-movie');
  };

  // 跳转到纪念详情页
  const handleViewDetail = () => {
    onOpenChange(false);
    router.push(`/pet-memorial/${memorialId}`);
  };

  // 关闭弹窗
  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden bg-[#0f172a] border-slate-700">
        {isSuccess ? (
          // ============ 成功状态：视频引导 ============
          <>
            {/* 视频预览区域 */}
            <div className="relative">
              <div className="relative aspect-video w-full bg-black">
                <video
                  src={videoUrl}
                  className="w-full h-full object-cover"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
                {/* 渐变遮罩 */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-transparent" />

                {/* 播放按钮覆盖层 */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Play className="w-8 h-8 text-white ml-1" />
                  </div>
                </div>
              </div>

              {/* 成功标题 */}
              <DialogHeader className="absolute bottom-0 left-0 right-0 p-6 pb-4">
                <DialogTitle className="flex items-center gap-2 text-white text-xl">
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <span>{tCandle('successTitle')}</span>
                </DialogTitle>
              </DialogHeader>
            </div>

            {/* 引导内容 */}
            <div className="p-6 pt-2 space-y-5">
              {/* 引导文案 */}
              <div className="text-center space-y-2">
                <p className="text-slate-300 text-sm">
                  {tCandle('successMessage')}
                </p>
                <p className="text-slate-400 text-xs">
                  {hasVideo ? tCandle('viewMemorialVideo') : tCandle('createYourOwn')}
                </p>
              </div>

              {/* 操作按钮 */}
              <div className="flex flex-col gap-3">
                {/* 查看详情按钮 - 仅从列表卡片打开时显示 */}
                {showViewDetail && (
                  <Button
                    onClick={handleViewDetail}
                    className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-medium py-5"
                  >
                    <Flame className="w-5 h-5 mr-2" />
                    {tCandle('viewDetailButton')}
                  </Button>
                )}
                <Button
                  onClick={handleCreateVideo}
                  variant={showViewDetail ? 'outline' : 'default'}
                  className={showViewDetail
                    ? "w-full border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                    : "w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium py-5"
                  }
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  {tCandle('createVideoButton')}
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleClose}
                  className="w-full text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  {tCandle('maybeLater')}
                </Button>
              </div>
            </div>
          </>
        ) : (
          // ============ 默认状态：点亮表单 ============
          <>
            {/* 头部：宠物图片和信息 */}
            <div className="relative">
              {/* 宠物图片 */}
              <div className="relative aspect-[16/9] w-full">
                <Image
                  src={petImage}
                  alt={petName}
                  fill
                  className="object-cover"
                  sizes="(max-width: 512px) 100vw, 512px"
                />
                {/* 渐变遮罩 */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/50 to-transparent" />
              </div>

              {/* 标题和星星装饰 */}
              <DialogHeader className="absolute bottom-0 left-0 right-0 p-6 pb-4">
                <DialogTitle className="flex items-center gap-2 text-white text-xl">
                  <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  <span>{t('lightCandleTitle')}</span>
                </DialogTitle>
                <p className="text-lg text-white/90 font-medium mt-1">
                  {petName}
                </p>
              </DialogHeader>
            </div>

            {/* 内容区域 */}
            <div className="p-6 pt-2 space-y-5">
              {/* 宠物留言预览 */}
              {message && (
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                  <p className="text-slate-300 text-sm italic">"{message}"</p>
                </div>
              )}

              {/* 表单 */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="candle-name" className="text-slate-300">
                    {t('yourName')}
                  </Label>
                  <Input
                    id="candle-name"
                    value={candleForm.name || ''}
                    onChange={(e) =>
                      setCandleForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder={t('namePlaceholder')}
                    className="mt-1.5 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-orange-500/50 focus:ring-orange-500/20"
                  />
                </div>
                <div>
                  <Label htmlFor="candle-message" className="text-slate-300">
                    {t('yourMessage')}
                  </Label>
                  <Textarea
                    id="candle-message"
                    value={candleForm.message || ''}
                    onChange={(e) =>
                      setCandleForm((prev) => ({ ...prev, message: e.target.value }))
                    }
                    placeholder={t('messagePlaceholder')}
                    rows={3}
                    className="mt-1.5 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-orange-500/50 focus:ring-orange-500/20 resize-none"
                  />
                </div>
              </div>

              {/* 提交按钮 */}
              <Button
                onClick={handleLightCandle}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-medium py-5"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Flame className="w-5 h-5 mr-2" />
                )}
                {t('lightCandleButton')}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
