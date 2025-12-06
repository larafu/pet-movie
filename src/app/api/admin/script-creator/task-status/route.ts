/**
 * 查询生成任务状态 API
 * GET /api/admin/script-creator/task-status?taskId=xxx&type=frame|video
 * 直接查询 Evolink API 的任务状态
 */

import { NextRequest, NextResponse } from 'next/server';

import { getAuth } from '@/core/auth';
import { createEvolinkClient } from '@/extensions/ai/providers/evolink/client';
import { checkScriptTemplateReadPermission } from '../_lib/check-admin';

export async function GET(request: NextRequest) {
  try {
    // 验证用户登录
    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // 验证管理员权限
    const permissionError = await checkScriptTemplateReadPermission(session.user.id);
    if (permissionError) return permissionError;

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    const type = searchParams.get('type'); // 'frame' or 'video'

    if (!taskId || !type) {
      return NextResponse.json({ success: false, error: 'Missing taskId or type' }, { status: 400 });
    }

    const evolinkClient = createEvolinkClient();

    if (type === 'frame') {
      // 查询图片生成任务状态
      const result = await evolinkClient.getTaskStatus(taskId);

      // 计算进度
      let progress = 0;
      let status: 'pending' | 'generating' | 'completed' | 'failed' = 'generating';
      let imageUrl: string | undefined;

      if (result.status === 'completed') {
        status = 'completed';
        progress = 100;
        // Evolink 返回 results 数组
        imageUrl = result.results?.[0];
      } else if (result.status === 'failed') {
        status = 'failed';
      } else {
        // 进行中（pending 或 processing）
        progress = result.progress || Math.min(90, (Date.now() % 90));
      }

      return NextResponse.json({
        success: true,
        status,
        progress,
        imageUrl,
      });
    } else {
      // 查询视频生成任务状态
      const result = await evolinkClient.getVideoTaskStatus(taskId);

      let progress = 0;
      let status: 'pending' | 'generating' | 'completed' | 'failed' = 'generating';
      let videoUrl: string | undefined;

      if (result.status === 'completed') {
        status = 'completed';
        progress = 100;
        // Evolink 返回 results 数组
        videoUrl = result.results?.[0];
      } else if (result.status === 'failed') {
        status = 'failed';
      } else {
        // 进行中（pending 或 processing）
        progress = result.progress || Math.min(90, (Date.now() % 90));
      }

      return NextResponse.json({
        success: true,
        status,
        progress,
        videoUrl,
      });
    }
  } catch (error) {
    console.error('Task status error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
