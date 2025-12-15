import { envConfigs } from '@/config';
import { AIMediaType, AITaskStatus } from '@/extensions/ai';
import {
  getModelByActualModel,
  type AIModelType,
} from '@/extensions/ai/models/config';
import { getUuid } from '@/shared/lib/hash';
import { respData, respErr } from '@/shared/lib/resp';
import { createAITask, NewAITask } from '@/shared/models/ai_task';
import { consumeCredits, getRemainingCredits } from '@/shared/models/credit';
import { getUserInfo } from '@/shared/models/user';
import { getAIService } from '@/shared/services/ai';
import { isSuperAdmin } from '@/shared/services/rbac';

export async function POST(request: Request) {
  try {
    let {
      provider,
      mediaType,
      model,
      prompt,
      options,
      scene,
      image_urls,
      isPublic = true, // 默认公开
      promptHidden = false, // 默认不隐藏提示词
    } = await request.json();

    if (!provider || !mediaType || !model) {
      throw new Error('invalid params');
    }

    if (!prompt && !options) {
      throw new Error('prompt or options is required');
    }

    const aiService = await getAIService();

    // check generate type
    if (!aiService.getMediaTypes().includes(mediaType)) {
      throw new Error('invalid mediaType');
    }

    // check ai provider
    const aiProvider = aiService.getProvider(provider);
    if (!aiProvider) {
      throw new Error('invalid provider');
    }

    // get current user
    const user = await getUserInfo();
    if (!user) {
      throw new Error('no auth, please sign in');
    }

    // 从 options 中解析配置（用于确定模型和积分）
    let parsedOptions: { duration?: number; quality?: string } = {};
    try {
      if (options && typeof options === 'string') {
        parsedOptions = JSON.parse(options);
      } else if (options && typeof options === 'object') {
        parsedOptions = options;
      }
    } catch {
      // ignore parse error
    }

    // 根据模型配置获取积分消耗
    let costCredits = 2; // 默认值

    if (mediaType === AIMediaType.IMAGE) {
      // 图片生成：根据模型查找积分
      const modelConfig = getModelByActualModel(model, 'image' as AIModelType);
      if (modelConfig) {
        costCredits = modelConfig.credits;
      }
      // 4K 质量额外消耗 5 积分
      if (parsedOptions.quality === '4K') {
        costCredits += 5;
      }
      // 设置场景
      if (!scene) {
        scene = image_urls?.length > 0 ? 'image-to-image' : 'text-to-image';
      }
    } else if (mediaType === AIMediaType.MUSIC) {
      // 音乐生成
      costCredits = 10;
      scene = 'text-to-music';
    } else if (mediaType === AIMediaType.VIDEO) {
      // 视频生成：根据模型和时长查找积分
      const duration = parsedOptions.duration || 10;
      const modelConfig = getModelByActualModel(model, 'video' as AIModelType, {
        duration,
      });
      if (modelConfig) {
        costCredits = modelConfig.credits;
      }
      scene = 'text-to-video';
    } else {
      throw new Error('invalid mediaType');
    }

    // Check if user is super admin (unlimited credits)
    const isAdmin = await isSuperAdmin(user.id);

    // Check credits (skip for super admins)
    if (!isAdmin) {
      const remainingCredits = await getRemainingCredits(user.id);
      if (remainingCredits < costCredits) {
        throw new Error('insufficient credits');
      }
    }

    const callbackUrl = `${envConfigs.app_url}/api/ai/notify/${provider}`;

    const params: any = {
      mediaType,
      model,
      prompt,
      callbackUrl,
      options,
    };

    // Add image_urls if provided (for image-to-video or reference images)
    // 只添加有效的 URL（过滤空字符串和无效格式）
    if (image_urls && Array.isArray(image_urls)) {
      const validUrls = image_urls.filter(
        (url: string) =>
          url && (url.startsWith('http://') || url.startsWith('https://'))
      );
      if (validUrls.length > 0) {
        params.image_urls = validUrls;
      }
    }

    // generate content
    const result = await aiProvider.generate({ params });
    if (!result?.taskId) {
      throw new Error(
        `ai generate failed, mediaType: ${mediaType}, provider: ${provider}, model: ${model}`
      );
    }

    // create ai task
    const newAITask: NewAITask = {
      id: getUuid(),
      userId: user.id,
      mediaType,
      provider,
      model,
      prompt,
      scene,
      options: options ? JSON.stringify(options) : null,
      status: AITaskStatus.PENDING,
      costCredits,
      taskId: result.taskId,
      taskInfo: result.taskInfo ? JSON.stringify(result.taskInfo) : null,
      taskResult: result.taskResult ? JSON.stringify(result.taskResult) : null,
      isPublic: Boolean(isPublic), // 是否公开
      promptHidden: Boolean(promptHidden), // 是否隐藏提示词
    };
    await createAITask(newAITask, {
      skipCreditConsumption: isAdmin, // Skip credit consumption for super admins
    });

    return respData(newAITask);
  } catch (e: any) {
    console.log('generate failed', e);
    return respErr(e.message);
  }
}
