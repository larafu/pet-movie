/**
 * 视频模板配置
 * Rainbow Bridge 彩虹桥故事模板
 */

import catTemplate from './cat-rainbow-bridge.json';
import dogTemplate from './dog-rainbow-bridge.json';

// 角色数据结构
export interface CharacterData {
  id: string; // 角色标识符，如 "pet", "owner", "kitten"
  role: 'primary' | 'secondary';
  name: string; // 英文名称
  nameCn: string; // 中文名称
  description: string; // 英文详细描述（用于提示词生成）
  descriptionCn: string; // 中文详细描述
}

// 场景模板类型定义
export interface SceneTemplate {
  sceneNumber: number;
  durationSeconds: number;
  title: string;
  titleCn: string;
  characterIds: string[]; // 该场景首帧图中应出现的角色ID数组
  firstFramePrompt: string; // 包含 [PET] [OWNER] 等占位符
  videoPrompt: string; // 包含 [PET] [OWNER] 等占位符
}

// 视频模板类型定义
export interface VideoTemplate {
  id: string;
  name: string;
  nameCn: string;
  description: string;
  descriptionCn: string;
  petType: 'cat' | 'dog';
  durationSeconds: number;
  aspectRatio: '16:9' | '9:16';
  creditsRequired: number;
  sceneCount: number;
  globalStylePrefix: string; // 全局风格前缀
  characters: CharacterData[]; // 角色数组
  characterSheet: {
    prompt: string;
  };
  scenes: SceneTemplate[];
}

/**
 * 占位符替换工具函数
 * 将 prompt 中的 [PET] [OWNER] 等占位符替换为角色的详细描述
 */
export function replacePlaceholders(prompt: string, characters: CharacterData[]): string {
  let result = prompt;
  for (const character of characters) {
    // 生成占位符正则，匹配 [id] 格式（大小写不敏感）
    const placeholder = new RegExp(`\\[${character.id.toUpperCase()}\\]`, 'gi');
    result = result.replace(placeholder, character.description);
  }
  return result;
}

// 导出模板
export const CAT_TEMPLATE = catTemplate as VideoTemplate;
export const DOG_TEMPLATE = dogTemplate as VideoTemplate;

// 根据宠物类型获取模板
export function getVideoTemplate(petType: 'cat' | 'dog'): VideoTemplate {
  return petType === 'cat' ? CAT_TEMPLATE : DOG_TEMPLATE;
}

// 获取所需积分
export function getRequiredCredits(petType: 'cat' | 'dog'): number {
  return getVideoTemplate(petType).creditsRequired;
}

// 所有可用模板
export const VIDEO_TEMPLATES: Record<'cat' | 'dog', VideoTemplate> = {
  cat: CAT_TEMPLATE,
  dog: DOG_TEMPLATE,
};
