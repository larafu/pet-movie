/**
 * Video Template Loader and Replacement Service
 */

import type { VideoTemplate, TemplateReplacementResult } from './types';
import dogTemplate from '@/config/video-templates/christmas-dog-rescue.json';
import catTemplate from '@/config/video-templates/christmas-cat-rescue.json';

/**
 * Get template by type
 */
export function getTemplate(templateType: 'dog' | 'cat'): VideoTemplate {
  const template = templateType === 'dog' ? dogTemplate : catTemplate;
  return template as VideoTemplate;
}

/**
 * Replace {PET_DESCRIPTION} placeholder with "the same pet" for consistent video generation
 * Since we use image-to-image for the first frame, we don't need detailed pet descriptions
 */
export function replacePetDescription(
  template: VideoTemplate
): TemplateReplacementResult {
  // Replace in frame prompt template with "the same pet"
  const framePrompt = template.framePromptTemplate.replace(
    /{PET_DESCRIPTION}/g,
    'the same pet'
  );

  // Replace in all shots with "the same pet"
  const shots = template.shots.map((shot) => ({
    ...shot,
    Scene: shot.Scene.replace(/{PET_DESCRIPTION}/g, 'the same pet'),
  }));

  return {
    framePrompt,
    shots,
  };
}

/**
 * Get credits cost for duration
 */
export function getCreditsCost(
  template: VideoTemplate,
  durationSeconds: 25 | 50
): number {
  const durationKey = durationSeconds.toString();
  const durationConfig = template.durations[durationKey];

  if (!durationConfig) {
    throw new Error(`Duration ${durationSeconds}s not found in template`);
  }

  if (!durationConfig.available) {
    throw new Error(`Duration ${durationSeconds}s is not available yet`);
  }

  return durationConfig.credits;
}

/**
 * Get nFrames for duration
 */
export function getNFrames(
  template: VideoTemplate,
  durationSeconds: 25 | 50
): string {
  const durationKey = durationSeconds.toString();
  const durationConfig = template.durations[durationKey];

  if (!durationConfig) {
    throw new Error(`Duration ${durationSeconds}s not found in template`);
  }

  return durationConfig.nFrames;
}
