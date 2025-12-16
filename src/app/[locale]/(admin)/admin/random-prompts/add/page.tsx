/**
 * Random Prompt Add Page
 * 新增随机 Prompt 页面
 */

import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PERMISSIONS, requirePermission } from '@/core/rbac';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { FormCard } from '@/shared/blocks/form';
import { getUuid } from '@/shared/lib/hash';
import {
  addRandomPrompt,
  NewRandomPrompt,
  RandomPromptMode,
  RandomPromptStatus,
} from '@/shared/models/random-prompt';
import { getUserInfo } from '@/shared/models/user';
import { Crumb } from '@/shared/types/blocks/common';
import { Form } from '@/shared/types/blocks/form';

export default async function RandomPromptAddPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // 检查用户权限
  await requirePermission({
    code: PERMISSIONS.RANDOM_PROMPTS_WRITE,
    redirectUrl: '/admin/no-permission',
    locale,
  });

  const t = await getTranslations('admin.random-prompts');

  // 面包屑导航
  const crumbs: Crumb[] = [
    { title: t('add.crumbs.admin'), url: '/admin' },
    { title: t('add.crumbs.random_prompts'), url: '/admin/random-prompts' },
    { title: t('add.crumbs.add'), is_active: true },
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
    passby: {},
    data: {
      mode: RandomPromptMode.VIDEO,
      status: RandomPromptStatus.ACTIVE,
      sortOrder: 0,
    },
    submit: {
      button: {
        title: t('add.buttons.submit'),
      },
      handler: async (data, passby) => {
        'use server';

        const user = await getUserInfo();
        if (!user) {
          throw new Error('no auth');
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

        const newPrompt: NewRandomPrompt = {
          id: getUuid(),
          prompt: prompt.trim(),
          mode,
          status: status || RandomPromptStatus.ACTIVE,
          sortOrder: isNaN(sortOrder) ? 0 : sortOrder,
        };

        const result = await addRandomPrompt(newPrompt);

        if (!result) {
          throw new Error('add random prompt failed');
        }

        return {
          status: 'success',
          message: 'random prompt added',
          redirect_url: '/admin/random-prompts',
        };
      },
    },
  };

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title={t('add.title')} />
        <FormCard form={form} className="md:max-w-xl" />
      </Main>
    </>
  );
}
