import { getTranslations, setRequestLocale } from 'next-intl/server';

import { envConfigs } from '@/config';
import { locales } from '@/config/locale';

// get metadata for page component
export function getMetadata(
  options: {
    title?: string;
    description?: string;
    keywords?: string;
    metadataKey?: string;
    canonicalUrl?: string; // relative path or full url
    imageUrl?: string;
    appName?: string;
    noIndex?: boolean;
  } = {}
) {
  return async function generateMetadata({
    params,
  }: {
    params: Promise<{ locale: string }>;
  }) {
    const { locale } = await params;
    setRequestLocale(locale);

    // passed metadata
    const passedMetadata = {
      title: options.title,
      description: options.description,
      keywords: options.keywords,
    };

    // default metadata
    const defaultMetadata = await getTranslatedMetadata(
      defaultMetadataKey,
      locale
    );

    // translated metadata
    let translatedMetadata: any = {};
    if (options.metadataKey) {
      translatedMetadata = await getTranslatedMetadata(
        options.metadataKey,
        locale
      );
    }

    // canonical url
    const canonicalUrl = await getCanonicalUrl(
      options.canonicalUrl || '',
      locale || ''
    );

    const title =
      passedMetadata.title || translatedMetadata.title || defaultMetadata.title;
    const description =
      passedMetadata.description ||
      translatedMetadata.description ||
      defaultMetadata.description;

    // image url
    let imageUrl = options.imageUrl || '/logo.png';
    if (imageUrl.startsWith('http')) {
      imageUrl = imageUrl;
    } else {
      imageUrl = `${envConfigs.app_url}${imageUrl}`;
    }

    // app name
    let appName = options.appName;
    if (!appName) {
      appName = envConfigs.app_name || '';
    }

    // 生成 hreflang 语言替代链接
    const languages: Record<string, string> = {};
    const baseUrl = envConfigs.app_url.replace(/\/$/, '');
    const pathname = options.canonicalUrl || '/';
    const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
    const pathWithoutSlash = normalizedPath === '/' ? '' : normalizedPath;

    for (const loc of locales) {
      // 将 locale 代码映射到 hreflang 代码（pt-br -> pt-BR）
      const hreflangCode = loc === 'pt-br' ? 'pt-BR' : loc;
      if (loc === 'en') {
        languages[hreflangCode] = `${baseUrl}${pathWithoutSlash}`;
      } else {
        languages[hreflangCode] = `${baseUrl}/${loc}${pathWithoutSlash}`;
      }
    }
    // 添加 x-default（指向英文版）
    languages['x-default'] = `${baseUrl}${pathWithoutSlash}`;

    return {
      title:
        passedMetadata.title ||
        translatedMetadata.title ||
        defaultMetadata.title,
      description:
        passedMetadata.description ||
        translatedMetadata.description ||
        defaultMetadata.description,
      keywords:
        passedMetadata.keywords ||
        translatedMetadata.keywords ||
        defaultMetadata.keywords,
      alternates: {
        canonical: canonicalUrl,
        languages,
      },

      openGraph: {
        type: 'website',
        locale: locale === 'pt-br' ? 'pt_BR' : locale,
        url: canonicalUrl,
        title,
        description,
        siteName: appName,
        images: [imageUrl.toString()],
      },

      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [imageUrl.toString()],
        site: envConfigs.app_url,
      },

      robots: {
        index: options.noIndex ? false : true,
        follow: options.noIndex ? false : true,
      },
    };
  };
}

const defaultMetadataKey = 'common.metadata';

async function getTranslatedMetadata(metadataKey: string, locale: string) {
  setRequestLocale(locale);
  const t = await getTranslations(metadataKey);

  return {
    title: t.has('title') ? t('title') : '',
    description: t.has('description') ? t('description') : '',
    keywords: t.has('keywords') ? t('keywords') : '',
  };
}

async function getCanonicalUrl(canonicalUrl: string, locale: string) {
  if (!canonicalUrl) {
    canonicalUrl = '/';
  }

  if (canonicalUrl.startsWith('http')) {
    // full url - already complete, just return
    return canonicalUrl;
  }

  // Normalize relative path
  if (!canonicalUrl.startsWith('/')) {
    canonicalUrl = `/${canonicalUrl}`;
  }

  // Normalize base URL (remove trailing slash)
  const baseUrl = envConfigs.app_url.replace(/\/$/, '');

  // Build canonical URL without double slashes
  const localePath = !locale || locale === 'en' ? '' : `/${locale}`;
  const pathname = canonicalUrl === '/' ? '' : canonicalUrl;

  // Construct final URL
  canonicalUrl = `${baseUrl}${localePath}${pathname}`;

  // For non-root paths, ensure no trailing slash
  if (canonicalUrl !== baseUrl && canonicalUrl.endsWith('/')) {
    canonicalUrl = canonicalUrl.slice(0, -1);
  }

  return canonicalUrl;
}
