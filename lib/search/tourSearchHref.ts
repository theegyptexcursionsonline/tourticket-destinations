export function tourSearchHref(slugOrId: string, locale = 'en'): string {
  const cleanSegment = slugOrId.replace(/^\/+|\/+$/g, '');
  const localePrefix = locale && locale !== 'en' ? `/${locale}` : '';
  return `${localePrefix}/${cleanSegment}`;
}
