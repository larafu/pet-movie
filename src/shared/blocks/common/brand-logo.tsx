'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

import { Link } from '@/core/i18n/navigation';
import { Brand as BrandType } from '@/shared/types/blocks/common';

import { LazyImage } from './lazy-image';

export function BrandLogo({ brand }: { brand: BrandType }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Determine which logo to use based on theme
  const logo = mounted
    ? resolvedTheme === 'dark'
      ? brand.logoDark || brand.logo
      : brand.logoLight || brand.logo
    : brand.logo;

  return (
    <Link
      href={brand.url || ''}
      target={brand.target || '_self'}
      className={`flex items-center space-x-2 ${brand.className}`}
    >
      {logo && (
        <LazyImage
          src={logo.src}
          alt={logo.alt || ''}
          className="h-10 w-auto"
        />
      )}
      {brand.title && (
        <span className="text-lg font-medium">{brand.title}</span>
      )}
    </Link>
  );
}
