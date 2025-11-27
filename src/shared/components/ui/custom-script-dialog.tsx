'use client';

/**
 * 自定义剧本设计弹窗
 * Custom Script Design Dialog
 */

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useTranslations, useLocale } from 'next-intl';
import {
  X,
  Loader2,
  Play,
  RefreshCw,
  Image as ImageIcon,
  Video,
  Check,
  AlertCircle,
  Music,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { Label } from '@/shared/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/components/ui/tooltip';
import { cn } from '@/shared/lib/utils';
import { VIDEO_STYLES, type VideoStyleId } from '@/shared/services/custom-script/types';

// ==================== 类型定义 ====================

interface SceneData {
  id: string;
  sceneNumber: number;
  prompt: string;
  description?: string;      // 中文描述
  descriptionEn?: string;    // 英文描述
  frameStatus: 'pending' | 'generating' | 'completed' | 'failed';
  frameImageUrl?: string;
  frameProgress?: number; // 首帧图生成进度 0-100
  videoStatus: 'pending' | 'generating' | 'completed' | 'failed';
  videoUrl?: string;
  videoProgress?: number; // 视频生成进度 0-100
  errorLog?: string; // 错误日志（JSON格式）
}

interface ScriptData {
  id: string;
  status: string;
  petImageUrl: string;
  userPrompt: string;
  musicPrompt?: string;
  durationSeconds: number;
  aspectRatio: string;
  storyTitle?: string;
  creditsUsed: number;
  scenes: SceneData[];
}

interface CustomScriptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  petImageUrl: string;
  aspectRatio: '16:9' | '9:16';
  // 如果传入 scriptId，表示恢复已有剧本
  existingScriptId?: string;
}

// ==================== 主组件 ====================

export function CustomScriptDialog({
  isOpen,
  onClose,
  petImageUrl,
  aspectRatio,
  existingScriptId,
}: CustomScriptDialogProps) {
  const t = useTranslations('landing.customScript');
  const locale = useLocale();
  // 判断是否显示中文：zh 开头的都是中文
  const isZhLocale = locale.startsWith('zh');

  // 状态管理
  const [step, setStep] = useState<'input' | 'creating' | 'editing'>('input');
  const [userPrompt, setUserPrompt] = useState('');
  const [musicPrompt, setMusicPrompt] = useState('');
  const [duration, setDuration] = useState<60 | 120>(60);
  const [styleId, setStyleId] = useState<VideoStyleId>('pixar-3d');
  const [customStyle, setCustomStyle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 剧本数据
  const [scriptId, setScriptId] = useState<string | null>(existingScriptId || null);
  const [scriptData, setScriptData] = useState<ScriptData | null>(null);
  const [isMerging, setIsMerging] = useState(false);
  const [mergedVideoUrl, setMergedVideoUrl] = useState<string | null>(null);

  // 轮询间隔
  const POLL_INTERVAL = 3000;

  // ==================== 恢复已有剧本 ====================

  useEffect(() => {
    if (existingScriptId && isOpen) {
      loadExistingScript(existingScriptId);
    }
  }, [existingScriptId, isOpen]);

  const loadExistingScript = async (id: string) => {
    try {
      const response = await fetch(`/api/custom-script/${id}`);
      const data = await response.json();

      if (data.success && data.script) {
        setScriptData(data.script);
        setScriptId(id);
        setStep('editing');
      }
    } catch (error) {
      console.error('Failed to load script:', error);
    }
  };

  // ==================== 创建剧本 ====================

  const handleCreateScript = async () => {
    if (!userPrompt.trim()) {
      setError(t('errorPromptRequired'));
      return;
    }

    // 验证自定义风格
    if (styleId === 'custom' && !customStyle.trim()) {
      setError(t('errorCustomStyleRequired'));
      return;
    }

    setIsCreating(true);
    setError(null);
    setStep('creating');

    try {
      const response = await fetch('/api/custom-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          petImageUrl,
          userPrompt: userPrompt.trim(),
          musicPrompt: musicPrompt.trim() || undefined,
          durationSeconds: duration,
          aspectRatio,
          styleId,
          customStyle: styleId === 'custom' ? customStyle.trim() : undefined,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create script');
      }

      // 创建成功，加载完整数据
      setScriptId(data.scriptId);
      await loadExistingScript(data.scriptId);
    } catch (error) {
      console.error('Create script error:', error);
      setError(error instanceof Error ? error.message : 'Failed to create script');
      setStep('input');
    } finally {
      setIsCreating(false);
    }
  };

  // ==================== 生成首帧图 ====================

  // 追踪正在请求中的场景，防止重复点击
  const [pendingFrameRequests, setPendingFrameRequests] = useState<Set<string>>(new Set());
  const [pendingVideoRequests, setPendingVideoRequests] = useState<Set<string>>(new Set());

  const handleGenerateFrame = async (sceneId: string) => {
    if (!scriptId) return;

    // 防止重复点击：检查是否已在请求中或正在生成
    if (pendingFrameRequests.has(sceneId)) {
      console.log('⚠️ Frame request already pending for scene:', sceneId);
      return;
    }

    const currentScene = scriptData?.scenes.find(s => s.id === sceneId);
    if (currentScene?.frameStatus === 'generating') {
      console.log('⚠️ Frame already generating for scene:', sceneId);
      return;
    }

    // 立即标记为请求中（乐观更新）
    setPendingFrameRequests(prev => new Set(prev).add(sceneId));
    setScriptData((prev) =>
      prev
        ? {
            ...prev,
            scenes: prev.scenes.map((s) =>
              s.id === sceneId ? { ...s, frameStatus: 'generating', frameProgress: 0 } : s
            ),
          }
        : null
    );

    try {
      const response = await fetch(
        `/api/custom-script/${scriptId}/scene/${sceneId}/frame`,
        { method: 'POST' }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to start frame generation');
      }

      // 开始轮询
      pollSceneStatus(sceneId);
    } catch (error) {
      console.error('Generate frame error:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate frame');
      // 请求失败，恢复状态
      setScriptData((prev) =>
        prev
          ? {
              ...prev,
              scenes: prev.scenes.map((s) =>
                s.id === sceneId ? { ...s, frameStatus: 'pending', frameProgress: undefined } : s
              ),
            }
          : null
      );
    } finally {
      // 移除请求中标记
      setPendingFrameRequests(prev => {
        const next = new Set(prev);
        next.delete(sceneId);
        return next;
      });
    }
  };

  // ==================== 生成视频 ====================

  const handleGenerateVideo = async (sceneId: string) => {
    if (!scriptId) return;

    // 防止重复点击：检查是否已在请求中或正在生成
    if (pendingVideoRequests.has(sceneId)) {
      console.log('⚠️ Video request already pending for scene:', sceneId);
      return;
    }

    const currentScene = scriptData?.scenes.find(s => s.id === sceneId);
    if (currentScene?.videoStatus === 'generating') {
      console.log('⚠️ Video already generating for scene:', sceneId);
      return;
    }

    // 立即标记为请求中（乐观更新）
    setPendingVideoRequests(prev => new Set(prev).add(sceneId));
    setScriptData((prev) =>
      prev
        ? {
            ...prev,
            scenes: prev.scenes.map((s) =>
              s.id === sceneId ? { ...s, videoStatus: 'generating', videoProgress: 0 } : s
            ),
          }
        : null
    );

    try {
      const response = await fetch(
        `/api/custom-script/${scriptId}/scene/${sceneId}/video`,
        { method: 'POST' }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to start video generation');
      }

      // 开始轮询
      pollSceneStatus(sceneId);
    } catch (error) {
      console.error('Generate video error:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate video');
      // 请求失败，恢复状态
      setScriptData((prev) =>
        prev
          ? {
              ...prev,
              scenes: prev.scenes.map((s) =>
                s.id === sceneId ? { ...s, videoStatus: 'pending', videoProgress: undefined } : s
              ),
            }
          : null
      );
    } finally {
      // 移除请求中标记
      setPendingVideoRequests(prev => {
        const next = new Set(prev);
        next.delete(sceneId);
        return next;
      });
    }
  };

  // ==================== 轮询状态 ====================

  const pollSceneStatus = useCallback(
    async (sceneId: string) => {
      if (!scriptId) return;

      const poll = async () => {
        try {
          const response = await fetch(
            `/api/custom-script/${scriptId}/scene/${sceneId}`
          );
          const data = await response.json();

          if (data.success && data.scene) {
            const scene = data.scene;

            // 更新本地状态（包括进度和错误信息）
            setScriptData((prev) =>
              prev
                ? {
                    ...prev,
                    scenes: prev.scenes.map((s) =>
                      s.id === sceneId
                        ? {
                            ...s,
                            frameStatus: scene.frameStatus,
                            frameImageUrl: scene.frameImageUrl,
                            frameProgress: scene.frameProgress,
                            videoStatus: scene.videoStatus,
                            videoUrl: scene.videoUrl,
                            videoProgress: scene.videoProgress,
                            errorLog: scene.errorLog,
                          }
                        : s
                    ),
                  }
                : null
            );

            // 如果还在生成中，继续轮询
            if (
              scene.frameStatus === 'generating' ||
              scene.videoStatus === 'generating'
            ) {
              setTimeout(poll, POLL_INTERVAL);
            }
          }
        } catch (error) {
          console.error('Poll error:', error);
        }
      };

      poll();
    },
    [scriptId]
  );

  // ==================== 更新提示词 ====================

  const handleUpdatePrompt = async (sceneId: string, newPrompt: string) => {
    if (!scriptId) return;

    try {
      const response = await fetch(
        `/api/custom-script/${scriptId}/scene/${sceneId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: newPrompt }),
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to update prompt');
      }

      // 更新本地状态（保留首帧图，只重置视频状态）
      // 用户可以选择是否重新生成首帧图
      setScriptData((prev) =>
        prev
          ? {
              ...prev,
              scenes: prev.scenes.map((s) =>
                s.id === sceneId
                  ? {
                      ...s,
                      prompt: newPrompt,
                      // 保留 frameStatus 和 frameImageUrl
                      videoStatus: 'pending',
                      videoUrl: undefined,
                    }
                  : s
              ),
            }
          : null
      );
    } catch (error) {
      console.error('Update prompt error:', error);
      setError(error instanceof Error ? error.message : 'Failed to update prompt');
    }
  };

  // ==================== 合并视频 ====================

  const handleMergeVideos = async () => {
    if (!scriptId) return;

    setIsMerging(true);
    setError(null);

    try {
      const response = await fetch(`/api/custom-script/${scriptId}/merge`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to start video merge');
      }

      // 开始轮询剧本状态以获取合并结果
      pollScriptStatus();
    } catch (error) {
      console.error('Merge videos error:', error);
      setError(error instanceof Error ? error.message : 'Failed to merge videos');
      setIsMerging(false);
    }
  };

  // 轮询剧本状态（用于合并）
  const pollScriptStatus = useCallback(async () => {
    if (!scriptId) return;

    const poll = async () => {
      try {
        const response = await fetch(`/api/custom-script/${scriptId}`);
        const data = await response.json();

        if (data.success && data.script) {
          const script = data.script;

          if (script.status === 'completed' && script.finalVideoUrl) {
            // 合并完成
            setMergedVideoUrl(script.finalVideoUrl);
            setIsMerging(false);
            setScriptData((prev) =>
              prev ? { ...prev, status: 'completed' } : null
            );
          } else if (script.status === 'failed') {
            // 合并失败
            setError('Video merge failed');
            setIsMerging(false);
          } else if (script.status === 'merging') {
            // 继续轮询
            setTimeout(poll, POLL_INTERVAL);
          }
        }
      } catch (error) {
        console.error('Poll script status error:', error);
      }
    };

    poll();
  }, [scriptId]);

  // ==================== 关闭弹窗 ====================

  const handleClose = () => {
    // 立即关闭弹窗，不阻塞用户操作
    onClose();

    // 后台异步保存剧本状态（不阻塞关闭）
    if (scriptId) {
      fetch(`/api/custom-script/${scriptId}`, { method: 'PUT' }).catch((error) => {
        console.error('Save script error:', error);
      });
    }
  };

  // ==================== 渲染 ====================

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* 弹窗内容 */}
      <div className="relative w-full max-w-4xl max-h-[90vh] mx-4 bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div>
            <h2 className="text-xl font-bold">{t('title')}</h2>
            {scriptData?.storyTitle && (
              <p className="text-sm text-muted-foreground mt-1">
                {scriptData.storyTitle}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="rounded-full"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'input' && (
            <InputStep
              userPrompt={userPrompt}
              setUserPrompt={setUserPrompt}
              musicPrompt={musicPrompt}
              setMusicPrompt={setMusicPrompt}
              duration={duration}
              setDuration={setDuration}
              styleId={styleId}
              setStyleId={setStyleId}
              customStyle={customStyle}
              setCustomStyle={setCustomStyle}
              isCreating={isCreating}
              error={error}
              onSubmit={handleCreateScript}
              t={t}
            />
          )}

          {step === 'creating' && (
            <div className="flex flex-col items-center justify-center min-h-[300px] space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <p className="text-lg">{t('creatingScript')}</p>
              <p className="text-sm text-muted-foreground">{t('creatingHint')}</p>
            </div>
          )}

          {step === 'editing' && scriptData && (
            <EditingStep
              scriptData={scriptData}
              onGenerateFrame={handleGenerateFrame}
              onGenerateVideo={handleGenerateVideo}
              onUpdatePrompt={handleUpdatePrompt}
              pendingFrameRequests={pendingFrameRequests}
              pendingVideoRequests={pendingVideoRequests}
              isZhLocale={isZhLocale}
              t={t}
            />
          )}
        </div>

        {/* 底部 */}
        {step === 'editing' && scriptData && (
          <div className="px-6 py-4 border-t border-zinc-800 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {t('creditsUsed')}: <span className="font-bold">{scriptData.creditsUsed}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {scriptData.scenes.filter((s) => s.videoStatus === 'completed').length} / {scriptData.scenes.length} {t('scenesCompleted')}
              </span>
              {mergedVideoUrl ? (
                <a
                  href={mergedVideoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
                >
                  <Check className="w-4 h-4" />
                  {t('downloadVideo') || 'Download Video'}
                </a>
              ) : (
                <Button
                  disabled={
                    isMerging ||
                    !scriptData.scenes.every((s) => s.videoStatus === 'completed')
                  }
                  onClick={handleMergeVideos}
                >
                  {isMerging ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      {t('merging') || 'Merging...'}
                    </>
                  ) : (
                    t('mergeVideo')
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== 输入步骤组件 ====================

interface InputStepProps {
  userPrompt: string;
  setUserPrompt: (v: string) => void;
  musicPrompt: string;
  setMusicPrompt: (v: string) => void;
  duration: 60 | 120;
  setDuration: (v: 60 | 120) => void;
  styleId: VideoStyleId;
  setStyleId: (v: VideoStyleId) => void;
  customStyle: string;
  setCustomStyle: (v: string) => void;
  isCreating: boolean;
  error: string | null;
  onSubmit: () => void;
  t: (key: string) => string;
}

function InputStep({
  userPrompt,
  setUserPrompt,
  musicPrompt,
  setMusicPrompt,
  duration,
  setDuration,
  styleId,
  setStyleId,
  customStyle,
  setCustomStyle,
  isCreating,
  error,
  onSubmit,
  t,
}: InputStepProps) {
  return (
    <div className="space-y-6">
      {/* 提示词输入 */}
      <div className="space-y-2">
        <Label>{t('promptLabel')}</Label>
        <Textarea
          value={userPrompt}
          onChange={(e) => setUserPrompt(e.target.value)}
          placeholder={t('promptPlaceholder')}
          className="min-h-[120px] resize-none"
        />
        <p className="text-xs text-muted-foreground">{t('promptHint')}</p>
      </div>

      {/* 配乐提示词 */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Music className="w-4 h-4" />
          {t('musicLabel')}
          <span className="text-xs text-muted-foreground">({t('optional')})</span>
        </Label>
        <Input
          value={musicPrompt}
          onChange={(e) => setMusicPrompt(e.target.value)}
          placeholder={t('musicPlaceholder')}
        />
      </div>

      {/* 风格选择 */}
      <div className="space-y-2">
        <Label>{t('styleLabel')}</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {VIDEO_STYLES.map((style) => (
            <div
              key={style.id}
              onClick={() => setStyleId(style.id)}
              className={cn(
                'p-3 rounded-lg border cursor-pointer transition-all',
                styleId === style.id
                  ? 'border-primary bg-primary/10'
                  : 'border-zinc-700 hover:border-zinc-600'
              )}
            >
              <div className="text-sm font-medium">{style.name}</div>
              <div className="text-xs text-muted-foreground mt-1">{style.nameCn}</div>
            </div>
          ))}
        </div>
        {/* 自定义风格输入框 */}
        {styleId === 'custom' && (
          <div className="mt-3 space-y-2">
            <Label className="text-xs text-muted-foreground">{t('customStyleLabel')}</Label>
            <Textarea
              value={customStyle}
              onChange={(e) => setCustomStyle(e.target.value)}
              placeholder={t('customStylePlaceholder')}
              className="min-h-[80px] resize-none"
            />
            <p className="text-xs text-muted-foreground">{t('customStyleHint')}</p>
          </div>
        )}
      </div>

      {/* 时长选择 */}
      <div className="space-y-2">
        <Label>{t('durationLabel')}</Label>
        <div className="grid grid-cols-2 gap-4">
          <div
            onClick={() => setDuration(60)}
            className={cn(
              'p-4 rounded-lg border cursor-pointer transition-all',
              duration === 60
                ? 'border-primary bg-primary/10'
                : 'border-zinc-700 hover:border-zinc-600'
            )}
          >
            <div className="text-lg font-bold">1 {t('minute')}</div>
            <div className="text-sm text-muted-foreground">4 {t('scenes')} × 15s</div>
            <div className="text-sm text-primary mt-2">75 {t('credits')}</div>
          </div>
          <div
            onClick={() => setDuration(120)}
            className={cn(
              'p-4 rounded-lg border cursor-pointer transition-all',
              duration === 120
                ? 'border-primary bg-primary/10'
                : 'border-zinc-700 hover:border-zinc-600'
            )}
          >
            <div className="text-lg font-bold">2 {t('minutes')}</div>
            <div className="text-sm text-muted-foreground">8 {t('scenes')} × 15s</div>
            <div className="text-sm text-primary mt-2">135 {t('credits')}</div>
          </div>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <div className="flex items-center gap-2 text-red-500">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* 创建按钮 */}
      <Button
        className="w-full h-12 text-lg"
        onClick={onSubmit}
        disabled={isCreating || !userPrompt.trim()}
      >
        {isCreating ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            {t('creating')}
          </>
        ) : (
          <>
            {t('createScript')} (15 {t('credits')})
          </>
        )}
      </Button>
    </div>
  );
}

// ==================== 编辑步骤组件 ====================

interface EditingStepProps {
  scriptData: ScriptData;
  onGenerateFrame: (sceneId: string) => void;
  onGenerateVideo: (sceneId: string) => void;
  onUpdatePrompt: (sceneId: string, newPrompt: string) => void;
  pendingFrameRequests: Set<string>;
  pendingVideoRequests: Set<string>;
  isZhLocale: boolean;
  t: (key: string) => string;
}

function EditingStep({
  scriptData,
  onGenerateFrame,
  onGenerateVideo,
  onUpdatePrompt,
  pendingFrameRequests,
  pendingVideoRequests,
  isZhLocale,
  t,
}: EditingStepProps) {
  return (
    <div className="space-y-4">
      {scriptData.scenes.map((scene) => (
        <SceneCard
          key={scene.id}
          scene={scene}
          aspectRatio={scriptData.aspectRatio}
          onGenerateFrame={() => onGenerateFrame(scene.id)}
          onGenerateVideo={() => onGenerateVideo(scene.id)}
          isFrameLoading={pendingFrameRequests.has(scene.id)}
          isVideoLoading={pendingVideoRequests.has(scene.id)}
          onUpdatePrompt={(newPrompt) => onUpdatePrompt(scene.id, newPrompt)}
          isZhLocale={isZhLocale}
          t={t}
        />
      ))}
    </div>
  );
}

// ==================== 分镜卡片组件 ====================

interface SceneCardProps {
  scene: SceneData;
  aspectRatio: string;
  onGenerateFrame: () => void;
  onGenerateVideo: () => void;
  onUpdatePrompt: (newPrompt: string) => void;
  isFrameLoading?: boolean;  // 是否正在发送首帧请求
  isVideoLoading?: boolean;  // 是否正在发送视频请求
  isZhLocale: boolean;       // 是否中文环境
  t: (key: string) => string;
}

function SceneCard({
  scene,
  aspectRatio,
  onGenerateFrame,
  onGenerateVideo,
  onUpdatePrompt,
  isFrameLoading = false,
  isVideoLoading = false,
  isZhLocale,
  t,
}: SceneCardProps) {
  // 根据语言环境选择显示的描述
  const displayDescription = isZhLocale
    ? (scene.description || scene.descriptionEn || '')
    : (scene.descriptionEn || scene.description || '');
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState(scene.prompt);

  const handleSavePrompt = () => {
    if (editedPrompt.trim() !== scene.prompt) {
      onUpdatePrompt(editedPrompt.trim());
    }
    setIsEditingPrompt(false);
  };

  // 状态图标
  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'completed':
        return <Check className="w-4 h-4 text-green-500" />;
      case 'generating':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <div className="w-4 h-4 rounded-full border-2 border-zinc-600" />;
    }
  };

  return (
    <div className="border border-zinc-800 rounded-xl overflow-hidden">
      {/* 卡片头部 */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-zinc-800/50 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-primary">
            #{scene.sceneNumber}
          </span>
          <span className="text-sm text-muted-foreground">
            {displayDescription || `Scene ${scene.sceneNumber}`}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <ImageIcon className="w-4 h-4" />
            <StatusIcon status={scene.frameStatus} />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Video className="w-4 h-4" />
            <StatusIcon status={scene.videoStatus} />
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
        </div>
      </div>

      {/* 卡片内容 */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* 提示词 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">{t('scenePrompt')}</Label>
              {/* 允许编辑提示词：不在生成中时都可以编辑 */}
              {!isEditingPrompt && scene.frameStatus !== 'generating' && scene.videoStatus !== 'generating' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingPrompt(true)}
                >
                  {t('edit')}
                </Button>
              )}
            </div>
            {isEditingPrompt ? (
              <div className="space-y-2">
                <Textarea
                  value={editedPrompt}
                  onChange={(e) => setEditedPrompt(e.target.value)}
                  className="min-h-[80px] text-sm"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSavePrompt}>
                    {t('save')}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditedPrompt(scene.prompt);
                      setIsEditingPrompt(false);
                    }}
                  >
                    {t('cancel')}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-zinc-400 line-clamp-3">{scene.prompt}</p>
            )}
          </div>

          {/* 首帧图和视频预览 */}
          <div className="grid grid-cols-2 gap-4">
            {/* 首帧图 */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">{t('frameImage')}</Label>
              <div
                className={cn(
                  'relative rounded-lg overflow-hidden bg-zinc-800',
                  aspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-video'
                )}
              >
                {scene.frameImageUrl ? (
                  <>
                    <Image
                      src={scene.frameImageUrl}
                      alt={`Scene ${scene.sceneNumber} frame`}
                      fill
                      className="object-cover"
                    />
                    {/* 重新生成按钮 */}
                    <Button
                      size="sm"
                      variant="secondary"
                      className="absolute bottom-2 right-2 h-8"
                      onClick={onGenerateFrame}
                      disabled={scene.frameStatus === 'generating' || isFrameLoading}
                    >
                      {isFrameLoading ? (
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3 h-3 mr-1" />
                      )}
                      {t('regenerate')}
                    </Button>
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    {scene.frameStatus === 'generating' || isFrameLoading ? (
                      <>
                        <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                        <span className="text-xs text-muted-foreground">
                          {t('generatingFrame')}
                        </span>
                        {/* 进度条 */}
                        {scene.frameProgress !== undefined && scene.frameProgress > 0 && (
                          <div className="w-3/4 mt-2">
                            <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary transition-all duration-300"
                                style={{ width: `${scene.frameProgress}%` }}
                              />
                            </div>
                            <span className="text-xs text-primary mt-1 block text-center">
                              {scene.frameProgress}%
                            </span>
                          </div>
                        )}
                      </>
                    ) : (
                      <Button
                        onClick={onGenerateFrame}
                        disabled={isFrameLoading}
                      >
                        {isFrameLoading ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <ImageIcon className="w-4 h-4 mr-2" />
                        )}
                        {isFrameLoading ? t('starting') || 'Starting...' : `${t('generateFrame')} (5 ${t('credits')})`}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 视频 */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">{t('video')}</Label>
              <div
                className={cn(
                  'relative rounded-lg overflow-hidden bg-zinc-800',
                  aspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-video'
                )}
              >
                {scene.videoUrl ? (
                  <>
                    <video
                      src={scene.videoUrl}
                      className="w-full h-full object-cover"
                      controls
                      playsInline
                    />
                    {/* 重新生成按钮 */}
                    <Button
                      size="sm"
                      variant="secondary"
                      className="absolute bottom-2 right-2 h-8"
                      onClick={onGenerateVideo}
                      disabled={scene.videoStatus === 'generating' || isVideoLoading}
                    >
                      {isVideoLoading ? (
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3 h-3 mr-1" />
                      )}
                      {t('regenerate')}
                    </Button>
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    {scene.videoStatus === 'generating' || isVideoLoading ? (
                      <>
                        <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                        <span className="text-xs text-muted-foreground">
                          {t('generatingVideo')}
                        </span>
                        {/* 进度条 */}
                        {scene.videoProgress !== undefined && scene.videoProgress > 0 && (
                          <div className="w-3/4 mt-2">
                            <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary transition-all duration-300"
                                style={{ width: `${scene.videoProgress}%` }}
                              />
                            </div>
                            <span className="text-xs text-primary mt-1 block text-center">
                              {scene.videoProgress}%
                            </span>
                          </div>
                        )}
                      </>
                    ) : scene.videoStatus === 'failed' ? (
                      // 视频生成失败状态
                      <div className="flex flex-col items-center gap-2 p-4">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-2 text-red-500 cursor-help">
                                <AlertCircle className="w-6 h-6" />
                                <span className="text-xs font-medium">{t('videoFailed')}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <p className="text-xs">
                                {t('videoFailedHint')}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={onGenerateVideo}
                          disabled={isVideoLoading}
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          {t('retry')}
                        </Button>
                      </div>
                    ) : scene.frameStatus === 'completed' ? (
                      <Button
                        onClick={onGenerateVideo}
                        disabled={isVideoLoading}
                      >
                        {isVideoLoading ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Video className="w-4 h-4 mr-2" />
                        )}
                        {isVideoLoading ? t('starting') || 'Starting...' : `${t('generateVideo')} (10 ${t('credits')})`}
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {t('generateFrameFirst')}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
