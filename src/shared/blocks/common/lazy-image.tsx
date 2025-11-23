'use client';

import Image from 'next/image';

export function LazyImage({
  src,
  alt,
  className,
  width,
  height,
  placeholderSrc,
  title,
  fill,
  priority,
  sizes,
  quality,
}: {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  placeholderSrc?: string;
  title?: string;
  fill?: boolean;
  priority?: boolean;
  sizes?: string;
  quality?: number;
}) {
  // Use Next.js Image component for automatic optimization
  // Supports WebP/AVIF conversion, lazy loading, and responsive sizing
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      title={title}
      fill={fill}
      priority={priority}
      sizes={sizes}
      quality={quality || 85}
      loading={priority ? 'eager' : 'lazy'}
      placeholder={placeholderSrc ? 'blur' : undefined}
      blurDataURL={placeholderSrc}
    />
  );
}
