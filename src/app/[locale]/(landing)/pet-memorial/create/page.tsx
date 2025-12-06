/**
 * 创建宠物纪念页面
 * Create Pet Memorial Page
 */

import { Suspense } from 'react';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { Loader2 } from 'lucide-react';

import { getAuth } from '@/core/auth';
import { headers } from 'next/headers';
import { MemorialForm } from '@/shared/components/pet-memorial';

export const metadata = {
  title: 'Create Pet Memorial | Honor Your Beloved Pet',
  description:
    'Create a beautiful memorial page for your beloved pet. Share their story, upload photos, and let others light candles in their memory.',
};

export default async function CreateMemorialPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // 验证用户登录
  const auth = await getAuth();
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session?.user?.id) {
    // 未登录，重定向到登录页
    redirect(`/${locale}/sign-in?redirect=/pet-memorial/create`);
  }

  const t = await getTranslations('pet-memorial');

  return (
    <main className="flex min-h-screen flex-col items-center p-4 pt-[80px] pb-16">
      <div className="w-full max-w-3xl mx-auto space-y-8">
        {/* 页面标题 */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl md:text-4xl font-bold">{t('create.title')}</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            {t('create.description')}
          </p>
        </div>

        {/* 表单 */}
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-[400px]">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          }
        >
          <MemorialForm mode="create" />
        </Suspense>
      </div>
    </main>
  );
}
