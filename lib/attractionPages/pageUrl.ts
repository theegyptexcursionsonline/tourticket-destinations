import { attractionPagePath, type UrlType } from '@/lib/content/contentUrl';

export type PageUrlType = 'default' | 'attraction' | 'category' | UrlType;
type LegacyPageUrlType = 'default' | 'attraction' | 'category';

export const PAGE_URL_TYPES: PageUrlType[] = ['default', 'attraction', 'category'];

export const PAGE_URL_TYPE_LABELS: Record<LegacyPageUrlType, string> = {
  default: 'Default (based on page type)',
  attraction: '/attraction/{slug}',
  category: '/category/{slug}',
};

export function normalizePageUrlType(value?: string | null): PageUrlType {
  return value && PAGE_URL_TYPES.includes(value as PageUrlType)
    ? value as PageUrlType
    : 'default';
}

export function pagePath(
  slug: string,
  pageType: 'attraction' | 'category',
  urlType?: string | null,
  citySlug?: string | null,
  parentSlug?: string | null,
): string {
  if (parentSlug) return attractionPagePath(slug, pageType, urlType, citySlug, parentSlug);
  if (urlType !== 'attraction' && urlType !== 'category') {
    return attractionPagePath(slug, pageType, urlType, citySlug);
  }
  const normalized = normalizePageUrlType(urlType);
  const segment = normalized === 'default' ? pageType : normalized;
  return `/${segment}/${slug}`;
}
