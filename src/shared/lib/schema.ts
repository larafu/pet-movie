import { envConfigs } from '@/config';

/**
 * 网站基础 Schema - 强调 Rainbow Bridge 和 Dog/Cat Movie
 */
export function getWebsiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Pet Movie AI',
    alternateName: ['Dog Movie AI', 'Cat Movie AI', 'Rainbow Bridge Pet Videos'],
    url: envConfigs.app_url,
    description:
      'Create dog movies, cat movies, and rainbow bridge pet memorial videos with AI. Turn your pet photos into cinematic tributes in minutes.',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${envConfigs.app_url}/ai-video-generator?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * 软件应用 Schema
 */
export function getSoftwareApplicationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Pet Movie AI',
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Web Browser',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      description: 'Free trial with 5 credits included',
    },
    description:
      'AI-powered platform for creating dog movies, cat movies, and rainbow bridge memorial videos. Turn pet photos into 4K cinematic tributes with music and effects.',
    featureList: [
      'Dog movie creation',
      'Cat movie creation',
      'Rainbow Bridge memorial videos',
      'Pet memorial tributes',
      '4K video export',
      'AI-powered editing',
    ],
  };
}

/**
 * FAQ Schema - 针对零点击搜索优化
 */
export function getFAQSchema(faqs: Array<{ question: string; answer: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

/**
 * 组织 Schema
 */
export function getOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Pet Movie AI',
    url: envConfigs.app_url,
    logo: `${envConfigs.app_url}/logo.png`,
    description:
      'AI-powered dog movie and cat movie creator. Specializing in rainbow bridge memorial videos and pet tributes.',
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'support@petmovie.ai',
      contactType: 'Customer Support',
      availableLanguage: ['English', 'Chinese'],
    },
  };
}
