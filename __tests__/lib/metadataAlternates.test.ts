import { localePath, metadataAlternates } from '@/lib/i18n/metadataAlternates';

describe('tenant-safe metadata alternates', () => {
  it('keeps English unprefixed and localizes every other route', () => {
    expect(localePath('en', '/categories/relaxation-cruises')).toBe(
      '/categories/relaxation-cruises',
    );
    expect(localePath('de', '/categories/relaxation-cruises')).toBe(
      '/de/categories/relaxation-cruises',
    );
  });

  // This repo has shipped `/de/de/...` before, by passing an already-localized
  // path to a function whose job is to localize. Callers are supposed to pass a
  // locale-less path; this pins that the helper survives when one does not.
  it('never doubles a locale prefix, whatever the caller passes', () => {
    expect(localePath('de', '/de/categories/relaxation-cruises')).toBe(
      '/de/categories/relaxation-cruises',
    );
    expect(localePath('en', '/en/categories/relaxation-cruises')).toBe(
      '/categories/relaxation-cruises',
    );
    expect(localePath('ar', '/de/categories/relaxation-cruises')).toBe(
      '/ar/categories/relaxation-cruises',
    );
    expect(localePath('de', '/ar')).toBe('/de');
  });

  it('does not mistake a real path segment for a locale', () => {
    // 'es' is a locale; 'escape-rooms' merely starts with it.
    expect(localePath('de', '/escape-rooms')).toBe('/de/escape-rooms');
    expect(localePath('de', '/end-of-season')).toBe('/de/end-of-season');
  });

  it('returns relative canonical and hreflang paths for the request tenant metadataBase', () => {
    expect(metadataAlternates('ar', '/categories/relaxation-cruises')).toEqual({
      canonical: '/ar/categories/relaxation-cruises',
      languages: {
        en: '/categories/relaxation-cruises',
        ar: '/ar/categories/relaxation-cruises',
        es: '/es/categories/relaxation-cruises',
        fr: '/fr/categories/relaxation-cruises',
        ru: '/ru/categories/relaxation-cruises',
        de: '/de/categories/relaxation-cruises',
        'x-default': '/categories/relaxation-cruises',
      },
    });
  });
});
