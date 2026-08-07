import { defaultLocale, locales } from '@/i18n/config';

function normalizePath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed || trimmed === '/') return '/';
  const rooted = `/${trimmed.replace(/^\/+|\/+$/g, '')}`;
  return stripLocalePrefix(rooted);
}

/**
 * Drop a leading `/{locale}` so this helper can never double a prefix.
 *
 * This codebase has produced `/de/de/...` before, by feeding an
 * already-localized path into a function that localizes. Callers pass a
 * locale-less path by convention, but convention is not a defence: the guard
 * belongs where the prefix is added.
 */
function stripLocalePrefix(path: string): string {
  const [, head, ...rest] = path.split('/');
  if (!head || !(locales as readonly string[]).includes(head)) return path;
  const remainder = rest.join('/');
  return remainder ? `/${remainder}` : '/';
}

/**
 * Build a locale-aware path without pinning it to one tenant domain.
 * The root locale layout supplies a request-derived metadataBase, so relative
 * URLs remain correct for every white-label host.
 */
export function localePath(locale: string, path: string): string {
  const normalizedPath = normalizePath(path);
  const prefix = locale === defaultLocale ? '' : `/${locale}`;
  return normalizedPath === '/' ? prefix || '/' : `${prefix}${normalizedPath}`;
}

export function metadataAlternates(currentLocale: string, path: string) {
  const languages: Record<string, string> = {};
  for (const locale of locales) {
    languages[locale] = localePath(locale, path);
  }
  languages['x-default'] = localePath(defaultLocale, path);

  return {
    canonical: localePath(currentLocale, path),
    languages,
  };
}
