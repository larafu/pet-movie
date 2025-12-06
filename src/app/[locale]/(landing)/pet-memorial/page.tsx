/**
 * 宠物纪念墙页面
 * Pet Memorial Wall Page
 *
 * 展示公开的宠物纪念列表
 */

import { Suspense } from 'react';
import { setRequestLocale } from 'next-intl/server';
import { Loader2 } from 'lucide-react';

import { getMetadata } from '@/shared/lib/seo';
import { MemorialList, MemorialHero } from '@/shared/components/pet-memorial';

// SEO 元数据
export const generateMetadata = getMetadata({
  metadataKey: 'pet-memorial.metadata',
  canonicalUrl: '/pet-memorial',
  imageUrl: '/images/pet-memorial-og.png',
});

export default async function PetMemorialPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="flex min-h-screen flex-col">
      {/* Hero 区域 - 浮动气泡 + 标题 + CTA */}
      <Suspense
        fallback={
          <div className="min-h-[500px] md:min-h-[600px] flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        }
      >
        <MemorialHero />
      </Suspense>

      {/* 纪念列表区域 - pt-2 添加上边距避免被遮挡（约8px） */}
      <div className="w-full max-w-7xl mx-auto px-4 pt-2 pb-16">
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-[400px]">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          }
        >
          <MemorialList />
        </Suspense>
      </div>
    </main>
  );
}
