/**
 * Random Prompt Edit Page
 * 编辑随机 Prompt 页面
 */

import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PERMISSIONS, requirePermission } from '@/core/rbac';
import { Empty } from '@/shared/blocks/common';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { FormCard } from '@/shared/blocks/form';
import {
  findRandomPrompt,
  updateRandomPrompt,
  UpdateRandomPrompt,
  RandomPromptMode,
  RandomPromptStatus,
} from '@/shared/models/random-prompt';
import { getUserInfo } from '@/shared/models/user';
import { Crumb } from '@/shared/types/blocks/common';
import { Form } from '@/shared/types/blocks/form';

export default async function RandomPromptEditPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  // 检查用户权限
  await requirePermission({
    code: PERMISSIONS.RANDOM_PROMPTS_WRITE,
    redirectUrl: '/admin/no-permission',
    locale,
  });

  const t = await getTranslations('admin.random-prompts');

  // 查找随机 prompt
  const randomPromptData = await findRandomPrompt({ id });
  if (!randomPromptData) {
    return <Empty message="Random prompt not found" />;
  }

  // 面包屑导航
  const crumbs: Crumb[] = [
    { title: t('edit.crumbs.admin'), url: '/admin' },
    { title: t('edit.crumbs.random_prompts'), url: '/admin/random-prompts' },
    { title: t('edit.crumbs.edit'), is_active: true },
  ];

  // 表单配置
  const form: Form = {
    fields: [
      {
        name: 'prompt',
        type: 'textarea',
        title: t('fields.prompt'),
        tip: t('fields.prompt_tip'),
        validation: { required: true },
      },
      {
        name: 'mode',
        type: 'select',
        title: t('fields.mode'),
        tip: t('fields.mode_tip'),
        validation: { required: true },
        options: [
          { value: RandomPromptMode.IMAGE, title: t('mode.image') },
          { value: RandomPromptMode.VIDEO, title: t('mode.video') },
        ],
      },
      {
        name: 'status',
        type: 'select',
        title: t('fields.status'),
        validation: { required: true },
        options: [
          { value: RandomPromptStatus.ACTIVE, title: t('status.active') },
          { value: RandomPromptStatus.INACTIVE, title: t('status.inactive') },
        ],
      },
      {
        name: 'sortOrder',
        type: 'number',
        title: t('fields.sort_order'),
        tip: t('fields.sort_order_tip'),
      },
    ],
    passby: {
      randomPrompt: randomPromptData,
    },
    data: randomPromptData,
    submit: {
      button: {
        title: t('edit.buttons.submit'),
      },
      handler: async (data, passby) => {
        'use server';

        const user = await getUserInfo();
        if (!user) {
          throw new Error('no auth');
        }

        const { randomPrompt } = passby;
        if (!randomPrompt) {
          throw new Error('random prompt not found');
        }

        const prompt = data.get('prompt') as string;
        const mode = data.get('mode') as RandomPromptMode;
        const status = data.get('status') as RandomPromptStatus;
        const sortOrderStr = data.get('sortOrder') as string;
        const sortOrder = sortOrderStr ? parseInt(sortOrderStr, 10) : 0;

        if (!prompt?.trim()) {
          throw new Error('prompt is required');
        }

        if (!mode || !Object.values(RandomPromptMode).includes(mode)) {
          throw new Error('invalid mode');
        }

        const updateData: UpdateRandomPrompt = {
          prompt: prompt.trim(),
          mode,
          status: status || RandomPromptStatus.ACTIVE,
          sortOrder: isNaN(sortOrder) ? 0 : sortOrder,
        };

        const result = await updateRandomPrompt(randomPrompt.id, updateData);

        if (!result) {
          throw new Error('update random prompt failed');
        }

        return {
          status: 'success',
          message: 'random prompt updated',
          redirect_url: '/admin/random-prompts',
        };
      },
    },
  };

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title={t('edit.title')} />
        <FormCard form={form} className="md:max-w-xl" />
      </Main>
    </>
  );
}
