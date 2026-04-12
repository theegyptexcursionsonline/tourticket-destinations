// Shared SEO utilities for consistent hreflang across all pages
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://egypt-excursionsonline.com';

/**
 * Returns the hreflang alternates object for Next.js metadata.
 * Includes all 6 supported locales: en, ar, es, fr, ru, de.
 */
export function getHreflangAlternates(path: string = '/') {
  const cleanPath = path === '/' ? '' : path;
  return {
    'en': `${BASE_URL}${cleanPath}`,
    'ar': `${BASE_URL}/ar${cleanPath}`,
    'es': `${BASE_URL}/es${cleanPath}`,
    'fr': `${BASE_URL}/fr${cleanPath}`,
    'ru': `${BASE_URL}/ru${cleanPath}`,
    'de': `${BASE_URL}/de${cleanPath}`,
    'x-default': `${BASE_URL}${cleanPath}`,
  };
}

/**
 * Returns a complete alternates object with both canonical and hreflang.
 */
export function getSeoAlternates(path: string) {
  return {
    canonical: path,
    languages: getHreflangAlternates(path),
  };
}
