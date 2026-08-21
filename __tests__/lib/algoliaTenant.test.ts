import { buildAlgoliaTenantFilter } from '@/lib/algoliaTenant';

describe('buildAlgoliaTenantFilter', () => {
  it('requires either owning tenant field to match exactly', () => {
    expect(buildAlgoliaTenantFilter('hurghada-excursions-online')).toBe(
      '(tenantId:"hurghada-excursions-online" OR tenantIds:"hurghada-excursions-online")'
    );
  });

  it.each(['', 'other tenant', 'default) OR isPublished:true']) (
    'fails closed for malformed tenant id %p',
    (tenantId) => expect(() => buildAlgoliaTenantFilter(tenantId)).toThrow(
      'Invalid storefront tenant identifier'
    )
  );
});
