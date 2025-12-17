/**
 * Random Prompts List Page
 * 随机 Prompt 列表页 - 显示所有随机 prompt，支持筛选和操作
 */

import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PERMISSIONS, requirePermission } from '@/core/rbac';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { TableCard } from '@/shared/blocks/table';
import {
  getRandomPrompts,
  getRandomPromptsCount,
  RandomPromptMode,
  RandomPromptStatus,
  type RandomPrompt,
} from '@/shared/models/random-prompt';
import { Button, Crumb } from '@/shared/types/blocks/common';
import { type Table } from '@/shared/types/blocks/table';

export default async function RandomPromptsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: number; pageSize?: number; mode?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // 检查用户权限
  await requirePermission({
    code: PERMISSIONS.RANDOM_PROMPTS_READ,
    redirectUrl: '/admin/no-permission',
    locale,
  });

  const t = await getTranslations('admin.random-prompts');

  const { page: pageNum, pageSize, mode: modeFilter } = await searchParams;
  const page = pageNum || 1;
  const limit = pageSize || 30;

  // 面包屑导航
  const crumbs: Crumb[] = [
    { title: t('list.crumbs.admin'), url: '/admin' },
    { title: t('list.crumbs.random_prompts'), is_active: true },
  ];

  // 获取数据
  const total = await getRandomPromptsCount({
    mode: modeFilter as RandomPromptMode | undefined,
  });
  const data = await getRandomPrompts({
    mode: modeFilter as RandomPromptMode | undefined,
    page,
    limit,
  });

  // 表格配置
  const table: Table = {
    columns: [
      {
        name: 'prompt',
        title: t('fields.prompt'),
      },
      {
        name: 'mode',
        title: t('fields.mode'),
        type: 'label',
        metadata: { variant: 'outline' },
      },
      {
        name: 'status',
        title: t('fields.status'),
        type: 'label',
        metadata: { variant: 'outline' },
      },
      {
        name: 'sortOrder',
        title: t('fields.sort_order'),
      },
      { name: 'createdAt', title: t('fields.created_at'), type: 'time' },
      {
        name: 'action',
        title: '',
        type: 'dropdown',
        callback: (item: RandomPrompt) => {
          return [
            {
              id: 'edit',
              title: t('list.buttons.edit'),
              icon: 'RiEditLine',
              url: `/admin/random-prompts/${item.id}/edit`,
            },
          ];
        },
      },
    ],
    actions: [
      {
        id: 'edit',
        title: t('list.buttons.edit'),
        icon: 'RiEditLine',
        url: '/admin/random-prompts/[id]/edit',
      },
    ],
    data,
    pagination: {
      total,
      page,
      limit,
    },
  };

  // 操作按钮
  const actions: Button[] = [
    {
      id: 'add',
      title: t('list.buttons.add'),
      icon: 'RiAddLine',
      url: '/admin/random-prompts/add',
    },
  ];

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title={t('list.title')} actions={actions} />
        <TableCard table={table} />
      </Main>
    </>
  );
}
