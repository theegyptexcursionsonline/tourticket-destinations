import { resolveTenantEmailWebsite } from '@/lib/email/tenantWebsite';

describe('resolveTenantEmailWebsite', () => {
  it('uses the tenant domain instead of an unrelated shared application URL', () => {
    expect(resolveTenantEmailWebsite(
      'elgounaexcursions.com',
      'https://egypt-excursionsonline.com',
    )).toBe('https://elgounaexcursions.com');
  });

  it('normalizes an absolute tenant URL to a stable origin', () => {
    expect(resolveTenantEmailWebsite(
      'https://www.elgounaexcursions.com/path?ignored=true',
      'https://egypt-excursionsonline.com',
    )).toBe('https://www.elgounaexcursions.com');
  });

  it('uses the fallback only when the tenant domain is missing or invalid', () => {
    expect(resolveTenantEmailWebsite('', 'https://eeo-main.netlify.app/checkout'))
      .toBe('https://eeo-main.netlify.app');
    expect(resolveTenantEmailWebsite('javascript:alert(1)', 'https://eeo-main.netlify.app'))
      .toBe('https://eeo-main.netlify.app');
  });

  it('fails closed when neither value is a valid HTTP origin', () => {
    expect(resolveTenantEmailWebsite('', '')).toBeUndefined();
    expect(resolveTenantEmailWebsite('javascript:alert(1)', 'not a url')).toBeUndefined();
  });
});
