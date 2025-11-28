"use client";

/**
 * 宠物视频生成组件
 * Pet Video Generation Component
 */

import type React from "react";
import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import Masonry from "react-masonry-css";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import {
  Upload,
  Loader2,
  Film,
  AlertCircle,
  Sparkles,
  Monitor,
  Smartphone,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/components/ui/tabs";
import { Label } from "@/shared/components/ui/label";
import { cn } from "@/shared/lib/utils";
import { VideoCard, type VideoCardData } from "./video-card";

interface PetVideoGenProps {
  className?: string;
}

type TemplateType = "dog" | "cat";
type Duration = 25 | 50;
type AspectRatio = "16:9" | "9:16";
type GenerationStatus =
  | "idle"
  | "uploading"
  | "identifying_pet"
  | "generating_frame"
  | "generating_video"
  | "applying_watermark"
  | "completed"
  | "failed";

const statusMessages: Record<GenerationStatus, string> = {
  idle: "Ready to create your pet movie",
  uploading: "Finalizing and saving (1 min)...",
  identifying_pet: "Analyzing your pet's features (5-10s)...",
  generating_frame: "Transforming to Pixar style (3 min)...",
  generating_video: "Generating your cinematic movie (25 min)...",
  applying_watermark: "Adding watermark (10-20s)...",
  completed: "Your movie is ready!",
  failed: "Generation failed. Please try again.",
};

interface GalleryItem {
  id: string;
  url: string;  // 显示的视频URL（带水印版本）
  thumbnail?: string;
  prompt?: string;
  timestamp: Date;
  aspectRatio?: AspectRatio;
  isLoading?: boolean;
  progress?: number;
  loadingText?: string;
  isShared?: boolean; // 是否已分享到社区（旧版）
  isPublic?: boolean; // 是否公开分享（新版）
  // 水印相关
  originalVideoUrl?: string;    // 原始无水印视频URL
  watermarkedVideoUrl?: string; // 带水印视频URL
  // 用户信息（公开视频使用）
  userName?: string;
  userImage?: string;
  // 点赞信息
  likeCount?: number;
  isLiked?: boolean;
}

interface StoredTask {
  taskId: string;
  kieTaskId?: string; // KIE视频生成任务ID，用于恢复轮询
  status: GenerationStatus;
  prompt: string;
  startTime: number;
  thumbnail?: string;
  aspectRatio?: AspectRatio;
}

// 各阶段预估时间（毫秒）
const STAGE_DURATIONS: Record<GenerationStatus, number> = {
  idle: 0,
  uploading: 60 * 1000,           // 1分钟
  identifying_pet: 10 * 1000,     // 10秒
  generating_frame: 3 * 60 * 1000, // 3分钟
  generating_video: 25 * 60 * 1000, // 25分钟
  applying_watermark: 30 * 1000,   // 30秒
  completed: 0,
  failed: 0,
};

// 各阶段在总进度中的占比
const STAGE_PROGRESS: Record<GenerationStatus, { start: number; end: number }> = {
  idle: { start: 0, end: 0 },
  uploading: { start: 0, end: 2 },
  identifying_pet: { start: 2, end: 5 },
  generating_frame: { start: 5, end: 15 },
  generating_video: { start: 15, end: 95 },
  applying_watermark: { start: 95, end: 99 },
  completed: { start: 100, end: 100 },
  failed: { start: 0, end: 0 },
};

export function PetVideoGeneration({ className }: PetVideoGenProps) {
  const t = useTranslations("landing.petVideoGen");
  const tCard = useTranslations("landing.videoCard");
  const searchParams = useSearchParams();

  // 获取状态消息的函数
  const getStatusMessage = (status: GenerationStatus): string => {
    return t(`status.${status}`);
  };

  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>("dog");
  const [selectedDuration, setSelectedDuration] = useState<Duration>(25);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<AspectRatio>("16:9");
  const [generationStatus, setGenerationStatus] =
    useState<GenerationStatus>("idle");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "my-generations" | "inspiration"
  >("inspiration");

  const [userItems, setUserItems] = useState<GalleryItem[]>([]);
  const [publicVideos, setPublicVideos] = useState<GalleryItem[]>([]); // 公开分享的视频
  const [loadingPublicVideos, setLoadingPublicVideos] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [pollStartTime, setPollStartTime] = useState<number | null>(null);
  const [isVIP, setIsVIP] = useState(false); // 用户是否是VIP

  // 当前用户数据（简化处理，实际应该从session获取）
  const [currentUser] = useState({
    id: "current-user",
    name: "You",
    image: null,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadingHistoryRef = useRef(false);
  const hasLoadedHistoryRef = useRef(false);
  const stageStartTimeRef = useRef<Record<string, number>>({});

  // Constants
  const POLL_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour
  const POLL_INTERVAL_MS = 3000; // 3 seconds
  const STORAGE_KEY_PREFIX = "pet-video-task-";

  // 基于时间的平滑进度计算
  const getProgressForStatus = useCallback((status: GenerationStatus, currentTaskId?: string, taskStartTime?: number): number => {
    if (status === 'completed') return 100;
    if (status === 'failed' || status === 'idle') return 0;

    const stageProgress = STAGE_PROGRESS[status];
    const stageDuration = STAGE_DURATIONS[status];

    if (!stageDuration || !taskStartTime || !currentTaskId) {
      return stageProgress.start;
    }

    // 获取或设置该阶段的开始时间
    const stageKey = `${currentTaskId}-${status}`;
    if (!stageStartTimeRef.current[stageKey]) {
      stageStartTimeRef.current[stageKey] = Date.now();
    }
    const stageStartTime = stageStartTimeRef.current[stageKey];

    const elapsed = Date.now() - stageStartTime;
    const progressRatio = Math.min(elapsed / stageDuration, 0.95); // 最多到95%，留余地

    const progressRange = stageProgress.end - stageProgress.start;
    const currentProgress = stageProgress.start + (progressRange * progressRatio);

    return Math.min(Math.round(currentProgress), stageProgress.end - 1);
  }, []);

  // 加载用户视频历史
  const loadHistory = useCallback(async () => {
    // 使用ref防止重复加载，避免状态依赖导致的无限循环
    if (loadingHistoryRef.current) return;

    try {
      loadingHistoryRef.current = true;
      setLoadingHistory(true);
      console.log("🔄 Loading video history...");
      const response = await fetch("/api/pet-video/history?limit=20");

      if (response.ok) {
        const data = await response.json();
        console.log("✅ History loaded:", data);

        if (data.success && data.videos) {
          const historyItems: GalleryItem[] = data.videos
            .filter((video: any) => video.status === "completed" && video.finalVideoUrl)
            .map((video: any) => ({
              id: video.id,
              // 优先显示带水印版本，如果没有则使用finalVideoUrl
              url: video.watermarkedVideoUrl || video.finalVideoUrl,
              thumbnail: video.frameImageUrl,
              prompt: `${video.templateType === "dog" ? "Dog" : "Cat"} Hero - ${video.durationSeconds}s`,
              timestamp: new Date(video.createdAt),
              aspectRatio: (video.aspectRatio || "16:9") as AspectRatio,
              isShared: video.isShared || false,
              isPublic: video.isPublic || false, // 是否公开分享
              // 保存原始和水印URL供下载使用
              originalVideoUrl: video.originalVideoUrl,
              watermarkedVideoUrl: video.watermarkedVideoUrl,
              // 点赞数据
              likeCount: video.likeCount || 0,
            }));

          console.log("📹 Filtered videos:", historyItems.length);

          // 合并逻辑：
          // 1. 保留正在加载的项（但如果已完成的项有相同ID，则用完成的替换）
          // 2. 用API返回的数据更新/替换已有项
          // 3. 添加新项
          setUserItems((prev) => {
            const historyMap = new Map(historyItems.map((item) => [item.id, item]));
            const loadingItems = prev.filter((item) => item.isLoading && !historyMap.has(item.id));
            const existingIds = new Set(prev.map((item) => item.id));
            const newItems = historyItems.filter((item) => !existingIds.has(item.id));
            // 更新已存在的项（用API数据替换，包括已完成的loading项）
            const updatedExistingItems = historyItems.filter((item) => existingIds.has(item.id));
            return [...loadingItems, ...updatedExistingItems, ...newItems];
          });

          hasLoadedHistoryRef.current = true;
        }
      } else {
        console.error("❌ History API error:", response.status, await response.text());
      }
    } catch (error) {
      console.error("❌ Failed to load video history:", error);
    } finally {
      loadingHistoryRef.current = false;
      setLoadingHistory(false);
    }
  }, []); // 空依赖数组，函数永远不会重新创建

  // 从 URL 参数设置初始 tab
  useEffect(() => {
    try {
      const tab = searchParams?.get("tab");
      console.log("URL tab parameter:", tab);
      if (tab === "my-generations") {
        setActiveTab("my-generations");
        console.log("Switching to my-generations tab");
      }
    } catch (error) {
      console.error("Error reading search params:", error);
    }
  }, [searchParams]);

  // 加载公开分享的视频
  useEffect(() => {
    loadPublicVideos();
  }, []);

  // 加载公开分享的视频
  const loadPublicVideos = async () => {
    try {
      setLoadingPublicVideos(true);
      const response = await fetch("/api/pet-video/public?limit=20");
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.videos) {
          const items: GalleryItem[] = data.videos.map((video: any) => ({
            id: video.id,
            url: video.watermarkedVideoUrl || video.finalVideoUrl,
            thumbnail: video.frameImageUrl,
            prompt: `${video.templateType === "dog" ? "Dog" : "Cat"} Hero - ${video.durationSeconds}s`,
            timestamp: new Date(video.createdAt),
            aspectRatio: (video.aspectRatio || "16:9") as AspectRatio,
            isPublic: true,
            // 用户信息
            userName: video.userName,
            userImage: video.userImage,
            // 点赞信息
            likeCount: video.likeCount || 0,
            isLiked: video.isLiked || false,
            // 水印相关（VIP下载使用）
            originalVideoUrl: video.originalVideoUrl,
            watermarkedVideoUrl: video.watermarkedVideoUrl,
          }));
          setPublicVideos(items);
        }
      }
    } catch (error) {
      console.error("Failed to load public videos:", error);
    } finally {
      setLoadingPublicVideos(false);
    }
  };

  // Restore ongoing task from localStorage on mount
  useEffect(() => {
    const storedTaskId = localStorage.getItem(`${STORAGE_KEY_PREFIX}current`);
    if (storedTaskId) {
      const taskData = localStorage.getItem(`${STORAGE_KEY_PREFIX}${storedTaskId}`);
      if (taskData) {
        try {
          const task: StoredTask = JSON.parse(taskData);
          const elapsed = Date.now() - task.startTime;
          if (
            !["completed", "failed"].includes(task.status) &&
            elapsed < POLL_TIMEOUT_MS
          ) {
            setTaskId(storedTaskId);
            setGenerationStatus(task.status);
            setActiveTab("my-generations");
            setPollStartTime(task.startTime);

            setUserItems([
              {
                id: storedTaskId,
                url: "",
                prompt: task.prompt,
                timestamp: new Date(task.startTime),
                aspectRatio: task.aspectRatio || "16:9", // 恢复宽高比
                isLoading: true,
                progress: getProgressForStatus(task.status, storedTaskId, task.startTime),
                loadingText: getStatusMessage(task.status),
                thumbnail: task.thumbnail,
              },
            ]);
          } else {
            localStorage.removeItem(`${STORAGE_KEY_PREFIX}${storedTaskId}`);
            localStorage.removeItem(`${STORAGE_KEY_PREFIX}current`);
          }
        } catch (err) {
          console.error("Failed to restore task:", err);
        }
      }
    }
  }, []);

  // 组件挂载时加载用户视频历史
  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 只在挂载时加载一次

  // 检查用户VIP状态
  useEffect(() => {
    const checkVIPStatus = async () => {
      try {
        const response = await fetch('/api/user/subscription/status');
        if (response.ok) {
          const data = await response.json();
          // 如果用户有活跃的订阅，则认为是VIP
          setIsVIP(data.hasActiveSubscription || false);
        }
      } catch (error) {
        console.error('Failed to check VIP status:', error);
        setIsVIP(false);
      }
    };

    checkVIPStatus();
  }, []);

  // 平滑进度更新定时器
  useEffect(() => {
    if (!taskId || generationStatus === "completed" || generationStatus === "failed") {
      return;
    }

    // 每秒更新进度显示
    const progressInterval = setInterval(() => {
      if (pollStartTime && taskId) {
        const currentProgress = getProgressForStatus(generationStatus, taskId, pollStartTime);
        setUserItems((prev) =>
          prev.map((item) =>
            item.id === taskId && item.isLoading
              ? { ...item, progress: currentProgress }
              : item
          )
        );
      }
    }, 1000);

    return () => clearInterval(progressInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId, generationStatus, pollStartTime]);

  // Poll task status
  useEffect(() => {
    if (!taskId || generationStatus === "completed" || generationStatus === "failed") {
      return;
    }

    const startTime = pollStartTime || Date.now();
    const elapsed = Date.now() - startTime;
    if (elapsed > POLL_TIMEOUT_MS) {
      setError(`Generation timeout after ${POLL_TIMEOUT_MS / 60000} minutes`);
      setGenerationStatus("failed");
      setUserItems((prev) => prev.filter((item) => item.id !== taskId));
      cleanupTask(taskId);
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const currentElapsed = Date.now() - startTime;
        if (currentElapsed > POLL_TIMEOUT_MS) {
          setError("Generation timeout");
          setGenerationStatus("failed");
          clearInterval(pollInterval);
          cleanupTask(taskId);
          return;
        }

        const response = await fetch(`/api/pet-video/status/${taskId}`);
        const data = await response.json();

        if (data.success && data.task) {
          const task = data.task;
          const newStatus = task.status as GenerationStatus;

          // 状态变化时重置阶段开始时间
          if (newStatus !== generationStatus) {
            const stageKey = `${taskId}-${newStatus}`;
            stageStartTimeRef.current[stageKey] = Date.now();
          }

          updateTaskInStorage(taskId, newStatus);

          setUserItems((prev) =>
            prev.map((item) =>
              item.id === taskId
                ? {
                    ...item,
                    loadingText: getStatusMessage(newStatus),
                    progress: getProgressForStatus(newStatus, taskId, startTime),
                  }
                : item
            )
          );

          setGenerationStatus(newStatus);

          if (newStatus === "completed") {
            // 优先使用带水印版本，如果没有则使用finalVideoUrl
            const videoUrl = task.watermarkedVideoUrl || task.finalVideoUrl || task.tempVideoUrl;
            setUserItems((prev) =>
              prev.map((item) =>
                item.id === taskId
                  ? {
                      ...item,
                      isLoading: false,
                      url: videoUrl,
                      thumbnail: uploadedImage || undefined,
                      originalVideoUrl: task.originalVideoUrl,
                      watermarkedVideoUrl: task.watermarkedVideoUrl,
                    }
                  : item
              )
            );
            cleanupTask(taskId);
            // 重置表单状态，允许继续生成
            resetFormForNextGeneration();
            // 视频生成完成后刷新列表
            setTimeout(() => loadHistory(), 1000);
          }

          if (newStatus === "failed") {
            setError(task.errorLog || "Generation failed");
            setUserItems((prev) => prev.filter((item) => item.id !== taskId));
            cleanupTask(taskId);
            // 重置表单状态
            resetFormForNextGeneration();
          }
        }
      } catch (err) {
        console.error("Poll error:", err);
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(pollInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId, generationStatus, uploadedImage, pollStartTime]);

  const saveTaskToStorage = (
    taskId: string,
    status: GenerationStatus,
    prompt: string,
    thumbnail?: string,
    aspectRatio?: AspectRatio
  ) => {
    const task: StoredTask = {
      taskId,
      status,
      prompt,
      startTime: Date.now(),
      thumbnail,
      aspectRatio,
    };
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${taskId}`, JSON.stringify(task));
    localStorage.setItem(`${STORAGE_KEY_PREFIX}current`, taskId);
  };

  const updateTaskInStorage = (taskId: string, status: GenerationStatus) => {
    const taskData = localStorage.getItem(`${STORAGE_KEY_PREFIX}${taskId}`);
    if (taskData) {
      const task: StoredTask = JSON.parse(taskData);
      task.status = status;
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${taskId}`, JSON.stringify(task));
    }
  };

  const cleanupTask = (taskId: string) => {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${taskId}`);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}current`);
  };

  // 重置表单状态，允许继续生成新任务
  const resetFormForNextGeneration = () => {
    setTaskId(null);
    setGenerationStatus("idle");
    setPollStartTime(null);
    setUploadedImage(null);
    setUploadedImageUrl(null);
    // 清理阶段时间记录
    stageStartTimeRef.current = {};
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setGenerationStatus("uploading");

    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/pet-video/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Upload failed");
      }

      setUploadedImageUrl(data.url);
      setGenerationStatus("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setGenerationStatus("idle");
    }
  };

  const handleGenerate = async () => {
    if (!uploadedImageUrl) {
      setError(t("uploadPhotoFirst"));
      return;
    }

    setError(null);
    setActiveTab("my-generations");

    const currentStartTime = Date.now();
    const loadingId = currentStartTime.toString();
    const promptText = selectedTemplate === "dog"
      ? t("prompt.dogHero", { duration: selectedDuration.toString() })
      : t("prompt.catHero", { duration: selectedDuration.toString() });
    const currentThumbnail = uploadedImage;
    const currentAspectRatio = selectedAspectRatio;
    const currentTemplate = selectedTemplate;
    const currentDuration = selectedDuration;
    const currentImageUrl = uploadedImageUrl;

    // 立即添加loading项到列表
    const loadingItem: GalleryItem = {
      id: loadingId,
      url: "",
      prompt: promptText,
      timestamp: new Date(),
      aspectRatio: currentAspectRatio,
      isLoading: true,
      progress: 2,
      loadingText: getStatusMessage("identifying_pet"),
      thumbnail: currentThumbnail || undefined,
    };

    setUserItems((prev) => [loadingItem, ...prev]);

    // 立即重置表单，允许用户继续添加新任务
    setUploadedImage(null);
    setUploadedImageUrl(null);

    // 设置当前任务状态（用于进度跟踪）
    setGenerationStatus("identifying_pet");
    setPollStartTime(currentStartTime);

    try {
      const response = await fetch("/api/pet-video/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateType: currentTemplate,
          petImageUrl: currentImageUrl,
          durationSeconds: currentDuration,
          aspectRatio: currentAspectRatio,
        }),
      });

      // 检查响应是否为 JSON，避免解析非 JSON 错误响应
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        throw new Error(text || `Server error: ${response.status}`);
      }

      const data = await response.json();

      // 处理积分不足错误
      if (response.status === 402) {
        const errorMsg = t("insufficientCredits", { required: data.required, available: data.available });
        throw new Error(errorMsg);
      }

      if (!data.success) {
        throw new Error(data.error || "Generation failed");
      }

      // 更新loading项的ID为真实taskId
      setUserItems((prev) =>
        prev.map((item) =>
          item.id === loadingId ? { ...item, id: data.taskId } : item
        )
      );
      setTaskId(data.taskId);

      // 初始化阶段开始时间
      stageStartTimeRef.current[`${data.taskId}-identifying_pet`] = currentStartTime;

      saveTaskToStorage(
        data.taskId,
        "identifying_pet",
        promptText,
        currentThumbnail || undefined,
        currentAspectRatio
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
      setGenerationStatus("failed");
      setUserItems((prev) => prev.filter((item) => item.id !== loadingId));
    }
  };

  return (
    <div className={cn("w-full max-w-[1200px] mx-auto p-4", className)}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT PANEL - Configuration (保持原有代码) */}
        <Card className="lg:col-span-4 border-border bg-zinc-900 shadow-lg h-fit">
          <CardContent className="px-4 py-0 space-y-3">
            <div>
              <h2 className="text-lg font-semibold mb-1">{t("title")}</h2>
              <p className="text-xs text-muted-foreground">
                {t("subtitle")}
              </p>
            </div>

            <div className="space-y-4">
              {/* Image Upload */}
              <div className="space-y-1.5">
                <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  {t("petPhoto")}
                </Label>
                <div
                  className="relative group w-full aspect-[16/9] rounded-lg border-2 border-dashed border-border hover:border-primary/50 bg-background/50 transition-all cursor-pointer overflow-hidden"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploadedImage ? (
                    <>
                      <Image
                        src={uploadedImage}
                        alt="Uploaded pet"
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <p className="text-white text-xs font-medium">
                          {t("clickToChange")}
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div className="text-center px-4">
                        <p className="text-xs font-medium text-foreground">
                          {t("uploadPrompt")}
                        </p>
                        <p className="text-[10px] mt-0.5">
                          {t("uploadHint")}
                        </p>
                      </div>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </div>
              </div>

              {/* Template Selection */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">{t("storyTemplate")}</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(["dog", "cat"] as const).map((template) => (
                    <div
                      key={template}
                      onClick={() => setSelectedTemplate(template)}
                      className={cn(
                        "flex items-center justify-center gap-2 p-2 rounded-lg border cursor-pointer transition-all",
                        selectedTemplate === template
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/50 bg-background hover:bg-muted"
                      )}
                    >
                      <div
                        className={cn(
                          "w-3 h-3 rounded-full border-2 flex items-center justify-center",
                          selectedTemplate === template
                            ? "border-primary"
                            : "border-muted-foreground"
                        )}
                      >
                        {selectedTemplate === template && (
                          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        )}
                      </div>
                      <span className="text-xs font-medium capitalize">
                        {template}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {t("christmasStory", { pet: selectedTemplate })}
                </p>
              </div>

              {/* Duration Selection */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">{t("videoDuration")}</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div
                    onClick={() => setSelectedDuration(25)}
                    className={cn(
                      "flex flex-col items-center gap-1 p-2 rounded-lg border cursor-pointer transition-all",
                      selectedDuration === 25
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/50 bg-background hover:bg-muted"
                    )}
                  >
                    <div
                      className={cn(
                        "w-3 h-3 rounded-full border-2 flex items-center justify-center",
                        selectedDuration === 25
                          ? "border-primary"
                          : "border-muted-foreground"
                      )}
                    >
                      {selectedDuration === 25 && (
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      )}
                    </div>
                    <span className="text-xs font-medium">25s</span>
                    <span className="text-[10px] text-muted-foreground">
                      70 {t("credits")}
                    </span>
                  </div>

                  <div className="flex flex-col items-center gap-1 p-2 rounded-lg border opacity-50 cursor-not-allowed border-border/50 bg-background/50">
                    <div className="w-3 h-3 rounded-full border-2 border-muted-foreground" />
                    <span className="text-xs font-medium">50s</span>
                    <span className="text-[10px] text-muted-foreground">
                      {t("soon")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Aspect Ratio Selection */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">{t("videoFormat")}</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div
                    onClick={() => setSelectedAspectRatio("16:9")}
                    className={cn(
                      "flex items-center justify-center gap-2 p-2 rounded-lg border cursor-pointer transition-all",
                      selectedAspectRatio === "16:9"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/50 bg-background hover:bg-muted"
                    )}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">16:9</span>
                  </div>
                  <div
                    onClick={() => setSelectedAspectRatio("9:16")}
                    className={cn(
                      "flex items-center justify-center gap-2 p-2 rounded-lg border cursor-pointer transition-all",
                      selectedAspectRatio === "9:16"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/50 bg-background hover:bg-muted"
                    )}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">9:16</span>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {selectedAspectRatio === "16:9" ? t("landscape") : t("portrait")}
                </p>
              </div>

              {/* Error Display */}
              {error && (
                <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                  <div className="flex items-center gap-2 text-red-500">
                    <AlertCircle className="w-3 h-3" />
                    <p className="text-[10px]">{error}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="pt-3 mt-auto space-y-3">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span>{t("creditsRequired")}</span>
                </div>
                <span className="font-medium text-foreground">
                  {selectedDuration === 25 ? "70" : "140"} {t("credits")}
                </span>
              </div>

              <Button
                className="w-full h-10 text-sm font-medium bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20 rounded-xl"
                onClick={handleGenerate}
                disabled={!uploadedImageUrl}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {t("createMovie")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* RIGHT PANEL - Gallery */}
        <Card className="lg:col-span-8 border-border bg-zinc-900 shadow-lg flex flex-col min-h-[600px]">
          <CardContent className="px-3 py-0 h-full flex flex-col">
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as any)}
              className="w-full h-full flex flex-col"
            >
              <div className="flex items-center justify-start mb-3">
                <TabsList className="bg-transparent border-0 p-0 h-8 gap-2">
                  <TabsTrigger
                    value="inspiration"
                    className="h-7 px-3 text-xs rounded-full border border-border/50 bg-background/10 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary transition-all"
                  >
                    {t("tabs.inspiration")}
                  </TabsTrigger>
                  <TabsTrigger
                    value="my-generations"
                    className="h-7 px-3 text-xs rounded-full border border-border/50 bg-background/10 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary transition-all"
                  >
                    {t("tabs.myGenerations")}
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 rounded-2xl overflow-hidden">
                {/* Inspiration标签 - 显示公开分享的视频（包含系统示例，按点赞数排序） */}
                <TabsContent value="inspiration" className="mt-0 h-full">
                  {loadingPublicVideos && publicVideos.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-3 min-h-[300px]">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <p className="text-sm">{t("loading.inspiration")}</p>
                    </div>
                  ) : publicVideos.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-3 min-h-[300px]">
                      <div className="w-12 h-12 rounded-full bg-muted/10 flex items-center justify-center">
                        <Film className="w-6 h-6 opacity-50" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-foreground">
                          {t("empty.noVideos")}
                        </p>
                        <p className="text-xs max-w-xs mx-auto mt-1">
                          {t("empty.beFirst")}
                        </p>
                      </div>
                    </div>
                  ) : (
                  <Masonry
                    breakpointCols={{
                      default: 2,
                      1024: 2,
                      640: 1,
                    }}
                    className="flex -ml-4 w-auto"
                    columnClassName="pl-4 bg-clip-padding"
                  >
                    {/* 公开分享的视频（包含系统示例，按点赞数排序） */}
                    {publicVideos.map((item) => {
                      const videoData: VideoCardData = {
                        id: item.id,
                        videoUrl: item.url,
                        thumbnailUrl: item.thumbnail,
                        title: item.prompt,
                        user: {
                          name: item.userName || tCard("anonymous"),
                          avatarUrl: item.userImage || undefined,
                        },
                        likeCount: item.likeCount || 0,
                        isLiked: item.isLiked || false,
                        aspectRatio: item.aspectRatio,
                        isPublic: true,
                        // 水印相关（公开视频也支持下载）
                        originalVideoUrl: item.originalVideoUrl,
                        watermarkedVideoUrl: item.watermarkedVideoUrl || item.url,
                        isVIP: isVIP,
                      };

                      return (
                        <VideoCard
                          key={`public-${item.id}`}
                          data={videoData}
                          variant="inspiration"
                          actions={{
                            onLike: (id, newLikeCount, isLiked) => {
                              // 同步更新 userItems 中相同视频的点赞数
                              setUserItems((prev) =>
                                prev.map((i) =>
                                  i.id === id
                                    ? { ...i, likeCount: newLikeCount ?? (i.likeCount || 0) }
                                    : i
                                )
                              );
                              // 同步更新 publicVideos 中的点赞数
                              setPublicVideos((prev) =>
                                prev.map((i) =>
                                  i.id === id
                                    ? { ...i, likeCount: newLikeCount ?? (i.likeCount || 0), isLiked }
                                    : i
                                )
                              );
                            },
                          }}
                        />
                      );
                    })}

                  </Masonry>
                  )}
                </TabsContent>

                {/* My Generations标签 - 用户的视频 */}
                <TabsContent value="my-generations" className="mt-0 h-full">
                  {loadingHistory && userItems.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-3 min-h-[300px]">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <p className="text-sm">{t("loading.yourVideos")}</p>
                    </div>
                  ) : userItems.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-3 min-h-[300px]">
                      <div className="w-12 h-12 rounded-full bg-muted/10 flex items-center justify-center">
                        <Film className="w-6 h-6 opacity-50" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-foreground">
                          {t("empty.noGenerations")}
                        </p>
                        <p className="text-xs max-w-xs mx-auto mt-1">
                          {t("empty.createFirst")}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <Masonry
                      breakpointCols={{
                        default: 2,
                        1024: 2,
                        640: 1,
                      }}
                      className="flex -ml-4 w-auto"
                      columnClassName="pl-4 bg-clip-padding"
                    >
                      {userItems.map((item) => {
                        const videoData: VideoCardData = {
                          id: item.id,
                          videoUrl: item.url,  // 显示带水印版本
                          thumbnailUrl: item.thumbnail,
                          title: item.prompt,
                          user: {
                            name: currentUser.name,
                            avatarUrl: currentUser.image || undefined,
                            avatarColor: "from-primary to-primary/80",
                          },
                          likeCount: item.likeCount || 0,
                          aspectRatio: item.aspectRatio,
                          isShared: item.isShared,
                          isPublic: item.isPublic, // 传递公开分享状态
                          isLoading: item.isLoading,
                          progress: item.progress,
                          loadingText: item.loadingText,
                          // 水印相关
                          originalVideoUrl: item.originalVideoUrl,
                          watermarkedVideoUrl: item.watermarkedVideoUrl,
                          isVIP: isVIP,  // 传递VIP状态
                        };

                        return (
                          <VideoCard
                            key={item.id}
                            data={videoData}
                            variant="user"
                            actions={{
                              onLike: (id, newLikeCount, isLiked) => {
                                // 同步更新 userItems 中的点赞数
                                setUserItems((prev) =>
                                  prev.map((i) =>
                                    i.id === id
                                      ? { ...i, likeCount: newLikeCount ?? (i.likeCount || 0) }
                                      : i
                                  )
                                );
                                // 同步更新 publicVideos 中相同视频的点赞数
                                setPublicVideos((prev) =>
                                  prev.map((i) =>
                                    i.id === id
                                      ? { ...i, likeCount: newLikeCount ?? (i.likeCount || 0), isLiked }
                                      : i
                                  )
                                );
                              },
                              onDownload: (id) => {
                                // VideoCard 内部已处理下载
                              },
                              onShare: (id) => {
                                // 分享后更新本地状态
                                setUserItems((prev) =>
                                  prev.map((i) =>
                                    i.id === id ? { ...i, isPublic: true } : i
                                  )
                                );
                                // 立即将当前视频添加到公开列表开头（置顶）
                                const sharedItem = userItems.find((i) => i.id === id);
                                if (sharedItem) {
                                  setPublicVideos((prev) => {
                                    // 避免重复添加
                                    const filtered = prev.filter((v) => v.id !== id);
                                    return [{
                                      ...sharedItem,
                                      isPublic: true,
                                      userName: currentUser.name,
                                      userImage: currentUser.image || undefined,
                                    }, ...filtered];
                                  });
                                }
                              },
                              onCopyLink: (id) => {
                                // 复制链接后更新本地状态
                                setUserItems((prev) =>
                                  prev.map((i) =>
                                    i.id === id ? { ...i, isPublic: true } : i
                                  )
                                );
                                // 立即将当前视频添加到公开列表开头（置顶）
                                const sharedItem = userItems.find((i) => i.id === id);
                                if (sharedItem) {
                                  setPublicVideos((prev) => {
                                    const filtered = prev.filter((v) => v.id !== id);
                                    return [{
                                      ...sharedItem,
                                      isPublic: true,
                                      userName: currentUser.name,
                                      userImage: currentUser.image || undefined,
                                    }, ...filtered];
                                  });
                                }
                              },
                              onMakePrivate: (id) => {
                                // 取消分享后更新 My Generations 中的状态（移除绿点）
                                setUserItems((prev) =>
                                  prev.map((i) =>
                                    i.id === id ? { ...i, isPublic: false } : i
                                  )
                                );
                                // 从 Inspiration 列表中移除该视频
                                setPublicVideos((prev) =>
                                  prev.filter((v) => v.id !== id)
                                );
                              },
                              onReport: (id) => console.log("Report:", id),
                            }}
                          />
                        );
                      })}
                    </Masonry>
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
