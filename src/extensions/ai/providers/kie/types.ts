/**
 * KIE AI Provider Type Definitions
 * For Sora 2 Pro Storyboard video generation
 */

export interface KieVideoShot {
  Scene: string;
  duration: number;
}

export interface KieVideoGenerationInput {
  n_frames: '10' | '15' | '25' | '50';
  image_urls: string[];
  aspect_ratio: 'portrait' | 'landscape';
  shots: KieVideoShot[];
}

export interface KieCreateTaskRequest {
  model: string;
  input: KieVideoGenerationInput;
  callBackUrl?: string;
}

export interface KieCreateTaskResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
  };
}

export interface KieTaskRecordResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
    model: string;
    state: 'waiting' | 'success' | 'fail';
    param: string; // JSON string
    resultJson: string | null; // JSON string: {resultUrls: [...]}
    failCode: string | null;
    failMsg: string | null;
    costTime: number | null;
    completeTime: number | null;
    createTime: number;
  };
}

export interface KieTaskResult {
  resultUrls: string[];
}
