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
  Music,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/components/ui/tabs";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { cn } from "@/shared/lib/utils";
import { Textarea } from "@/shared/components/ui/textarea";
import { Input } from "@/shared/components/ui/input";
import { VideoCard, type VideoCardData } from "./video-card";
import { CustomScriptDialog } from "./custom-script-dialog";
import { VIDEO_STYLES, type VideoStyleId } from "@/shared/services/custom-script/types";
import { toast } from "sonner";

interface PetVideoGenProps {
  className?: string;
}

type TemplateType = "dog" | "cat" | "custom";
type Duration = 60; // 1分钟模板（4个场景 x 15秒）
type AspectRatio = "16:9" | "9:16";
type GenerationStatus =
  | "idle"
  | "uploading"
  | "identifying_pet"
  | "generating_frame"
  | "generating_video"
  | "applying_watermark"
  | "completed"
  | "failed"
  // Rainbow Bridge 任务额外状态
  | "generating_character_sheet"
  | "generating_frames"
  | "generating_videos"
  | "merging";

const statusMessages: Record<GenerationStatus, string> = {
  idle: "Ready to create your pet movie",
  uploading: "Finalizing and saving (1 min)...",
  identifying_pet: "Analyzing your pet's features (5-10s)...",
  generating_frame: "Transforming to Pixar style (3 min)...",
  generating_video: "Generating your cinematic movie (25 min)...",
  applying_watermark: "Adding watermark (10-20s)...",
  completed: "Your movie is ready!",
  failed: "Generation failed. Please try again.",
  // Rainbow Bridge 额外状态
  generating_character_sheet: "Creating character reference...",
  generating_frames: "Generating scene frames...",
  generating_videos: "Generating scene videos...",
  merging: "Merging video clips...",
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
  isFailed?: boolean; // 是否生成失败
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
  // Rainbow Bridge 额外状态
  generating_character_sheet: 60 * 1000,  // 1分钟
  generating_frames: 5 * 60 * 1000,       // 5分钟
  generating_videos: 20 * 60 * 1000,      // 20分钟
  merging: 60 * 1000,                     // 1分钟
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
  // Rainbow Bridge 额外状态
  generating_character_sheet: { start: 2, end: 10 },
  generating_frames: { start: 10, end: 30 },
  generating_videos: { start: 30, end: 90 },
  merging: { start: 90, end: 99 },
};

export function PetVideoGeneration({ className }: PetVideoGenProps) {
  const t = useTranslations("landing.petVideoGen");
  const tCard = useTranslations("landing.videoCard");
  const tScript = useTranslations("landing.customScript"); // 自定义剧本翻译
  const searchParams = useSearchParams();

  // 获取状态消息的函数（使用 useCallback 避免不必要的重渲染）
  const getStatusMessage = useCallback((status: GenerationStatus): string => {
    return t(`status.${status}`);
  }, [t]);

  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>("dog");
  const [selectedDuration] = useState<Duration>(60); // 固定1分钟
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
  const [showCustomScriptDialog, setShowCustomScriptDialog] = useState(false); // 自定义剧本弹窗
  const [editingScriptId, setEditingScriptId] = useState<string | undefined>(undefined); // 正在编辑的剧本ID

  // 自定义剧本输入状态（放在主界面）
  const [customUserPrompt, setCustomUserPrompt] = useState("");
  const [customMusicPrompt, setCustomMusicPrompt] = useState("");
  const [customDuration, setCustomDuration] = useState<60 | 120>(60);
  const [customStyleId, setCustomStyleId] = useState<VideoStyleId>("pixar-3d");
  const [customStyleText, setCustomStyleText] = useState("");
  const [isCreatingScript, setIsCreatingScript] = useState(false);

  // 自定义剧本列表
  interface CustomScriptItem {
    id: string;
    status: string;
    storyTitle: string | null;
    durationSeconds: number;
    aspectRatio: string;
    creditsUsed: number;
    createdAt: string;
    completedScenes: number;
    totalScenes: number;
  }
  const [customScripts, setCustomScripts] = useState<CustomScriptItem[]>([]);
  const [loadingScripts, setLoadingScripts] = useState(false);

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

  // 基于时间的平滑进度计算
  const getProgressForStatus = useCallback((status: GenerationStatus, currentTaskId?: string, taskStartTime?: number): number => {
    if (status === 'completed') return 100;
    if (status === 'failed' || status === 'idle') return 0;

    const stageProgress = STAGE_PROGRESS[status];
    const stageDuration = STAGE_DURATIONS[status];

    // 防御性检查：如果状态不在预定义范围内，返回默认进度
    if (!stageProgress) {
      console.warn(`Unknown generation status: ${status}`);
      return 50; // 返回中间值作为默认
    }

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

  // 根据Rainbow Bridge任务状态获取显示状态和进度
  // 直接使用API返回的状态，翻译文件中已添加对应的key
  const getStatusFromApiTask = (video: any): { status: GenerationStatus; progress: number } => {
    const apiStatus = video.status;
    // Rainbow Bridge 任务状态映射
    switch (apiStatus) {
      case 'pending':
        return { status: 'identifying_pet', progress: 2 };
      case 'generating_character_sheet':
        return { status: 'generating_character_sheet', progress: 5 };
      case 'generating_frames':
        return { status: 'generating_frames', progress: 15 };
      case 'generating_videos':
        return { status: 'generating_videos', progress: 50 };
      case 'merging':
        return { status: 'merging', progress: 85 };
      case 'applying_watermark':
        return { status: 'applying_watermark', progress: 95 };
      case 'completed':
        return { status: 'completed', progress: 100 };
      case 'failed':
        return { status: 'failed', progress: 0 };
      default:
        return { status: 'generating_video', progress: 30 };
    }
  };

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
          // 完成的视频
          const completedItems: GalleryItem[] = data.videos
            .filter((video: any) => video.status === "completed" && video.finalVideoUrl)
            .map((video: any) => ({
              id: video.id,
              // 优先显示带水印版本，如果没有则使用finalVideoUrl
              url: video.watermarkedVideoUrl || video.finalVideoUrl,
              thumbnail: undefined, // 不使用缩略图，直接显示视频
              prompt: `${video.templateType === "dog" ? "Dog" : "Cat"} Memorial - ${video.durationSeconds}s`,
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

          // 超时阈值：2小时（超过这个时间的进行中任务视为卡住/失败）
          const STUCK_TIMEOUT_MS = 2 * 60 * 60 * 1000;
          const now = Date.now();

          // 失败的任务
          const failedVideos = data.videos.filter((video: any) => video.status === "failed");
          const failedItems: GalleryItem[] = failedVideos.map((video: any) => ({
            id: video.id,
            url: "",
            thumbnail: video.petImageUrl,
            prompt: `${video.templateType === "dog" ? "Dog" : "Cat"} Memorial`,
            timestamp: new Date(video.createdAt),
            aspectRatio: (video.aspectRatio || "16:9") as AspectRatio,
            isFailed: true,
            loadingText: t("status.failed"),
          }));

          // 正在生成中的视频（过滤掉超时的任务）
          const inProgressVideos = data.videos.filter((video: any) => {
            if (video.status === "completed" || video.status === "failed") return false;
            // 检查是否超时（超过2小时视为卡住）
            const createdAt = new Date(video.createdAt).getTime();
            const isStuck = (now - createdAt) > STUCK_TIMEOUT_MS;
            if (isStuck) {
              console.log(`⚠️ Task ${video.id} is stuck (created ${Math.round((now - createdAt) / 60000)} minutes ago)`);
            }
            return !isStuck;
          });

          const inProgressItems: GalleryItem[] = inProgressVideos.map((video: any) => {
            const { status, progress } = getStatusFromApiTask(video);
            return {
              id: video.id,
              url: "",
              thumbnail: video.petImageUrl,
              prompt: `${video.templateType === "dog" ? "Dog" : "Cat"} Memorial`,
              timestamp: new Date(video.createdAt),
              aspectRatio: (video.aspectRatio || "16:9") as AspectRatio,
              isLoading: true,
              progress,
              loadingText: t(`status.${status}`),
            };
          });

          console.log("📹 Completed videos:", completedItems.length);
          console.log("⏳ In-progress videos:", inProgressItems.length);
          console.log("❌ Failed videos:", failedItems.length);

          const historyItems = [...failedItems, ...inProgressItems, ...completedItems];

          // 合并逻辑：
          // 1. 保留本地正在加载的项（但如果API返回相同ID，则用API数据替换）
          // 2. 用API返回的数据更新/替换已有项
          // 3. 添加新项
          setUserItems((prev) => {
            const historyMap = new Map(historyItems.map((item) => [item.id, item]));
            // 保留本地loading项（如果API没有返回该ID的数据）
            const localOnlyLoadingItems = prev.filter((item) => item.isLoading && !historyMap.has(item.id));
            const existingIds = new Set(prev.map((item) => item.id));
            const newItems = historyItems.filter((item) => !existingIds.has(item.id));
            // 更新已存在的项（用API数据替换，包括已完成的loading项）
            const updatedExistingItems = historyItems.filter((item) => existingIds.has(item.id));
            return [...localOnlyLoadingItems, ...updatedExistingItems, ...newItems];
          });

          // 如果有进行中的任务且当前没有轮询，启动对第一个进行中任务的轮询
          if (inProgressVideos.length > 0 && !taskId) {
            const firstInProgress = inProgressVideos[0];
            console.log("🔄 Resuming polling for in-progress task:", firstInProgress.id);
            // 设置任务ID以启动轮询
            setTaskId(firstInProgress.id);
            const { status } = getStatusFromApiTask(firstInProgress);
            setGenerationStatus(status);
            setPollStartTime(new Date(firstInProgress.createdAt).getTime());
            setActiveTab("my-generations");
          }

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
  }, [t]); // 添加 t 依赖

  // 加载用户的自定义剧本列表
  const loadCustomScripts = useCallback(async () => {
    try {
      setLoadingScripts(true);
      console.log("🔄 Loading custom scripts...");
      const response = await fetch("/api/custom-script?limit=20");

      const data = await response.json();
      console.log("📦 Custom scripts API response:", response.status, data);

      if (response.ok && data.success && data.scripts) {
        console.log("📋 All scripts:", data.scripts);

        // 过滤出未完成的剧本（draft, creating, merging 状态）
        const inProgressScripts = data.scripts
          .filter((script: any) => {
            const isInProgress = script.status !== 'completed' && script.status !== 'failed';
            console.log(`📝 Script ${script.id}: status=${script.status}, inProgress=${isInProgress}`);
            return isInProgress;
          })
          .map((script: any) => ({
            id: script.id,
            status: script.status,
            storyTitle: script.storyTitle,
            durationSeconds: script.durationSeconds,
            aspectRatio: script.aspectRatio,
            creditsUsed: script.creditsUsed,
            createdAt: script.createdAt,
            completedScenes: 0, // 需要从详情接口获取
            totalScenes: script.durationSeconds / 15, // 每个场景15秒
          }));
        console.log("✅ In-progress scripts:", inProgressScripts);
        setCustomScripts(inProgressScripts);

        // 将已完成的剧本视频添加到 userItems
        const completedScriptVideos: GalleryItem[] = data.scripts
          .filter((script: any) => script.status === 'completed' && script.finalVideoUrl)
          .map((script: any) => ({
            id: `custom-script-${script.id}`,
            url: script.finalVideoUrl,
            thumbnail: undefined, // 自定义剧本暂无缩略图
            prompt: script.storyTitle || 'Custom Script',
            timestamp: new Date(script.createdAt),
            aspectRatio: (script.aspectRatio || '16:9') as AspectRatio,
            isShared: false,
            isPublic: false,
            originalVideoUrl: script.finalVideoUrl,
            watermarkedVideoUrl: undefined,
          }));

        if (completedScriptVideos.length > 0) {
          console.log("✅ Completed script videos:", completedScriptVideos);
          // 合并到 userItems，避免重复
          setUserItems((prev) => {
            const existingIds = new Set(prev.map(item => item.id));
            const newVideos = completedScriptVideos.filter(v => !existingIds.has(v.id));
            if (newVideos.length > 0) {
              // 按时间排序，最新的在前
              return [...prev, ...newVideos].sort((a, b) =>
                b.timestamp.getTime() - a.timestamp.getTime()
              );
            }
            return prev;
          });
        }
      } else {
        console.log("⚠️ No scripts or error:", data.error);
      }
    } catch (error) {
      console.error("❌ Failed to load custom scripts:", error);
    } finally {
      setLoadingScripts(false);
    }
  }, []);

  // 打开剧本编辑对话框
  const handleEditScript = (scriptId: string) => {
    setEditingScriptId(scriptId);
    setShowCustomScriptDialog(true);
  };

  // 从 URL 参数设置初始 tab 和初始图片
  useEffect(() => {
    try {
      const tab = searchParams?.get("tab");
      console.log("URL tab parameter:", tab);
      if (tab === "my-generations") {
        setActiveTab("my-generations");
        console.log("Switching to my-generations tab");
      }

      // 从 URL 参数获取初始图片（从 pet-memorial 跳转过来）
      const initialImage = searchParams?.get("image");
      if (initialImage && !uploadedImage) {
        console.log("Setting initial image from URL:", initialImage);
        setUploadedImage(initialImage);
        setUploadedImageUrl(initialImage);
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
            thumbnail: undefined, // 不使用缩略图，直接显示视频
            prompt: `${video.templateType === "dog" ? "Dog" : "Cat"} Memorial - ${video.durationSeconds}s`,
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

  // 组件挂载时清理旧版 localStorage 数据（一次性迁移）
  useEffect(() => {
    try {
      // 清理旧版 pet-video-task-* 格式的 localStorage 数据
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('pet-video-task-')) {
          keysToRemove.push(key);
        }
      }
      if (keysToRemove.length > 0) {
        keysToRemove.forEach(key => localStorage.removeItem(key));
        console.log('🗑️ Cleaned up legacy localStorage:', keysToRemove.length, 'items');
      }
    } catch (e) {
      // 忽略清理错误
    }
  }, []);

  // 组件挂载时加载用户视频历史和自定义剧本
  useEffect(() => {
    loadHistory();
    loadCustomScripts();
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
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const currentElapsed = Date.now() - startTime;
        if (currentElapsed > POLL_TIMEOUT_MS) {
          setError("Generation timeout");
          setGenerationStatus("failed");
          clearInterval(pollInterval);
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
            // 重置表单状态，允许继续生成
            resetFormForNextGeneration();
            // 视频生成完成后刷新列表
            setTimeout(() => loadHistory(), 1000);
          }

          if (newStatus === "failed") {
            setError(task.errorLog || "Generation failed");
            setUserItems((prev) => prev.filter((item) => item.id !== taskId));
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

  // 删除失败或卡住的任务（乐观更新：先更新UI，失败再回滚）
  const handleDeleteTask = async (taskIdToDelete: string) => {
    // 1. 保存当前项用于回滚
    const deletedItem = userItems.find((item) => item.id === taskIdToDelete);

    // 2. 乐观更新：立即从列表中移除
    setUserItems((prev) => prev.filter((item) => item.id !== taskIdToDelete));
    toast.success(t("deleteSuccess"));

    // 3. 后台调用API
    try {
      const response = await fetch(`/api/pet-video/delete?taskId=${taskIdToDelete}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        // API失败：回滚UI
        if (deletedItem) {
          setUserItems((prev) => [deletedItem, ...prev]);
        }
        const data = await response.json();
        toast.error(data.error || t("deleteFailed"));
        console.error('Delete failed:', data.error);
      } else {
        console.log(`🗑️ Task ${taskIdToDelete} deleted`);
      }
    } catch (error) {
      // 网络错误：回滚UI
      if (deletedItem) {
        setUserItems((prev) => [deletedItem, ...prev]);
      }
      toast.error(t("deleteFailed"));
      console.error('Delete error:', error);
    }
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

  // 创建自定义剧本并打开编辑弹窗
  const handleCreateCustomScript = async () => {
    if (!uploadedImageUrl) {
      setError(t("uploadPhotoFirst"));
      return;
    }

    if (!customUserPrompt.trim()) {
      setError(tScript("errorPromptRequired"));
      return;
    }

    if (customStyleId === "custom" && !customStyleText.trim()) {
      setError(tScript("errorCustomStyleRequired"));
      return;
    }

    setIsCreatingScript(true);
    setError(null);

    try {
      const response = await fetch("/api/custom-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          petImageUrl: uploadedImageUrl,
          userPrompt: customUserPrompt.trim(),
          musicPrompt: customMusicPrompt.trim() || undefined,
          durationSeconds: customDuration,
          aspectRatio: selectedAspectRatio,
          styleId: customStyleId,
          customStyle: customStyleId === "custom" ? customStyleText.trim() : undefined,
        }),
      });

      const data = await response.json();

      // 处理积分不足错误
      if (response.status === 402) {
        throw new Error(t("insufficientCredits", { required: data.required, available: data.available }));
      }

      if (!data.success) {
        throw new Error(data.error || "Failed to create script");
      }

      // 创建成功，设置编辑ID并打开弹窗
      setEditingScriptId(data.scriptId);
      setShowCustomScriptDialog(true);

      // 重置表单
      setCustomUserPrompt("");
      setCustomMusicPrompt("");
      setCustomDuration(60);
      setCustomStyleId("pixar-3d");
      setCustomStyleText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create script");
    } finally {
      setIsCreatingScript(false);
    }
  };

  const handleGenerate = async () => {
    if (!uploadedImageUrl) {
      setError(t("uploadPhotoFirst"));
      return;
    }

    // 自定义剧本功能暂时下架
    if (selectedTemplate === "custom") {
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
      // TODO: 替换为新的 Rainbow Bridge API
      // 新流程: 生成参考卡 → 并发生成4个首帧 → 首帧完成即生成视频 → 合并 → 加水印
      const response = await fetch("/api/pet-video/generate-v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          petType: currentTemplate as "dog" | "cat",
          petImageUrl: currentImageUrl,
          aspectRatio: currentAspectRatio,
        }),
      });

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

              {/* Template Selection - 下拉选择 */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">{t("storyTemplate")}</Label>
                <Select
                  value={selectedTemplate}
                  onValueChange={(value: TemplateType) => {
                    setSelectedTemplate(value);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("storyTemplate")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dog">
                      <div className="flex items-center gap-2">
                        <span>🐕</span>
                        <span>{t("templateDog")}</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="cat">
                      <div className="flex items-center gap-2">
                        <span>🐈</span>
                        <span>{t("templateCat")}</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {t("templateDescription", { pet: selectedTemplate === "dog" ? "🐕" : "🐈" })}
                </p>
              </div>

              {/* 自定义剧本配置 - 只在选择custom时显示 */}
              {selectedTemplate === "custom" && (
                <>
                  {/* 故事提示词 */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">{tScript("promptLabel")}</Label>
                    <Textarea
                      value={customUserPrompt}
                      onChange={(e) => setCustomUserPrompt(e.target.value)}
                      placeholder={tScript("promptPlaceholder")}
                      className="min-h-[80px] resize-none text-sm"
                    />
                  </div>

                  {/* 配乐 */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium flex items-center gap-1.5">
                      <Music className="w-3 h-3" />
                      {tScript("musicLabel")}
                      <span className="text-[10px] text-muted-foreground">({tScript("optional")})</span>
                    </Label>
                    <Input
                      value={customMusicPrompt}
                      onChange={(e) => setCustomMusicPrompt(e.target.value)}
                      placeholder={tScript("musicPlaceholder")}
                      className="h-8 text-sm"
                    />
                  </div>

                  {/* 风格选择 - 使用下拉 */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">{tScript("styleLabel")}</Label>
                    <Select
                      value={customStyleId}
                      onValueChange={(v: VideoStyleId) => setCustomStyleId(v)}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {VIDEO_STYLES.map((style) => (
                          <SelectItem key={style.id} value={style.id}>
                            <span>{style.name}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {customStyleId === "custom" && (
                      <Textarea
                        value={customStyleText}
                        onChange={(e) => setCustomStyleText(e.target.value)}
                        placeholder={tScript("customStylePlaceholder")}
                        className="min-h-[60px] resize-none text-sm mt-2"
                      />
                    )}
                  </div>

                  {/* 时长选择 */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">{tScript("durationLabel")}</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div
                        onClick={() => setCustomDuration(60)}
                        className={cn(
                          "flex flex-col items-center gap-0.5 p-2 rounded-lg border cursor-pointer transition-all",
                          customDuration === 60
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border/50 bg-background hover:bg-muted"
                        )}
                      >
                        <span className="text-xs font-medium">1 {tScript("minute")}</span>
                        <span className="text-[10px] text-muted-foreground">4 {tScript("scenes")}</span>
                      </div>
                      <div
                        onClick={() => setCustomDuration(120)}
                        className={cn(
                          "flex flex-col items-center gap-0.5 p-2 rounded-lg border cursor-pointer transition-all",
                          customDuration === 120
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border/50 bg-background hover:bg-muted"
                        )}
                      >
                        <span className="text-xs font-medium">2 {tScript("minutes")}</span>
                        <span className="text-[10px] text-muted-foreground">8 {tScript("scenes")}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Duration: 固定1分钟，显示积分信息 */}
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Film className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">{t("videoDuration")}: 60s</span>
                  </div>
                  <span className="text-sm font-medium text-primary">15 {t("credits")}</span>
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
                  {selectedTemplate === "custom"
                    ? `${customDuration === 60 ? "60" : "100"}+`
                    : "15"
                  } {t("credits")}
                </span>
              </div>

              <Button
                className="w-full h-10 text-sm font-medium bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20 rounded-xl"
                onClick={handleGenerate}
                disabled={!uploadedImageUrl || isCreatingScript || (selectedTemplate === "custom" && !customUserPrompt.trim())}
              >
                {isCreatingScript ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                {isCreatingScript
                  ? tScript("creating")
                  : t("createMovie")
                }
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
                  <div className="space-y-6">
                    {/* 已完成的视频 */}
                    {(loadingHistory && userItems.length === 0) ? (
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
                    ) : userItems.length > 0 ? (
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
                          isFailed: item.isFailed, // 传递失败状态
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
                              onDelete: handleDeleteTask, // 删除失败任务
                            }}
                          />
                        );
                      })}
                    </Masonry>
                    ) : null}
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* 自定义剧本弹窗 */}
      <CustomScriptDialog
        isOpen={showCustomScriptDialog}
        onClose={() => {
          setShowCustomScriptDialog(false);
          setEditingScriptId(undefined);
          // 关闭弹窗后刷新剧本列表
          loadCustomScripts();
        }}
        petImageUrl={uploadedImageUrl || ""}
        aspectRatio={selectedAspectRatio}
        existingScriptId={editingScriptId}
      />
    </div>
  );
}
