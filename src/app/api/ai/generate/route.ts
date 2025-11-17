import { envConfigs } from '@/config';
import { AIMediaType, AITaskStatus } from '@/extensions/ai';
import { getUuid } from '@/shared/lib/hash';
import { respData, respErr } from '@/shared/lib/resp';
import { createAITask, NewAITask } from '@/shared/models/ai_task';
import { consumeCredits, getRemainingCredits } from '@/shared/models/credit';
import { getUserInfo } from '@/shared/models/user';
import { getAIService } from '@/shared/services/ai';
import { isSuperAdmin } from '@/shared/services/rbac';

export async function POST(request: Request) {
  try {
    let { provider, mediaType, model, prompt, options, scene, image_urls } =
      await request.json();

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

    // todo: get cost credits from settings
    let costCredits = 2;

    if (mediaType === AIMediaType.IMAGE) {
      // generate image
      if (scene === 'image-to-image') {
        costCredits = 4;
      } else if (scene === 'text-to-image') {
        costCredits = 2;
      } else {
        throw new Error('invalid scene');
      }
    } else if (mediaType === AIMediaType.MUSIC) {
      // generate music
      costCredits = 10;
      scene = 'text-to-music';
    } else if (mediaType === AIMediaType.VIDEO) {
      // generate video
      costCredits = 5;
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
    if (image_urls) {
      params.image_urls = image_urls;
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
