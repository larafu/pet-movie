/**
 * 宠物视频列表组件
 * Pet Video List Component
 *
 * 展示用户生成的所有宠物视频，支持分享功能
 */

'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  Video,
  Share2,
  Lock,
  Play,
  Loader2,
  MoreVertical,
  Download,
  Link2,
} from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Badge } from '@/shared/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/shared/components/ui/dropdown-menu';
import {
  useUserPetVideos,
  useToggleVideoShare,
  type PetVideoItem,
} from '@/shared/services/pet-memorial/hooks';
import { cn } from '@/shared/lib/utils';
import { ShareModal, type ShareData } from '@/shared/components/ui/share-modal';

interface PetVideoListProps {
  /** 是否只显示公开视频（用于分享页面） */
  publicOnly?: boolean;
  /** 指定用户ID（用于查看他人视频） */
  userId?: string;
}

/**
 * 视频卡片组件
 */
function VideoCard({
  video,
  onPlay,
  onToggleShare,
  onShare,
  onCopyLink,
  onDownload,
  isToggling,
}: {
  video: PetVideoItem;
  onPlay: (video: PetVideoItem) => void;
  onToggleShare: (video: PetVideoItem) => void;
  onShare: (video: PetVideoItem) => void;
  onCopyLink: (video: PetVideoItem) => void;
  onDownload: (video: PetVideoItem) => void;
  isToggling: boolean;
}) {
  const t = useTranslations('pet-memorial.videos');

  // 获取可播放的视频URL
  const videoUrl = video.finalVideoUrl || video.watermarkedVideoUrl || video.tempVideoUrl;
  // 获取视频缩略图：已完成的视频优先使用首帧图，否则用宠物图片
  const thumbnail = video.frameImageUrl || video.petImageUrl;
  // 对于已完成的视频，使用视频本身作为预览（而不是静态图）
  const useVideoPreview = video.status === 'completed' && videoUrl;

  // 状态标签颜色
  const statusColors: Record<string, string> = {
    completed: 'bg-green-500/20 text-green-400 border-green-500/30',
    generating: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    pending: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    failed: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  return (
    <Card className="overflow-hidden group">
      {/* 缩略图区域 */}
      <div className="relative aspect-video bg-muted">
        {/* 已完成的视频：使用视频首帧作为预览 */}
        {useVideoPreview ? (
          <video
            src={videoUrl}
            className="w-full h-full object-cover"
            muted
            playsInline
            preload="metadata"
            // 加载后暂停在第一帧
            onLoadedData={(e) => {
              const video = e.currentTarget;
              video.currentTime = 0.1; // 设置到0.1秒以确保显示首帧
            }}
          />
        ) : thumbnail ? (
          <Image
            src={thumbnail}
            alt="Pet video thumbnail"
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Video className="w-8 h-8 text-muted-foreground" />
          </div>
        )}

        {/* 播放按钮覆盖层 */}
        {videoUrl && video.status === 'completed' && (
          <button
            onClick={() => onPlay(video)}
            className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center">
              <Play className="w-6 h-6 text-black ml-1" />
            </div>
          </button>
        )}

        {/* 状态标签 */}
        <Badge
          variant="outline"
          className={cn(
            'absolute top-2 left-2 text-xs',
            statusColors[video.status] || statusColors.pending
          )}
        >
          {t(`status.${video.status}`)}
        </Badge>

        {/* 公开状态指示器 - 使用绿色小圆点表示已公开 */}
        {video.isPublic && (
          <div
            className="absolute top-2 right-2 w-3 h-3 rounded-full bg-green-500 shadow-lg shadow-green-500/50"
            title={t('publicVideo')}
          />
        )}
      </div>

      {/* 信息和操作区域 */}
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          {/* 视频信息 */}
          <div className="text-xs text-muted-foreground">
            {video.createdAt && (
              <span>
                {new Date(video.createdAt).toLocaleDateString()}
              </span>
            )}
            {video.durationSeconds && (
              <span className="ml-2">{video.durationSeconds}s</span>
            )}
          </div>

          {/* 更多菜单 */}
          {video.status === 'completed' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center justify-center h-8 w-8 rounded-full hover:bg-muted transition-colors"
                  disabled={isToggling}
                >
                  {isToggling ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <MoreVertical className="w-4 h-4" />
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[160px]">
                {/* 下载 */}
                <DropdownMenuItem onClick={() => onDownload(video)}>
                  <Download className="w-4 h-4 mr-2" />
                  {t('download')}
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* 分享到社交媒体 */}
                <DropdownMenuItem onClick={() => onShare(video)}>
                  <Share2 className="w-4 h-4 mr-2" />
                  {t('share')}
                </DropdownMenuItem>

                {/* 复制链接 */}
                <DropdownMenuItem onClick={() => onCopyLink(video)}>
                  <Link2 className="w-4 h-4 mr-2" />
                  {t('copyLink')}
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* 公开/私密切换 */}
                <DropdownMenuItem onClick={() => onToggleShare(video)}>
                  <Lock className="w-4 h-4 mr-2" />
                  {video.isPublic ? t('makePrivate') : t('makePublic')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 视频播放弹窗
 */
function VideoPlayerDialog({
  video,
  open,
  onOpenChange,
}: {
  video: PetVideoItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('pet-memorial.videos');
  const [shareModalOpen, setShareModalOpen] = useState(false);

  if (!video) return null;

  const videoUrl = video.finalVideoUrl || video.watermarkedVideoUrl || video.tempVideoUrl;
  const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const shareLink = `${appUrl}/share/${video.id}`;

  // 分享数据 - 使用视频场景
  const shareData: ShareData = {
    url: shareLink,
    title: t('shareVideoTitle'),
    scene: 'video',
    hashtags: ['PetMovie', 'AIPetVideo', 'PetLove'],
  };

  // 处理分享按钮点击
  const handleShareClick = () => {
    if (video.isPublic) {
      setShareModalOpen(true);
    } else {
      toast.error(t('enableShareFirst'));
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="flex items-center gap-2">
              <Video className="w-5 h-5" />
              {t('videoPlayer')}
            </DialogTitle>
          </DialogHeader>

          {/* 视频播放器 */}
          <div className="relative aspect-video bg-black">
            {videoUrl ? (
              <video
                src={videoUrl}
                controls
                autoPlay
                className="w-full h-full"
                poster={video.frameImageUrl || undefined}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                {t('videoNotReady')}
              </div>
            )}
          </div>

          {/* 操作栏 */}
          <div className="p-4 flex items-center justify-between border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {video.isPublic ? (
                <>
                  {/* 使用绿色小圆点表示已公开 */}
                  <div className="w-3 h-3 rounded-full bg-green-500 shadow-lg shadow-green-500/50" />
                  <span>{t('publicVideo')}</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>{t('privateVideo')}</span>
                </>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleShareClick}
            >
              <Share2 className="w-4 h-4 mr-2" />
              {t('share')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 分享弹窗 */}
      <ShareModal
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
        shareData={shareData}
      />
    </>
  );
}

/**
 * 宠物视频列表组件
 */
export function PetVideoList({ publicOnly = false }: PetVideoListProps) {
  const t = useTranslations('pet-memorial.videos');

  // 获取视频列表
  const { videos, isLoading, error, refresh } = useUserPetVideos(20);

  // 分享状态切换
  const { isLoading: isToggling, toggle: toggleShare } = useToggleVideoShare();
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // 视频播放弹窗状态
  const [selectedVideo, setSelectedVideo] = useState<PetVideoItem | null>(null);
  const [playerOpen, setPlayerOpen] = useState(false);

  // 分享弹窗状态
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareVideo, setShareVideo] = useState<PetVideoItem | null>(null);

  // 过滤视频（如果只显示公开视频）
  const displayVideos = publicOnly
    ? videos.filter((v) => v.isPublic && v.status === 'completed')
    : videos;

  // 播放视频
  const handlePlay = (video: PetVideoItem) => {
    setSelectedVideo(video);
    setPlayerOpen(true);
  };

  // 获取分享链接
  const getShareLink = (videoId: string) => {
    const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return `${appUrl}/share/${videoId}`;
  };

  // 复制链接到剪贴板（带后备方案）
  const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textarea);
        return successful;
      } catch {
        return false;
      }
    }
  };

  // 切换公开/私密状态
  const handleToggleShare = async (video: PetVideoItem) => {
    setTogglingId(video.id);
    const result = await toggleShare(video.id);

    if (result.success) {
      if (result.isPublic) {
        toast.success(t('shareEnabled'));
      } else {
        toast.success(t('shareDisabled'));
      }
      refresh();
    } else {
      toast.error(result.error || t('shareFailed'));
    }

    setTogglingId(null);
  };

  // 打开分享弹窗（分享到社交媒体）
  const handleShare = async (video: PetVideoItem) => {
    // 如果视频未公开，先设为公开
    if (!video.isPublic) {
      setTogglingId(video.id);
      const result = await toggleShare(video.id);
      setTogglingId(null);
      if (!result.success) {
        toast.error(result.error || t('shareFailed'));
        return;
      }
      refresh();
    }
    // 打开分享弹窗
    setShareVideo(video);
    setShareModalOpen(true);
  };

  // 复制分享链接
  const handleCopyLink = async (video: PetVideoItem) => {
    // 如果视频未公开，先设为公开
    if (!video.isPublic) {
      setTogglingId(video.id);
      const result = await toggleShare(video.id);
      setTogglingId(null);
      if (!result.success) {
        toast.error(result.error || t('shareFailed'));
        return;
      }
      refresh();
    }
    // 复制链接
    const shareLink = getShareLink(video.id);
    const copied = await copyToClipboard(shareLink);
    if (copied) {
      toast.success(t('linkCopied'));
    } else {
      toast.error(t('shareFailed'));
    }
  };

  // 下载视频（默认带水印版本）
  const handleDownload = (video: PetVideoItem) => {
    // 优先使用带水印版本，确保非VIP用户下载的都是带水印的
    const videoUrl = video.watermarkedVideoUrl || video.tempVideoUrl;
    if (!videoUrl) {
      toast.error(t('videoNotReady'));
      return;
    }
    const link = document.createElement('a');
    link.href = videoUrl;
    link.download = `pet-memorial-video-${video.id}.mp4`;
    link.click();
  };

  // 加载状态
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive text-sm mb-2">{error}</p>
        <Button variant="outline" size="sm" onClick={refresh}>
          {t('retry')}
        </Button>
      </div>
    );
  }

  // 空状态
  if (displayVideos.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Video className="w-10 h-10 mx-auto mb-2 opacity-50" />
        <p className="text-sm">{t('noVideos')}</p>
      </div>
    );
  }

  // 分享数据 - 使用视频场景
  const shareData: ShareData | null = shareVideo ? {
    url: getShareLink(shareVideo.id),
    title: t('shareVideoTitle'),
    scene: 'video',
    hashtags: ['PetMovie', 'AIPetVideo', 'PetLove'],
  } : null;

  return (
    <div className="space-y-4">
      {/* 视频网格 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayVideos.map((video) => (
          <VideoCard
            key={video.id}
            video={video}
            onPlay={handlePlay}
            onToggleShare={handleToggleShare}
            onShare={handleShare}
            onCopyLink={handleCopyLink}
            onDownload={handleDownload}
            isToggling={isToggling && togglingId === video.id}
          />
        ))}
      </div>

      {/* 视频播放弹窗 */}
      <VideoPlayerDialog
        video={selectedVideo}
        open={playerOpen}
        onOpenChange={setPlayerOpen}
      />

      {/* 分享弹窗 */}
      {shareData && (
        <ShareModal
          open={shareModalOpen}
          onOpenChange={setShareModalOpen}
          shareData={shareData}
        />
      )}
    </div>
  );
}
