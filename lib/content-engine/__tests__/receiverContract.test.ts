jest.mock('next/server', () => ({
  NextResponse: class MockNextResponse {},
}));
jest.mock('@/lib/auth/verifyContentEngine', () => ({ verifyContentEngine: jest.fn() }));

import {
  CONTENT_ENGINE_CAPABILITIES,
  CONTENT_ENGINE_TENANT_IDS,
  contentEngineLiveUrl,
  localizedReceiverPath,
  resolveContentEngineLocale,
  resolveContentEngineTenant,
  sanitizeContentEngineTranslations,
  strictTenantSlugQuery,
} from '@/lib/content-engine/receiverContract';

describe('Content Engine receiver contract', () => {
  it('advertises exactly the four implemented types and nine English tenants', () => {
    expect(CONTENT_ENGINE_CAPABILITIES.supportedTypes).toEqual([
      'blog', 'destination', 'category', 'tour',
    ]);
    expect(CONTENT_ENGINE_TENANT_IDS).toEqual([
      'hurghada-excursions-online',
      'cairo-excursions-online',
      'makadi-bay',
      'el-gouna',
      'luxor-excursions',
      'sharm-excursions-online',
      'aswan-excursions',
      'marsa-alam-excursions',
      'dahab-excursions',
    ]);
    expect(CONTENT_ENGINE_CAPABILITIES.tenants.every((tenant) =>
      tenant.defaultLocale === 'en' && tenant.supportedLocales.join(',') === 'en,ar,es,fr,ru,de')).toBe(true);
    expect(CONTENT_ENGINE_CAPABILITIES.manualReviewTypes).toEqual(['tour']);
  });

  it.each([undefined, null, '', 'default', 'cairo-ausfluege', ' Cairo-excursions-online', 'CAIRO']) (
    'rejects missing, malformed, or unknown tenant %p',
    (tenantId) => {
      expect(resolveContentEngineTenant(tenantId).ok).toBe(false);
    },
  );

  it('accepts only the exact configured tenant value and builds strict queries', () => {
    expect(resolveContentEngineTenant('cairo-excursions-online')).toEqual({
      ok: true,
      tenantId: 'cairo-excursions-online',
    });
    expect(strictTenantSlugQuery('cairo-excursions-online', 'shared-slug')).toEqual({
      tenantId: 'cairo-excursions-online',
      slug: 'shared-slug',
    });
  });

  it('accepts only English as this adapter default locale', () => {
    expect(resolveContentEngineLocale(undefined)).toEqual({ ok: true, locale: 'en' });
    expect(resolveContentEngineLocale('en')).toEqual({ ok: true, locale: 'en' });
    expect(resolveContentEngineLocale('ar').ok).toBe(false);
    expect(resolveContentEngineLocale('EN').ok).toBe(false);
  });

  it('uses unprefixed default-locale canonicals and prefixes a non-default locale once', () => {
    expect(contentEngineLiveUrl('cairo-excursions-online', 'blog', 'pyramids')).toBe(
      'https://cairoexcursionsonline.com/blog/pyramids',
    );
    expect(contentEngineLiveUrl('hurghada-excursions-online', 'destination', 'hurghada')).toBe(
      'https://hurghadaexcursionsonline.com/hurghada',
    );
    expect(localizedReceiverPath('category', 'red-sea', 'ar')).toBe('/ar/red-sea');
    expect(localizedReceiverPath('blog', 'red-sea', 'ar')).toBe('/ar/blog/red-sea');
  });

  it('drops unsupported/default locales and strips non-allowlisted translation fields', () => {
    const result = sanitizeContentEngineTranslations(
      'tour',
      {
        en: { title: 'duplicate base' },
        ar: {
          title: 'رحلة',
          description: 'وصف',
          tenantId: 'other-tenant',
          isPublished: true,
        },
        xx: { title: 'unsupported' },
      },
      { supportedLocales: ['en', 'ar'], defaultLocale: 'en' },
    );
    expect(result.translations).toEqual({
      ar: { title: 'رحلة', description: 'وصف' },
    });
    expect(result.droppedLocales).toEqual(['en', 'xx']);
    expect(result.droppedFields).toEqual({ ar: ['isPublished', 'tenantId'] });
  });

  it('keeps supported non-default translations and drops default/unknown locales', () => {
    expect(sanitizeContentEngineTranslations('destination', {
      ar: { name: 'القاهرة' },
      en: { name: 'duplicate base' },
      xx: { name: 'unknown' },
    })).toEqual({
      translations: { ar: { name: 'القاهرة' } },
      droppedLocales: ['en', 'xx'],
      droppedFields: {},
    });
  });
});
