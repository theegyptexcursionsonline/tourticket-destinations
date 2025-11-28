'use client';

// contexts/TenantContext.tsx
// Multi-tenant context provider for client-side tenant access

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

// ============================================
// TYPES
// ============================================

export interface TenantBranding {
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
}

export interface TenantSEO {
  defaultTitle: string;
  titleSuffix: string;
  defaultDescription: string;
  ogImage: string;
}

export interface TenantContact {
  email: string;
  phone: string;
  whatsapp?: string;
}

export interface TenantSocialLinks {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  youtube?: string;
  tiktok?: string;
}

export interface TenantFeatures {
  enableBlog: boolean;
  enableReviews: boolean;
  enableWishlist: boolean;
  enableAISearch: boolean;
  enableIntercom: boolean;
  enableMultiCurrency: boolean;
  enableMultiLanguage: boolean;
  enableHotelPickup: boolean;
}

export interface TenantPayments {
  currency: string;
  currencySymbol: string;
  supportedCurrencies?: string[];
}

export interface TenantLocalization {
  defaultLanguage: string;
  supportedLanguages: string[];
}

export interface TenantConfig {
  tenantId: string;
  name: string;
  domain: string;
  branding: TenantBranding;
  seo: TenantSEO;
  contact: TenantContact;
  socialLinks: TenantSocialLinks;
  features: TenantFeatures;
  payments: TenantPayments;
  localization: TenantLocalization;
}

interface TenantContextType {
  tenant: TenantConfig | null;
  tenantId: string;
  isLoading: boolean;
  error: string | null;
  refreshTenant: () => Promise<void>;
  // Helper methods
  getLogo: () => string;
  getPrimaryColor: () => string;
  getSecondaryColor: () => string;
  getSiteName: () => string;
  getCurrency: () => string;
  getCurrencySymbol: () => string;
  isFeatureEnabled: (feature: keyof TenantFeatures) => boolean;
}

// ============================================
// DEFAULT VALUES
// ============================================

const DEFAULT_TENANT_CONFIG: TenantConfig = {
  tenantId: 'default',
  name: 'Egypt Excursions Online',
  domain: 'egyptexcursionsonline.com',
  branding: {
    logo: '/EEO-logo.png',
    logoAlt: 'Egypt Excursions Online',
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
    defaultTitle: 'Egypt Excursions Online - Tours & Experiences',
    titleSuffix: 'Egypt Excursions Online',
    defaultDescription: 'Discover Egypt\'s wonders with unforgettable tours and experiences.',
    ogImage: '/hero1.jpg',
  },
  contact: {
    email: 'info@egyptexcursionsonline.com',
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
    enableHotelPickup: true,
  },
  payments: {
    currency: 'USD',
    currencySymbol: '$',
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'EGP'],
  },
  localization: {
    defaultLanguage: 'en',
    supportedLanguages: ['en', 'ar'],
  },
};

// ============================================
// CONTEXT CREATION
// ============================================

const TenantContext = createContext<TenantContextType | undefined>(undefined);

// ============================================
// CUSTOM HOOK
// ============================================

export const useTenant = (): TenantContextType => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};

// ============================================
// HELPER: Get tenant ID from cookie
// ============================================

function getTenantIdFromCookie(): string {
  if (typeof document === 'undefined') {
    return 'default';
  }
  
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'tenantId') {
      return value || 'default';
    }
  }
  
  return 'default';
}

// ============================================
// PROVIDER COMPONENT
// ============================================

interface TenantProviderProps {
  children: ReactNode;
  initialTenant?: TenantConfig | null;
  initialTenantId?: string;
}

export const TenantProvider: React.FC<TenantProviderProps> = ({
  children,
  initialTenant = null,
  initialTenantId,
}) => {
  const [tenant, setTenant] = useState<TenantConfig | null>(initialTenant);
  const [tenantId, setTenantId] = useState<string>(initialTenantId || 'default');
  const [isLoading, setIsLoading] = useState(!initialTenant);
  const [error, setError] = useState<string | null>(null);

  // Fetch tenant configuration from API
  const fetchTenantConfig = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/tenant/current?tenantId=${id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch tenant configuration');
      }
      
      const data = await response.json();
      
      if (data.success && data.tenant) {
        setTenant(data.tenant);
        setTenantId(data.tenant.tenantId);
        
        // Apply CSS variables for branding
        applyBrandingStyles(data.tenant.branding);
      } else {
        // Use default config if tenant not found
        setTenant(DEFAULT_TENANT_CONFIG);
        setTenantId('default');
        applyBrandingStyles(DEFAULT_TENANT_CONFIG.branding);
      }
    } catch (err) {
      console.error('Error fetching tenant config:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tenant configuration');
      
      // Fall back to default config
      setTenant(DEFAULT_TENANT_CONFIG);
      setTenantId('default');
      applyBrandingStyles(DEFAULT_TENANT_CONFIG.branding);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Apply branding styles as CSS variables
  const applyBrandingStyles = (branding: TenantBranding) => {
    if (typeof document === 'undefined') return;
    
    const root = document.documentElement;
    
    root.style.setProperty('--primary-color', branding.primaryColor);
    root.style.setProperty('--secondary-color', branding.secondaryColor);
    root.style.setProperty('--accent-color', branding.accentColor);
    root.style.setProperty('--background-color', branding.backgroundColor || '#FFFFFF');
    root.style.setProperty('--text-color', branding.textColor || '#1F2937');
    root.style.setProperty('--font-family', `${branding.fontFamily}, system-ui, sans-serif`);
    root.style.setProperty('--font-family-heading', `${branding.fontFamilyHeading || branding.fontFamily}, system-ui, sans-serif`);
    root.style.setProperty('--border-radius', branding.borderRadius || '8px');
    
    // Update favicon
    if (branding.favicon) {
      const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (favicon) {
        favicon.href = branding.favicon;
      }
    }
  };

  // Initialize tenant on mount
  useEffect(() => {
    if (initialTenant) {
      // If initial tenant provided, just apply styles
      applyBrandingStyles(initialTenant.branding);
      return;
    }
    
    // Get tenant ID from cookie or URL
    const cookieTenantId = getTenantIdFromCookie();
    const effectiveTenantId = initialTenantId || cookieTenantId;
    
    fetchTenantConfig(effectiveTenantId);
  }, [initialTenant, initialTenantId, fetchTenantConfig]);

  // Refresh tenant configuration
  const refreshTenant = useCallback(async () => {
    const currentTenantId = getTenantIdFromCookie();
    await fetchTenantConfig(currentTenantId);
  }, [fetchTenantConfig]);

  // Helper methods
  const getLogo = useCallback(() => {
    return tenant?.branding.logo || DEFAULT_TENANT_CONFIG.branding.logo;
  }, [tenant]);

  const getPrimaryColor = useCallback(() => {
    return tenant?.branding.primaryColor || DEFAULT_TENANT_CONFIG.branding.primaryColor;
  }, [tenant]);

  const getSecondaryColor = useCallback(() => {
    return tenant?.branding.secondaryColor || DEFAULT_TENANT_CONFIG.branding.secondaryColor;
  }, [tenant]);

  const getSiteName = useCallback(() => {
    return tenant?.name || DEFAULT_TENANT_CONFIG.name;
  }, [tenant]);

  const getCurrency = useCallback(() => {
    return tenant?.payments.currency || DEFAULT_TENANT_CONFIG.payments.currency;
  }, [tenant]);

  const getCurrencySymbol = useCallback(() => {
    return tenant?.payments.currencySymbol || DEFAULT_TENANT_CONFIG.payments.currencySymbol;
  }, [tenant]);

  const isFeatureEnabled = useCallback((feature: keyof TenantFeatures) => {
    if (!tenant?.features) return DEFAULT_TENANT_CONFIG.features[feature];
    return tenant.features[feature] ?? DEFAULT_TENANT_CONFIG.features[feature];
  }, [tenant]);

  // Context value
  const value: TenantContextType = {
    tenant,
    tenantId,
    isLoading,
    error,
    refreshTenant,
    getLogo,
    getPrimaryColor,
    getSecondaryColor,
    getSiteName,
    getCurrency,
    getCurrencySymbol,
    isFeatureEnabled,
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
};

// ============================================
// SERVER-SIDE HELPER
// ============================================

/**
 * Generate CSS style tag content for server-side rendering
 * Use this in layout.tsx to inject initial styles
 */
export function generateTenantStyleTag(branding: TenantBranding): string {
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

// ============================================
// EXPORTS
// ============================================

export { DEFAULT_TENANT_CONFIG };
export type {
  TenantContextType,
  TenantProviderProps,
};

