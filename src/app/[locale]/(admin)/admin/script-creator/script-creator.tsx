'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Link } from '@/core/i18n/navigation';
import { nanoid } from 'nanoid';
import { Loader2, Plus, Trash2, Play, Image as ImageIcon, Save, Upload, RefreshCw, FileJson, Sparkles, X, ZoomIn } from 'lucide-react';

// 角色数据结构
interface CharacterData {
  id: string; // 角色标识符，如 "pet", "owner"
  role: 'primary' | 'secondary';
  name: string; // 英文名称
  nameCn: string; // 中文名称
  description: string; // 英文详细描述（用于提示词生成）
  descriptionCn: string; // 中文详细描述（用于展示）
}

// 单个镜头数据结构
interface ShotData {
  shotNumber: number; // 镜头编号
  durationSeconds: number; // 该镜头时长（秒），支持小数如 1.2, 3.5
  prompt: string; // 镜头提示词，支持占位符如 [PET] [OWNER]
  cameraMovement: string; // 镜头运动描述
}

// 分镜数据结构（一个场景包含多个镜头）
interface SceneData {
  id: string;
  sceneNumber: number;
  characterIds: string[]; // 该场景首帧图中应出现的角色ID数组
  shots: ShotData[]; // 镜头数组（替代原来的单个 prompt）
  firstFramePrompt: string; // 首帧图提示词
  description: string; // 中文描述
  descriptionEn: string; // 英文描述
  frameStatus: 'pending' | 'generating' | 'completed' | 'failed';
  frameImageUrl?: string;
  frameProgress?: number;
  videoStatus: 'pending' | 'generating' | 'completed' | 'failed';
  videoUrl?: string;
  videoProgress?: number;
}

// 模板配置
interface TemplateConfig {
  name: string;
  nameCn: string;
  description: string;
  descriptionCn: string;
  tags: string[]; // 标签：用于前端筛选和展示，如 ["dog", "christmas", "heartwarming"]
  styleId: string; // 风格ID标识（仅用于代码引用，不影响实际效果）
  globalStylePrefix: string; // 全局风格前缀 - 实际控制视频风格，会加到每个视频提示词前面
  characters: CharacterData[]; // 角色数组 - 定义故事中的所有角色
  characterSheetUrl: string; // 角色参考卡图片URL（用于保持角色一致性）
  durationSeconds: 60 | 120;
  aspectRatio: '16:9' | '9:16';
  musicPrompt: string;
}

/**
 * 占位符替换工具函数
 * 将 prompt 中的 [PET] [OWNER] 等占位符替换为角色的详细描述
 *
 * @param prompt 原始 prompt，包含占位符如 [PET] sits on the couch
 * @param characters 角色数组，包含 id 和 description
 * @returns 替换后的 prompt，如 "fluffy orange tabby cat with amber eyes sits on the couch"
 */
function replacePlaceholders(prompt: string, characters: CharacterData[]): string {
  let result = prompt;

  // 为每个角色创建占位符映射
  // 占位符格式：[ROLE_ID]，如 [PET]、[OWNER]、[FIREFIGHTER]
  for (const character of characters) {
    // 生成占位符正则，匹配 [id] 格式（大小写不敏感）
    const placeholder = new RegExp(`\\[${character.id.toUpperCase()}\\]`, 'gi');
    // 使用角色的英文描述替换占位符
    result = result.replace(placeholder, character.description);
  }

  return result;
}

// 预设标签（可以添加更多）
const PRESET_TAGS = ['dog', 'cat', 'christmas', 'adventure', 'heartwarming', 'funny', 'action'];

// 预设风格列表（仅供参考，可以自由输入）
const STYLE_PRESETS = [
  { id: 'pixar-3d', prefix: 'Pixar-style High-quality 3D CG animation style, cinematic lighting, vibrant saturated colors' },
  { id: 'ghibli', prefix: 'Hand-drawn 2D animation style, soft watercolor backgrounds, dreamy whimsical atmosphere' },
  { id: 'realistic', prefix: 'Photorealistic cinematic style, movie-grade lighting, dramatic shadows, film grain texture' },
  { id: 'anime', prefix: 'Anime animation style, vibrant cel-shading, dynamic action lines, large expressive eyes' },
];

export function ScriptCreator() {
  const searchParams = useSearchParams();
  const editTemplateId = searchParams.get('edit');

  // 编辑模式状态
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // 模板配置状态
  const [config, setConfig] = useState<TemplateConfig>({
    name: '',
    nameCn: '',
    description: '',
    descriptionCn: '',
    tags: ['dog'],
    styleId: 'pixar-3d',
    globalStylePrefix: STYLE_PRESETS[0].prefix,
    characters: [], // 角色数组
    characterSheetUrl: '', // 角色参考卡URL
    durationSeconds: 60,
    aspectRatio: '16:9',
    musicPrompt: '',
  });

  // 标签管理
  const [availableTags, setAvailableTags] = useState<string[]>(PRESET_TAGS);
  const [newTagInput, setNewTagInput] = useState('');

  // 宠物图片
  const [petImageUrl, setPetImageUrl] = useState('');
  const [petImageFile, setPetImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // 分镜列表
  const [scenes, setScenes] = useState<SceneData[]>([]);

  // 创作状态
  const [scriptId, setScriptId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);

  // 保存模板状态
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [savedTemplateId, setSavedTemplateId] = useState<string | null>(null);

  // 保存状态
  const [isSaving, setIsSaving] = useState(false);

  // JSON 导入状态（仅新建模式可用）
  const [showJsonImport, setShowJsonImport] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [isParsingJson, setIsParsingJson] = useState(false);
  const [jsonParseError, setJsonParseError] = useState<string | null>(null);

  // 角色参考卡生成状态
  const [isGeneratingCharacterSheet, setIsGeneratingCharacterSheet] = useState(false);
  const [characterSheetProgress, setCharacterSheetProgress] = useState(0);

  // 媒体预览状态
  const [previewMedia, setPreviewMedia] = useState<{
    type: 'image' | 'video';
    url: string;
    title: string;
  } | null>(null);

  // 加载模板数据（编辑模式）
  const loadTemplate = useCallback(async (templateId: string) => {
    console.log('📄 loadTemplate called with:', templateId); // 调试日志
    setIsLoadingTemplate(true);
    try {
      const response = await fetch(`/api/admin/script-templates/${templateId}`);
      const result = await response.json();
      console.log('📄 API response:', result); // 调试日志

      if (result.success && result.template) {
        const template = result.template;
        console.log('📄 Template data:', {
          name: template.name,
          scenesCount: template.scenes?.length,
          scenes: template.scenes
        }); // 调试日志

        // 设置配置
        setConfig({
          name: template.name || '',
          nameCn: template.nameCn || '',
          description: template.description || '',
          descriptionCn: template.descriptionCn || '',
          tags: template.tags || ['dog'],
          styleId: template.styleId || 'pixar-3d',
          globalStylePrefix: template.globalStylePrefix || '',
          characters: template.characters || [],
          characterSheetUrl: template.characterSheetUrl || '',
          durationSeconds: template.durationSeconds || 60,
          aspectRatio: template.aspectRatio || '16:9',
          musicPrompt: template.musicPrompt || '',
        });

        // 添加模板中的标签到可用标签列表
        if (template.tags && Array.isArray(template.tags)) {
          setAvailableTags(prev => {
            const newTags = template.tags.filter((t: string) => !prev.includes(t));
            return [...prev, ...newTags];
          });
        }

        // 设置分镜（支持草稿的完整状态或发布模板的简化状态）
        // 兼容旧的 prompt 字段和新的 shots 数组
        if (template.scenes && Array.isArray(template.scenes)) {
          const loadedScenes: SceneData[] = template.scenes.map((s: {
            id?: string;
            sceneNumber: number;
            characterIds?: string[];
            shots?: Array<{
              shotNumber: number;
              durationSeconds: number;
              prompt: string;
              cameraMovement: string;
            }>;
            prompt?: string; // 旧格式兼容
            firstFramePrompt: string;
            description: string;
            descriptionEn: string;
            frameStatus?: string;
            frameImageUrl?: string;
            videoStatus?: string;
            videoUrl?: string;
          }) => {
            // 处理 shots：优先使用新格式，兼容旧的单个 prompt
            let shots: ShotData[];
            if (s.shots && Array.isArray(s.shots) && s.shots.length > 0) {
              // 直接使用 shots 数组
              shots = s.shots.map((shot: {
                shotNumber: number;
                durationSeconds?: number;
                prompt?: string;
                cameraMovement?: string;
              }) => ({
                shotNumber: shot.shotNumber,
                durationSeconds: shot.durationSeconds || 5,
                prompt: shot.prompt || '',
                cameraMovement: shot.cameraMovement || '',
              }));
            } else if (s.prompt) {
              // 旧格式：将单个 prompt 转为一个镜头
              shots = [{
                shotNumber: 1,
                durationSeconds: 15,
                prompt: s.prompt,
                cameraMovement: 'full scene',
              }];
            } else {
              // 无数据：创建默认空镜头
              shots = [
                { shotNumber: 1, durationSeconds: 5, prompt: '', cameraMovement: 'establishing shot' },
                { shotNumber: 2, durationSeconds: 5, prompt: '', cameraMovement: 'medium shot' },
                { shotNumber: 3, durationSeconds: 5, prompt: '', cameraMovement: 'close-up' },
              ];
            }

            return {
              id: s.id || nanoid(),
              sceneNumber: s.sceneNumber,
              characterIds: s.characterIds || [], // 加载场景角色
              shots, // 镜头数组
              firstFramePrompt: s.firstFramePrompt || '',
              description: s.description || '',
              descriptionEn: s.descriptionEn || '',
              frameStatus: (s.frameStatus as SceneData['frameStatus']) || 'pending',
              frameImageUrl: s.frameImageUrl,
              videoStatus: (s.videoStatus as SceneData['videoStatus']) || 'pending',
              videoUrl: s.videoUrl,
            };
          });
          setScenes(loadedScenes);
        }

        // 设置合并后的视频（优先使用 mergedVideoUrl，其次 previewVideoUrl）
        if (template.mergedVideoUrl) {
          setFinalVideoUrl(template.mergedVideoUrl);
        } else if (template.previewVideoUrl) {
          setFinalVideoUrl(template.previewVideoUrl);
        }

        // 设置宠物图片（优先使用 petImageUrl，其次 thumbnailUrl）
        if (template.petImageUrl) {
          setPetImageUrl(template.petImageUrl);
        } else if (template.thumbnailUrl) {
          setPetImageUrl(template.thumbnailUrl);
        }

        setIsEditMode(true);
        setEditingTemplateId(templateId);
        setSavedTemplateId(templateId);
      } else {
        alert('Failed to load template: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Load template error:', error);
      alert('Failed to load template');
    } finally {
      setIsLoadingTemplate(false);
    }
  }, []);

  // 检查 URL 参数，加载模板数据
  useEffect(() => {
    console.log('📄 useEffect check:', { editTemplateId, isEditMode, isLoadingTemplate }); // 调试日志
    if (editTemplateId && !isEditMode && !isLoadingTemplate) {
      console.log('📄 Calling loadTemplate...'); // 调试日志
      loadTemplate(editTemplateId);
    }
  }, [editTemplateId, isEditMode, isLoadingTemplate, loadTemplate]);

  // 保存模板（新建或更新）
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/admin/script-creator/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingTemplateId, // 如果有则更新，否则创建
          name: config.name,
          nameCn: config.nameCn,
          description: config.description,
          descriptionCn: config.descriptionCn,
          tags: config.tags,
          styleId: config.styleId,
          globalStylePrefix: config.globalStylePrefix,
          characters: config.characters,
          characterSheetUrl: config.characterSheetUrl,
          durationSeconds: config.durationSeconds,
          aspectRatio: config.aspectRatio,
          musicPrompt: config.musicPrompt,
          petImageUrl,
          scenes,
          mergedVideoUrl: finalVideoUrl,
        }),
      });

      const result = await response.json();
      if (result.success) {
        // 如果是新建，设置编辑模式
        if (!editingTemplateId) {
          setEditingTemplateId(result.draftId);
          setIsEditMode(true);
          // 更新 URL，方便刷新后继续编辑
          window.history.replaceState({}, '', `?edit=${result.draftId}`);
        }
        alert('已保存 Saved!');
      } else {
        alert('Save failed: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  // 根据时长计算分镜数量
  const sceneCount = config.durationSeconds / 15;

  // 初始化分镜
  // 每个场景默认包含 3 个镜头，总时长 15 秒
  const initializeScenes = useCallback(() => {
    const newScenes: SceneData[] = [];
    // 默认使用所有 primary 角色
    const defaultCharacterIds = config.characters
      .filter(c => c.role === 'primary')
      .map(c => c.id);

    for (let i = 1; i <= sceneCount; i++) {
      // 创建默认的 3 个镜头（时长分配：5+5+5=15秒）
      const defaultShots: ShotData[] = [
        { shotNumber: 1, durationSeconds: 5, prompt: '', cameraMovement: 'establishing shot' },
        { shotNumber: 2, durationSeconds: 5, prompt: '', cameraMovement: 'medium shot' },
        { shotNumber: 3, durationSeconds: 5, prompt: '', cameraMovement: 'close-up' },
      ];

      newScenes.push({
        id: nanoid(),
        sceneNumber: i,
        characterIds: defaultCharacterIds, // 默认包含所有主要角色
        shots: defaultShots, // 镜头数组
        firstFramePrompt: '',
        description: `场景 ${i}`,
        descriptionEn: `Scene ${i}`,
        frameStatus: 'pending',
        videoStatus: 'pending',
      });
    }
    setScenes(newScenes);
  }, [sceneCount, config.characters]);

  // 更新分镜
  const updateScene = (id: string, updates: Partial<SceneData>) => {
    setScenes(prev => prev.map(scene =>
      scene.id === id ? { ...scene, ...updates } : scene
    ));
  };

  // 更新单个镜头
  const updateShot = (sceneId: string, shotIndex: number, updates: Partial<ShotData>) => {
    setScenes(prev => prev.map(scene => {
      if (scene.id !== sceneId) return scene;
      const newShots = [...scene.shots];
      newShots[shotIndex] = { ...newShots[shotIndex], ...updates };
      return { ...scene, shots: newShots };
    }));
  };

  // 添加镜头
  const addShot = (sceneId: string) => {
    setScenes(prev => prev.map(scene => {
      if (scene.id !== sceneId) return scene;
      const newShot: ShotData = {
        shotNumber: scene.shots.length + 1,
        durationSeconds: 3, // 默认3秒
        prompt: '',
        cameraMovement: '',
      };
      return { ...scene, shots: [...scene.shots, newShot] };
    }));
  };

  // 删除镜头
  const removeShot = (sceneId: string, shotIndex: number) => {
    setScenes(prev => prev.map(scene => {
      if (scene.id !== sceneId) return scene;
      const newShots = scene.shots.filter((_, i) => i !== shotIndex);
      // 重新编号
      return {
        ...scene,
        shots: newShots.map((shot, i) => ({ ...shot, shotNumber: i + 1 })),
      };
    }));
  };

  // 计算场景总时长
  const getSceneDuration = (scene: SceneData) => {
    return scene.shots.reduce((sum, shot) => sum + shot.durationSeconds, 0);
  };

  // 检查所有镜头是否有 prompt
  const hasAllShotPrompts = (scene: SceneData) => {
    return scene.shots.length > 0 && scene.shots.every(shot => shot.prompt.trim());
  };

  // 上传图片
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPetImageFile(file);
    setUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/admin/script-creator/upload-image', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (result.success && result.url) {
        setPetImageUrl(result.url);
      } else {
        alert('Upload failed: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed');
    } finally {
      setUploadingImage(false);
    }
  };

  // 创建剧本（初始化到数据库）
  const handleCreateScript = async () => {
    if (!petImageUrl) {
      alert('Please upload a pet image first');
      return;
    }

    if (scenes.some(s => !hasAllShotPrompts(s) || !s.firstFramePrompt)) {
      alert('Please fill in all scene prompts');
      return;
    }

    setIsCreating(true);

    try {
      const response = await fetch('/api/admin/script-creator/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config,
          petImageUrl,
          scenes: scenes.map(s => ({
            sceneNumber: s.sceneNumber,
            shots: s.shots, // 传递 shots 数组
            firstFramePrompt: s.firstFramePrompt,
            description: s.description,
            descriptionEn: s.descriptionEn,
          })),
        }),
      });

      const result = await response.json();
      if (result.success) {
        setScriptId(result.scriptId);
        // 更新场景ID
        setScenes(prev => prev.map((scene, index) => ({
          ...scene,
          id: result.sceneIds[index] || scene.id,
        })));
        alert('Script created! You can now generate frames and videos.');
      } else {
        alert('Create failed: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Create error:', error);
      alert('Create failed');
    } finally {
      setIsCreating(false);
    }
  };

  // 确保脚本已创建（如果没有则自动创建）
  const ensureScriptCreated = async (): Promise<{ scriptId: string; sceneIds: string[] } | null> => {
    // 如果已有 scriptId，直接返回
    if (scriptId) {
      return { scriptId, sceneIds: scenes.map(s => s.id) };
    }

    // 验证必填项
    if (!petImageUrl) {
      alert('Please upload a pet image first');
      return null;
    }

    if (scenes.length === 0) {
      alert('Please initialize scenes first');
      return null;
    }

    if (scenes.some(s => !hasAllShotPrompts(s) || !s.firstFramePrompt)) {
      alert('Please fill in all scene prompts');
      return null;
    }

    // 自动创建脚本
    try {
      const response = await fetch('/api/admin/script-creator/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config,
          petImageUrl,
          scenes: scenes.map(s => ({
            sceneNumber: s.sceneNumber,
            shots: s.shots, // 传递 shots 数组
            firstFramePrompt: s.firstFramePrompt,
            description: s.description,
            descriptionEn: s.descriptionEn,
          })),
        }),
      });

      const result = await response.json();
      if (result.success) {
        setScriptId(result.scriptId);
        // 更新场景ID
        setScenes(prev => prev.map((scene, index) => ({
          ...scene,
          id: result.sceneIds[index] || scene.id,
        })));
        return { scriptId: result.scriptId, sceneIds: result.sceneIds };
      } else {
        alert('Create script failed: ' + (result.error || 'Unknown error'));
        return null;
      }
    } catch (error) {
      console.error('Create script error:', error);
      alert('Create script failed');
      return null;
    }
  };

  // 生成首帧图（直接使用表单数据，不依赖数据库）
  const handleGenerateFrame = async (sceneId: string) => {
    const scene = scenes.find(s => s.id === sceneId);
    if (!scene) return;

    // 防止重复点击
    if (scene.frameStatus === 'generating') {
      return;
    }

    // 验证必填项
    if (!petImageUrl) {
      alert('Please upload a pet image first');
      return;
    }

    if (!scene.firstFramePrompt) {
      alert('Please fill in the first frame prompt');
      return;
    }

    updateScene(sceneId, { frameStatus: 'generating', frameProgress: 0 });

    try {
      const sceneIndex = scenes.findIndex(s => s.id === sceneId);

      // 替换 firstFramePrompt 中的占位符（如 [PET] [OWNER]）为实际角色描述
      const resolvedFirstFramePrompt = replacePlaceholders(scene.firstFramePrompt, config.characters);
      console.log('🖼️ Resolved firstFramePrompt:', resolvedFirstFramePrompt.substring(0, 200) + '...');

      // 直接调用生成 API，传入表单数据
      // 包含 characters + characterIds 用于构建角色提示词
      const response = await fetch('/api/admin/script-creator/generate-frame-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          petImageUrl,
          firstFramePrompt: resolvedFirstFramePrompt, // 使用替换后的 prompt
          globalStylePrefix: config.globalStylePrefix,
          characters: config.characters, // 所有角色定义
          characterIds: scene.characterIds, // 该场景应出现的角色
          characterSheetUrl: config.characterSheetUrl, // 角色参考卡（可选）
          aspectRatio: config.aspectRatio,
          sceneIndex,
        }),
      });

      const result = await response.json();
      if (result.success && result.taskId) {
        // 开始轮询任务状态
        pollTaskStatus(sceneId, result.taskId, 'frame');
      } else {
        updateScene(sceneId, { frameStatus: 'failed' });
        alert('Generate frame failed: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Generate frame error:', error);
      updateScene(sceneId, { frameStatus: 'failed' });
    }
  };

  // 生成视频（直接使用表单数据，不依赖数据库）
  // 将 shots 数组合并成一个完整的视频提示词
  const handleGenerateVideo = async (sceneId: string) => {
    const scene = scenes.find(s => s.id === sceneId);
    if (!scene) return;

    if (!scene.frameImageUrl) {
      alert('Please generate frame image first');
      return;
    }

    // 防止重复点击
    if (scene.videoStatus === 'generating') {
      return;
    }

    // 检查是否有 shots
    if (!hasAllShotPrompts(scene)) {
      alert('Please fill in all shot prompts');
      return;
    }

    updateScene(sceneId, { videoStatus: 'generating', videoProgress: 0 });

    try {
      const sceneIndex = scenes.findIndex(s => s.id === sceneId);

      // 将 shots 合并成一个完整的视频提示词
      // 格式：[Shot N (Xs): camera movement] prompt. 每个镜头的 prompt 先替换占位符
      const mergedPrompt = scene.shots
        .map(shot => {
          // 替换占位符（如 [PET] [OWNER]）为实际角色描述
          const resolvedPrompt = replacePlaceholders(shot.prompt, config.characters);
          const cameraInfo = shot.cameraMovement ? ` ${shot.cameraMovement}.` : '';
          return `[Shot ${shot.shotNumber} (${shot.durationSeconds}s):${cameraInfo}] ${resolvedPrompt}`.trim();
        })
        .join(' ');

      console.log('📽️ Merged prompt for video:', mergedPrompt.substring(0, 300) + '...');

      // 直接调用生成 API，传入表单数据
      // 包含 characters + characterIds 用于构建角色提示词
      const response = await fetch('/api/admin/script-creator/generate-video-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frameImageUrl: scene.frameImageUrl,
          prompt: mergedPrompt, // 合并后且替换占位符后的 prompt
          globalStylePrefix: config.globalStylePrefix,
          characters: config.characters, // 所有角色定义
          characterIds: scene.characterIds, // 该场景应出现的角色
          aspectRatio: config.aspectRatio,
          sceneIndex,
        }),
      });

      const result = await response.json();
      if (result.success && result.taskId) {
        // 开始轮询任务状态
        pollTaskStatus(sceneId, result.taskId, 'video');
      } else {
        updateScene(sceneId, { videoStatus: 'failed' });
        alert('Generate video failed: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Generate video error:', error);
      updateScene(sceneId, { videoStatus: 'failed' });
    }
  };

  // 轮询任务状态（直接查询 Evolink API）
  const pollTaskStatus = async (sceneId: string, taskId: string, type: 'frame' | 'video') => {
    const poll = async () => {
      try {
        const response = await fetch(
          `/api/admin/script-creator/task-status?taskId=${taskId}&type=${type}`
        );
        const result = await response.json();

        if (result.success) {
          if (type === 'frame') {
            updateScene(sceneId, {
              frameStatus: result.status,
              frameImageUrl: result.imageUrl,
              frameProgress: result.progress,
            });

            if (result.status === 'generating') {
              setTimeout(poll, 3000);
            }
          } else {
            updateScene(sceneId, {
              videoStatus: result.status,
              videoUrl: result.videoUrl,
              videoProgress: result.progress,
            });

            if (result.status === 'generating') {
              setTimeout(poll, 5000);
            }
          }
        }
      } catch (error) {
        console.error('Poll error:', error);
      }
    };

    poll();
  };

  // 保留旧的轮询函数用于数据库相关流程（如合并视频等）
  const pollSceneStatus = async (sceneId: string, type: 'frame' | 'video') => {
    const poll = async () => {
      try {
        const response = await fetch(
          `/api/admin/script-creator/status?scriptId=${scriptId}&sceneId=${sceneId}`
        );
        const result = await response.json();

        if (result.success) {
          if (type === 'frame') {
            updateScene(sceneId, {
              frameStatus: result.frameStatus,
              frameImageUrl: result.frameImageUrl,
              frameProgress: result.frameProgress,
            });

            if (result.frameStatus === 'generating') {
              setTimeout(poll, 3000);
            }
          } else {
            updateScene(sceneId, {
              videoStatus: result.videoStatus,
              videoUrl: result.videoUrl,
              videoProgress: result.videoProgress,
            });

            if (result.videoStatus === 'generating') {
              setTimeout(poll, 5000);
            }
          }
        }
      } catch (error) {
        console.error('Poll error:', error);
      }
    };

    poll();
  };

  // 合并视频（直接使用前端视频 URL 列表）
  const handleMergeVideos = async () => {
    // 检查所有分镜视频是否都已完成
    const incompleteScenes = scenes.filter(s => s.videoStatus !== 'completed' || !s.videoUrl);
    if (incompleteScenes.length > 0) {
      alert(`Please complete all video generation first. ${incompleteScenes.length} scene(s) are not completed.`);
      return;
    }

    setIsMerging(true);

    try {
      // 按场景顺序收集视频 URL
      const videoUrls = scenes
        .sort((a, b) => a.sceneNumber - b.sceneNumber)
        .map(s => s.videoUrl!)
        .filter(Boolean);

      if (videoUrls.length === 0) {
        alert('No video URLs found');
        setIsMerging(false);
        return;
      }

      console.log('📼 Merging videos:', videoUrls);

      const response = await fetch('/api/admin/script-creator/merge-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrls }),
      });

      const result = await response.json();
      if (result.success) {
        setFinalVideoUrl(result.videoUrl);
        alert('Videos merged successfully!');
      } else {
        alert('Merge failed: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Merge error:', error);
      alert('Merge failed');
    } finally {
      setIsMerging(false);
    }
  };

  // 发布模板（把 status 改成 published）
  const handlePublish = async () => {
    if (!finalVideoUrl) {
      alert('Please merge videos first 请先合并视频');
      return;
    }

    if (!config.name) {
      alert('Please enter template name 请输入模板名称');
      return;
    }

    // 如果还没保存过，先保存
    if (!editingTemplateId) {
      alert('Please save first 请先保存');
      return;
    }

    setIsSavingTemplate(true);

    try {
      const response = await fetch('/api/admin/script-creator/save-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draftId: editingTemplateId, // 从当前模板发布
          config,
          scenes: scenes.map(s => ({
            sceneNumber: s.sceneNumber,
            shots: s.shots, // 传递 shots 数组
            firstFramePrompt: s.firstFramePrompt,
            description: s.description,
            descriptionEn: s.descriptionEn,
          })),
          previewVideoUrl: finalVideoUrl,
          thumbnailUrl: scenes[0]?.frameImageUrl || '',
        }),
      });

      const result = await response.json();
      if (result.success) {
        setSavedTemplateId(result.templateId);
        alert('已发布 Published! ID: ' + result.templateId);
      } else {
        alert('Publish failed: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Publish error:', error);
      alert('Publish failed');
    } finally {
      setIsSavingTemplate(false);
    }
  };

  // 更新模板（编辑模式）
  const handleUpdateTemplate = async (updateVideo = false) => {
    if (!editingTemplateId) {
      alert('No template to update');
      return;
    }

    if (!config.name) {
      alert('Please enter template name');
      return;
    }

    setIsUpdating(true);

    try {
      const updateData: {
        templateId: string;
        config: TemplateConfig;
        scenes: Array<{
          sceneNumber: number;
          shots: ShotData[];
          firstFramePrompt: string;
          description: string;
          descriptionEn: string;
        }>;
        previewVideoUrl?: string;
        thumbnailUrl?: string;
      } = {
        templateId: editingTemplateId,
        config,
        scenes: scenes.map(s => ({
          sceneNumber: s.sceneNumber,
          shots: s.shots, // 传递 shots 数组
          firstFramePrompt: s.firstFramePrompt,
          description: s.description,
          descriptionEn: s.descriptionEn,
        })),
      };

      // 如果要更新视频，添加新的预览视频URL
      if (updateVideo && finalVideoUrl) {
        updateData.previewVideoUrl = finalVideoUrl;
        // 如果有新的首帧图，也更新缩略图
        const firstFrameWithImage = scenes.find(s => s.frameImageUrl);
        if (firstFrameWithImage?.frameImageUrl) {
          updateData.thumbnailUrl = firstFrameWithImage.frameImageUrl;
        }
      }

      const response = await fetch('/api/admin/script-templates/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      const result = await response.json();
      if (result.success) {
        alert(updateVideo ? 'Template and preview video updated!' : 'Template updated!');
      } else {
        alert('Update failed: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Update error:', error);
      alert('Update failed');
    } finally {
      setIsUpdating(false);
    }
  };

  // 创建新模板（退出编辑模式）
  const handleCreateNew = () => {
    setIsEditMode(false);
    setEditingTemplateId(null);
    setSavedTemplateId(null);
    setConfig({
      name: '',
      nameCn: '',
      description: '',
      descriptionCn: '',
      tags: ['dog'],
      styleId: 'pixar-3d',
      globalStylePrefix: STYLE_PRESETS[0].prefix,
      characters: [],
      characterSheetUrl: '',
      durationSeconds: 60,
      aspectRatio: '16:9',
      musicPrompt: '',
    });
    setScenes([]);
    setPetImageUrl('');
    setScriptId(null);
    setFinalVideoUrl(null);
    // 清除 URL 参数（使用 replaceState 避免页面重新加载）
    window.history.replaceState(null, '', '/admin/script-creator');
  };

  // 一键导入文本 - 调用 Gemini 从长文本生成模板并填充表单
  const handleParseText = async () => {
    if (!jsonInput.trim()) {
      setJsonParseError('请输入故事或剧本内容');
      return;
    }

    if (jsonInput.trim().length < 50) {
      setJsonParseError('内容太短，请输入更详细的故事描述（至少50字）');
      return;
    }

    setIsParsingJson(true);
    setJsonParseError(null);

    try {
      const response = await fetch('/api/admin/script-creator/parse-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          textContent: jsonInput,
          durationSeconds: config.durationSeconds, // 使用当前选择的时长
          aspectRatio: config.aspectRatio, // 使用当前选择的比例
        }),
      });

      const result = await response.json();

      if (!result.success) {
        setJsonParseError(result.error || '解析失败');
        return;
      }

      const template = result.template;

      // 填充配置
      setConfig({
        name: template.config.name || '',
        nameCn: template.config.nameCn || '',
        description: template.config.description || '',
        descriptionCn: template.config.descriptionCn || '',
        tags: template.config.tags || ['dog'],
        styleId: template.config.styleId || 'pixar-3d',
        globalStylePrefix: template.config.globalStylePrefix || '',
        characters: template.config.characters || [],
        characterSheetUrl: template.config.characterSheetUrl || '',
        durationSeconds: template.config.durationSeconds || 60,
        aspectRatio: template.config.aspectRatio || '16:9',
        musicPrompt: template.config.musicPrompt || '',
      });

      // 添加模板中的标签到可用标签列表
      if (template.config.tags && Array.isArray(template.config.tags)) {
        setAvailableTags(prev => {
          const newTags = template.config.tags.filter((t: string) => !prev.includes(t));
          return [...prev, ...newTags];
        });
      }

      // 填充分镜
      if (template.scenes && Array.isArray(template.scenes)) {
        const importedScenes: SceneData[] = template.scenes.map((s: {
          sceneNumber: number;
          characterIds?: string[];
          shots?: Array<{
            shotNumber: number;
            durationSeconds?: number;
            prompt: string;
            cameraMovement: string;
          }>;
          firstFramePrompt: string;
          description: string;
          descriptionEn: string;
        }) => ({
          id: nanoid(),
          sceneNumber: s.sceneNumber,
          characterIds: s.characterIds || ['pet'],
          shots: s.shots?.map(shot => ({
            shotNumber: shot.shotNumber,
            durationSeconds: shot.durationSeconds || 3,
            prompt: shot.prompt || '',
            cameraMovement: shot.cameraMovement || '',
          })) || [],
          firstFramePrompt: s.firstFramePrompt || '',
          description: s.description || '',
          descriptionEn: s.descriptionEn || '',
          frameStatus: 'pending' as const,
          videoStatus: 'pending' as const,
        }));

        setScenes(importedScenes);
      }

      // 关闭弹窗
      setShowJsonImport(false);
      setJsonInput('');

      console.log('✅ Text imported successfully:', result.message);
    } catch (error) {
      console.error('Parse text error:', error);
      setJsonParseError(error instanceof Error ? error.message : '解析失败，请重试');
    } finally {
      setIsParsingJson(false);
    }
  };

  // 生成角色参考卡
  const handleGenerateCharacterSheet = async () => {
    if (config.characters.length === 0) {
      alert('请先添加角色');
      return;
    }

    if (!config.globalStylePrefix) {
      alert('请先设置全局风格前缀');
      return;
    }

    // 参考图：优先使用宠物原图，其次使用已有的角色参考卡
    const referenceImageUrl = petImageUrl || config.characterSheetUrl;
    if (!referenceImageUrl) {
      alert('请先上传宠物图片，参考卡需要基于宠物图片生成以保持角色一致性');
      return;
    }

    setIsGeneratingCharacterSheet(true);
    setCharacterSheetProgress(0);

    try {
      // 1. 发起生成请求
      const response = await fetch('/api/admin/script-creator/generate-character-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characters: config.characters,
          petImageUrl: referenceImageUrl, // 优先宠物原图，其次已有参考卡
          globalStylePrefix: config.globalStylePrefix,
          aspectRatio: config.aspectRatio,
        }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || '生成失败');
      }

      const taskId = result.taskId;
      console.log('🎨 Character sheet task created:', taskId);

      // 2. 轮询任务状态
      let attempts = 0;
      const maxAttempts = 60; // 最多等待 5 分钟
      const pollInterval = 5000; // 每 5 秒查询一次

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        attempts++;

        const statusResponse = await fetch(`/api/admin/script-creator/task-status?taskId=${taskId}&type=frame`);
        const statusResult = await statusResponse.json();

        if (!statusResult.success) {
          throw new Error(statusResult.error || '查询状态失败');
        }

        setCharacterSheetProgress(statusResult.progress || Math.min(90, attempts * 5));

        if (statusResult.status === 'completed' && statusResult.imageUrl) {
          // 生成成功，更新 characterSheetUrl
          setConfig(prev => ({ ...prev, characterSheetUrl: statusResult.imageUrl }));
          console.log('✅ Character sheet generated:', statusResult.imageUrl);
          break;
        }

        if (statusResult.status === 'failed') {
          throw new Error('角色参考卡生成失败');
        }
      }

      if (attempts >= maxAttempts) {
        throw new Error('生成超时，请重试');
      }

    } catch (error) {
      console.error('Generate character sheet error:', error);
      alert(error instanceof Error ? error.message : '生成失败');
    } finally {
      setIsGeneratingCharacterSheet(false);
      setCharacterSheetProgress(0);
    }
  };

  // 显示加载中状态
  if (isLoadingTemplate) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-500">Loading template...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 编辑模式标题栏 */}
      {isEditMode && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-blue-800 dark:text-blue-200">
              编辑模式 Editing Mode
            </h2>
            <p className="text-sm text-blue-600 dark:text-blue-400">
              正在编辑模板: {config.name || editingTemplateId}
            </p>
          </div>
          <button
            onClick={handleCreateNew}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-700 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300"
          >
            <Plus className="w-4 h-4" />
            创建新模板
          </button>
        </div>
      )}

      {/* 基础配置 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">模板配置 Template Configuration</h2>

          {/* AI 生成模板按钮 - 仅新建模式显示 */}
          {!isEditMode && (
            <button
              onClick={() => setShowJsonImport(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg hover:from-purple-600 hover:to-indigo-600 transition-all shadow-md"
            >
              <Sparkles className="w-4 h-4" />
              <span>AI 生成模板</span>
            </button>
          )}
        </div>

        {/* AI 生成模板弹窗 */}
        {showJsonImport && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
              {/* 弹窗标题 */}
              <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-500" />
                  <h3 className="text-lg font-bold">AI 生成视频模板</h3>
                </div>
                <button
                  onClick={() => {
                    setShowJsonImport(false);
                    setJsonInput('');
                    setJsonParseError(null);
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-xl"
                >
                  ×
                </button>
              </div>

              {/* 弹窗内容 */}
              <div className="p-4 flex-1 overflow-auto">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  输入故事描述或剧本内容，AI 会自动识别角色、拆分场景、生成分镜提示词，并填充到表单中。
                </p>

                {/* 当前设置提示 */}
                <div className="mb-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-sm">
                  <span className="text-purple-700 dark:text-purple-300">
                    将生成 <strong>{config.durationSeconds / 15} 个场景</strong>（{config.durationSeconds} 秒），
                    比例 <strong>{config.aspectRatio}</strong>
                  </span>
                  <span className="text-purple-500 dark:text-purple-400 ml-2 text-xs">
                    （可在下方修改时长和比例后再生成）
                  </span>
                </div>

                <textarea
                  value={jsonInput}
                  onChange={e => setJsonInput(e.target.value)}
                  className="w-full h-64 px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder={`在这里输入你的故事或剧本内容...

例如：
圣诞节的温馨故事。一只橘色的小猫和它的主人住在一起。某天晚上，主人在玩游戏时忽视了小猫的陪伴请求。小猫独自坐在地毯上，突然闻到了烟味。它发现角落里的电线冒烟了，火焰开始蔓延。小猫拼命去叫主人，但主人戴着耳机听不见。最后小猫咬住主人的袖子，终于让主人发现了火情。他们一起逃出了房子，消防员救援了他们。故事最后，主人抱着小猫，感激它救了自己的命。

或者用英文：
A heartwarming Christmas story about a brave cat who saves its owner from a house fire...`}
                />

                {/* 错误提示 */}
                {jsonParseError && (
                  <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                    {jsonParseError}
                  </div>
                )}
              </div>

              {/* 弹窗底部 */}
              <div className="flex items-center justify-between p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 rounded-b-xl">
                <span className="text-xs text-gray-500">
                  使用 Gemini AI 智能生成 · 约需 10-20 秒
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowJsonImport(false);
                      setJsonInput('');
                      setJsonParseError(null);
                    }}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleParseText}
                    disabled={isParsingJson || !jsonInput.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg hover:from-purple-600 hover:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isParsingJson ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        AI 生成中...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        生成模板
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 模板名称 */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Template Name (EN)
              <span className="text-xs text-gray-500 ml-2">模板英文名称，显示在选择列表中</span>
            </label>
            <input
              type="text"
              value={config.name}
              onChange={e => setConfig(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              placeholder="Christmas Dog Rescue"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Template Name (CN)
              <span className="text-xs text-gray-500 ml-2">模板中文名称</span>
            </label>
            <input
              type="text"
              value={config.nameCn}
              onChange={e => setConfig(prev => ({ ...prev, nameCn: e.target.value }))}
              className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              placeholder="圣诞狗狗救援"
            />
          </div>

          {/* 标签 - 多选+可新增 */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">
              Tags 标签
              <span className="text-xs text-gray-500 ml-2">用于前端筛选和分类，可多选</span>
            </label>
            <div className="space-y-2">
              {/* 已选标签 */}
              <div className="flex flex-wrap gap-2">
                {config.tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm"
                  >
                    {tag}
                    <button
                      onClick={() => setConfig(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }))}
                      className="hover:text-red-500"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              {/* 可选标签 */}
              <div className="flex flex-wrap gap-2">
                {availableTags.filter(tag => !config.tags.includes(tag)).map(tag => (
                  <button
                    key={tag}
                    onClick={() => setConfig(prev => ({ ...prev, tags: [...prev.tags, tag] }))}
                    className="px-3 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full text-sm"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
              {/* 添加新标签 */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTagInput}
                  onChange={e => setNewTagInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newTagInput.trim()) {
                      const newTag = newTagInput.trim().toLowerCase();
                      if (!availableTags.includes(newTag)) {
                        setAvailableTags(prev => [...prev, newTag]);
                      }
                      if (!config.tags.includes(newTag)) {
                        setConfig(prev => ({ ...prev, tags: [...prev.tags, newTag] }));
                      }
                      setNewTagInput('');
                    }
                  }}
                  className="flex-1 px-3 py-1 border rounded-md text-sm dark:bg-gray-700 dark:border-gray-600"
                  placeholder="输入新标签，按回车添加..."
                />
                <button
                  onClick={() => {
                    if (newTagInput.trim()) {
                      const newTag = newTagInput.trim().toLowerCase();
                      if (!availableTags.includes(newTag)) {
                        setAvailableTags(prev => [...prev, newTag]);
                      }
                      if (!config.tags.includes(newTag)) {
                        setConfig(prev => ({ ...prev, tags: [...prev.tags, newTag] }));
                      }
                      setNewTagInput('');
                    }
                  }}
                  className="px-3 py-1 bg-green-500 text-white rounded-md text-sm hover:bg-green-600"
                >
                  添加
                </button>
              </div>
            </div>
          </div>

          {/* 时长 */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Duration 时长
              <span className="text-xs text-gray-500 ml-2">决定分镜数量：60秒=4个，120秒=8个</span>
            </label>
            <select
              value={config.durationSeconds}
              onChange={e => {
                setConfig(prev => ({ ...prev, durationSeconds: parseInt(e.target.value) as 60 | 120 }));
                setScenes([]); // 清空分镜
              }}
              className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            >
              <option value={60}>60 秒 (4 个分镜)</option>
              <option value={120}>120 秒 (8 个分镜)</option>
            </select>
          </div>

          {/* 比例 */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Aspect Ratio 画面比例
              <span className="text-xs text-gray-500 ml-2">横屏或竖屏</span>
            </label>
            <select
              value={config.aspectRatio}
              onChange={e => setConfig(prev => ({ ...prev, aspectRatio: e.target.value as '16:9' | '9:16' }))}
              className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="16:9">16:9 横屏 (Landscape)</option>
              <option value="9:16">9:16 竖屏 (Portrait)</option>
            </select>
          </div>

          {/* 描述 */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">
              Description (EN) 英文描述
              <span className="text-xs text-gray-500 ml-2">显示给用户看的模板说明</span>
            </label>
            <textarea
              value={config.description}
              onChange={e => setConfig(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              rows={2}
              placeholder="A heartwarming Christmas story about a brave dog..."
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">
              Description (CN) 中文描述
              <span className="text-xs text-gray-500 ml-2">显示给用户看的模板说明</span>
            </label>
            <textarea
              value={config.descriptionCn}
              onChange={e => setConfig(prev => ({ ...prev, descriptionCn: e.target.value }))}
              className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              rows={2}
              placeholder="一个关于勇敢狗狗的温暖圣诞故事..."
            />
          </div>

          {/* 全局风格前缀 - 最重要的字段 */}
          <div className="md:col-span-2 p-4 border-2 border-yellow-400 dark:border-yellow-600 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
            <label className="block text-sm font-medium mb-1">
              <span className="text-yellow-700 dark:text-yellow-400">★ Global Style Prefix 全局风格前缀 (核心字段)</span>
            </label>
            <p className="text-xs text-yellow-600 dark:text-yellow-500 mb-2">
              这是最重要的字段！会添加到每个视频提示词前面，控制整体视觉风格和角色一致性。
              例如：&quot;Pixar-style 3D animation, cinematic lighting, the main character is a golden retriever...&quot;
            </p>
            <textarea
              value={config.globalStylePrefix}
              onChange={e => setConfig(prev => ({ ...prev, globalStylePrefix: e.target.value }))}
              className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              rows={4}
              placeholder="Pixar-style High-quality 3D CG animation style, cinematic lighting, vibrant saturated colors. The main character is [pet description], maintaining consistent appearance throughout all scenes."
            />
            {/* 快速预设按钮 */}
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="text-xs text-gray-500">快速预设：</span>
              {STYLE_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => setConfig(prev => ({ ...prev, styleId: preset.id, globalStylePrefix: preset.prefix }))}
                  className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
                >
                  {preset.id}
                </button>
              ))}
            </div>
          </div>

          {/* 角色管理 */}
          <div className="md:col-span-2 p-4 border-2 border-purple-400 dark:border-purple-600 rounded-lg bg-purple-50 dark:bg-purple-900/20">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">
                <span className="text-purple-700 dark:text-purple-400">★ Characters 角色定义</span>
              </label>
              <button
                onClick={() => {
                  const newChar: CharacterData = {
                    id: `char-${Date.now()}`,
                    role: 'primary',
                    name: '',
                    nameCn: '',
                    description: '',
                    descriptionCn: '',
                  };
                  setConfig(prev => ({ ...prev, characters: [...prev.characters, newChar] }));
                }}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600"
              >
                <Plus className="w-3 h-3" />
                添加角色
              </button>
            </div>
            <p className="text-xs text-purple-600 dark:text-purple-500 mb-3">
              定义故事中的所有角色。每个场景可以指定出现哪些角色，系统会自动构建提示词。
            </p>

            {config.characters.length === 0 ? (
              <p className="text-sm text-gray-500 italic">暂无角色，点击「添加角色」创建</p>
            ) : (
              <div className="space-y-3">
                {config.characters.map((char, charIndex) => (
                  <div key={char.id} className="p-3 bg-white dark:bg-gray-700 rounded-lg border border-purple-200 dark:border-purple-700">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={char.id}
                          onChange={e => {
                            const newChars = [...config.characters];
                            newChars[charIndex] = { ...char, id: e.target.value };
                            setConfig(prev => ({ ...prev, characters: newChars }));
                          }}
                          className="w-24 px-2 py-1 text-xs border rounded dark:bg-gray-600 dark:border-gray-500"
                          placeholder="ID (pet)"
                        />
                        <select
                          value={char.role}
                          onChange={e => {
                            const newChars = [...config.characters];
                            newChars[charIndex] = { ...char, role: e.target.value as 'primary' | 'secondary' };
                            setConfig(prev => ({ ...prev, characters: newChars }));
                          }}
                          className="px-2 py-1 text-xs border rounded dark:bg-gray-600 dark:border-gray-500"
                        >
                          <option value="primary">主要角色</option>
                          <option value="secondary">次要角色</option>
                        </select>
                      </div>
                      <button
                        onClick={() => {
                          setConfig(prev => ({
                            ...prev,
                            characters: prev.characters.filter((_, i) => i !== charIndex),
                          }));
                        }}
                        className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={char.name}
                        onChange={e => {
                          const newChars = [...config.characters];
                          newChars[charIndex] = { ...char, name: e.target.value };
                          setConfig(prev => ({ ...prev, characters: newChars }));
                        }}
                        className="px-2 py-1 text-sm border rounded dark:bg-gray-600 dark:border-gray-500"
                        placeholder="英文名 (Hero Cat)"
                      />
                      <input
                        type="text"
                        value={char.nameCn}
                        onChange={e => {
                          const newChars = [...config.characters];
                          newChars[charIndex] = { ...char, nameCn: e.target.value };
                          setConfig(prev => ({ ...prev, characters: newChars }));
                        }}
                        className="px-2 py-1 text-sm border rounded dark:bg-gray-600 dark:border-gray-500"
                        placeholder="中文名 (英雄猫咪)"
                      />
                      <textarea
                        value={char.description}
                        onChange={e => {
                          const newChars = [...config.characters];
                          newChars[charIndex] = { ...char, description: e.target.value };
                          setConfig(prev => ({ ...prev, characters: newChars }));
                        }}
                        className="px-2 py-1 text-xs border rounded dark:bg-gray-600 dark:border-gray-500"
                        rows={2}
                        placeholder="英文描述 (用于提示词)"
                      />
                      <textarea
                        value={char.descriptionCn}
                        onChange={e => {
                          const newChars = [...config.characters];
                          newChars[charIndex] = { ...char, descriptionCn: e.target.value };
                          setConfig(prev => ({ ...prev, characters: newChars }));
                        }}
                        className="px-2 py-1 text-xs border rounded dark:bg-gray-600 dark:border-gray-500"
                        rows={2}
                        placeholder="中文描述 (用于展示)"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 角色参考卡 - 生成按钮和展示 */}
            <div className="mt-3 pt-3 border-t border-purple-200 dark:border-purple-700">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-medium text-purple-600 dark:text-purple-400">
                    角色参考卡 Character Sheet
                  </label>
                  <button
                    onClick={handleGenerateCharacterSheet}
                    disabled={isGeneratingCharacterSheet || !config.globalStylePrefix || (!petImageUrl && !config.characterSheetUrl)}
                    className="flex items-center gap-1 px-3 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={
                      !petImageUrl && !config.characterSheetUrl
                        ? '请先上传宠物图片'
                        : !config.globalStylePrefix
                          ? '请先设置全局风格前缀'
                          : '基于宠物图片生成角色参考卡'
                    }
                  >
                    {isGeneratingCharacterSheet ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        生成中 {characterSheetProgress}%
                      </>
                    ) : config.characterSheetUrl ? (
                      <>
                        <RefreshCw className="w-3 h-3" />
                        重新生成
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3" />
                        生成参考卡
                      </>
                    )}
                  </button>
                </div>

                {/* 参考卡图片展示 */}
                {config.characterSheetUrl ? (
                  <div className="relative group">
                    <img
                      src={config.characterSheetUrl}
                      alt="Character Sheet"
                      className="w-full max-h-48 object-contain rounded-lg border border-purple-200 dark:border-purple-700 bg-gray-50 dark:bg-gray-900"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                      <a
                        href={config.characterSheetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 bg-white text-gray-800 rounded text-sm hover:bg-gray-100"
                      >
                        查看大图
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 dark:text-gray-400 p-4 border border-dashed border-purple-200 dark:border-purple-700 rounded-lg text-center">
                    {isGeneratingCharacterSheet ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                        <span>正在生成角色参考卡...</span>
                        <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500 transition-all duration-300"
                            style={{ width: `${characterSheetProgress}%` }}
                          />
                        </div>
                      </div>
                    ) : !petImageUrl ? (
                      <span className="text-amber-600 dark:text-amber-400">请先上传宠物图片，参考卡需要基于宠物图片生成</span>
                    ) : (
                      <span>点击「生成参考卡」按钮，AI 将基于上传的宠物图片生成风格化角色参考卡</span>
                    )}
                  </div>
                )}
              </div>
          </div>

          {/* Style ID - 仅作为标识 */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Style ID 风格标识
              <span className="text-xs text-gray-500 ml-2">仅用于代码引用，不影响实际效果</span>
            </label>
            <input
              type="text"
              value={config.styleId}
              onChange={e => setConfig(prev => ({ ...prev, styleId: e.target.value }))}
              className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              placeholder="pixar-3d"
            />
          </div>

          {/* 音乐提示词 */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Music Prompt 配乐提示词
              <span className="text-xs text-gray-500 ml-2">可选，会添加到视频提示词中</span>
            </label>
            <input
              type="text"
              value={config.musicPrompt}
              onChange={e => setConfig(prev => ({ ...prev, musicPrompt: e.target.value }))}
              className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              placeholder="Heartwarming orchestral Christmas music"
            />
          </div>
        </div>
      </div>

      {/* 宠物图片上传 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
        <h2 className="text-xl font-bold mb-4">Pet Image (for testing)</h2>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md cursor-pointer hover:bg-blue-600">
            <Upload className="w-4 h-4" />
            {uploadingImage ? 'Uploading...' : 'Upload Image'}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              disabled={uploadingImage}
            />
          </label>

          {petImageUrl && (
            <div className="flex items-center gap-2">
              <img src={petImageUrl} alt="Pet" className="w-16 h-16 object-cover rounded" />
              <span className="text-sm text-green-600">Uploaded</span>
            </div>
          )}
        </div>
      </div>

      {/* 分镜编辑 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Scenes ({sceneCount} x 15s)</h2>
          <button
            onClick={initializeScenes}
            className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
          >
            <Plus className="w-4 h-4" />
            Initialize Scenes
          </button>
        </div>

        {scenes.length === 0 ? (
          <p className="text-gray-500">Click &quot;Initialize Scenes&quot; to create {sceneCount} scene slots</p>
        ) : (
          <div className="space-y-6">
            {scenes.map((scene, index) => (
              <div key={scene.id} className="border rounded-lg p-4 dark:border-gray-600">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold">Scene {scene.sceneNumber}</h3>
                    {/* 角色选择 */}
                    {config.characters.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-xs text-gray-500">角色:</span>
                        {config.characters.map(char => (
                          <label
                            key={char.id}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded cursor-pointer ${
                              scene.characterIds.includes(char.id)
                                ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={scene.characterIds.includes(char.id)}
                              onChange={e => {
                                const newIds = e.target.checked
                                  ? [...scene.characterIds, char.id]
                                  : scene.characterIds.filter(id => id !== char.id);
                                updateScene(scene.id, { characterIds: newIds });
                              }}
                              className="hidden"
                            />
                            {char.nameCn || char.name || char.id}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {/* 首帧图状态/按钮 */}
                    {scene.frameStatus === 'generating' ? (
                      <span className="text-sm text-blue-500 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Generating frame... {scene.frameProgress}%
                      </span>
                    ) : scene.frameStatus === 'completed' && scene.frameImageUrl ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPreviewMedia({
                            type: 'image',
                            url: scene.frameImageUrl!,
                            title: `Scene ${scene.sceneNumber} - 首帧图`
                          })}
                          className="relative group"
                          title="点击预览大图"
                        >
                          <img src={scene.frameImageUrl} alt="Frame" className="w-12 h-12 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded">
                            <ZoomIn className="w-4 h-4 text-white" />
                          </div>
                        </button>
                        <button
                          onClick={() => handleGenerateFrame(scene.id)}
                          className="p-1 text-xs text-gray-500 hover:text-blue-500 disabled:opacity-50"
                          title="重新生成首帧图"
                        >
                          <RefreshCw className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleGenerateFrame(scene.id)}
                        disabled={!petImageUrl || !scene.firstFramePrompt}
                        className="flex items-center gap-1 px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                      >
                        <ImageIcon className="w-3 h-3" />
                        Frame
                      </button>
                    )}

                    {/* 视频状态/按钮 */}
                    {scene.videoStatus === 'generating' ? (
                      <span className="text-sm text-blue-500 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Generating video... {scene.videoProgress}%
                      </span>
                    ) : scene.videoStatus === 'completed' && scene.videoUrl ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPreviewMedia({
                            type: 'video',
                            url: scene.videoUrl!,
                            title: `Scene ${scene.sceneNumber} - 视频`
                          })}
                          className="flex items-center gap-1 px-2 py-1 text-sm text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/30 rounded transition-colors"
                          title="点击播放视频"
                        >
                          <Play className="w-3 h-3" />
                          预览视频
                        </button>
                        <button
                          onClick={() => handleGenerateVideo(scene.id)}
                          className="p-1 text-xs text-gray-500 hover:text-purple-500 disabled:opacity-50"
                          title="重新生成视频"
                        >
                          <RefreshCw className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleGenerateVideo(scene.id)}
                        disabled={scene.frameStatus !== 'completed' || !hasAllShotPrompts(scene)}
                        className="flex items-center gap-1 px-3 py-1 text-sm bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
                      >
                        <Play className="w-3 h-3" />
                        Video
                      </button>
                    )}
                  </div>
                </div>

                {/* 首帧图提示词 */}
                <div className="mb-3">
                  <label className="block text-xs font-medium mb-1 text-gray-500">First Frame Prompt 首帧图提示词</label>
                  <textarea
                    value={scene.firstFramePrompt}
                    onChange={e => updateScene(scene.id, { firstFramePrompt: e.target.value })}
                    className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                    rows={2}
                    placeholder="Static image description for the first frame..."
                  />
                </div>

                {/* Shots 镜头列表 */}
                <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-gray-500 flex items-center gap-2">
                      Shots 镜头列表
                      <span className={`px-1.5 py-0.5 rounded text-xs ${
                        getSceneDuration(scene) === 15
                          ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                      }`}>
                        总时长: {getSceneDuration(scene)}s {getSceneDuration(scene) !== 15 && '(推荐15s)'}
                      </span>
                    </label>
                    <button
                      onClick={() => addShot(scene.id)}
                      className="flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      <Plus className="w-3 h-3" />
                      添加镜头
                    </button>
                  </div>

                  {scene.shots.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">暂无镜头，点击「添加镜头」创建</p>
                  ) : (
                    <div className="space-y-2">
                      {scene.shots.map((shot, shotIdx) => (
                        <div key={shotIdx} className="flex gap-2 items-start p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600">
                          {/* 镜头编号和时间轴 */}
                          <div className="flex flex-col gap-1 min-w-[100px]">
                            <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                              Shot {shot.shotNumber}
                            </span>
                            {/* 时长输入（支持小数） */}
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={shot.durationSeconds}
                                onChange={e => updateShot(scene.id, shotIdx, { durationSeconds: parseFloat(e.target.value) || 0 })}
                                className="w-14 px-1 py-0.5 text-xs border rounded dark:bg-gray-700 dark:border-gray-600"
                                min={0.1}
                                max={15}
                                step={0.1}
                              />
                              <span className="text-xs text-gray-400">秒</span>
                            </div>
                            <input
                              type="text"
                              value={shot.cameraMovement}
                              onChange={e => updateShot(scene.id, shotIdx, { cameraMovement: e.target.value })}
                              className="w-full px-1 py-0.5 text-xs border rounded dark:bg-gray-700 dark:border-gray-600"
                              placeholder="镜头运动"
                            />
                          </div>

                          {/* 镜头提示词 */}
                          <textarea
                            value={shot.prompt}
                            onChange={e => updateShot(scene.id, shotIdx, { prompt: e.target.value })}
                            className="flex-1 px-2 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600"
                            rows={3}
                            placeholder="Shot prompt... 支持占位符: [PET] [OWNER]"
                          />

                          {/* 删除按钮 */}
                          <button
                            onClick={() => removeShot(scene.id, shotIdx)}
                            className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                            title="删除镜头"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 场景描述 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1 text-gray-500">Description (CN) 中文描述</label>
                    <input
                      type="text"
                      value={scene.description}
                      onChange={e => updateScene(scene.id, { description: e.target.value })}
                      className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                      placeholder="场景描述..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1 text-gray-500">Description (EN) 英文描述</label>
                    <input
                      type="text"
                      value={scene.descriptionEn}
                      onChange={e => updateScene(scene.id, { descriptionEn: e.target.value })}
                      className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                      placeholder="Scene description..."
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
        <h2 className="text-xl font-bold mb-4">Actions 操作</h2>

        {/* 状态提示 */}
        <div className="mb-4 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-sm text-blue-700 dark:text-blue-300">
          {editingTemplateId ? (
            <span>当前编辑模板 ID: {editingTemplateId}</span>
          ) : (
            <span>新建模板，点击「Save 保存」创建记录</span>
          )}
        </div>

        <div className="flex flex-wrap gap-4">
          {/* 保存按钮 */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save 保存
          </button>

          {/* 合并视频 */}
          <button
            onClick={handleMergeVideos}
            disabled={isMerging || scenes.length === 0 || scenes.some(s => s.videoStatus !== 'completed' || !s.videoUrl)}
            className="flex items-center gap-2 px-6 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50"
          >
            {isMerging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Merge Videos 合并视频
          </button>

          {/* 发布按钮 */}
          <button
            onClick={handlePublish}
            disabled={isSavingTemplate || !finalVideoUrl || !editingTemplateId}
            className="flex items-center gap-2 px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50"
          >
            {isSavingTemplate ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Publish 发布
          </button>
        </div>

        {/* 最终视频预览 */}
        {finalVideoUrl && (
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-bold">Final Video 最终视频</h3>
              {isEditMode && (
                <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                  {scenes.some(s => s.videoStatus === 'completed') ? '新生成的视频' : '原有预览视频'}
                </span>
              )}
            </div>
            <video src={finalVideoUrl} controls className="max-w-lg rounded" />
          </div>
        )}

        {/* 模板保存结果 */}
        {savedTemplateId && (
          <div className="mt-4 p-3 bg-green-100 dark:bg-green-900 rounded">
            <p className="text-green-800 dark:text-green-200">
              {isEditMode ? 'Template ID: ' : 'Template saved! ID: '}<code>{savedTemplateId}</code>
            </p>
            <Link
              href="/admin/script-templates"
              className="text-sm text-green-600 dark:text-green-400 underline hover:no-underline"
              prefetch={true}
            >
              View all templates 查看所有模板
            </Link>
          </div>
        )}
      </div>

      {/* 媒体预览弹窗 */}
      {previewMedia && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setPreviewMedia(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] w-full mx-4"
            onClick={e => e.stopPropagation()}
          >
            {/* 关闭按钮 */}
            <button
              onClick={() => setPreviewMedia(null)}
              className="absolute -top-10 right-0 p-2 text-white hover:text-gray-300 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            {/* 标题 */}
            <div className="absolute -top-10 left-0 text-white text-sm">
              {previewMedia.title}
            </div>

            {/* 内容 */}
            {previewMedia.type === 'image' ? (
              <img
                src={previewMedia.url}
                alt={previewMedia.title}
                className="w-full h-auto max-h-[85vh] object-contain rounded-lg"
              />
            ) : (
              <video
                src={previewMedia.url}
                controls
                autoPlay
                className="w-full h-auto max-h-[85vh] rounded-lg"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
