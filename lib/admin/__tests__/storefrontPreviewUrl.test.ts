import { storefrontPreviewUrl } from '../storefrontPreviewUrl';

describe('storefrontPreviewUrl', () => {
  it('uses the row tenant storefront domain', () => {
    expect(storefrontPreviewUrl('/categories/safari', {
      tenantDomain: 'makadibayexcursions.com',
      adminOrigin: 'https://dashboard.egypt-excursionsonline.com',
    })).toBe('https://makadibayexcursions.com/categories/safari');
  });

  it('never leaves a public preview on the dashboard hostname', () => {
    expect(storefrontPreviewUrl('/tour/safari', {
      adminOrigin: 'https://dashboard.egypt-excursionsonline.com',
    })).toBe('https://egypt-excursionsonline.com/tour/safari');
  });
});
