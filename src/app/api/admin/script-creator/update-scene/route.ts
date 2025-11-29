/**
 * 更新分镜提示词 API
 * POST /api/admin/script-creator/update-scene
 * 用于在重新生成前更新数据库中的提示词和全局配置
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

import { getAuth } from '@/core/auth';
import { db } from '@/core/db';
import { customScript, customScriptScene } from '@/config/db/schema';

interface UpdateSceneRequest {
  sceneId: string;
  scriptId?: string;
  firstFramePrompt?: string;
  prompt?: string;
  globalStylePrefix?: string; // 全局风格前缀
  styleId?: string;
}

export async function POST(request: NextRequest) {
  try {
    // 验证用户登录
    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: 验证管理员权限

    const body: UpdateSceneRequest = await request.json();
    const { sceneId, scriptId, firstFramePrompt, prompt, globalStylePrefix, styleId } = body;

    if (!sceneId) {
      return NextResponse.json({ success: false, error: 'Missing sceneId' }, { status: 400 });
    }

    const database = db();

    // 1. 更新分镜记录
    const sceneUpdateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (firstFramePrompt !== undefined) {
      sceneUpdateData.firstFramePrompt = firstFramePrompt;
    }

    if (prompt !== undefined) {
      sceneUpdateData.prompt = prompt;
      sceneUpdateData.originalPrompt = prompt;
    }

    await database
      .update(customScriptScene)
      .set(sceneUpdateData)
      .where(eq(customScriptScene.id, sceneId));

    // 2. 如果提供了 scriptId 和全局配置，更新剧本主记录
    if (scriptId && (globalStylePrefix !== undefined || styleId !== undefined)) {
      // 先获取当前的 scenesJson
      const scriptData = await database
        .select({ scenesJson: customScript.scenesJson })
        .from(customScript)
        .where(eq(customScript.id, scriptId))
        .limit(1);

      if (scriptData.length > 0) {
        // 更新 scenesJson 中的 globalStylePrefix
        let scenesJson = scriptData[0].scenesJson;
        if (globalStylePrefix !== undefined && scenesJson) {
          try {
            const parsed = JSON.parse(scenesJson);
            parsed.globalStylePrefix = globalStylePrefix;
            scenesJson = JSON.stringify(parsed);
          } catch {
            // 忽略解析错误
          }
        }

        const scriptUpdateData: Record<string, unknown> = {
          updatedAt: new Date(),
          scenesJson,
        };

        if (styleId !== undefined) {
          scriptUpdateData.styleId = styleId;
        }

        await database
          .update(customScript)
          .set(scriptUpdateData)
          .where(eq(customScript.id, scriptId));

        console.log('✅ Script config updated:', scriptId);
      }
    }

    console.log('✅ Scene updated:', sceneId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update scene error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
