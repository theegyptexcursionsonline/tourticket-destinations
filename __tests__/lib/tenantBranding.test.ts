import { resolveTenantBranding } from '@/lib/tenantBranding';

describe('resolveTenantBranding', () => {
  it('uses tenant assets when a non-default tenant still points at the global logo', () => {
    const branding = resolveTenantBranding({
      tenantId: 'hurghada-excursions-online',
      name: 'Hurghada Excursions Online',
      branding: {
        logo: '/EEO-logo.png',
        logoAlt: '',
        favicon: '/favicon.ico',
        primaryColor: '#14b8a6',
        secondaryColor: '#0f172a',
        accentColor: '#f59e0b',
        fontFamily: 'Inter',
      },
    });

    expect(branding.logo).toBe('/tenants/hurghada-excursions-online/logo.png');
    expect(branding.favicon).toBe('/tenants/hurghada-excursions-online/favicon.ico');
    expect(branding.logoAlt).toBe('Hurghada Excursions Online logo');
  });

  it('keeps an explicit tenant logo when one is configured', () => {
    const branding = resolveTenantBranding({
      tenantId: 'hurghada-excursions-online',
      name: 'Hurghada Excursions Online',
      branding: {
        logo: 'https://cdn.example.com/hurghada-logo.png',
        logoAlt: 'Hurghada brand',
        favicon: 'https://cdn.example.com/hurghada.ico',
        primaryColor: '#14b8a6',
        secondaryColor: '#0f172a',
        accentColor: '#f59e0b',
        fontFamily: 'Inter',
      },
    });

    expect(branding.logo).toBe('https://cdn.example.com/hurghada-logo.png');
    expect(branding.favicon).toBe('https://cdn.example.com/hurghada.ico');
    expect(branding.logoAlt).toBe('Hurghada brand');
  });

  it('leaves the default tenant on the global assets', () => {
    const branding = resolveTenantBranding({
      tenantId: 'default',
      name: 'Egypt Excursions Online',
      branding: {
        logo: '/EEO-logo.png',
        logoAlt: 'Egypt Excursions Online',
        favicon: '/favicon.ico',
        primaryColor: '#E63946',
        secondaryColor: '#1D3557',
        accentColor: '#F4A261',
        fontFamily: 'Inter',
      },
    });

    expect(branding.logo).toBe('/EEO-logo.png');
    expect(branding.favicon).toBe('/favicon.ico');
  });
});
