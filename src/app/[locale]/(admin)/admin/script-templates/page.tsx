import { setRequestLocale } from 'next-intl/server';
import { eq, desc } from 'drizzle-orm';

import { PERMISSIONS, requirePermission } from '@/core/rbac';
import { db } from '@/core/db';
import { scriptTemplate } from '@/config/db/schema';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { Crumb, Button } from '@/shared/types/blocks/common';
import { TemplateList } from './template-list';

export default async function ScriptTemplatesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // 检查权限 - 只有管理员可以访问
  await requirePermission({
    code: PERMISSIONS.AITASKS_READ,
    redirectUrl: '/admin/no-permission',
    locale,
  });

  const crumbs: Crumb[] = [
    { title: 'Admin', url: '/admin' },
    { title: 'Script Templates', is_active: true },
  ];

  const actions: Button[] = [
    {
      title: 'Create Template',
      url: '/admin/script-creator',
      icon: 'RiAddLine',
    },
  ];

  // 获取所有模板
  const database = db();
  const templates = await database
    .select()
    .from(scriptTemplate)
    .orderBy(desc(scriptTemplate.createdAt));

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title="Script Templates" actions={actions} />
        <div className="p-4">
          <TemplateList templates={templates} />
        </div>
      </Main>
    </>
  );
}
