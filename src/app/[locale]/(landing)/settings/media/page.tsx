import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';

import { getUserInfo } from '@/shared/models/user';
import { MediaLibraryClient } from './client';

export default async function MediaLibraryPage() {
  const user = await getUserInfo();
  if (!user) {
    redirect('/sign-in');
  }

  const t = await getTranslations('settings.media');

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h2 className="text-2xl font-semibold">{t('title')}</h2>
        <p className="text-muted-foreground text-sm mt-1">{t('description')}</p>
      </div>

      {/* 客户端组件 */}
      <MediaLibraryClient
        messages={{
          tabs: {
            all: t('tabs.all'),
            images: t('tabs.images'),
            videos: t('tabs.videos'),
          },
          upload: {
            button: t('upload.button'),
            hint: t('upload.hint'),
            success: t('upload.success'),
            failed: t('upload.failed'),
          },
          empty: {
            title: t('empty.title'),
            description: t('empty.description'),
          },
          item: {
            delete: t('item.delete'),
            deleteConfirm: t('item.deleteConfirm'),
            deleteSuccess: t('item.deleteSuccess'),
            deleteFailed: t('item.deleteFailed'),
            size: t('item.size'),
            uploaded: t('item.uploaded'),
          },
          loading: t('loading'),
          loadMore: t('loadMore'),
          noMore: t('noMore'),
        }}
      />
    </div>
  );
}
