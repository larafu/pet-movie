"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Film, Loader2, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";

interface VideoHistoryItem {
  id: string;
  templateType: "dog" | "cat";
  status: string;
  petImageUrl: string | null;
  finalVideoUrl: string | null;
  tempVideoUrl: string | null;
  durationSeconds: number | null;
  costCredits: number;
  createdAt: string;
  updatedAt: string;
}

const statusConfig: Record<string, {  label: string;
  icon: React.ComponentType<any>;
  color: string;
}> = {
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    color: "text-green-600",
  },
  failed: {
    label: "Failed",
    icon: AlertCircle,
    color: "text-red-600",
  },
  pending: {
    label: "Processing",
    icon: Loader2,
    color: "text-blue-600 animate-spin",
  },
  identifying_pet: {
    label: "Analyzing",
    icon: Loader2,
    color: "text-blue-600 animate-spin",
  },
  generating_frame: {
    label: "Creating Frame",
    icon: Loader2,
    color: "text-blue-600 animate-spin",
  },
  generating_video: {
    label: "Generating Video",
    icon: Loader2,
    color: "text-blue-600 animate-spin",
  },
  uploading: {
    label: "Uploading",
    icon: Loader2,
    color: "text-blue-600 animate-spin",
  },
};

export default function MyMoviesPage() {
  const [videos, setVideos] = useState<VideoHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const response = await fetch("/api/pet-video/history");
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch videos");
      }

      setVideos(data.videos || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load videos");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="text-center py-12">
          <Film className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h2 className="text-2xl font-semibold mb-2">No movies yet</h2>
          <p className="text-gray-600 mb-6">
            Create your first pet movie to see it here
          </p>
          <Button onClick={() => (window.location.href = "/ai-gen-demo")}>
            Create Movie
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Pet Movies</h1>
        <p className="text-gray-600">
          View and manage all your generated pet videos
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.map((video) => {
          const statusInfo = statusConfig[video.status] || statusConfig.pending;
          const StatusIcon = statusInfo.icon;
          const videoUrl = video.finalVideoUrl || video.tempVideoUrl;

          return (
            <Card key={video.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="aspect-video bg-gray-100 relative">
                  {video.status === "completed" && videoUrl ? (
                    <video
                      src={videoUrl}
                      className="w-full h-full object-cover"
                      controls
                    />
                  ) : video.petImageUrl ? (
                    <Image
                      src={video.petImageUrl}
                      alt="Pet"
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Film className="h-12 w-12 text-gray-400" />
                    </div>
                  )}
                </div>

                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium capitalize">
                      {video.templateType} Rescue
                    </span>
                    <div className={cn("flex items-center gap-1", statusInfo.color)}>
                      <StatusIcon className="h-4 w-4" />
                      <span className="text-sm">{statusInfo.label}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{video.durationSeconds || 25}s</span>
                    </div>
                    <span>{video.costCredits} credits</span>
                  </div>

                  <div className="text-xs text-gray-500">
                    {new Date(video.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>

                  {video.status === "completed" && videoUrl && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => window.open(videoUrl, "_blank")}
                      >
                        Download
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          // Share functionality
                          if (navigator.share) {
                            navigator.share({
                              title: "My Pet Movie",
                              url: videoUrl,
                            });
                          }
                        }}
                      >
                        Share
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
