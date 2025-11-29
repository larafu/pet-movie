'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CreditCard,
  Download,
  ImageIcon,
  Loader2,
  Sparkles,
  User,
  Video,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Link } from '@/core/i18n/navigation';
import { AIMediaType, AITaskStatus } from '@/extensions/ai';
import { VIDEO_MODELS } from '@/extensions/ai/providers/evolink/models';
import { Button } from '@/shared/components/ui/button';
import { TempImageUploader } from './temp-image-uploader';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { Label } from '@/shared/components/ui/label';
import { Progress } from '@/shared/components/ui/progress';
import { Textarea } from '@/shared/components/ui/textarea';
import { useAppContext } from '@/shared/contexts/app';

interface VideoGeneratorProps {
  srOnlyTitle?: string;
}

interface GeneratedVideo {
  id: string;
  url: string;
  provider?: string;
  model?: string;
  prompt?: string;
}

interface BackendTask {
  id: string;
  status: string;
  provider: string;
  model: string;
  prompt: string | null;
  taskResult: string | null;
}

const POLL_INTERVAL = 5000;
const GENERATION_TIMEOUT = 600000; // 10 minutes for video
const MAX_PROMPT_LENGTH = 2000;
const COST_CREDITS = 5;

function parseTaskResult(taskResult: string | null): any {
  if (!taskResult) {
    return null;
  }

  try {
    return JSON.parse(taskResult);
  } catch (error) {
    console.warn('Failed to parse taskResult:', error);
    return null;
  }
}

function extractVideoUrl(result: any): string | null {
  if (!result) {
    return null;
  }

  // Check Evolink format first: results array
  if (result.results && Array.isArray(result.results) && result.results.length > 0) {
    const firstResult = result.results[0];
    if (typeof firstResult === 'string') {
      return firstResult;
    }
  }

  // Check various possible video URL locations
  const output = result.output ?? result.video ?? result.url ?? result.data;

  if (!output) {
    return null;
  }

  if (typeof output === 'string') {
    return output;
  }

  if (Array.isArray(output) && output.length > 0) {
    const firstItem = output[0];
    if (typeof firstItem === 'string') return firstItem;
    if (typeof firstItem === 'object') {
      return firstItem.url ?? firstItem.uri ?? firstItem.video ?? null;
    }
  }

  if (typeof output === 'object') {
    return output.url ?? output.uri ?? output.video ?? null;
  }

  return null;
}

export function VideoGenerator({ srOnlyTitle }: VideoGeneratorProps) {
  const t = useTranslations('ai.video.generator');

  const [prompt, setPrompt] = useState('');
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);
  const [generatedVideos, setGeneratedVideos] = useState<GeneratedVideo[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(
    null
  );
  const [taskStatus, setTaskStatus] = useState<AITaskStatus | null>(null);
  const [downloadingVideoId, setDownloadingVideoId] = useState<string | null>(
    null
  );
  const [isMounted, setIsMounted] = useState(false);

  const { user, isCheckSign, setIsShowSignModal, fetchUserCredits } =
    useAppContext();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const promptLength = prompt.trim().length;
  const remainingCredits = user?.credits?.remainingCredits ?? 0;
  const isPromptTooLong = promptLength > MAX_PROMPT_LENGTH;

  const taskStatusLabel = useMemo(() => {
    if (!taskStatus) {
      return '';
    }

    switch (taskStatus) {
      case AITaskStatus.PENDING:
        return 'Waiting for the model to start';
      case AITaskStatus.PROCESSING:
        return 'Generating your video...';
      case AITaskStatus.SUCCESS:
        return 'Video generation completed';
      case AITaskStatus.FAILED:
        return 'Generation failed';
      default:
        return '';
    }
  }, [taskStatus]);

  const resetTaskState = useCallback(() => {
    setIsGenerating(false);
    setProgress(0);
    setTaskId(null);
    setGenerationStartTime(null);
    setTaskStatus(null);
  }, []);

  const pollTaskStatus = useCallback(
    async (id: string) => {
      try {
        if (
          generationStartTime &&
          Date.now() - generationStartTime > GENERATION_TIMEOUT
        ) {
          resetTaskState();
          toast.error('Video generation timed out. Please try again.');
          return true;
        }

        const resp = await fetch('/api/ai/query', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ taskId: id }),
        });

        if (!resp.ok) {
          throw new Error(`request failed with status: ${resp.status}`);
        }

        const { code, message, data } = await resp.json();

        // If query fails, log error but continue polling (don't stop)
        if (code !== 0) {
          console.warn('Query failed, will retry:', message);
          setProgress((prev) => Math.max(prev, 15));
          return false; // Continue polling
        }

        const task = data as BackendTask;
        const currentStatus = task.status as AITaskStatus;
        setTaskStatus(currentStatus);

        const parsedResult = parseTaskResult(task.taskResult);
        const videoUrl = extractVideoUrl(parsedResult);

        if (currentStatus === AITaskStatus.PENDING) {
          setProgress((prev) => Math.max(prev, 20));
          return false;
        }

        if (currentStatus === AITaskStatus.PROCESSING) {
          if (videoUrl) {
            setGeneratedVideos([
              {
                id: task.id,
                url: videoUrl,
                provider: task.provider,
                model: task.model,
                prompt: task.prompt ?? undefined,
              },
            ]);
            setProgress((prev) => Math.max(prev, 85));
          } else {
            setProgress((prev) => Math.min(prev + 10, 80));
          }
          return false;
        }

        if (currentStatus === AITaskStatus.SUCCESS) {
          if (!videoUrl) {
            toast.error('The provider returned no video. Please retry.');
          } else {
            setGeneratedVideos([
              {
                id: task.id,
                url: videoUrl,
                provider: task.provider,
                model: task.model,
                prompt: task.prompt ?? undefined,
              },
            ]);
            toast.success('Video generated successfully');
          }

          setProgress(100);
          resetTaskState();
          return true;
        }

        if (currentStatus === AITaskStatus.FAILED) {
          const errorMessage =
            parsedResult?.error ||
            parsedResult?.failure_reason ||
            'Generate video failed';
          toast.error(errorMessage);
          resetTaskState();
          fetchUserCredits();
          return true;
        }

        setProgress((prev) => Math.min(prev + 5, 95));
        return false;
      } catch (error: any) {
        // Log error but continue polling (don't stop on network errors)
        console.warn('Error polling video task, will retry:', error.message);
        setProgress((prev) => Math.max(prev, 10));
        return false; // Continue polling even on error
      }
    },
    [generationStartTime, resetTaskState, fetchUserCredits]
  );

  useEffect(() => {
    if (!taskId || !isGenerating) {
      return;
    }

    let isCancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    const poll = async () => {
      if (isCancelled) return;

      const shouldStop = await pollTaskStatus(taskId);
      if (!shouldStop && !isCancelled) {
        timeoutId = setTimeout(poll, POLL_INTERVAL);
      }
    };

    poll();

    return () => {
      isCancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [taskId, isGenerating, pollTaskStatus]);

  const handleGenerate = async () => {
    if (!user) {
      setIsShowSignModal(true);
      return;
    }

    if (!prompt.trim()) {
      toast.error('Please enter a video description');
      return;
    }

    if (isPromptTooLong) {
      toast.error(t('form.prompt_too_long'));
      return;
    }

    // Skip credit check for super admins
    if (!user.isSuperAdmin && remainingCredits < COST_CREDITS) {
      toast.error(`Insufficient credits. You need ${COST_CREDITS} credits.`);
      return;
    }

    setIsGenerating(true);
    setProgress(10);
    setGenerationStartTime(Date.now());
    setGeneratedVideos([]);

    try {
      const requestBody: any = {
        mediaType: AIMediaType.VIDEO,
        provider: 'evolink',
        model: VIDEO_MODELS.SORA_2,
        prompt: prompt.trim(),
      };

      // Add reference image if provided (image_urls at top level, same as prompt)
      if (referenceImageUrl) {
        requestBody.image_urls = [referenceImageUrl];
      }

      const resp = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!resp.ok) {
        throw new Error(`request failed with status: ${resp.status}`);
      }

      const { code, message, data } = await resp.json();
      if (code !== 0) {
        throw new Error(message || 'Generate video failed');
      }

      setTaskId(data.taskId);
      fetchUserCredits();
    } catch (error: any) {
      console.error('Error generating video:', error);
      toast.error(`Failed to generate video: ${error.message}`);
      resetTaskState();
    }
  };

  const handleDownloadVideo = async (video: GeneratedVideo) => {
    setDownloadingVideoId(video.id);
    try {
      const response = await fetch(video.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pet-movie-${video.id}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Video downloaded successfully');
    } catch (error: any) {
      console.error('Error downloading video:', error);
      toast.error(`Failed to download video: ${error.message}`);
    } finally {
      setDownloadingVideoId(null);
    }
  };

  if (!isMounted) {
    return (
      <section className="container py-24">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </section>
    );
  }

  const canGenerate =
    !isGenerating &&
    prompt.trim().length > 0 &&
    !isPromptTooLong &&
    (!user || user.isSuperAdmin || remainingCredits >= COST_CREDITS);

  return (
    <section className="container py-24">
      {srOnlyTitle && <h1 className="sr-only">{srOnlyTitle}</h1>}

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Left Column: Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              {t('title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Prompt Input */}
            <div className="space-y-2">
              <Label htmlFor="prompt">{t('form.prompt')}</Label>
              <Textarea
                id="prompt"
                placeholder={t('form.prompt_placeholder')}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[150px] resize-none"
                disabled={isGenerating}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {promptLength} / {MAX_PROMPT_LENGTH}
                </span>
                {isPromptTooLong && (
                  <span className="text-destructive">
                    {t('form.prompt_too_long')}
                  </span>
                )}
              </div>
            </div>

            {/* Reference Image (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="reference-image" className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                {t('form.reference_images')}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t('form.reference_images_description')}
              </p>
              <TempImageUploader
                value={referenceImageUrl ?? undefined}
                onChange={setReferenceImageUrl}
                disabled={isGenerating}
                maxSizeMB={10}
              />
            </div>

            {/* Credits Info */}
            {user && (
              <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t('credits_cost', { credits: COST_CREDITS })}
                  </span>
                  <span className="font-medium">
                    {t('credits_remaining', { credits: remainingCredits })}
                  </span>
                </div>
                {remainingCredits < COST_CREDITS && (
                  <Button asChild variant="outline" size="sm" className="w-full">
                    <Link href="/settings/billing">
                      <CreditCard className="h-4 w-4 mr-2" />
                      {t('buy_credits')}
                    </Link>
                  </Button>
                )}
              </div>
            )}

            {/* Free Trial Info */}
            {user && remainingCredits >= COST_CREDITS && remainingCredits <= 5 && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                <p className="text-sm text-primary">
                  {t('free_trial', { credits: remainingCredits })}
                </p>
              </div>
            )}

            {/* Generate Button */}
            {isCheckSign ? (
              <Button disabled className="w-full" size="lg">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {t('checking_account')}
              </Button>
            ) : !user ? (
              <Button
                onClick={() => setIsShowSignModal(true)}
                className="w-full"
                size="lg"
              >
                <User className="h-4 w-4 mr-2" />
                {t('sign_in_to_generate')}
              </Button>
            ) : (
              <Button
                onClick={handleGenerate}
                disabled={!canGenerate}
                className="w-full"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {t('generating')}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    {t('generate')}
                  </>
                )}
              </Button>
            )}

            {/* Progress */}
            {isGenerating && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('progress')}</span>
                  <span className="font-medium">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
                {taskStatusLabel && (
                  <p className="text-xs text-muted-foreground">
                    {taskStatusLabel}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column: Preview */}
        <Card>
          <CardHeader>
            <CardTitle>{t('generated_videos')}</CardTitle>
          </CardHeader>
          <CardContent>
            {generatedVideos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Video className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <p className="text-sm text-muted-foreground">
                  {isGenerating
                    ? t('ready_for_generating')
                    : t('no_videos_generated')}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {generatedVideos.map((video) => (
                  <div
                    key={video.id}
                    className="group relative overflow-hidden rounded-lg border bg-muted/50"
                  >
                    <video
                      src={video.url}
                      controls
                      className="w-full aspect-video object-cover"
                      preload="metadata"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleDownloadVideo(video)}
                        disabled={downloadingVideoId === video.id}
                        className="w-full"
                      >
                        {downloadingVideoId === video.id ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Downloading...
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4 mr-2" />
                            Download Video
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
