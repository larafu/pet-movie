/**
 * 宠物纪念详情页面
 * Pet Memorial Detail Page
 */

import { Suspense } from 'react';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Loader2 } from 'lucide-react';
import { notFound } from 'next/navigation';

import { db } from '@/core/db';
import { petMemorial } from '@/config/db/schema';
import { eq, isNull, and } from 'drizzle-orm';
import { MemorialDetailV2 } from '@/shared/components/pet-memorial';

interface PageProps {
  params: Promise<{
    locale: string;
    id: string;
  }>;
}

// 动态生成 metadata
export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const database = db();

  // 获取纪念信息
  const memorial = await database
    .select({
      petName: petMemorial.petName,
      message: petMemorial.message,
      images: petMemorial.images,
    })
    .from(petMemorial)
    .where(and(eq(petMemorial.id, id), isNull(petMemorial.deletedAt)))
    .limit(1);

  if (!memorial[0]) {
    return {
      title: 'Memorial Not Found',
    };
  }

  const { petName, message, images } = memorial[0];
  const imageList = JSON.parse(images || '[]');
  const coverImage = imageList[0] || '/images/pet-memorial-og.png';

  return {
    title: `${petName} | Pet Memorial`,
    description: message || `In loving memory of ${petName}`,
    openGraph: {
      title: `${petName} | Pet Memorial`,
      description: message || `In loving memory of ${petName}`,
      images: [coverImage],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${petName} | Pet Memorial`,
      description: message || `In loving memory of ${petName}`,
      images: [coverImage],
    },
  };
}

export default async function PetMemorialDetailPage({ params }: PageProps) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  // 服务端验证纪念是否存在
  const database = db();
  const memorial = await database
    .select({ id: petMemorial.id })
    .from(petMemorial)
    .where(and(eq(petMemorial.id, id), isNull(petMemorial.deletedAt)))
    .limit(1);

  if (!memorial[0]) {
    notFound();
  }

  return (
    <main className="min-h-screen pt-[64px]">
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        }
      >
        <MemorialDetailV2 id={id} />
      </Suspense>
    </main>
  );
}
