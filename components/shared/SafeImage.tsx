'use client';

import React, { useEffect, useState } from 'react';
import Image, { type ImageProps } from 'next/image';

type SafeImageProps = ImageProps & {
  fallbackSrc?: string;
};

function normalizeSrc(src: ImageProps['src'], fallbackSrc: string): ImageProps['src'] {
  if (typeof src === 'string') {
    const trimmed = src.trim();
    return trimmed.length > 0 ? trimmed : fallbackSrc;
  }

  return src;
}

export default function SafeImage({
  src,
  fallbackSrc = '/bg.png',
  onError,
  ...props
}: SafeImageProps) {
  const [resolvedSrc, setResolvedSrc] = useState<ImageProps['src']>(() => normalizeSrc(src, fallbackSrc));

  useEffect(() => {
    setResolvedSrc(normalizeSrc(src, fallbackSrc));
  }, [src, fallbackSrc]);

  return (
    <Image
      {...props}
      src={resolvedSrc}
      onError={(event) => {
        setResolvedSrc((currentSrc) => {
          if (typeof currentSrc === 'string' && currentSrc === fallbackSrc) {
            return currentSrc;
          }

          return fallbackSrc;
        });

        onError?.(event);
      }}
    />
  );
}
