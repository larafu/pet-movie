/**
 * 草稿管理 API
 * GET /api/admin/script-creator/draft - 获取用户的草稿列表
 * POST /api/admin/script-creator/draft - 保存草稿
 *
 * 草稿和正式模板统一存储在 scriptTemplate 表中，通过 status 字段区分
 * status: draft=草稿, published=已发布, disabled=已禁用
 */

import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { eq, desc, and } from 'drizzle-orm';

import { getAuth } from '@/core/auth';
import { db } from '@/core/db';
import { scriptTemplate } from '@/config/db/schema';
import { checkScriptTemplateWritePermission, checkScriptTemplateReadPermission } from '../_lib/check-admin';

// 角色数据接口
interface CharacterData {
  id: string;
  role: 'primary' | 'secondary';
  name: string;
  nameCn: string;
  description: string;
  descriptionCn: string;
}

// 草稿数据接口
// 单个镜头数据
interface ShotData {
  shotNumber: number;
  durationSeconds: number;
  prompt: string;
  cameraMovement: string;
}

// 草稿数据接口（支持新的 shots 结构和旧的 prompt 结构）
interface DraftData {
  id?: string; // 如果提供则更新，否则创建新草稿
  name: string;
  nameCn?: string;
  description?: string;
  descriptionCn?: string;
  tags: string[];
  styleId: string;
  globalStylePrefix: string;
  characters?: CharacterData[]; // 角色数组
  characterSheetUrl?: string; // 角色参考卡URL
  durationSeconds: number;
  aspectRatio: string;
  musicPrompt?: string;
  petImageUrl?: string;
  scenes: Array<{
    id: string;
    sceneNumber: number;
    characterIds?: string[]; // 该场景出现的角色
    shots?: ShotData[]; // 镜头数组（新结构）
    prompt?: string; // 旧结构兼容
    firstFramePrompt: string;
    description: string;
    descriptionEn: string;
    frameStatus: string;
    frameImageUrl?: string;
    videoStatus: string;
    videoUrl?: string;
  }>;
  mergedVideoUrl?: string;
}

/**
 * 获取用户的草稿列表
 */
export async function GET(request: NextRequest) {
  try {
    // 验证用户登录
    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // 检查权限
    const permissionError = await checkScriptTemplateReadPermission(session.user.id);
    if (permissionError) return permissionError;

    const database = db();

    // 获取用户的所有草稿（status = 'draft'）
    const drafts = await database
      .select({
        id: scriptTemplate.id,
        name: scriptTemplate.name,
        nameCn: scriptTemplate.nameCn,
        petImageUrl: scriptTemplate.petImageUrl,
        mergedVideoUrl: scriptTemplate.mergedVideoUrl,
        updatedAt: scriptTemplate.updatedAt,
        createdAt: scriptTemplate.createdAt,
      })
      .from(scriptTemplate)
      .where(
        and(
          eq(scriptTemplate.createdBy, session.user.id),
          eq(scriptTemplate.status, 'draft')
        )
      )
      .orderBy(desc(scriptTemplate.updatedAt));

    return NextResponse.json({
      success: true,
      drafts,
    });
  } catch (error) {
    console.error('Get drafts error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * 保存草稿（创建或更新）
 */
export async function POST(request: NextRequest) {
  try {
    // 验证用户登录
    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // 检查权限
    const permissionError = await checkScriptTemplateWritePermission(session.user.id);
    if (permissionError) return permissionError;

    const body: DraftData = await request.json();
    const database = db();

    // 从 tags 推断分类
    const tags = body.tags || [];
    const hasCatTag = tags.some(tag => tag.toLowerCase() === 'cat');
    const hasDogTag = tags.some(tag => tag.toLowerCase() === 'dog');
    const category = hasCatTag ? 'cat' : hasDogTag ? 'dog' : 'other';

    const draftData = {
      name: body.name || '',
      nameCn: body.nameCn || null,
      description: body.description || null,
      descriptionCn: body.descriptionCn || null,
      category,
      tags: JSON.stringify(tags),
      styleId: body.styleId || 'pixar-3d',
      globalStylePrefix: body.globalStylePrefix || null,
      charactersJson: body.characters ? JSON.stringify(body.characters) : null,
      characterSheetUrl: body.characterSheetUrl || null,
      durationSeconds: body.durationSeconds || 60,
      aspectRatio: body.aspectRatio || '16:9',
      musicPrompt: body.musicPrompt || null,
      petImageUrl: body.petImageUrl || null,
      scenesJson: JSON.stringify({ scenes: body.scenes || [] }),
      mergedVideoUrl: body.mergedVideoUrl || null,
    };

    let draftId: string;

    if (body.id) {
      // 更新已有模板
      // 检查模板是否存在
      const existingTemplate = await database
        .select({ createdBy: scriptTemplate.createdBy, status: scriptTemplate.status })
        .from(scriptTemplate)
        .where(eq(scriptTemplate.id, body.id))
        .limit(1);

      if (existingTemplate.length === 0) {
        return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });
      }

      // 权限检查：只有创建者可以编辑（管理员权限已在上面验证）
      // 如果需要允许所有管理员编辑，可以注释掉下面的检查
      // if (existingTemplate[0].createdBy !== session.user.id) {
      //   return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 });
      // }

      // 更新模板数据（不改变 status）
      await database
        .update(scriptTemplate)
        .set(draftData)
        .where(eq(scriptTemplate.id, body.id));

      draftId = body.id;
      console.log('✅ Template updated:', draftId, 'status:', existingTemplate[0].status);
    } else {
      // 创建新草稿
      draftId = nanoid();
      await database.insert(scriptTemplate).values({
        id: draftId,
        status: 'draft', // 明确设置为草稿状态
        ...draftData,
        createdBy: session.user.id,
      });
      console.log('✅ Draft created:', draftId);
    }

    return NextResponse.json({
      success: true,
      draftId,
    });
  } catch (error) {
    console.error('Save draft error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
