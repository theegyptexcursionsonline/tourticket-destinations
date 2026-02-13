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

// Extended Theme Configuration for distinct UI/UX per tenant
export interface TenantThemeConfig {
  themeId: string;
  themeName: string;
  colors: {
    primary: string;
    primaryHover: string;
    primaryLight: string;
    secondary: string;
    secondaryHover?: string;
    accent: string;
    accentHover?: string;
    success: string;
    warning: string;
    error: string;
    info: string;
    background: string;
    backgroundAlt: string;
    surface: string;
    surfaceHover?: string;
    text: string;
    textMuted: string;
    textInverse: string;
    border: string;
    borderHover?: string;
    divider: string;
    rating: string;
  };
  gradients: {
    primary: string;
    secondary: string;
    hero: string;
    card?: string;
    button?: string;
    overlay?: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    primary: string;
    card: string;
    button?: string;
    dropdown?: string;
  };
  typography: {
    fontFamily: string;
    fontFamilyHeading: string;
    fontFamilyMono?: string;
    baseFontSize: string;
    lineHeight: string;
    headingLineHeight?: string;
    fontWeightNormal: number;
    fontWeightMedium: number;
    fontWeightSemibold: number;
    fontWeightBold: number;
    letterSpacing?: string;
    headingLetterSpacing?: string;
  };
  layout: {
    borderRadius: string;
    borderRadiusSm: string;
    borderRadiusLg: string;
    borderRadiusXl: string;
    borderRadiusFull: string;
    containerMaxWidth: string;
    headerHeight: string;
    footerStyle: 'minimal' | 'standard' | 'expanded';
  };
  components: {
    header: {
      background: string;
      backgroundScrolled?: string;
      textColor: string;
      style: 'transparent' | 'solid' | 'gradient';
      position: 'fixed' | 'sticky' | 'static';
      blur?: boolean;
    };
    footer: {
      background: string;
      textColor: string;
      style: 'dark' | 'light' | 'colored';
    };
    buttons: {
      style: 'rounded' | 'pill' | 'square';
      primaryBg: string;
      primaryText: string;
      primaryHoverBg: string;
      secondaryBg: string;
      secondaryText: string;
      outlineBorderColor: string;
    };
    cards: {
      style: 'elevated' | 'bordered' | 'flat';
      background: string;
      hoverTransform?: string;
      imageBorderRadius: string;
    };
    badges: {
      background: string;
      textColor: string;
      style: 'rounded' | 'pill' | 'square';
    };
    inputs: {
      background: string;
      borderColor: string;
      focusBorderColor: string;
      style: 'outlined' | 'filled' | 'underlined';
    };
  };
  animations: {
    enabled: boolean;
    duration: string;
    durationFast: string;
    durationSlow: string;
    easing: string;
    hoverScale?: string;
  };
  darkMode?: {
    enabled: boolean;
    colors?: Partial<TenantThemeConfig['colors']>;
  };
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
  supportedPaymentMethods?: string[];
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
  theme?: TenantThemeConfig;
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
  // Theme helpers
  getTheme: () => TenantThemeConfig | undefined;
  getThemeId: () => string;
  hasCustomTheme: () => boolean;
}

// ============================================
// DEFAULT VALUES
// ============================================

const DEFAULT_TENANT_CONFIG: TenantConfig = {
  tenantId: 'default',
  name: 'Egypt Excursions Online',
  domain: 'egypt-excursionsonline.com',
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
    email: 'info@egypt-excursionsonline.com',
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
    supportedPaymentMethods: ['card', 'paypal'],
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
        
        // Apply CSS variables for branding and theme
        applyBrandingStyles(data.tenant.branding, data.tenant.tenantId, data.tenant.theme);
      } else {
        // Use default config if tenant not found
        setTenant(DEFAULT_TENANT_CONFIG);
        setTenantId('default');
        applyBrandingStyles(DEFAULT_TENANT_CONFIG.branding, 'default', DEFAULT_TENANT_CONFIG.theme);
      }
    } catch (err) {
      console.error('Error fetching tenant config:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tenant configuration');
      
      // Fall back to default config
      setTenant(DEFAULT_TENANT_CONFIG);
      setTenantId('default');
      applyBrandingStyles(DEFAULT_TENANT_CONFIG.branding, 'default', DEFAULT_TENANT_CONFIG.theme);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Apply branding styles as CSS variables
  const applyBrandingStyles = (branding: TenantBranding, currentTenantId?: string, theme?: TenantThemeConfig) => {
    if (typeof document === 'undefined') return;
    
    const root = document.documentElement;
    
    // If we have a full theme config, use it for comprehensive styling
    if (theme) {
      // Apply theme class
      root.className = root.className.replace(/theme-[\w-]+/g, '').trim();
      root.classList.add(`theme-${theme.themeId}`);
      
      // Colors
      const colors = theme.colors;
      root.style.setProperty('--primary-color', colors.primary);
      root.style.setProperty('--primary-hover', colors.primaryHover);
      root.style.setProperty('--primary-light', colors.primaryLight);
      root.style.setProperty('--secondary-color', colors.secondary);
      root.style.setProperty('--secondary-hover', colors.secondaryHover || colors.secondary);
      root.style.setProperty('--accent-color', colors.accent);
      root.style.setProperty('--accent-hover', colors.accentHover || colors.accent);
      root.style.setProperty('--success-color', colors.success);
      root.style.setProperty('--warning-color', colors.warning);
      root.style.setProperty('--error-color', colors.error);
      root.style.setProperty('--info-color', colors.info);
      root.style.setProperty('--background-color', colors.background);
      root.style.setProperty('--background-alt', colors.backgroundAlt);
      root.style.setProperty('--surface-color', colors.surface);
      root.style.setProperty('--surface-hover', colors.surfaceHover || colors.surface);
      root.style.setProperty('--text-color', colors.text);
      root.style.setProperty('--text-muted', colors.textMuted);
      root.style.setProperty('--text-inverse', colors.textInverse);
      root.style.setProperty('--border-color', colors.border);
      root.style.setProperty('--border-hover', colors.borderHover || colors.border);
      root.style.setProperty('--divider-color', colors.divider);
      root.style.setProperty('--rating-color', colors.rating);
      
      // Gradients
      const gradients = theme.gradients;
      root.style.setProperty('--gradient-primary', gradients.primary);
      root.style.setProperty('--gradient-secondary', gradients.secondary);
      root.style.setProperty('--gradient-hero', gradients.hero);
      if (gradients.card) root.style.setProperty('--gradient-card', gradients.card);
      if (gradients.button) root.style.setProperty('--gradient-button', gradients.button);
      if (gradients.overlay) root.style.setProperty('--gradient-overlay', gradients.overlay);
      
      // Shadows
      const shadows = theme.shadows;
      root.style.setProperty('--shadow-sm', shadows.sm);
      root.style.setProperty('--shadow-md', shadows.md);
      root.style.setProperty('--shadow-lg', shadows.lg);
      root.style.setProperty('--shadow-xl', shadows.xl);
      root.style.setProperty('--shadow-primary', shadows.primary);
      root.style.setProperty('--shadow-card', shadows.card);
      if (shadows.button) root.style.setProperty('--shadow-button', shadows.button);
      if (shadows.dropdown) root.style.setProperty('--shadow-dropdown', shadows.dropdown);
      
      // Typography
      const typography = theme.typography;
      root.style.setProperty('--font-family', `${typography.fontFamily}, system-ui, sans-serif`);
      root.style.setProperty('--font-family-heading', `${typography.fontFamilyHeading}, system-ui, sans-serif`);
      root.style.setProperty('--font-family-mono', typography.fontFamilyMono || 'monospace');
      root.style.setProperty('--font-size-base', typography.baseFontSize);
      root.style.setProperty('--line-height', typography.lineHeight);
      root.style.setProperty('--line-height-heading', typography.headingLineHeight || '1.2');
      root.style.setProperty('--font-weight-normal', String(typography.fontWeightNormal));
      root.style.setProperty('--font-weight-medium', String(typography.fontWeightMedium));
      root.style.setProperty('--font-weight-semibold', String(typography.fontWeightSemibold));
      root.style.setProperty('--font-weight-bold', String(typography.fontWeightBold));
      root.style.setProperty('--letter-spacing', typography.letterSpacing || '0');
      root.style.setProperty('--letter-spacing-heading', typography.headingLetterSpacing || '-0.02em');
      
      // Layout
      const layout = theme.layout;
      root.style.setProperty('--border-radius', layout.borderRadius);
      root.style.setProperty('--border-radius-sm', layout.borderRadiusSm);
      root.style.setProperty('--border-radius-lg', layout.borderRadiusLg);
      root.style.setProperty('--border-radius-xl', layout.borderRadiusXl);
      root.style.setProperty('--border-radius-full', layout.borderRadiusFull);
      root.style.setProperty('--container-max-width', layout.containerMaxWidth);
      root.style.setProperty('--header-height', layout.headerHeight);
      root.setAttribute('data-footer-style', layout.footerStyle);
      
      // Components
      const components = theme.components;
      
      // Header
      root.style.setProperty('--header-bg', components.header.background);
      root.style.setProperty('--header-bg-scrolled', components.header.backgroundScrolled || components.header.background);
      root.style.setProperty('--header-text', components.header.textColor);
      root.setAttribute('data-header-style', components.header.style);
      root.setAttribute('data-header-position', components.header.position);
      if (components.header.blur) root.setAttribute('data-header-blur', 'true');
      
      // Footer
      root.style.setProperty('--footer-bg', components.footer.background);
      root.style.setProperty('--footer-text', components.footer.textColor);
      root.setAttribute('data-footer-theme', components.footer.style);
      
      // Buttons
      root.style.setProperty('--btn-primary-bg', components.buttons.primaryBg);
      root.style.setProperty('--btn-primary-text', components.buttons.primaryText);
      root.style.setProperty('--btn-primary-hover', components.buttons.primaryHoverBg);
      root.style.setProperty('--btn-secondary-bg', components.buttons.secondaryBg);
      root.style.setProperty('--btn-secondary-text', components.buttons.secondaryText);
      root.style.setProperty('--btn-outline-border', components.buttons.outlineBorderColor);
      root.setAttribute('data-btn-style', components.buttons.style);
      
      // Cards
      root.style.setProperty('--card-bg', components.cards.background);
      root.style.setProperty('--card-hover-transform', components.cards.hoverTransform || 'translateY(-4px)');
      root.style.setProperty('--card-image-radius', components.cards.imageBorderRadius);
      root.setAttribute('data-card-style', components.cards.style);
      
      // Badges
      root.style.setProperty('--badge-bg', components.badges.background);
      root.style.setProperty('--badge-text', components.badges.textColor);
      root.setAttribute('data-badge-style', components.badges.style);
      
      // Inputs
      root.style.setProperty('--input-bg', components.inputs.background);
      root.style.setProperty('--input-border', components.inputs.borderColor);
      root.style.setProperty('--input-focus-border', components.inputs.focusBorderColor);
      root.setAttribute('data-input-style', components.inputs.style);
      
      // Animations
      const animations = theme.animations;
      root.style.setProperty('--animation-duration', animations.duration);
      root.style.setProperty('--animation-duration-fast', animations.durationFast);
      root.style.setProperty('--animation-duration-slow', animations.durationSlow);
      root.style.setProperty('--animation-easing', animations.easing);
      root.style.setProperty('--hover-scale', animations.hoverScale || '1.02');
      if (!animations.enabled) root.setAttribute('data-reduce-motion', 'true');
      
      // Dark mode support
      if (theme.darkMode?.enabled) {
        root.setAttribute('data-dark-mode-available', 'true');
      }
    } else {
      // Fallback: Use basic branding (legacy support)
      root.style.setProperty('--primary-color', branding.primaryColor);
      root.style.setProperty('--secondary-color', branding.secondaryColor);
      root.style.setProperty('--accent-color', branding.accentColor);
      root.style.setProperty('--background-color', branding.backgroundColor || '#FFFFFF');
      root.style.setProperty('--text-color', branding.textColor || '#1F2937');
      root.style.setProperty('--font-family', `${branding.fontFamily}, system-ui, sans-serif`);
      root.style.setProperty('--font-family-heading', `${branding.fontFamilyHeading || branding.fontFamily}, system-ui, sans-serif`);
      root.style.setProperty('--border-radius', branding.borderRadius || '8px');
      
      // Apply default extended values
      root.style.setProperty('--primary-hover', adjustColor(branding.primaryColor, -10));
      root.style.setProperty('--primary-light', adjustColor(branding.primaryColor, 90));
      root.style.setProperty('--gradient-primary', `linear-gradient(135deg, ${branding.primaryColor} 0%, ${adjustColor(branding.primaryColor, -10)} 100%)`);
      root.style.setProperty('--gradient-secondary', `linear-gradient(135deg, ${branding.secondaryColor} 0%, ${adjustColor(branding.secondaryColor, 20)} 100%)`);
      root.style.setProperty('--gradient-hero', 'linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 100%)');
      root.style.setProperty('--shadow-primary', `0 4px 14px 0 ${branding.primaryColor}40`);
      root.style.setProperty('--shadow-card', '0 4px 20px rgba(0, 0, 0, 0.1)');
      root.style.setProperty('--border-color', '#E5E7EB');
      root.style.setProperty('--surface-color', '#F9FAFB');
      root.style.setProperty('--header-bg', 'rgba(255, 255, 255, 0.95)');
      root.style.setProperty('--footer-bg', '#1F2937');
      root.style.setProperty('--badge-bg', branding.primaryColor);
      root.style.setProperty('--badge-text', '#FFFFFF');
      root.style.setProperty('--rating-color', '#FBBF24');
      
      root.classList.add('theme-default');
    }
    
    // Update favicon
    if (branding.favicon) {
      const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (favicon) {
        favicon.href = branding.favicon;
      }
    }
  };
  
  // Helper: Adjust color brightness
  const adjustColor = (hex: string, percent: number): string => {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + 
      (R < 255 ? R < 0 ? 0 : R : 255) * 0x10000 + 
      (G < 255 ? G < 0 ? 0 : G : 255) * 0x100 + 
      (B < 255 ? B < 0 ? 0 : B : 255)
    ).toString(16).slice(1);
  };

  // Initialize tenant on mount
  useEffect(() => {
    if (initialTenant) {
      // If initial tenant provided, just apply styles
      applyBrandingStyles(initialTenant.branding, initialTenant.tenantId, initialTenant.theme);
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

  // Theme helpers
  const getTheme = useCallback(() => {
    return tenant?.theme;
  }, [tenant]);

  const getThemeId = useCallback(() => {
    return tenant?.theme?.themeId || 'default';
  }, [tenant]);

  const hasCustomTheme = useCallback(() => {
    return !!tenant?.theme;
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
    getTheme,
    getThemeId,
    hasCustomTheme,
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
export function generateTenantStyleTag(branding: TenantBranding, theme?: TenantThemeConfig): string {
  if (theme) {
    // Full theme config available - generate comprehensive CSS variables
    return `
      :root {
        /* Colors */
        --primary-color: ${theme.colors.primary};
        --primary-hover: ${theme.colors.primaryHover};
        --primary-light: ${theme.colors.primaryLight};
        --secondary-color: ${theme.colors.secondary};
        --secondary-hover: ${theme.colors.secondaryHover || theme.colors.secondary};
        --accent-color: ${theme.colors.accent};
        --accent-hover: ${theme.colors.accentHover || theme.colors.accent};
        --success-color: ${theme.colors.success};
        --warning-color: ${theme.colors.warning};
        --error-color: ${theme.colors.error};
        --info-color: ${theme.colors.info};
        --background-color: ${theme.colors.background};
        --background-alt: ${theme.colors.backgroundAlt};
        --surface-color: ${theme.colors.surface};
        --text-color: ${theme.colors.text};
        --text-muted: ${theme.colors.textMuted};
        --text-inverse: ${theme.colors.textInverse};
        --border-color: ${theme.colors.border};
        --divider-color: ${theme.colors.divider};
        --rating-color: ${theme.colors.rating};
        
        /* Gradients */
        --gradient-primary: ${theme.gradients.primary};
        --gradient-secondary: ${theme.gradients.secondary};
        --gradient-hero: ${theme.gradients.hero};
        
        /* Shadows */
        --shadow-sm: ${theme.shadows.sm};
        --shadow-md: ${theme.shadows.md};
        --shadow-lg: ${theme.shadows.lg};
        --shadow-xl: ${theme.shadows.xl};
        --shadow-primary: ${theme.shadows.primary};
        --shadow-card: ${theme.shadows.card};
        
        /* Typography */
        --font-family: ${theme.typography.fontFamily}, system-ui, sans-serif;
        --font-family-heading: ${theme.typography.fontFamilyHeading}, system-ui, sans-serif;
        --font-size-base: ${theme.typography.baseFontSize};
        --line-height: ${theme.typography.lineHeight};
        
        /* Layout */
        --border-radius: ${theme.layout.borderRadius};
        --border-radius-sm: ${theme.layout.borderRadiusSm};
        --border-radius-lg: ${theme.layout.borderRadiusLg};
        --border-radius-xl: ${theme.layout.borderRadiusXl};
        --border-radius-full: ${theme.layout.borderRadiusFull};
        --container-max-width: ${theme.layout.containerMaxWidth};
        --header-height: ${theme.layout.headerHeight};
        
        /* Components */
        --header-bg: ${theme.components.header.background};
        --header-text: ${theme.components.header.textColor};
        --footer-bg: ${theme.components.footer.background};
        --footer-text: ${theme.components.footer.textColor};
        --btn-primary-bg: ${theme.components.buttons.primaryBg};
        --btn-primary-text: ${theme.components.buttons.primaryText};
        --card-bg: ${theme.components.cards.background};
        --badge-bg: ${theme.components.badges.background};
        --badge-text: ${theme.components.badges.textColor};
        
        /* Animations */
        --animation-duration: ${theme.animations.duration};
        --animation-easing: ${theme.animations.easing};
      }
    `;
  }
  
  // Fallback: Basic branding only
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

