/**
 * Pet Video Generation Service Types
 */

import type { KieVideoShot } from '@/extensions/ai/providers/kie/types';

export interface VideoTemplate {
  id: string;
  name: string;
  description: string;
  previewVideo: string;
  aspectRatio: 'portrait' | 'landscape';
  durations: {
    [key: string]: {
      nFrames: string;
      credits: number;
      available: boolean;
      comingSoon?: boolean;
    };
  };
  petDescriptionOriginal: string;
  framePromptTemplate: string;
  shots: KieVideoShot[];
}

export interface PetVideoGenerationRequest {
  userId: string;
  templateType: 'dog' | 'cat';
  petImageUrl: string;
  durationSeconds: 25 | 50;
  aspectRatio: '16:9' | '9:16';
}

export interface PetVideoTaskStatus {
  id: string;
  userId: string;
  status: 'pending' | 'identifying_pet' | 'generating_frame' | 'generating_video' | 'uploading' | 'applying_watermark' | 'completed' | 'failed';
  templateType: 'dog' | 'cat';
  petImageUrl: string;
  petDescription?: string;
  frameImageUrl?: string;
  tempVideoUrl?: string;
  finalVideoUrl?: string;
  originalVideoUrl?: string;      // 原始无水印视频URL
  watermarkedVideoUrl?: string;   // 带水印视频URL
  durationSeconds: number;
  aspectRatio?: string;
  costCredits: number;
  retryCount: number;
  errorLog?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateReplacementResult {
  framePrompt: string;
  shots: KieVideoShot[];
}
