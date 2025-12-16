/**
 * FloatingPromptBar - 浮动提示栏组件
 * 核心功能:
 * 1. 图片/视频模式切换
 * 2. 模型选择
 * 3. 高级设置(宽高比、分辨率、时长等)
 * 4. 图片上传
 * 5. 隐私设置(免费用户强制公开)
 * 6. 多语言切换
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ImageIcon,
  Video,
  Palette,
  Settings2,
  ChevronDown,
  ChevronUp,
  Lock,
  LockOpen,
  Earth,
  Sparkles,
  Square,
  RectangleHorizontal,
  RectangleVertical,
  Monitor,
  SlidersVertical,
  X,
  Loader2,
  Check,
  Zap,
  Crown,
  Dices,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import {
  getDefaultModel,
  getModelsByType,
  IMAGE_MODELS,
  VIDEO_MODELS,
  type AIModel,
  type AspectRatio,
} from '@/extensions/ai/models/config';
import { Sparkles as SparklesIcon, Zap as ZapIcon, Star, Palette as PaletteIcon } from 'lucide-react';
import { useAppContext } from '@/shared/contexts/app';
import { Link } from '@/core/i18n/navigation';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/components/ui/tooltip';

import { DropdownMenu } from './dropdown-menu';
import { ImageUploadModal } from './image-upload-modal';

// 图片宽高比选项配置类型 (支持 Nanobanana 2 / doubao-seedream 等模型)
interface ImageAspectRatio {
  id: string;
  name: string;
  description: string;
  icon: typeof Square;
}

// 图片宽高比选项 (基于 Nanobanana 2 API 支持的比例)
const IMAGE_ASPECT_RATIOS: ImageAspectRatio[] = [
  { id: 'auto', name: 'Auto', description: 'settings.ratio.auto', icon: Square },
  { id: '1:1', name: '1:1', description: 'settings.ratio.square', icon: Square },
  { id: '4:3', name: '4:3', description: 'settings.ratio.standard', icon: RectangleHorizontal },
  { id: '3:4', name: '3:4', description: 'settings.ratio.portrait', icon: RectangleVertical },
  { id: '16:9', name: '16:9', description: 'settings.ratio.landscape', icon: RectangleHorizontal },
  { id: '9:16', name: '9:16', description: 'settings.ratio.vertical', icon: RectangleVertical },
  { id: '3:2', name: '3:2', description: 'settings.ratio.photo', icon: RectangleHorizontal },
  { id: '2:3', name: '2:3', description: 'settings.ratio.photoPortrait', icon: RectangleVertical },
  { id: '21:9', name: '21:9', description: 'settings.ratio.ultrawide', icon: RectangleHorizontal },
];

// 图片质量选项类型 (基于 Nanobanana 2 API)
interface ImageQuality {
  id: string;
  name: string;
  description: string;
  extraCredits?: number; // 额外积分消耗
}

const IMAGE_QUALITIES: ImageQuality[] = [
  { id: '1K', name: '1K', description: 'settings.qualityOption.1k' },
  { id: '2K', name: '2K', description: 'settings.qualityOption.2k' },
  { id: '4K', name: '4K', description: 'settings.qualityOption.4k', extraCredits: 5 },
];

// 引导强度选项类型 (guidance_scale - 仅 doubao-seedream 支持)
interface GuidanceScale {
  id: string;
  name: string;
  value: number;
  description: string;
}

const GUIDANCE_SCALES: GuidanceScale[] = [
  { id: 'low', name: 'settings.guidance.low', value: 1.5, description: 'settings.guidance.lowDesc' },
  { id: 'medium', name: 'settings.guidance.medium', value: 2.5, description: 'settings.guidance.mediumDesc' },
  { id: 'high', name: 'settings.guidance.high', value: 5.0, description: 'settings.guidance.highDesc' },
  { id: 'max', name: 'settings.guidance.max', value: 7.5, description: 'settings.guidance.maxDesc' },
];

// 判断模型是否支持 guidance_scale (仅 doubao-seedream 系列支持)
function supportsGuidanceScale(model: AIModel): boolean {
  return model.actualModel.startsWith('doubao-seedream');
}

// 判断模型是否支持质量选择 (nanobanana-pro 和 nanobanana-2 支持)
function supportsQualitySelection(model: AIModel): boolean {
  return (
    model.actualModel === 'gemini-3-pro-image-preview' || // nanobanana-2
    model.actualModel === 'nano-banana-2-lite' // nanobanana-pro
  );
}

// 获取模型支持的最大参考图片数量
function getMaxReferenceImages(model: AIModel, mode: 'image' | 'video'): number {
  // 视频模式: Sora-2 仅支持 1 张图片
  if (mode === 'video') {
    return 1;
  }
  // 图片模式: 所有模型最多支持 5 张参考图片
  return 5;
}

// 视频宽高比选项类型 (基于 Sora-2 API，仅支持 16:9 和 9:16)
interface VideoAspectRatio {
  id: string;
  name: string;
  description: string;
  icon: typeof Square;
}

const VIDEO_ASPECT_RATIOS: VideoAspectRatio[] = [
  { id: '16:9', name: '16:9', description: 'settings.videoRatio.landscape', icon: RectangleHorizontal },
  { id: '9:16', name: '9:16', description: 'settings.videoRatio.portrait', icon: RectangleVertical },
];

// 视频时长选项类型 (基于 Sora-2 API，仅支持 10s 和 15s)
interface VideoDuration {
  id: string;
  name: string;
  seconds: number;
  description: string;
}

const VIDEO_DURATIONS: VideoDuration[] = [
  { id: '10s', name: '10s', seconds: 10, description: 'settings.videoDuration.standard' },
  { id: '15s', name: '15s', seconds: 15, description: 'settings.videoDuration.extended' },
];

// 水印选项类型 (会员专属功能，由后端服务处理)
interface WatermarkOption {
  id: string;
  name: string;
  removeWatermark: boolean;
  description: string;
  isPro?: boolean; // 是否需要会员
}

// 视频水印选项
const VIDEO_WATERMARK_OPTIONS: WatermarkOption[] = [
  { id: 'keep', name: 'settings.watermark.keep', removeWatermark: false, description: 'settings.watermark.keepDesc' },
  { id: 'remove', name: 'settings.watermark.remove', removeWatermark: true, description: 'settings.watermark.removeDesc', isPro: true },
];



interface FloatingPromptBarProps {
  onGenerate?: (params: GenerateParams) => void;
  defaultPrompt?: string;
  defaultMode?: 'image' | 'video';
  defaultImages?: string[];
  defaultModelId?: string; // 默认选中的模型 ID（如 'nanobanana'）
}

export interface GenerateParams {
  prompt: string;
  mode: 'image' | 'video';
  model: AIModel;
  aspectRatio: string;
  isPublic: boolean;
  hidePrompt: boolean; // 是否隐藏提示词（Pro功能）
  images?: string[];
  // 图片专用
  imageAspectRatio?: ImageAspectRatio; // 图片宽高比 (Nanobanana 2 / doubao-seedream)
  quality?: ImageQuality; // 图片质量 (Nanobanana 2: 1K/2K/4K)
  guidanceScale?: GuidanceScale; // 引导强度 (仅 doubao-seedream 支持)
  seed?: number; // 随机种子 (-1 为随机)
  // 视频专用 (基于 Sora-2 API)
  duration?: VideoDuration; // 视频时长 (10s/15s)
  watermark?: WatermarkOption; // 视频水印选项 (保留/去除)
}

export function FloatingPromptBar({
  onGenerate,
  defaultPrompt = '',
  defaultMode = 'image',
  defaultImages = [],
  defaultModelId,
}: FloatingPromptBarProps) {
  const t = useTranslations('dashboard.promptBar');
  const router = useRouter();
  const { user } = useAppContext();

  // 模式状态
  const [mode, setMode] = useState<'image' | 'video'>(defaultMode);
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [isGenerating, setIsGenerating] = useState(false);

  // 随机提示词状态
  const [hasRandomPrompts, setHasRandomPrompts] = useState(false);
  const [isLoadingRandomPrompt, setIsLoadingRandomPrompt] = useState(false);

  // 免费用户判定: 没有付费订阅的用户 (使用 isPro 字段判断)
  const isFreeUser = !user?.isPro;
  const [isPublic, setIsPublic] = useState(true); // 免费用户强制公开
  const [hidePrompt, setHidePrompt] = useState(false); // 是否隐藏提示词（Pro功能）

  // 高级设置
  const [showAdvanced, setShowAdvanced] = useState(false);

  // 下拉菜单状态
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // 图片上传
  const [showImageModal, setShowImageModal] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>(defaultImages);

  // 模型选择（支持通过 defaultModelId 设置初始模型）
  const [selectedImageModel, setSelectedImageModel] = useState<AIModel>(() => {
    if (defaultModelId) {
      const model = IMAGE_MODELS.find((m) => m.id === defaultModelId);
      if (model) return model;
    }
    return getDefaultModel('image');
  });
  const [selectedVideoModel, setSelectedVideoModel] = useState<AIModel>(() => {
    if (defaultModelId) {
      const model = VIDEO_MODELS.find((m) => m.id === defaultModelId);
      if (model) return model;
    }
    return getDefaultModel('video');
  });

  // 图片设置 (支持 Nanobanana 2 / doubao-seedream)
  const [selectedImageAspectRatio, setSelectedImageAspectRatio] = useState(IMAGE_ASPECT_RATIOS[1]); // 默认 1:1
  const [selectedQuality, setSelectedQuality] = useState(IMAGE_QUALITIES[1]); // 默认 2K
  const [selectedGuidance, setSelectedGuidance] = useState(GUIDANCE_SCALES[1]); // 默认 medium (仅 doubao-seedream)
  const [seed, setSeed] = useState(-1); // -1 表示随机

  // 当前模型支持的最大参考图片数量 (视频模式仅支持 1 张)
  const currentModel = mode === 'image' ? selectedImageModel : selectedVideoModel;
  const maxReferenceImages = getMaxReferenceImages(currentModel, mode);

  // 视频设置 (基于 Sora-2 API)
  const [selectedVideoAspect, setSelectedVideoAspect] = useState(
    VIDEO_ASPECT_RATIOS[0]
  ); // 16:9
  const [selectedDuration, setSelectedDuration] = useState(VIDEO_DURATIONS[0]); // 默认 10s
  const [selectedWatermark, setSelectedWatermark] = useState(VIDEO_WATERMARK_OPTIONS[0]); // 默认保留水印


  // 当 defaultPrompt 或 defaultImages 改变时更新状态 (支持 Remix 功能)
  useEffect(() => {
    if (defaultPrompt) {
      setPrompt(defaultPrompt);
    }
  }, [defaultPrompt]);

  useEffect(() => {
    if (defaultImages.length > 0) {
      setUploadedImages(defaultImages);
    }
  }, [defaultImages]);

  // 检查当前模式是否有可用的随机提示词
  useEffect(() => {
    const checkRandomPrompts = async () => {
      try {
        const response = await fetch(`/api/random-prompt/check?mode=${mode}`);
        const data = await response.json();
        if (data.code === 0) {
          setHasRandomPrompts(data.data?.hasPrompts ?? false);
        } else {
          setHasRandomPrompts(false);
        }
      } catch {
        setHasRandomPrompts(false);
      }
    };
    checkRandomPrompts();
  }, [mode]);

  // 获取随机提示词
  const handleRandomPrompt = async () => {
    if (isLoadingRandomPrompt) return;
    setIsLoadingRandomPrompt(true);
    try {
      const response = await fetch(`/api/random-prompt?mode=${mode}`);
      const data = await response.json();
      if (data.code === 0 && data.data?.prompt) {
        setPrompt(data.data.prompt);
      } else {
        toast.error(t('randomPrompt.error'));
      }
    } catch {
      toast.error(t('randomPrompt.error'));
    } finally {
      setIsLoadingRandomPrompt(false);
    }
  };

  const closeDropdown = useCallback(() => setActiveDropdown(null), []);
  const toggleDropdown = useCallback((name: string) => {
    setActiveDropdown((prev) => (prev === name ? null : name));
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;

    const currentModel = mode === 'image' ? selectedImageModel : selectedVideoModel;
    const remainingCredits = user?.credits?.remainingCredits ?? 0;

    // 检查积分
    if (remainingCredits < currentModel.credits) {
      toast.error(t('errors.insufficientCredits'));
      return;
    }

    setIsGenerating(true);

    try {
      const params: GenerateParams = {
        prompt,
        mode,
        model: currentModel,
        aspectRatio:
          mode === 'image' ? selectedImageAspectRatio.id : selectedVideoAspect.id,
        isPublic: isFreeUser ? true : isPublic, // 免费用户强制公开
        hidePrompt: isFreeUser ? false : hidePrompt, // 免费用户不能隐藏提示词
        images: uploadedImages.length > 0 ? uploadedImages : undefined,
      };

      if (mode === 'image') {
        // 图片生成参数
        params.imageAspectRatio = selectedImageAspectRatio;
        // quality 仅 nanobanana-2 支持
        if (supportsQualitySelection(currentModel)) {
          params.quality = selectedQuality;
        }
        // guidance_scale 仅 doubao-seedream 系列支持
        if (supportsGuidanceScale(currentModel)) {
          params.guidanceScale = selectedGuidance;
        }
        params.seed = seed;
      } else {
        // 视频生成参数 (基于 Sora-2 API)
        params.duration = selectedDuration;
        params.watermark = selectedWatermark;
      }

      // 调用生成API
      if (onGenerate) {
        await onGenerate(params);
      } else {
        // 默认API调用
        const response = await fetch('/api/ai/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: 'evolink', // TODO: 根据模型选择provider
            mediaType: mode,
            model: currentModel.actualModel,
            prompt,
            options: JSON.stringify({
              aspectRatio: params.aspectRatio,
              duration: params.duration?.seconds, // Sora-2 使用秒数
              quality: params.quality?.id, // 图片质量 1K/2K/4K
              guidanceScale: params.guidanceScale?.value, // 引导强度 (仅 doubao-seedream)
              // 水印由后端服务根据用户会员状态处理
            }),
            scene: mode === 'image' ? 'text-to-image' : 'text-to-video',
            image_urls: params.images,
          }),
        });

        const data = await response.json();
        if (data.code === 0) {
          toast.success(t('success.generated'));
          // 清空输入
          setPrompt('');
          setUploadedImages([]);
        } else {
          toast.error(data.message || t('errors.generateFailed'));
        }
      }
    } catch (error) {
      console.error('Generation failed:', error);
      toast.error(t('errors.generateFailed'));
    } finally {
      setIsGenerating(false);
    }
  };

  // 按钮样式
  const btnBase =
    'inline-flex items-center justify-center whitespace-nowrap text-sm ring-offset-background focus-visible:outline-none group/button relative px-3 py-2 h-9 rounded-full max-w-52 overflow-hidden font-semibold outline-none disabled:opacity-50 text-white transition-colors';
  const btnComposer = `${btnBase} bg-white/10 hover:bg-white/20`;
  const btnDark = `${btnBase} bg-black/20 hover:bg-white/10`;

  const currentModels = getModelsByType(mode);
  // currentModel 已在上方定义 (用于计算 maxReferenceImages)

  return (
    <>
      {/* 图片上传模态框 */}
      <ImageUploadModal
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        selectedImages={uploadedImages}
        onImagesChange={setUploadedImages}
        maxImages={maxReferenceImages}
      />

      <div
        className="fixed bottom-6 left-1/2 z-50 w-[90%] max-w-3xl -translate-x-1/2 px-1 transition-all duration-300"
        style={{
          background: 'rgba(37, 37, 37, 0.8)',
          backdropFilter: 'blur(18px) saturate(1.8)',
          borderRadius: '2rem',
          boxShadow: 'rgba(0, 0, 0, 0.37) 0px 8px 32px 0px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        {/* 已上传图片预览 */}
        {uploadedImages.length > 0 && (
          <div className="flex items-center gap-2 px-3 pt-3 overflow-x-auto">
            {uploadedImages.map((src, index) => (
              <div key={index} className="relative flex-shrink-0 group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`Upload ${index + 1}`}
                  className="h-12 w-12 rounded-lg object-cover border border-white/20"
                />
                <button
                  onClick={() => {
                    const newImages = [...uploadedImages];
                    newImages.splice(index, 1);
                    setUploadedImages(newImages);
                  }}
                  className="absolute -top-1 -right-1 bg-black/60 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Row 1: 图片上传 + Textarea */}
        <div className="flex items-center px-1 pt-2">
          {/* 图片上传按钮 */}
          <button
            type="button"
            onClick={() => setShowImageModal(true)}
            className={btnComposer}
            title={`${t('addImages')} (${uploadedImages.length}/${maxReferenceImages})`}
          >
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              {uploadedImages.length > 0 && (
                <span className="text-xs">{uploadedImages.length}</span>
              )}
            </div>
          </button>

          {/* Textarea */}
          <div className="flex-1 min-w-0">
            <textarea
              placeholder={
                mode === 'image'
                  ? t('placeholder.image')
                  : t('placeholder.video')
              }
              rows={1}
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                // 自动调整高度（由内容撑开，最多3行约72px）
                const target = e.target;
                target.style.height = 'auto';
                target.style.height = `${Math.min(target.scrollHeight, 72)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
              style={{ background: 'transparent' }}
              className="w-full min-h-[24px] max-h-[72px] border-none bg-transparent outline-none text-base placeholder:text-white/40 focus:outline-none focus:ring-0 focus:border-none focus-visible:ring-0 focus-visible:ring-offset-0 px-3 text-white selection:bg-white/20 selection:text-white resize-none overflow-y-auto py-2.5 appearance-none"
            />
          </div>

          {/* 随机提示词按钮 - 放在输入框最右边 */}
          {hasRandomPrompts && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleRandomPrompt}
                    disabled={isLoadingRandomPrompt}
                    className={btnComposer}
                    type="button"
                  >
                    {isLoadingRandomPrompt ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Dices className="h-4 w-4" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">{t('randomPrompt.tooltip')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Row 2: 控制按钮 */}
        <div className="flex items-center gap-2 px-1 pb-3 mt-1 overflow-visible">
          {/* 图片/视频切换 */}
          <div className="flex items-center bg-black/20 rounded-full p-1 border border-white/10">
            <button
              onClick={() => setMode('image')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                mode === 'image'
                  ? 'bg-white/20 text-white shadow-sm'
                  : 'text-white/60 hover:text-white/80 hover:bg-white/10'
              }`}
            >
              <ImageIcon className="h-4 w-4" />
              <span className="hidden sm:inline">{t('modes.image')}</span>
            </button>
            <button
              onClick={() => setMode('video')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                mode === 'video'
                  ? 'bg-white/20 text-white shadow-sm'
                  : 'text-white/60 hover:text-white/80 hover:bg-white/10'
              }`}
            >
              <Video className="h-4 w-4" />
              <span className="hidden sm:inline">{t('modes.video')}</span>
            </button>
          </div>

          {/* 模型选择器 */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown('model')}
              className={btnDark}
              type="button"
            >
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                <span className="truncate hidden sm:inline">
                  {currentModel.displayName}
                </span>
                <span className="text-xs opacity-60">
                  {currentModel.credits}
                </span>
                <ChevronDown className="h-3 w-3 opacity-50" />
              </div>
            </button>
            <DropdownMenu
              isOpen={activeDropdown === 'model'}
              onClose={closeDropdown}
              width="min-w-72"
            >
              <div className="px-4 py-2 text-xs text-white/50 font-medium">
                {t('models.quickSelect')}
              </div>
              {currentModels.map((model, index) => {
                const isSelected = currentModel.id === model.id;
                // 根据模型特性选择图标
                const ModelIcon = model.badge === 'pro' ? SparklesIcon :
                                  model.badge === 'new' ? ZapIcon :
                                  model.isDefault ? PaletteIcon : Star;
                return (
                  <button
                    key={model.id}
                    onClick={() => {
                      if (mode === 'image') {
                        setSelectedImageModel(model);
                      } else {
                        setSelectedVideoModel(model);
                        // 视频模型选择时自动设置对应的时长
                        if (model.duration) {
                          const matchingDuration = VIDEO_DURATIONS.find(
                            (d) => d.seconds === model.duration
                          );
                          if (matchingDuration) {
                            setSelectedDuration(matchingDuration);
                          }
                        }
                      }
                      closeDropdown();
                    }}
                    className={`w-full px-4 py-3 text-left hover:bg-white/10 transition-colors ${
                      isSelected ? 'bg-white/5' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* 左侧图标 */}
                      <ModelIcon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                        model.badge === 'pro' ? 'text-amber-400' :
                        model.badge === 'new' ? 'text-green-400' :
                        'text-white/60'
                      }`} />

                      {/* 中间内容 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-white font-medium">
                            {model.displayName}
                          </span>
                          {/* 积分徽章 */}
                          <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded">
                            <Sparkles className="h-3 w-3" />
                            {model.credits}
                          </span>
                        </div>
                        <div className="text-xs text-white/50 mt-0.5">
                          {t(model.description)}
                        </div>
                      </div>

                      {/* 右侧状态 */}
                      <div className="flex-shrink-0 mt-1">
                        {model.badge === 'pro' && !user?.isPro ? (
                          <Lock className="h-4 w-4 text-white/30" />
                        ) : isSelected ? (
                          <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })}
            </DropdownMenu>
          </div>

          {/* 设置按钮 */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`${btnComposer} ${showAdvanced ? 'bg-white/20' : ''}`}
            title={t('settings.title')}
          >
            <div className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              {showAdvanced ? (
                <ChevronUp className="h-3 w-3 opacity-60" />
              ) : (
                <ChevronDown className="h-3 w-3 opacity-60" />
              )}
            </div>
          </button>

          {/* 右侧按钮 */}
          <span className="flex items-center gap-2 ml-auto">
            {/* 桌面端: 可见性和提示词锁定 */}
            <span className="md:flex hidden items-center gap-2">
              {/* 可见性下拉菜单 */}
              <div className="relative">
                <button
                  onClick={() => toggleDropdown('visibility')}
                  className={btnDark}
                  type="button"
                >
                  <div className="flex items-center gap-2">
                    {isPublic ? (
                      <Earth className="h-4 w-4" />
                    ) : (
                      <Lock className="h-4 w-4 text-amber-400" />
                    )}
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </div>
                </button>
                <DropdownMenu
                  isOpen={activeDropdown === 'visibility'}
                  onClose={closeDropdown}
                  align="right"
                >
                  <div className="px-4 py-2 text-xs text-white/40 font-medium">
                    {t('visibility.title')}
                  </div>
                  <div className="h-px bg-white/10 my-1" />
                  <div className="p-1.5">
                    {/* 公开选项 */}
                    <button
                      onClick={() => {
                        setIsPublic(true);
                        closeDropdown();
                      }}
                      className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors ${
                        isPublic ? 'bg-white/5' : 'hover:bg-white/10'
                      }`}
                    >
                      <Earth className="h-4 w-4 text-white/80 flex-shrink-0" />
                      <div className="flex-1 text-left">
                        <div className="font-medium text-white/90 text-sm">
                          {t('visibility.public')}
                        </div>
                        <div className="text-xs text-white/60">
                          {t('visibility.publicDesc')}
                        </div>
                      </div>
                      {isPublic && (
                        <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
                      )}
                    </button>
                    {/* 私密选项 */}
                    <button
                      onClick={() => {
                        if (isFreeUser) {
                          // 免费用户跳转付费页面
                          closeDropdown();
                          router.push('/pricing');
                        } else {
                          setIsPublic(false);
                          closeDropdown();
                        }
                      }}
                      className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors ${
                        isFreeUser
                          ? 'hover:bg-white/10 cursor-pointer'
                          : !isPublic
                            ? 'bg-white/5'
                            : 'hover:bg-white/10'
                      }`}
                    >
                      <Lock className="h-4 w-4 text-white/80 flex-shrink-0" />
                      <div className="flex-1 text-left">
                        <div className="font-medium text-white/90 text-sm">
                          {t('visibility.private')}
                        </div>
                        <div className="text-xs text-white/60">
                          {t('visibility.privateDesc')}
                        </div>
                      </div>
                      {isFreeUser ? (
                        <Crown className="h-3 w-3 text-amber-400 flex-shrink-0" />
                      ) : (
                        !isPublic && (
                          <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
                        )
                      )}
                    </button>
                  </div>
                  {isFreeUser && (
                    <>
                      <div className="h-px bg-white/10 my-1" />
                      <div className="px-3 py-2 text-xs text-white/60">
                        {t('visibility.proTip')}
                      </div>
                    </>
                  )}
                </DropdownMenu>
              </div>

              {/* 提示词锁定按钮 */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => {
                        if (isFreeUser) {
                          // 免费用户跳转付费页面
                          router.push('/pricing');
                        } else {
                          setHidePrompt(!hidePrompt);
                        }
                      }}
                      className={`${btnDark} ${hidePrompt ? 'bg-white/20' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        {hidePrompt ? (
                          <Lock className="h-4 w-4 text-amber-400" />
                        ) : (
                          <LockOpen className="h-4 w-4 text-white/60" />
                        )}
                        {isFreeUser && <Crown className="h-3 w-3 text-amber-400" />}
                      </div>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    {isFreeUser ? (
                      <p className="text-xs">{t('promptLock.proRequired')}</p>
                    ) : hidePrompt ? (
                      <p className="text-xs">{t('promptLock.hidden')}</p>
                    ) : (
                      <p className="text-xs">{t('promptLock.visible')}</p>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </span>

            {/* 生成按钮 */}
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              className={btnComposer}
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
            </button>
          </span>
        </div>

        {/* 高级设置面板 */}
        {showAdvanced && (
          <div className="border-t border-white/5">
            <div className="flex items-start gap-1.5 px-2 pt-2 pb-3 flex-wrap">
              {mode === 'image' ? (
                <>
                  {/* 图片模式设置: 宽高比、质量、引导强度(仅 doubao-seedream) */}
                  {/* 宽高比 */}
                  <div className="relative">
                    <button
                      onClick={() => toggleDropdown('imageAspectRatio')}
                      className={btnComposer}
                      type="button"
                    >
                      <div className="flex items-center gap-2">
                        {(() => {
                          const Icon = selectedImageAspectRatio.icon;
                          return <Icon className="h-4 w-4" />;
                        })()}
                        <span className="truncate">
                          {selectedImageAspectRatio.name}
                        </span>
                        <ChevronDown className="h-3 w-3 opacity-50" />
                      </div>
                    </button>
                    <DropdownMenu
                      isOpen={activeDropdown === 'imageAspectRatio'}
                      onClose={closeDropdown}
                      width="min-w-56"
                    >
                      <div className="px-4 py-2 text-xs text-white/50 font-medium">
                        {t('settings.aspectRatio')}
                      </div>
                      {IMAGE_ASPECT_RATIOS.map((ratio) => {
                        const Icon = ratio.icon;
                        const isSelected = selectedImageAspectRatio.id === ratio.id;
                        return (
                          <button
                            key={ratio.id}
                            onClick={() => {
                              setSelectedImageAspectRatio(ratio);
                              closeDropdown();
                            }}
                            className="w-full px-4 py-2.5 text-left hover:bg-white/10 transition-colors flex items-center gap-3"
                          >
                            <div
                              className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                isSelected
                                  ? 'bg-white border-white'
                                  : 'border-white/30'
                              }`}
                            >
                              {isSelected && (
                                <Check className="h-3 w-3 text-black" />
                              )}
                            </div>
                            <Icon className="h-4 w-4 text-white/70" />
                            <div className="flex-1">
                              <div className="text-sm text-white font-medium">
                                {ratio.name}
                              </div>
                              <div className="text-xs text-white/50">
                                {t(ratio.description)}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </DropdownMenu>
                  </div>

                  {/* 图片质量 - 仅 nanobanana-2 模型支持 */}
                  {supportsQualitySelection(selectedImageModel) && (
                    <div className="relative">
                      <button
                        onClick={() => toggleDropdown('quality')}
                        className={btnComposer}
                        type="button"
                      >
                        <div className="flex items-center gap-2">
                          <Monitor className="h-4 w-4" />
                          <span className="truncate">
                            {selectedQuality.name}
                          </span>
                          <ChevronDown className="h-3 w-3 opacity-50" />
                        </div>
                      </button>
                      <DropdownMenu
                        isOpen={activeDropdown === 'quality'}
                        onClose={closeDropdown}
                        width="min-w-48"
                      >
                        <div className="px-4 py-2 text-xs text-white/50 font-medium">
                          {t('settings.quality')}
                        </div>
                        {IMAGE_QUALITIES.map((quality) => {
                          const isSelected = selectedQuality.id === quality.id;
                          return (
                            <button
                              key={quality.id}
                              onClick={() => {
                                setSelectedQuality(quality);
                                closeDropdown();
                              }}
                              className={`w-full px-4 py-2.5 text-left hover:bg-white/10 transition-colors flex items-center gap-3 ${
                                isSelected ? 'bg-white/5' : ''
                              }`}
                            >
                              <div
                                className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                  isSelected
                                    ? 'bg-white border-white'
                                    : 'border-white/30'
                                }`}
                              >
                                {isSelected && (
                                  <Check className="h-3 w-3 text-black" />
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="text-sm text-white font-medium flex items-center gap-2">
                                  {quality.name}
                                  {quality.extraCredits && (
                                    <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded">
                                      <Sparkles className="h-3 w-3" />
                                      +{quality.extraCredits}
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-white/50">
                                  {t(quality.description)}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </DropdownMenu>
                    </div>
                  )}

                  {/* 引导强度 - 仅 doubao-seedream 模型支持 */}
                  {supportsGuidanceScale(selectedImageModel) && (
                    <div className="relative">
                      <button
                        onClick={() => toggleDropdown('guidance')}
                        className={btnComposer}
                        type="button"
                      >
                        <div className="flex items-center gap-2">
                          <SlidersVertical className="h-4 w-4" />
                          <span className="truncate">
                            {t(selectedGuidance.name)}
                          </span>
                          <ChevronDown className="h-3 w-3 opacity-60" />
                        </div>
                      </button>
                      <DropdownMenu
                        isOpen={activeDropdown === 'guidance'}
                        onClose={closeDropdown}
                        width="min-w-56"
                      >
                        <div className="px-4 py-2 text-xs text-white/50 font-medium border-b border-white/5 mb-1">
                          {t('settings.guidanceScale')}
                        </div>
                        {GUIDANCE_SCALES.map((scale) => {
                          const isSelected = selectedGuidance.id === scale.id;
                          return (
                            <button
                              key={scale.id}
                              onClick={() => {
                                setSelectedGuidance(scale);
                                closeDropdown();
                              }}
                              className={`w-full px-4 py-2.5 text-left hover:bg-white/10 transition-colors ${
                                isSelected ? 'bg-white/5' : ''
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="text-sm text-white font-medium">
                                    {t(scale.name)}
                                  </div>
                                  <div className="text-xs text-white/50">
                                    {t(scale.description)}
                                  </div>
                                </div>
                                <span className="text-xs text-white/40">
                                  {scale.value}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </DropdownMenu>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* 视频模式设置: 宽高比、时长、运动幅度 */}
                  {/* 宽高比 */}
                  <div className="relative">
                    <button
                      onClick={() => toggleDropdown('aspect')}
                      className={btnComposer}
                      type="button"
                    >
                      <div className="flex items-center gap-2">
                        <RectangleHorizontal className="h-4 w-4" />
                        <span className="truncate">
                          {selectedVideoAspect.name}
                        </span>
                        <ChevronDown className="h-3 w-3 opacity-50" />
                      </div>
                    </button>
                    <DropdownMenu
                      isOpen={activeDropdown === 'aspect'}
                      onClose={closeDropdown}
                      width="min-w-56"
                    >
                      <div className="px-4 py-2 text-xs text-white/50 font-medium">
                        {t('videoAspectRatio')}
                      </div>
                      {VIDEO_ASPECT_RATIOS.map((ratio) => {
                        const Icon = ratio.icon;
                        const isSelected = selectedVideoAspect.id === ratio.id;
                        return (
                          <button
                            key={ratio.id}
                            onClick={() => {
                              setSelectedVideoAspect(ratio);
                              closeDropdown();
                            }}
                            className="w-full px-4 py-2.5 text-left hover:bg-white/10 transition-colors flex items-center gap-3"
                          >
                            <div
                              className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                isSelected
                                  ? 'bg-white border-white'
                                  : 'border-white/30'
                              }`}
                            >
                              {isSelected && (
                                <Check className="h-3 w-3 text-black" />
                              )}
                            </div>
                            <Icon className="h-4 w-4 text-white/70" />
                            <div>
                              <div className="text-sm text-white font-medium">
                                {ratio.name}
                              </div>
                              <div className="text-xs text-white/50">
                                {ratio.description}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </DropdownMenu>
                  </div>

                  {/* 时长由模型选择自动决定，不再单独显示 */}

                  {/* 水印选项 (会员专属功能) */}
                  <div className="relative">
                    <button
                      onClick={() => toggleDropdown('watermark')}
                      className={btnComposer}
                      type="button"
                    >
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        <span className="truncate">{t(selectedWatermark.name)}</span>
                        {selectedWatermark.isPro && (
                          <Crown className="h-3 w-3 text-amber-400" />
                        )}
                        <ChevronDown className="h-3 w-3 opacity-60" />
                      </div>
                    </button>
                    <DropdownMenu
                      isOpen={activeDropdown === 'watermark'}
                      onClose={closeDropdown}
                    >
                      <div className="px-4 py-2 text-xs text-white/50 font-medium border-b border-white/5 mb-1">
                        {t('settings.watermark.title')}
                      </div>
                      {VIDEO_WATERMARK_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => {
                            // 去水印是会员专属功能
                            if (opt.isPro && isFreeUser) {
                              closeDropdown();
                              router.push('/pricing');
                              return;
                            }
                            setSelectedWatermark(opt);
                            closeDropdown();
                          }}
                          className={`w-full px-4 py-2.5 text-left hover:bg-white/10 transition-colors ${
                            selectedWatermark.id === opt.id ? 'bg-white/5' : ''
                          }`}
                        >
                          <div className="text-sm text-white font-medium flex items-center gap-2">
                            {t(opt.name)}
                            {opt.isPro && (
                              isFreeUser ? (
                                <Crown className="h-3 w-3 text-amber-400" />
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded">
                                  Pro
                                </span>
                              )
                            )}
                          </div>
                          <div className="text-xs text-white/50">
                            {t(opt.description)}
                          </div>
                        </button>
                      ))}
                      {isFreeUser && (
                        <>
                          <div className="h-px bg-white/10 my-1" />
                          <div className="px-3 py-2 text-xs text-white/60">
                            {t('settings.watermark.proTip')}
                          </div>
                        </>
                      )}
                    </DropdownMenu>
                  </div>
                </>
              )}

              {/* 移动端: 可见性和提示词锁定 */}
              <div className="md:hidden w-full flex items-center gap-2 mt-2">
                {/* 可见性下拉菜单 */}
                <div className="relative">
                  <button
                    onClick={() => toggleDropdown('visibility-mobile')}
                    className={btnDark}
                    type="button"
                  >
                    <div className="flex items-center gap-2">
                      {isPublic ? (
                        <Earth className="h-4 w-4" />
                      ) : (
                        <Lock className="h-4 w-4 text-amber-400" />
                      )}
                      <span className="text-xs">
                        {isPublic ? t('visibility.public') : t('visibility.private')}
                      </span>
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    </div>
                  </button>
                  <DropdownMenu
                    isOpen={activeDropdown === 'visibility-mobile'}
                    onClose={closeDropdown}
                    align="left"
                  >
                    <div className="px-4 py-2 text-xs text-white/40 font-medium">
                      {t('visibility.title')}
                    </div>
                    <div className="h-px bg-white/10 my-1" />
                    <div className="p-1.5">
                      <button
                        onClick={() => {
                          setIsPublic(true);
                          closeDropdown();
                        }}
                        className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors ${
                          isPublic ? 'bg-white/5' : 'hover:bg-white/10'
                        }`}
                      >
                        <Earth className="h-4 w-4 text-white/80" />
                        <span className="text-sm text-white/90">{t('visibility.public')}</span>
                        {isPublic && <div className="h-2 w-2 rounded-full bg-blue-500 ml-auto" />}
                      </button>
                      <button
                        onClick={() => {
                          if (isFreeUser) {
                            // 免费用户跳转付费页面
                            closeDropdown();
                            router.push('/pricing');
                          } else {
                            setIsPublic(false);
                            closeDropdown();
                          }
                        }}
                        className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors ${
                          isFreeUser
                            ? 'hover:bg-white/10'
                            : !isPublic
                              ? 'bg-white/5'
                              : 'hover:bg-white/10'
                        }`}
                      >
                        <Lock className="h-4 w-4 text-white/80" />
                        <span className="text-sm text-white/90">{t('visibility.private')}</span>
                        {isFreeUser ? (
                          <Crown className="h-3 w-3 text-amber-400 ml-auto" />
                        ) : (
                          !isPublic && <div className="h-2 w-2 rounded-full bg-blue-500 ml-auto" />
                        )}
                      </button>
                    </div>
                  </DropdownMenu>
                </div>

                {/* 提示词锁定按钮 */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => {
                          if (isFreeUser) {
                            // 免费用户跳转付费页面
                            router.push('/pricing');
                          } else {
                            setHidePrompt(!hidePrompt);
                          }
                        }}
                        className={`${btnDark} ${hidePrompt ? 'bg-white/20' : ''}`}
                      >
                        <div className="flex items-center gap-2">
                          {hidePrompt ? (
                            <Lock className="h-4 w-4 text-amber-400" />
                          ) : (
                            <LockOpen className="h-4 w-4 text-white/60" />
                          )}
                          {isFreeUser && <Crown className="h-3 w-3 text-amber-400" />}
                        </div>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {isFreeUser ? (
                        <p className="text-xs">{t('promptLock.proRequired')}</p>
                      ) : hidePrompt ? (
                        <p className="text-xs">{t('promptLock.hidden')}</p>
                      ) : (
                        <p className="text-xs">{t('promptLock.visible')}</p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
