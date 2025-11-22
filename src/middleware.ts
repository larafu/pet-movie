import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';

import { routing } from '@/core/i18n/config';

// Create next-intl middleware
const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  // Get response from next-intl middleware
  const response = intlMiddleware(request);

  // Add X-Robots-Tag HTTP header for SEO
  // This is different from <meta name="robots"> tag in HTML
  // The HTTP header takes priority and is recognized by all search engines
  const { pathname } = request.nextUrl;

  // Allow indexing for public pages
  if (
    pathname === '/' ||
    pathname.startsWith('/pricing') ||
    pathname.startsWith('/showcases') ||
    pathname.startsWith('/blog') ||
    pathname.match(/^\/(en|zh)$/) ||
    pathname.match(/^\/(en|zh)\/(pricing|showcases|blog)/)
  ) {
    response.headers.set('X-Robots-Tag', 'index, follow');
  }
  // Block indexing for private/internal pages
  else if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/settings/') ||
    pathname.startsWith('/admin/') ||
    pathname.startsWith('/activity/') ||
    pathname.match(/^\/(en|zh)\/(settings|admin|activity)/)
  ) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }
  // Default: allow indexing for other public pages
  else {
    response.headers.set('X-Robots-Tag', 'index, follow');
  }

  return response;
}

export const config = {
  // Match all pathnames except for:
  // - /api/ routes (handled above but excluded from matcher for performance)
  // - /_next/ (Next.js internals)
  // - /_vercel (Vercel internals)
  // - Static files (images, videos, etc.)
  matcher: [
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ],
};
