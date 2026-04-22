import type { IBranding, IThemeConfig, ITenant } from './models/Tenant';

import { resolveTenantBranding } from './tenantBranding';

const TENANT_PRESENTATION_SOURCE_MAP: Record<string, string> = {
  'hurghada-ausfluege': 'hurghada-excursions-online',
  'cairo-ausfluege': 'cairo-excursions-online',
  'makadi-ausfluege': 'makadi-bay',
  'elgouna-ausfluege': 'el-gouna',
  'luxor-ausfluege': 'luxor-excursions',
  'sharm-ausfluege': 'sharm-excursions-online',
};

const GENERIC_BRANDING_FALLBACK = {
  primaryColor: '#E63946',
  secondaryColor: '#1D3557',
  accentColor: '#F4A261',
};

type TenantPresentationInput = Pick<ITenant, 'tenantId' | 'name' | 'branding' | 'theme'>;

function normalizeColor(value?: string | null): string {
  return value?.trim().toLowerCase() || '';
}

function hasGenericBrandingFallback(branding?: Partial<IBranding> | null): boolean {
  if (!branding) {
    return true;
  }

  return (
    normalizeColor(branding.primaryColor) === GENERIC_BRANDING_FALLBACK.primaryColor.toLowerCase() &&
    normalizeColor(branding.secondaryColor) === GENERIC_BRANDING_FALLBACK.secondaryColor.toLowerCase() &&
    normalizeColor(branding.accentColor) === GENERIC_BRANDING_FALLBACK.accentColor.toLowerCase()
  );
}

export function getTenantPresentationSourceTenantId(tenantId?: string | null): string | undefined {
  if (!tenantId) {
    return undefined;
  }

  return TENANT_PRESENTATION_SOURCE_MAP[tenantId];
}

export function resolveTenantPresentation(
  tenant: TenantPresentationInput,
  sourceTenant?: TenantPresentationInput | null
): {
  branding: IBranding;
  theme?: IThemeConfig;
} {
  const tenantBranding = resolveTenantBranding(tenant);

  if (!sourceTenant) {
    return {
      branding: tenantBranding,
      theme: tenant.theme,
    };
  }

  const sourceBranding = resolveTenantBranding(sourceTenant);
  const shouldInheritBranding = hasGenericBrandingFallback(tenant.branding);

  return {
    branding: shouldInheritBranding
      ? {
          ...sourceBranding,
          logo: tenantBranding.logo,
          logoDark: tenantBranding.logoDark,
          logoAlt: tenantBranding.logoAlt,
          favicon: tenantBranding.favicon,
        }
      : tenantBranding,
    theme: tenant.theme || sourceTenant.theme,
  };
}
