import { Suspense } from 'react';
import { setRequestLocale } from 'next-intl/server';

import { PERMISSIONS, requirePermission } from '@/core/rbac';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { Crumb } from '@/shared/types/blocks/common';
import { ScriptCreator } from './script-creator';

// 加载占位组件
function ScriptCreatorLoading() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      <span className="ml-2 text-gray-500">Loading...</span>
    </div>
  );
}

export default async function ScriptCreatorPage({
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
    { title: 'Script Creator', is_active: true },
  ];

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title="Script Template Creator 脚本模板创建" />
        <div className="p-4">
          {/* Suspense 包裹使用 useSearchParams 的组件 */}
          <Suspense fallback={<ScriptCreatorLoading />}>
            <ScriptCreator />
          </Suspense>
        </div>
      </Main>
    </>
  );
}
