/**
 * 创建脚本 API（不走 Gemini，直接保存手动输入的分镜）
 * POST /api/admin/script-creator/create
 */

import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';

import { getAuth } from '@/core/auth';
import { db } from '@/core/db';
import { customScript, customScriptScene } from '@/config/db/schema';

interface SceneInput {
  sceneNumber: number;
  prompt: string;
  firstFramePrompt: string;
  description: string;
  descriptionEn: string;
}

interface CreateRequest {
  config: {
    name: string;
    nameCn: string;
    description: string;
    descriptionCn: string;
    tags: string[]; // 标签数组，用于分类（如 dog, cat, christmas 等）
    styleId: string;
    globalStylePrefix: string;
    durationSeconds: number;
    aspectRatio: string;
    musicPrompt: string;
  };
  petImageUrl: string;
  scenes: SceneInput[];
}

export async function POST(request: NextRequest) {
  try {
    // 验证用户登录
    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    // TODO: 验证管理员权限

    const body: CreateRequest = await request.json();
    const { config, petImageUrl, scenes } = body;

    if (!petImageUrl || !scenes || scenes.length === 0) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const database = db();
    const scriptId = nanoid();

    // 根据 tags 判断宠物类型（优先级：cat > dog > 默认 dog）
    const hasCatTag = config.tags.some(tag => tag.toLowerCase() === 'cat');
    const petSpecies = hasCatTag ? 'cat' : 'dog';

    // 构建 scenesJson（与 Gemini 生成的格式保持一致）
    const scenesJson = JSON.stringify({
      title: config.name,
      pet: {
        species: petSpecies,
        description: 'Template pet - will be replaced by user pet',
        descriptionCn: '模板宠物 - 将被用户宠物替换',
      },
      globalStylePrefix: config.globalStylePrefix,
      tags: config.tags, // 保存标签数组
      scenes: scenes.map(s => ({
        sceneNumber: s.sceneNumber,
        prompt: s.prompt,
        firstFramePrompt: s.firstFramePrompt,
        description: s.description,
        descriptionEn: s.descriptionEn,
      })),
    });

    // 创建剧本主记录
    await database.insert(customScript).values({
      id: scriptId,
      userId,
      status: 'creating',
      petImageUrl,
      userPrompt: config.description || config.name, // 使用描述作为提示词
      musicPrompt: config.musicPrompt || null,
      durationSeconds: config.durationSeconds,
      aspectRatio: config.aspectRatio,
      styleId: config.styleId,
      customStyle: null,
      scenesJson,
      storyTitle: config.name,
      creditsUsed: 0, // 管理员创建模板不扣积分
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 创建分镜记录
    const sceneIds: string[] = [];
    const sceneRecords = scenes.map(scene => {
      const sceneId = nanoid();
      sceneIds.push(sceneId);

      // 如果有配乐提示词，添加到视频提示词
      const promptWithMusic = config.musicPrompt
        ? `${scene.prompt}, with ${config.musicPrompt} background music`
        : scene.prompt;

      return {
        id: sceneId,
        scriptId,
        sceneNumber: scene.sceneNumber,
        prompt: promptWithMusic,
        firstFramePrompt: scene.firstFramePrompt,
        originalPrompt: scene.prompt,
        description: scene.description,
        descriptionEn: scene.descriptionEn,
        frameStatus: 'pending' as const,
        videoStatus: 'pending' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    });

    await database.insert(customScriptScene).values(sceneRecords);

    console.log('✅ Admin script created:', scriptId);
    console.log('📝 Scene count:', sceneIds.length);

    return NextResponse.json({
      success: true,
      scriptId,
      sceneIds,
    });
  } catch (error) {
    console.error('Create script error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
