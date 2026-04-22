import { getTenantPresentationSourceTenantId, resolveTenantPresentation } from '@/lib/tenantPresentation';

describe('tenantPresentation', () => {
  it('maps German city tenants to their English presentation source', () => {
    expect(getTenantPresentationSourceTenantId('hurghada-ausfluege')).toBe('hurghada-excursions-online');
    expect(getTenantPresentationSourceTenantId('makadi-ausfluege')).toBe('makadi-bay');
    expect(getTenantPresentationSourceTenantId('elgouna-ausfluege')).toBe('el-gouna');
  });

  it('inherits source branding colors and theme while preserving tenant-specific assets', () => {
    const germanTenant = {
      tenantId: 'makadi-ausfluege',
      name: 'Makadi Bay Ausfluge',
      branding: {
        logo: '/tenants/makadi-ausfluege/logo.png',
        favicon: '/tenants/makadi-ausfluege/favicon.ico',
        logoAlt: 'Makadi Bay Ausfluge',
        primaryColor: '#E63946',
        secondaryColor: '#1D3557',
        accentColor: '#F4A261',
        fontFamily: 'Poppins',
      },
      theme: undefined,
    };

    const sourceTenant = {
      tenantId: 'makadi-bay',
      name: 'Makadi Bay Excursions',
      branding: {
        logo: '/tenants/makadi-bay/logo.png',
        favicon: '/tenants/makadi-bay/favicon.ico',
        logoAlt: 'Makadi Bay Excursions',
        primaryColor: '#FF7105',
        secondaryColor: '#A64903',
        accentColor: '#FFA35D',
        fontFamily: 'DM Sans',
      },
      theme: {
        themeId: 'tropical-paradise',
        themeName: 'Tropical Paradise',
        colors: {
          primary: '#FF7105',
          primaryHover: '#E66305',
          primaryLight: '#FFF1E7',
          secondary: '#A64903',
          accent: '#FFA35D',
          success: '#10B981',
          warning: '#F59E0B',
          error: '#EF4444',
          info: '#0EA5E9',
          background: '#FFFFFF',
          backgroundAlt: '#FFF7F0',
          surface: '#FFFFFF',
          text: '#111827',
          textMuted: '#6B7280',
          textInverse: '#FFFFFF',
          border: '#FED7AA',
          divider: '#FED7AA',
          rating: '#FBBF24',
        },
        gradients: {
          primary: 'linear-gradient(135deg, #FF7105 0%, #E66305 100%)',
          secondary: 'linear-gradient(135deg, #A64903 0%, #D97706 100%)',
          hero: 'linear-gradient(180deg, rgba(166,73,3,0.75) 0%, rgba(255,113,5,0.25) 100%)',
        },
        shadows: {
          sm: '0 1px 2px 0 rgba(255, 113, 5, 0.05)',
          md: '0 4px 6px -1px rgba(255, 113, 5, 0.1)',
          lg: '0 10px 15px -3px rgba(255, 113, 5, 0.1)',
          xl: '0 20px 25px -5px rgba(255, 113, 5, 0.1)',
          primary: '0 4px 14px 0 rgba(255, 113, 5, 0.35)',
          card: '0 4px 20px rgba(255, 113, 5, 0.12)',
        },
        typography: {
          fontFamily: 'DM Sans',
          fontFamilyHeading: 'DM Sans',
          baseFontSize: '16px',
          lineHeight: '1.6',
          fontWeightNormal: 400,
          fontWeightMedium: 500,
          fontWeightSemibold: 600,
          fontWeightBold: 700,
        },
        layout: {
          borderRadius: '16px',
          borderRadiusSm: '8px',
          borderRadiusLg: '20px',
          borderRadiusXl: '24px',
          borderRadiusFull: '9999px',
          containerMaxWidth: '1280px',
          headerHeight: '72px',
          footerStyle: 'standard',
        },
        components: {
          header: {
            background: 'rgba(255, 255, 255, 0.92)',
            textColor: '#111827',
            style: 'solid',
            position: 'sticky',
          },
          footer: {
            background: '#A64903',
            textColor: '#FFFFFF',
            style: 'dark',
          },
          buttons: {
            style: 'pill',
            primaryBg: '#FF7105',
            primaryText: '#FFFFFF',
            primaryHoverBg: '#E66305',
            secondaryBg: '#A64903',
            secondaryText: '#FFFFFF',
            outlineBorderColor: '#FF7105',
          },
          cards: {
            style: 'elevated',
            background: '#FFFFFF',
            imageBorderRadius: '16px',
          },
          badges: {
            background: '#FF7105',
            textColor: '#FFFFFF',
            style: 'pill',
          },
          inputs: {
            background: '#FFFFFF',
            borderColor: '#FED7AA',
            focusBorderColor: '#FF7105',
            style: 'outlined',
          },
        },
        animations: {
          enabled: true,
          duration: '200ms',
          durationFast: '150ms',
          durationSlow: '300ms',
          easing: 'ease',
        },
      },
    };

    const presentation = resolveTenantPresentation(germanTenant as any, sourceTenant as any);

    expect(presentation.branding.logo).toBe('/tenants/makadi-ausfluege/logo.png');
    expect(presentation.branding.favicon).toBe('/tenants/makadi-ausfluege/favicon.ico');
    expect(presentation.branding.primaryColor).toBe('#FF7105');
    expect(presentation.branding.secondaryColor).toBe('#A64903');
    expect(presentation.branding.fontFamily).toBe('DM Sans');
    expect(presentation.theme?.themeId).toBe('tropical-paradise');
  });
});
