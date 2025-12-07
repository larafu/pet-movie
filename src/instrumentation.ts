import * as Sentry from '@sentry/nextjs';

export async function register() {
  // 仅在生产环境加载 Sentry，避免开发环境的 HMR 问题
  // Only load Sentry in production to avoid HMR issues in development
  if (process.env.NODE_ENV === 'production') {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
      await import('../sentry.server.config');
    }

    if (process.env.NEXT_RUNTIME === 'edge') {
      await import('../sentry.edge.config');
    }
  }
}

export const onRequestError = Sentry.captureRequestError;
