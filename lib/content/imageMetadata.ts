export interface ImageMetadata {
  url: string;
  alt: string;
  title?: string;
}

export function normalizeImageMetadata(value: unknown): ImageMetadata[] {
  if (!Array.isArray(value)) return [];

  const normalized = value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item) => ({
      url: typeof item.url === 'string' ? item.url.trim() : '',
      alt: typeof item.alt === 'string' ? item.alt.trim() : '',
      title: typeof item.title === 'string' ? item.title.trim() : '',
    }))
    .filter((item) => item.url);

  return normalized.filter((item, index, items) => items.findIndex((candidate) => candidate.url === item.url) === index);
}

export function imageMetadataFor(
  url: string | undefined,
  metadata: ImageMetadata[] | undefined,
  fallbackAlt: string,
) {
  const match = url ? metadata?.find((item) => item.url === url) : undefined;
  return {
    alt: match?.alt?.trim() || fallbackAlt,
    title: match?.title?.trim() || fallbackAlt,
  };
}

export function ensureImageMetadata(
  metadata: ImageMetadata[] | undefined,
  urls: string[],
): ImageMetadata[] {
  const byUrl = new Map(normalizeImageMetadata(metadata).map((item) => [item.url, item]));
  return Array.from(new Set(urls))
    .filter(Boolean)
    .map((url) => {
      const existing = byUrl.get(url);
      return existing ? { ...existing, title: existing.title || '' } : { url, alt: '', title: '' };
    });
}
