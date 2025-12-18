// lib/tenant.ts
// Multi-tenant utility helpers for server-side operations

import { headers, cookies } from 'next/headers';
import dbConnect from './dbConnect';
import Tenant, { ITenant } from './models/Tenant';

// ============================================
// TYPES
// ============================================

export interface TenantConfig {
  tenantId: string;
  name: string;
  domain: string;
  branding: {
    logo: string;
    logoDark?: string;
    logoAlt: string;
    favicon: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    backgroundColor?: string;
    textColor?: string;
    fontFamily: string;
    fontFamilyHeading?: string;
    borderRadius?: string;
  };
  seo: {
    defaultTitle: string;
    titleSuffix: string;
    defaultDescription: string;
    defaultKeywords: string[];
    ogImage: string;
    twitterHandle?: string;
    googleAnalyticsId?: string;
    googleTagManagerId?: string;
  };
  contact: {
    email: string;
    phone: string;
    whatsapp?: string;
    address?: string;
  };
  socialLinks: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
    tiktok?: string;
  };
  features: {
    enableBlog: boolean;
    enableReviews: boolean;
    enableWishlist: boolean;
    enableAISearch: boolean;
    enableIntercom: boolean;
    enableMultiCurrency: boolean;
    enableMultiLanguage: boolean;
    enableHotelPickup: boolean;
  };
  payments: {
    currency: string;
    currencySymbol: string;
    supportedCurrencies?: string[];
  };
  localization: {
    defaultLanguage: string;
    supportedLanguages: string[];
    defaultTimezone: string;
  };
  homepage: {
    heroType: 'slider' | 'video' | 'static';
    showDestinations: boolean;
    showCategories: boolean;
    showFeaturedTours: boolean;
    showReviews: boolean;
    showFAQ: boolean;
  };
}

export interface TenantPublicConfig {
  tenantId: string;
  name: string;
  domain: string;
  branding: TenantConfig['branding'];
  seo: Pick<TenantConfig['seo'], 'defaultTitle' | 'titleSuffix' | 'defaultDescription' | 'ogImage'>;
  contact: Pick<TenantConfig['contact'], 'email' | 'phone' | 'whatsapp'>;
  socialLinks: TenantConfig['socialLinks'];
  features: TenantConfig['features'];
  localization: Pick<TenantConfig['localization'], 'defaultLanguage' | 'supportedLanguages'>;
  payments: Pick<TenantConfig['payments'], 'currency' | 'currencySymbol' | 'supportedCurrencies'>;
}

// ============================================
// SERVER-SIDE TENANT DETECTION
// ============================================

/**
 * Get tenant ID from the current request (Server Component)
 * Uses headers set by middleware
 */
export async function getTenantFromRequest(): Promise<string> {
  try {
    const headersList = await headers();
    const tenantId = headersList.get('x-tenant-id');
    
    if (tenantId) {
      return tenantId;
    }
    
    // Fallback to cookie
    const cookieStore = await cookies();
    const cookieTenant = cookieStore.get('tenantId');
    
    if (cookieTenant?.value) {
      return cookieTenant.value;
    }
  } catch (error) {
    // Headers might not be available in some contexts
    console.warn('Could not read tenant from headers/cookies:', error);
  }
  
  // Return default tenant
  return process.env.DEFAULT_TENANT_ID || 'default';
}

/**
 * Get tenant domain from the current request
 */
export async function getTenantDomainFromRequest(): Promise<string> {
  try {
    const headersList = await headers();
    return headersList.get('x-tenant-domain') || headersList.get('host') || 'localhost';
  } catch (error) {
    return 'localhost';
  }
}

// ============================================
// TENANT CONFIGURATION
// ============================================

/**
 * Get full tenant configuration from database
 * Includes all settings, branding, SEO, etc.
 * Uses tenant-specific database if configured
 */
export async function getTenantConfig(tenantId: string): Promise<ITenant | null> {
  try {
    // Connect to tenant-specific database if configured
    await dbConnect(tenantId);
    
    const tenant = await Tenant.findOne({ tenantId, isActive: true })
      .populate('heroSettings')
      .populate('primaryDestination')
      .lean() as ITenant | null;
    
    return tenant;
  } catch (error) {
    console.error(`Error fetching tenant config for ${tenantId}:`, error);
    return null;
  }
}

/**
 * Get tenant configuration by domain
 * Note: This function checks the main database since we need to look up
 * which tenant/database to use based on domain
 */
export async function getTenantByDomain(domain: string): Promise<ITenant | null> {
  try {
    // First connect to main database to look up tenant mapping
    await dbConnect();
    
    // Normalize domain
    const normalizedDomain = domain.toLowerCase().replace(/^www\./, '');
    
    const tenant = await Tenant.findOne({
      $or: [
        { domain: normalizedDomain },
        { domain: `www.${normalizedDomain}` },
        { domains: normalizedDomain },
        { domains: `www.${normalizedDomain}` },
      ],
      isActive: true,
    })
      .populate('heroSettings')
      .lean() as ITenant | null;
    
    return tenant;
  } catch (error) {
    console.error(`Error fetching tenant by domain ${domain}:`, error);
    return null;
  }
}

/**
 * Get public tenant configuration (safe for client-side)
 * Excludes sensitive information
 */
export async function getTenantPublicConfig(tenantId: string): Promise<TenantPublicConfig | null> {
  try {
    const tenant = await getTenantConfig(tenantId);
    
    if (!tenant) {
      return null;
    }
  
  // Return only public/safe configuration
  return {
    tenantId: tenant.tenantId,
    name: tenant.name,
    domain: tenant.domain,
    branding: tenant.branding,
    seo: {
      defaultTitle: tenant.seo.defaultTitle,
      titleSuffix: tenant.seo.titleSuffix,
      defaultDescription: tenant.seo.defaultDescription,
      ogImage: tenant.seo.ogImage,
    },
    contact: {
      email: tenant.contact.email,
      phone: tenant.contact.phone,
      whatsapp: tenant.contact.whatsapp,
    },
    socialLinks: tenant.socialLinks,
    features: tenant.features,
    localization: {
      defaultLanguage: tenant.localization.defaultLanguage,
      supportedLanguages: tenant.localization.supportedLanguages,
    },
    payments: {
      currency: tenant.payments.currency,
      currencySymbol: tenant.payments.currencySymbol,
      supportedCurrencies: tenant.payments.supportedCurrencies,
    },
  };
  } catch (error) {
    console.error(`Error fetching public tenant config for ${tenantId}:`, error);
    return null;
  }
}

/**
 * Get default tenant configuration
 */
export async function getDefaultTenant(): Promise<ITenant | null> {
  try {
    await dbConnect();
    
    const tenant = await Tenant.findOne({ isDefault: true, isActive: true })
      .populate('heroSettings')
      .lean() as ITenant | null;
    
    if (!tenant) {
      // Try to get any active tenant as fallback
      return await Tenant.findOne({ isActive: true })
        .populate('heroSettings')
        .lean() as ITenant | null;
    }
    
    return tenant;
  } catch (error) {
    console.error('Error fetching default tenant:', error);
    return null;
  }
}

/**
 * Get all active tenants
 */
export async function getAllActiveTenants(): Promise<ITenant[]> {
  try {
    await dbConnect();
    
    const tenants = await Tenant.find({ isActive: true })
      .sort({ name: 1 })
      .lean() as ITenant[];
    
    return tenants;
  } catch (error) {
    console.error('Error fetching all tenants:', error);
    return [];
  }
}

// ============================================
// TENANT-AWARE QUERY HELPERS
// ============================================

/**
 * Add tenant filter to a query object
 */
export function withTenantFilter<T extends Record<string, unknown>>(
  query: T,
  tenantId: string
): T & { tenantId: string } {
  return {
    ...query,
    tenantId,
  };
}

/**
 * Create a tenant-aware query builder
 * Usage: const tours = await withTenant(Tour.find({ isPublished: true }), tenantId);
 */
export function withTenant<T>(
  query: { where: (filter: { tenantId: string }) => T },
  tenantId: string
): T {
  return query.where({ tenantId });
}

/**
 * Build tenant-filtered query for Mongoose
 * Usage: const filter = buildTenantQuery({ isPublished: true }, tenantId);
 */
export function buildTenantQuery(
  baseQuery: Record<string, unknown>,
  tenantId: string
): Record<string, unknown> {
  return {
    ...baseQuery,
    tenantId,
  };
}

// ============================================
// TENANT VALIDATION
// ============================================

/**
 * Check if a tenant exists and is active
 * Uses tenant-specific database if configured
 */
export async function isTenantActive(tenantId: string): Promise<boolean> {
  try {
    // Connect to tenant-specific database if configured
    await dbConnect(tenantId);
    
    const tenant = await Tenant.findOne({ tenantId, isActive: true })
      .select('_id')
      .lean();
    
    return !!tenant;
  } catch (error) {
    console.error(`Error checking tenant status for ${tenantId}:`, error);
    return false;
  }
}

/**
 * Validate that the current user has access to a tenant
 * (For admin dashboard multi-tenant access control)
 */
export async function canAccessTenant(
  userId: string,
  tenantId: string,
  userRole: string
): Promise<boolean> {
  // Super admins can access all tenants
  if (userRole === 'super_admin') {
    return true;
  }
  
  // TODO: Implement team/organization-based access control
  // For now, regular admins can only access their assigned tenant
  
  return true; // Placeholder - implement proper access control
}

// ============================================
// CSS VARIABLE GENERATOR
// ============================================

/**
 * Generate CSS variables from tenant branding
 * For use in layout components
 */
export function generateCSSVariables(branding: TenantConfig['branding']): string {
  return `
    :root {
      --primary-color: ${branding.primaryColor};
      --secondary-color: ${branding.secondaryColor};
      --accent-color: ${branding.accentColor};
      --background-color: ${branding.backgroundColor || '#FFFFFF'};
      --text-color: ${branding.textColor || '#1F2937'};
      --font-family: ${branding.fontFamily}, system-ui, sans-serif;
      --font-family-heading: ${branding.fontFamilyHeading || branding.fontFamily}, system-ui, sans-serif;
      --border-radius: ${branding.borderRadius || '8px'};
    }
  `;
}

/**
 * Generate inline style object from tenant branding
 * For React components
 */
export function generateBrandingStyles(branding: TenantConfig['branding']): React.CSSProperties {
  return {
    '--primary-color': branding.primaryColor,
    '--secondary-color': branding.secondaryColor,
    '--accent-color': branding.accentColor,
    '--background-color': branding.backgroundColor || '#FFFFFF',
    '--text-color': branding.textColor || '#1F2937',
  } as React.CSSProperties;
}

// ============================================
// TENANT CACHE (For performance)
// ============================================

// Simple in-memory cache for tenant config
const tenantCache = new Map<string, { config: ITenant; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get tenant config with caching
 * Uses tenant-specific database if configured
 */
export async function getTenantConfigCached(tenantId: string): Promise<ITenant | null> {
  const cached = tenantCache.get(tenantId);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.config;
  }
  
  // getTenantConfig already uses tenant-specific database
  const config = await getTenantConfig(tenantId);
  
  if (config) {
    tenantCache.set(tenantId, { config, timestamp: Date.now() });
  }
  
  return config;
}

/**
 * Clear tenant cache (call after updating tenant config)
 */
export function clearTenantCache(tenantId?: string): void {
  if (tenantId) {
    tenantCache.delete(tenantId);
  } else {
    tenantCache.clear();
  }
}

// ============================================
// DEFAULT TENANT CONFIG (For new tenants)
// ============================================

export function getDefaultTenantConfig(tenantId: string, name: string): Partial<ITenant> {
  return {
    tenantId,
    name,
    slug: tenantId,
    domain: `${tenantId}tours.com`,
    domains: [`${tenantId}tours.com`, `www.${tenantId}tours.com`],
    branding: {
      logo: '/EEO-logo.png',
      logoAlt: `${name} Logo`,
      favicon: '/favicon.ico',
      primaryColor: '#E63946',
      secondaryColor: '#1D3557',
      accentColor: '#F4A261',
      backgroundColor: '#FFFFFF',
      textColor: '#1F2937',
      fontFamily: 'Inter',
      borderRadius: '8px',
    },
    seo: {
      defaultTitle: `${name} - Tours & Excursions`,
      titleSuffix: name,
      defaultDescription: `Discover amazing tours and experiences with ${name}. Book your adventure today!`,
      defaultKeywords: ['tours', 'excursions', 'travel', tenantId],
      ogImage: '/hero1.jpg',
    },
    contact: {
      email: `info@${tenantId}tours.com`,
      phone: '+20 000 000 0000',
    },
    socialLinks: {},
    features: {
      enableBlog: true,
      enableReviews: true,
      enableWishlist: true,
      enableAISearch: true,
      enableIntercom: false,
      enableMultiCurrency: true,
      enableMultiLanguage: true,
      enableLiveChat: false,
      enableNewsletter: true,
      enablePromoBar: false,
      enableHotelPickup: true,
      enableGiftCards: false,
    },
    payments: {
      currency: 'USD',
      currencySymbol: '$',
      supportedCurrencies: ['USD', 'EUR', 'GBP', 'EGP'],
      supportedPaymentMethods: ['card', 'paypal'],
    },
    email: {
      fromName: name,
      fromEmail: `noreply@${tenantId}tours.com`,
    },
    localization: {
      defaultLanguage: 'en',
      supportedLanguages: ['en', 'ar'],
      defaultTimezone: 'Africa/Cairo',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: 'HH:mm',
    },
    homepage: {
      heroType: 'slider',
      showDestinations: true,
      showCategories: true,
      showFeaturedTours: true,
      showPopularInterests: true,
      showDayTrips: true,
      showReviews: true,
      showFAQ: true,
      showAboutUs: true,
      showPromoSection: false,
    },
    isActive: true,
    isDefault: false,
  };
}

