export type PageUrlType = 'default' | 'attraction' | 'category';

export const PAGE_URL_TYPES: PageUrlType[] = ['default', 'attraction', 'category'];

export const PAGE_URL_TYPE_LABELS: Record<PageUrlType, string> = {
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
): string {
  const normalized = normalizePageUrlType(urlType);
  const segment = normalized === 'default' ? pageType : normalized;
  return `/${segment}/${slug}`;
}
