import { AITaskStatus } from '@/extensions/ai';
import { respData, respErr } from '@/shared/lib/resp';
import {
  findAITaskByTaskId,
  UpdateAITask,
  updateAITaskById,
} from '@/shared/models/ai_task';
import { getUserInfo } from '@/shared/models/user';
import { getAIService } from '@/shared/services/ai';
import { processMediaStorage } from '@/shared/services/media-storage';
import { shouldAddWatermark } from '@/shared/services/task-limiter';

export async function POST(req: Request) {
  try {
    const { taskId } = await req.json();
    if (!taskId) {
      return respErr('invalid params');
    }

    const user = await getUserInfo();
    if (!user) {
      return respErr('no auth, please sign in');
    }

    // Find task by provider's taskId (e.g., Evolink task ID)
    const task = await findAITaskByTaskId(taskId);
    if (!task || !task.taskId) {
      return respErr('task not found');
    }

    if (task.userId !== user.id) {
      return respErr('no permission');
    }

    const aiService = await getAIService();
    const aiProvider = aiService.getProvider(task.provider);
    if (!aiProvider) {
      return respErr('invalid ai provider');
    }

    const result = await aiProvider?.query?.({
      taskId: task.taskId,
    });

    if (!result?.taskStatus) {
      return respErr('query ai task failed');
    }

    // 准备更新数据
    const updateAITask: UpdateAITask = {
      status: result.taskStatus,
      taskInfo: result.taskInfo ? JSON.stringify(result.taskInfo) : null,
      taskResult: result.taskResult ? JSON.stringify(result.taskResult) : null,
      creditId: task.creditId, // credit consumption record id
    };

    // 检查任务是否刚完成（状态变为 success）
    // 注意：数据库中可能存储 'completed'（旧数据或 pet-video 服务），
    // 但 AI Provider 返回的会被映射为 AITaskStatus.SUCCESS ('success')
    const isJustCompleted =
      result.taskStatus === AITaskStatus.SUCCESS &&
      task.status !== AITaskStatus.SUCCESS &&
      task.status !== 'completed'; // 兼容旧数据

    // 检查是否已经有 R2 URL（避免重复上传）
    const hasR2Url =
      task.mediaType === 'image'
        ? !!task.finalImageUrl
        : !!task.finalVideoUrl || !!task.originalVideoUrl;

    // 如果任务刚完成且没有 R2 URL，触发上传
    if (isJustCompleted && !hasR2Url && updateAITask.taskResult) {
      console.log(`[QueryAPI] Task ${task.id} completed, starting R2 upload...`);

      try {
        // 检查是否需要水印（Pro 用户跳过）
        const needWatermark = await shouldAddWatermark(task.userId);

        // 处理媒体存储
        const storageResult = await processMediaStorage({
          taskId: task.id,
          userId: task.userId,
          mediaType: task.mediaType as 'image' | 'video',
          taskResult: updateAITask.taskResult,
          skipWatermark: !needWatermark,
        });

        if (storageResult.success) {
          // 更新数据库中的 R2 URL
          if (task.mediaType === 'image') {
            updateAITask.finalImageUrl = storageResult.finalUrl;
          } else {
            updateAITask.finalVideoUrl = storageResult.finalUrl;
            updateAITask.originalVideoUrl = storageResult.originalUrl;
            if (storageResult.watermarkedUrl) {
              updateAITask.watermarkedVideoUrl = storageResult.watermarkedUrl;
            }
          }
          console.log(`[QueryAPI] R2 upload successful for task ${task.id}`);
        } else {
          // 上传失败，记录错误但不阻断流程
          console.error(`[QueryAPI] R2 upload failed for task ${task.id}:`, storageResult.error);
        }
      } catch (uploadError) {
        // 上传异常，记录错误但不阻断流程
        console.error(`[QueryAPI] R2 upload error for task ${task.id}:`, uploadError);
      }
    }

    // 更新任务记录
    if (updateAITask.taskInfo !== task.taskInfo || isJustCompleted) {
      await updateAITaskById(task.id, updateAITask);
    }

    // 更新返回的任务对象
    task.status = updateAITask.status || '';
    task.taskInfo = updateAITask.taskInfo || null;
    task.taskResult = updateAITask.taskResult || null;
    if (updateAITask.finalImageUrl) {
      task.finalImageUrl = updateAITask.finalImageUrl;
    }
    if (updateAITask.finalVideoUrl) {
      task.finalVideoUrl = updateAITask.finalVideoUrl;
    }
    if (updateAITask.originalVideoUrl) {
      task.originalVideoUrl = updateAITask.originalVideoUrl;
    }
    if (updateAITask.watermarkedVideoUrl) {
      task.watermarkedVideoUrl = updateAITask.watermarkedVideoUrl;
    }

    return respData(task);
  } catch (e: any) {
    console.log('ai query failed', e);
    return respErr(e.message);
  }
}
