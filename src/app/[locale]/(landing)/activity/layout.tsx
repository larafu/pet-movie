import { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';

import { redirect } from '@/core/i18n/navigation';
import { ConsoleLayout } from '@/shared/blocks/console/layout';
import { getUserInfo } from '@/shared/models/user';

export default async function ActivityLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  // Check if user is logged in
  const user = await getUserInfo();
  if (!user) {
    const { locale } = await params;
    redirect({ href: '/sign-in', locale });
  }

  const t = await getTranslations('activity.sidebar');

  // settings title
  const title = t('title');

  // settings nav
  const nav = t.raw('nav');

  const topNav = t.raw('top_nav');

  return (
    <ConsoleLayout
      title={title}
      nav={nav}
      topNav={topNav}
      className="py-16 md:py-20"
    >
      {children}
    </ConsoleLayout>
  );
}
