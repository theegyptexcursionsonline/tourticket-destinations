import fs from 'node:fs';
import path from 'node:path';

import type { IBranding } from './models/Tenant';

type TenantBrandingInput = {
  tenantId: string;
  name?: string | null;
  branding?: Partial<IBranding> | null;
};

const DEFAULT_LOGO_PATH = '/EEO-logo.png';
const DEFAULT_FAVICON_PATH = '/favicon.ico';
const assetExistsCache = new Map<string, boolean>();

function trimString(value?: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function getAssetPathname(value: string): string {
  try {
    return new URL(value).pathname;
  } catch {
    return value;
  }
}

function hasTenantAsset(tenantId: string, filename: 'logo.png' | 'favicon.ico'): boolean {
  const cacheKey = `${tenantId}:${filename}`;
  const cached = assetExistsCache.get(cacheKey);

  if (typeof cached === 'boolean') {
    return cached;
  }

  const assetPath = path.join(process.cwd(), 'public', 'tenants', tenantId, filename);
  const exists = fs.existsSync(assetPath);
  assetExistsCache.set(cacheKey, exists);

  return exists;
}

function getTenantAssetPublicPath(
  tenantId: string,
  filename: 'logo.png' | 'favicon.ico'
): string | undefined {
  if (tenantId === 'default' || !hasTenantAsset(tenantId, filename)) {
    return undefined;
  }

  return `/tenants/${tenantId}/${filename}`;
}

function shouldUseTenantLogoFallback(tenantId: string, logo?: string): boolean {
  if (tenantId === 'default') {
    return false;
  }

  if (!logo) {
    return true;
  }

  return getAssetPathname(logo) === DEFAULT_LOGO_PATH;
}

function shouldUseTenantFaviconFallback(tenantId: string, favicon?: string): boolean {
  if (tenantId === 'default') {
    return false;
  }

  if (!favicon) {
    return true;
  }

  return getAssetPathname(favicon) === DEFAULT_FAVICON_PATH;
}

export function resolveTenantBranding({
  tenantId,
  name,
  branding,
}: TenantBrandingInput): IBranding {
  const safeBranding = branding ?? {};
  const logo = trimString(safeBranding.logo);
  const favicon = trimString(safeBranding.favicon);
  const logoFallback = getTenantAssetPublicPath(tenantId, 'logo.png');
  const faviconFallback = getTenantAssetPublicPath(tenantId, 'favicon.ico');

  return {
    logo:
      logoFallback && shouldUseTenantLogoFallback(tenantId, logo)
        ? logoFallback
        : logo || DEFAULT_LOGO_PATH,
    logoDark: trimString(safeBranding.logoDark),
    logoAlt: trimString(safeBranding.logoAlt) || `${name || tenantId} logo`,
    favicon:
      faviconFallback && shouldUseTenantFaviconFallback(tenantId, favicon)
        ? faviconFallback
        : favicon || DEFAULT_FAVICON_PATH,
    primaryColor: trimString(safeBranding.primaryColor) || '#E63946',
    secondaryColor: trimString(safeBranding.secondaryColor) || '#1D3557',
    accentColor: trimString(safeBranding.accentColor) || '#F4A261',
    backgroundColor: trimString(safeBranding.backgroundColor) || '#FFFFFF',
    textColor: trimString(safeBranding.textColor) || '#1F2937',
    fontFamily: trimString(safeBranding.fontFamily) || 'Inter',
    fontFamilyHeading: trimString(safeBranding.fontFamilyHeading),
    borderRadius: trimString(safeBranding.borderRadius) || '8px',
  };
}
