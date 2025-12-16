import { envConfigs } from '..';

export const localeNames: any = {
  en: 'English',
  zh: '中文',
  es: 'Español',
  'pt-br': 'Português (Brasil)',
  ko: '한국어',
  ja: '日本語',
};

// 支持的语言列表：英语、中文、西班牙语、巴西葡萄牙语、韩语
export const locales = ['en', 'zh', 'es', 'pt-br', 'ko', 'ja'];

export const defaultLocale = envConfigs.locale;

export const localePrefix = 'as-needed';

export const localeDetection = false;

export const localeMessagesRootPath = '@/config/locale/messages';

export const localeMessagesPaths = [
  'common',
  'landing',
  'legal',
  'showcases',
  'blog',
  'pricing',
  'pet-memorial',
  'dashboard',
  'models',
  'settings/sidebar',
  'settings/profile',
  'settings/security',
  'settings/billing',
  'settings/payments',
  'settings/credits',
  'settings/apikeys',
  'settings/media',
  'admin/sidebar',
  'admin/users',
  'admin/roles',
  'admin/permissions',
  'admin/categories',
  'admin/posts',
  'admin/payments',
  'admin/subscriptions',
  'admin/credits',
  'admin/settings',
  'admin/apikeys',
  'admin/ai-tasks',
  'admin/chats',
  'admin/random-prompts',
  'ai/music',
  'ai/chat',
  'ai/image',
  'ai/video',
  'activity/sidebar',
  'activity/chats',
  'activity/ai-tasks',
];
