"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Masonry from "react-masonry-css";
import {
  Upload,
  Loader2,
  Play,
  Pause,
  Film,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Heart,
  Monitor,
  Smartphone,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/components/ui/tabs";
import { Label } from "@/shared/components/ui/label";
import { cn } from "@/shared/lib/utils";

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
  | "completed"
  | "failed";

const statusMessages: Record<GenerationStatus, string> = {
  idle: "Ready to create your pet movie",
  uploading: "Finalizing and saving (1 min)...",
  identifying_pet: "Analyzing your pet's features (5-10s)...",
  generating_frame: "Transforming to Pixar style (3 min)...",
  generating_video: "Generating your cinematic movie (25 min)...",
  completed: "Your movie is ready!",
  failed: "Generation failed. Please try again.",
};

interface GalleryItem {
  id: string;
  url: string;
  thumbnail?: string;
  prompt?: string;
  timestamp: Date;
  aspectRatio?: AspectRatio; // Video aspect ratio
  isLoading?: boolean;
  progress?: number;
  loadingText?: string;
}

interface StoredTask {
  taskId: string;
  status: GenerationStatus;
  prompt: string;
  startTime: number;
  thumbnail?: string;
}

export function PetVideoGeneration({ className }: PetVideoGenProps) {
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
  const [pollStartTime, setPollStartTime] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Constants
  const POLL_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour
  const POLL_INTERVAL_MS = 3000; // 3 seconds
  const STORAGE_KEY_PREFIX = "pet-video-task-";

  // Inspiration items (example videos)
  // Note: thumbnail is optional - video will auto-generate poster from first frame if not provided
  const inspirationItems: GalleryItem[] = [
    {
      id: "ins-1",
      url: "/video/dog-hero-Christmas.mp4",
      prompt: "Christmas Dog Rescue - A brave dog saves its owner from a fire",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
      aspectRatio: "16:9",
    },
    {
      id: "ins-2",
      url: "/video/cat-hero-christmas.mp4",
      prompt: "Christmas Cat Rescue - A brave cat saves its owner from a fire",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48),
      aspectRatio: "16:9",
    },
  ];

  // Restore ongoing task from localStorage on mount
  useEffect(() => {
    const storedTaskId = localStorage.getItem(`${STORAGE_KEY_PREFIX}current`);
    if (storedTaskId) {
      const taskData = localStorage.getItem(`${STORAGE_KEY_PREFIX}${storedTaskId}`);
      if (taskData) {
        try {
          const task: StoredTask = JSON.parse(taskData);
          // Only restore if task is still in progress (and not too old)
          const elapsed = Date.now() - task.startTime;
          if (
            !["completed", "failed"].includes(task.status) &&
            elapsed < POLL_TIMEOUT_MS
          ) {
            setTaskId(storedTaskId);
            setGenerationStatus(task.status);
            setActiveTab("my-generations");
            setPollStartTime(task.startTime);

            // Restore to gallery
            setUserItems([
              {
                id: storedTaskId,
                url: "",
                prompt: task.prompt,
                timestamp: new Date(task.startTime),
                isLoading: true,
                progress: getProgressForStatus(task.status),
                loadingText: statusMessages[task.status],
                thumbnail: task.thumbnail,
              },
            ]);
          } else {
            // Clean up completed/failed/expired tasks
            localStorage.removeItem(`${STORAGE_KEY_PREFIX}${storedTaskId}`);
            localStorage.removeItem(`${STORAGE_KEY_PREFIX}current`);
          }
        } catch (err) {
          console.error("Failed to restore task:", err);
        }
      }
    }
  }, []);

  // Load user's video history from API on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await fetch("/api/pet-video/history?limit=20");
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.videos) {
            // Transform API response to GalleryItem format
            const historyItems: GalleryItem[] = data.videos
              .filter((video: any) => video.status === "completed" && video.finalVideoUrl)
              .map((video: any) => ({
                id: video.id,
                url: video.finalVideoUrl,
                thumbnail: video.frameImageUrl, // Use AI-generated Pixar frame as thumbnail
                prompt: `${video.templateType === "dog" ? "Dog" : "Cat"} Hero - ${video.durationSeconds}s`,
                timestamp: new Date(video.createdAt),
                aspectRatio: (video.aspectRatio || "16:9") as AspectRatio,
              }));

            // Merge with any existing items (from current generation)
            setUserItems((prev) => {
              // Keep loading items, add history items that don't exist yet
              const loadingItems = prev.filter((item) => item.isLoading);
              const existingIds = new Set(prev.map((item) => item.id));
              const newItems = historyItems.filter((item) => !existingIds.has(item.id));
              return [...loadingItems, ...newItems];
            });
          }
        }
      } catch (error) {
        console.error("Failed to load video history:", error);
      }
    };

    loadHistory();
  }, []);

  // Poll task status
  useEffect(() => {
    if (!taskId || generationStatus === "completed" || generationStatus === "failed") {
      return;
    }

    // Check timeout
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
        // Check timeout again
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
          const newStatus = task.status;

          // Update localStorage
          updateTaskInStorage(taskId, newStatus);

          // Update the loading item in gallery
          setUserItems((prev) =>
            prev.map((item) =>
              item.id === taskId
                ? {
                    ...item,
                    loadingText: statusMessages[newStatus],
                    progress: getProgressForStatus(newStatus),
                  }
                : item
            )
          );

          setGenerationStatus(newStatus);

          if (newStatus === "completed") {
            const videoUrl = task.finalVideoUrl || task.tempVideoUrl;
            // Update gallery item with final video
            setUserItems((prev) =>
              prev.map((item) =>
                item.id === taskId
                  ? {
                      ...item,
                      isLoading: false,
                      url: videoUrl,
                      thumbnail: uploadedImage || undefined,
                    }
                  : item
              )
            );
            // Clean up storage on completion
            cleanupTask(taskId);
          }

          if (newStatus === "failed") {
            setError(task.errorLog || "Generation failed");
            // Remove loading item on failure
            setUserItems((prev) => prev.filter((item) => item.id !== taskId));
            cleanupTask(taskId);
          }
        }
      } catch (err) {
        console.error("Poll error:", err);
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(pollInterval);
  }, [taskId, generationStatus, uploadedImage, pollStartTime]);

  const getProgressForStatus = (status: GenerationStatus): number => {
    // Progress distribution based on ~30 min total estimation:
    // - Uploading photo: 30s → 0-2%
    // - Generating frame (image-to-image): 3 min → 2-12%
    // - Generating video (Sora 2): 25 min → 12-95% (most time-consuming)
    // - Uploading to R2: 1 min → 95-99%
    // - Completed: 100%
    const progressMap: Record<GenerationStatus, number> = {
      idle: 0,
      uploading: 2,              // Photo upload: ~30s
      identifying_pet: 2,        // (Skipped now, but keep for compatibility)
      generating_frame: 12,      // Pixar style transform: ~3 min
      generating_video: 95,      // Video generation: ~25 min (MOST TIME!)
      uploading: 99,             // R2 upload: ~1 min
      completed: 100,
      failed: 0,
    };
    return progressMap[status];
  };

  // Save task to localStorage
  const saveTaskToStorage = (
    taskId: string,
    status: GenerationStatus,
    prompt: string,
    thumbnail?: string
  ) => {
    const task: StoredTask = {
      taskId,
      status,
      prompt,
      startTime: Date.now(),
      thumbnail,
    };
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${taskId}`, JSON.stringify(task));
    localStorage.setItem(`${STORAGE_KEY_PREFIX}current`, taskId);
  };

  // Update task status in localStorage
  const updateTaskInStorage = (taskId: string, status: GenerationStatus) => {
    const taskData = localStorage.getItem(`${STORAGE_KEY_PREFIX}${taskId}`);
    if (taskData) {
      const task: StoredTask = JSON.parse(taskData);
      task.status = status;
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${taskId}`, JSON.stringify(task));
    }
  };

  // Clean up task from localStorage
  const cleanupTask = (taskId: string) => {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${taskId}`);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}current`);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setGenerationStatus("uploading");

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to R2
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
      setError("Please upload your pet photo first");
      return;
    }

    setError(null);
    setGenerationStatus("identifying_pet");
    setActiveTab("my-generations"); // Switch to my generations tab
    setPollStartTime(Date.now());

    // Add a loading item to gallery
    const loadingId = Date.now().toString();
    const promptText = `${selectedTemplate === "dog" ? "Christmas Dog" : "Christmas Cat"} Rescue - ${selectedDuration}s`;

    const loadingItem: GalleryItem = {
      id: loadingId,
      url: "",
      prompt: promptText,
      timestamp: new Date(),
      aspectRatio: selectedAspectRatio,
      isLoading: true,
      progress: 10,
      loadingText: "Starting generation...",
      thumbnail: uploadedImage || undefined,
    };

    setUserItems((prev) => [loadingItem, ...prev]);

    try {
      const response = await fetch("/api/pet-video/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateType: selectedTemplate,
          petImageUrl: uploadedImageUrl,
          durationSeconds: selectedDuration,
          aspectRatio: selectedAspectRatio,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Generation failed");
      }

      // Update the loading item ID with actual task ID
      setUserItems((prev) =>
        prev.map((item) =>
          item.id === loadingId ? { ...item, id: data.taskId } : item
        )
      );
      setTaskId(data.taskId);

      // Save to localStorage
      saveTaskToStorage(
        data.taskId,
        "identifying_pet",
        promptText,
        uploadedImage || undefined
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
      setGenerationStatus("failed");
      // Remove the loading item
      setUserItems((prev) => prev.filter((item) => item.id !== loadingId));
    }
  };

  const isGenerating = !["idle", "completed", "failed"].includes(generationStatus);

  return (
    <div className={cn("w-full max-w-[1200px] mx-auto p-4", className)}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* LEFT PANEL - Configuration */}
        <Card className="lg:col-span-4 border-border bg-zinc-900 shadow-lg h-fit">
          <CardContent className="px-4 py-0 space-y-3">
            <div>
              <h2 className="text-lg font-semibold mb-1">Pet Movie Generator</h2>
              <p className="text-xs text-muted-foreground">
                Transform your pet into a Christmas rescue hero
              </p>
            </div>

            <div className="space-y-4">
              {/* Image Upload */}
              <div className="space-y-1.5">
                <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  Pet Photo
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
                          Click to change
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
                          Click to upload your pet photo
                        </p>
                        <p className="text-[10px] mt-0.5">
                          JPG/PNG/WEBP up to 10MB
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
                    disabled={isGenerating}
                  />
                </div>
              </div>

              {/* Template Selection */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Story Template</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(["dog", "cat"] as const).map((template) => (
                    <div
                      key={template}
                      onClick={() => !isGenerating && setSelectedTemplate(template)}
                      className={cn(
                        "flex items-center justify-center gap-2 p-2 rounded-lg border cursor-pointer transition-all",
                        selectedTemplate === template
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/50 bg-background hover:bg-muted",
                        isGenerating && "opacity-50 cursor-not-allowed"
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
                  Christmas rescue story with your {selectedTemplate}
                </p>
              </div>

              {/* Duration Selection */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Video Duration</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div
                    onClick={() => !isGenerating && setSelectedDuration(25)}
                    className={cn(
                      "flex flex-col items-center gap-1 p-2 rounded-lg border cursor-pointer transition-all",
                      selectedDuration === 25
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/50 bg-background hover:bg-muted",
                      isGenerating && "opacity-50 cursor-not-allowed"
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
                      70 Credits
                    </span>
                  </div>

                  <div className="flex flex-col items-center gap-1 p-2 rounded-lg border opacity-50 cursor-not-allowed border-border/50 bg-background/50">
                    <div className="w-3 h-3 rounded-full border-2 border-muted-foreground" />
                    <span className="text-xs font-medium">50s</span>
                    <span className="text-[10px] text-muted-foreground">
                      Soon
                    </span>
                  </div>
                </div>
              </div>

              {/* Aspect Ratio Selection */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Video Format</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div
                    onClick={() => !isGenerating && setSelectedAspectRatio("16:9")}
                    className={cn(
                      "flex items-center justify-center gap-2 p-2 rounded-lg border cursor-pointer transition-all",
                      selectedAspectRatio === "16:9"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/50 bg-background hover:bg-muted",
                      isGenerating && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">16:9</span>
                  </div>
                  <div
                    onClick={() => !isGenerating && setSelectedAspectRatio("9:16")}
                    className={cn(
                      "flex items-center justify-center gap-2 p-2 rounded-lg border cursor-pointer transition-all",
                      selectedAspectRatio === "9:16"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/50 bg-background hover:bg-muted",
                      isGenerating && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">9:16</span>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {selectedAspectRatio === "16:9" ? "Landscape (Desktop)" : "Portrait (Mobile)"}
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

              {/* Status Display */}
              {isGenerating && (
                <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <div className="flex items-center gap-2 text-blue-500">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <div className="flex-1">
                      <p className="text-[10px]">{statusMessages[generationStatus]}</p>
                      {pollStartTime && (
                        <p className="text-[9px] text-blue-400 mt-0.5">
                          Elapsed: {Math.floor((Date.now() - pollStartTime) / 1000)}s / 3600s
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="pt-3 mt-auto space-y-3">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span>Credits required:</span>
                </div>
                <span className="font-medium text-foreground">
                  {selectedDuration === 25 ? "70" : "140"} Credits
                </span>
              </div>

              <Button
                className="w-full h-10 text-sm font-medium bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20 rounded-xl"
                onClick={handleGenerate}
                disabled={!uploadedImageUrl || isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Create Movie
                  </>
                )}
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
                    Inspiration
                  </TabsTrigger>
                  <TabsTrigger
                    value="my-generations"
                    className="h-7 px-3 text-xs rounded-full border border-border/50 bg-background/10 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary transition-all"
                  >
                    My Generations
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 rounded-2xl overflow-hidden">
                <TabsContent value="inspiration" className="mt-0 h-full">
                  <Masonry
                    breakpointCols={{
                      default: 3,
                      1024: 2,
                      640: 1,
                    }}
                    className="flex -ml-2 w-auto"
                    columnClassName="pl-2 bg-clip-padding"
                  >
                    {inspirationItems.map((item) => (
                      <GalleryCard key={item.id} item={item} />
                    ))}
                  </Masonry>
                </TabsContent>

                <TabsContent value="my-generations" className="mt-0 h-full">
                  {userItems.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-3 min-h-[300px]">
                      <div className="w-12 h-12 rounded-full bg-muted/10 flex items-center justify-center">
                        <Film className="w-6 h-6 opacity-50" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-foreground">
                          No generations yet
                        </p>
                        <p className="text-xs max-w-xs mx-auto mt-1">
                          Create your first pet movie by uploading an image on
                          the left.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <Masonry
                      breakpointCols={{
                        default: 3,
                        1024: 2,
                        640: 1,
                      }}
                      className="flex -ml-2 w-auto"
                      columnClassName="pl-2 bg-clip-padding"
                    >
                      {userItems.map((item) => (
                        <GalleryCard key={item.id} item={item} />
                      ))}
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

// Gallery Card Component
function GalleryCard({ item }: { item: GalleryItem }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  if (item.isLoading) {
    // Determine aspect ratio for loading card
    const loadingAspectRatioClass = item.aspectRatio === "9:16" ? "aspect-[9/16]" : "aspect-[16/9]";

    return (
      <Card className="border-0 bg-background/50 overflow-hidden rounded-xl mb-2 relative group">
        <CardContent className="p-0">
          <div className={cn("relative w-full flex flex-col items-center justify-center bg-gradient-to-tr from-primary/5 via-transparent to-transparent", loadingAspectRatioClass)}>
            <div className="flex flex-col items-center gap-4 p-4 text-center w-full">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
                <div
                  className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin"
                  style={{ animationDuration: "1.5s" }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-primary">
                    {Math.round(item.progress || 0)}%
                  </span>
                </div>
              </div>

              <div className="space-y-1 max-w-[150px]">
                <h3 className="text-xs font-medium text-foreground animate-pulse">
                  {item.loadingText}
                </h3>
                <p className="text-[10px] text-muted-foreground">Creating...</p>
              </div>

              <div className="w-full max-w-[100px] h-1 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300 ease-out"
                  style={{ width: `${item.progress}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Determine aspect ratio class based on video format
  const aspectRatioClass = item.aspectRatio === "9:16" ? "aspect-[9/16]" : "aspect-[16/9]";

  return (
    <Card className="border-0 bg-background/50 overflow-hidden rounded-xl break-inside-avoid mb-2 relative group hover:shadow-xl transition-all duration-300">
      <CardContent className="p-0">
        <div className={cn("relative w-full overflow-hidden bg-muted", aspectRatioClass)}>
          <video
            ref={videoRef}
            src={item.url}
            poster={item.thumbnail || undefined}
            className="w-full h-full object-cover"
            loop
            muted
            playsInline
            preload="metadata"
            onEnded={() => setIsPlaying(false)}
          />
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <button
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 text-white" />
              ) : (
                <Play className="w-4 h-4 text-white ml-1" />
              )}
            </button>
          </div>

          {/* Overlay Info */}
          <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
            <div className="flex items-end justify-between">
              <p className="text-[10px] font-medium text-white/90 line-clamp-2">
                {item.prompt}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
