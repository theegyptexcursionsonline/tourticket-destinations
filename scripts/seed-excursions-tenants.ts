#!/usr/bin/env npx tsx
// scripts/seed-excursions-tenants.ts
// Comprehensive seed script to create all Excursions Online tenants
// Client Request: January 2026 - Foxes Technology Projects

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config();

// ============================================================================
// TENANT SCHEMA DEFINITION (inline to avoid import issues)
// ============================================================================

const TenantSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, unique: true, lowercase: true },
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  domain: { type: String, required: true, unique: true, lowercase: true },
  domains: [{ type: String, lowercase: true }],
  branding: {
    logo: String,
    logoDark: String,
    logoAlt: String,
    favicon: String,
    primaryColor: { type: String, default: '#E63946' },
    secondaryColor: { type: String, default: '#1D3557' },
    accentColor: { type: String, default: '#F4A261' },
    backgroundColor: { type: String, default: '#FFFFFF' },
    textColor: { type: String, default: '#1F2937' },
    fontFamily: { type: String, default: 'Inter' },
    fontFamilyHeading: String,
    borderRadius: { type: String, default: '8px' },
  },
  theme: {
    themeId: { type: String, default: 'default' },
    themeName: { type: String, default: 'Default Theme' },
    colors: {
      primary: String,
      primaryHover: String,
      primaryLight: String,
      secondary: String,
      secondaryHover: String,
      accent: String,
      accentHover: String,
      success: { type: String, default: '#10B981' },
      warning: { type: String, default: '#F59E0B' },
      error: { type: String, default: '#EF4444' },
      info: { type: String, default: '#3B82F6' },
      background: { type: String, default: '#FFFFFF' },
      backgroundAlt: { type: String, default: '#F9FAFB' },
      surface: { type: String, default: '#FFFFFF' },
      surfaceHover: String,
      text: { type: String, default: '#1F2937' },
      textMuted: { type: String, default: '#6B7280' },
      textInverse: { type: String, default: '#FFFFFF' },
      border: { type: String, default: '#E5E7EB' },
      borderHover: String,
      divider: { type: String, default: '#E5E7EB' },
      rating: { type: String, default: '#FBBF24' },
    },
    gradients: {
      primary: String,
      secondary: String,
      hero: String,
      card: String,
      button: String,
      overlay: String,
    },
    shadows: {
      sm: String,
      md: String,
      lg: String,
      xl: String,
      primary: String,
      card: String,
      button: String,
      dropdown: String,
    },
    typography: {
      fontFamily: String,
      fontFamilyHeading: String,
      fontFamilyMono: String,
      baseFontSize: { type: String, default: '16px' },
      lineHeight: { type: String, default: '1.5' },
      headingLineHeight: { type: String, default: '1.2' },
      fontWeightNormal: { type: Number, default: 400 },
      fontWeightMedium: { type: Number, default: 500 },
      fontWeightSemibold: { type: Number, default: 600 },
      fontWeightBold: { type: Number, default: 700 },
      letterSpacing: String,
      headingLetterSpacing: String,
    },
    layout: {
      borderRadius: { type: String, default: '8px' },
      borderRadiusSm: { type: String, default: '4px' },
      borderRadiusLg: { type: String, default: '12px' },
      borderRadiusXl: { type: String, default: '16px' },
      borderRadiusFull: { type: String, default: '9999px' },
      containerMaxWidth: { type: String, default: '1280px' },
      headerHeight: { type: String, default: '72px' },
      footerStyle: { type: String, enum: ['minimal', 'standard', 'expanded'], default: 'standard' },
    },
    components: {
      header: {
        background: String,
        backgroundScrolled: String,
        textColor: String,
        style: { type: String, enum: ['transparent', 'solid', 'gradient'], default: 'solid' },
        position: { type: String, enum: ['fixed', 'sticky', 'static'], default: 'sticky' },
        blur: { type: Boolean, default: true },
      },
      footer: {
        background: String,
        textColor: String,
        style: { type: String, enum: ['dark', 'light', 'colored'], default: 'dark' },
      },
      buttons: {
        style: { type: String, enum: ['rounded', 'pill', 'square'], default: 'rounded' },
        primaryBg: String,
        primaryText: String,
        primaryHoverBg: String,
        secondaryBg: String,
        secondaryText: String,
        outlineBorderColor: String,
      },
      cards: {
        style: { type: String, enum: ['elevated', 'bordered', 'flat'], default: 'elevated' },
        background: String,
        hoverTransform: String,
        imageBorderRadius: String,
      },
      badges: {
        background: String,
        textColor: String,
        style: { type: String, enum: ['rounded', 'pill', 'square'], default: 'rounded' },
      },
      inputs: {
        background: String,
        borderColor: String,
        focusBorderColor: String,
        style: { type: String, enum: ['outlined', 'filled', 'underlined'], default: 'outlined' },
      },
    },
    animations: {
      enabled: { type: Boolean, default: true },
      duration: { type: String, default: '200ms' },
      durationFast: { type: String, default: '150ms' },
      durationSlow: { type: String, default: '300ms' },
      easing: { type: String, default: 'cubic-bezier(0.4, 0, 0.2, 1)' },
      hoverScale: { type: String, default: '1.02' },
    },
    darkMode: {
      enabled: { type: Boolean, default: false },
      colors: mongoose.Schema.Types.Mixed,
    },
  },
  seo: {
    defaultTitle: String,
    titleSuffix: String,
    defaultDescription: String,
    defaultKeywords: [String],
    ogImage: String,
    ogType: { type: String, default: 'website' },
    twitterHandle: String,
    twitterCardType: { type: String, default: 'summary_large_image' },
    googleAnalyticsId: String,
    googleTagManagerId: String,
    facebookPixelId: String,
    structuredDataType: { type: String, default: 'TravelAgency' },
  },
  contact: {
    email: String,
    supportEmail: String,
    phone: String,
    whatsapp: String,
    address: String,
    city: String,
    country: String,
    postalCode: String,
    businessHours: String,
  },
  socialLinks: {
    facebook: String,
    instagram: String,
    twitter: String,
    youtube: String,
    tiktok: String,
    linkedin: String,
    pinterest: String,
    tripadvisor: String,
  },
  features: {
    enableBlog: { type: Boolean, default: true },
    enableReviews: { type: Boolean, default: true },
    enableWishlist: { type: Boolean, default: true },
    enableAISearch: { type: Boolean, default: true },
    enableIntercom: { type: Boolean, default: false },
    enableMultiCurrency: { type: Boolean, default: true },
    enableMultiLanguage: { type: Boolean, default: true },
    enableLiveChat: { type: Boolean, default: false },
    enableNewsletter: { type: Boolean, default: true },
    enablePromoBar: { type: Boolean, default: false },
    enableHotelPickup: { type: Boolean, default: true },
    enableGiftCards: { type: Boolean, default: false },
  },
  payments: {
    stripeAccountId: String,
    stripePublishableKey: String,
    currency: { type: String, default: 'USD' },
    currencySymbol: { type: String, default: '$' },
    supportedCurrencies: [String],
    supportedPaymentMethods: [String],
    taxRate: { type: Number, default: 0 },
    serviceFeePercent: { type: Number, default: 0 },
    minBookingAmount: { type: Number, default: 0 },
    maxBookingAmount: { type: Number, default: 100000 },
  },
  email: {
    fromName: String,
    fromEmail: String,
    replyToEmail: String,
    mailgunDomain: String,
    emailTemplateTheme: { type: String, default: 'default' },
  },
  localization: {
    defaultLanguage: { type: String, default: 'en' },
    supportedLanguages: [String],
    defaultTimezone: { type: String, default: 'Africa/Cairo' },
    dateFormat: { type: String, default: 'DD/MM/YYYY' },
    timeFormat: { type: String, default: 'HH:mm' },
  },
  homepage: {
    heroType: { type: String, enum: ['slider', 'video', 'static'], default: 'slider' },
    heroTitle: String,
    heroSubtitle: String,
    heroImages: [String],
    heroVideoUrl: String,
    showDestinations: { type: Boolean, default: true },
    showCategories: { type: Boolean, default: true },
    showFeaturedTours: { type: Boolean, default: true },
    showPopularInterests: { type: Boolean, default: true },
    showDayTrips: { type: Boolean, default: true },
    showReviews: { type: Boolean, default: true },
    showFAQ: { type: Boolean, default: true },
    showAboutUs: { type: Boolean, default: true },
    showPromoSection: { type: Boolean, default: false },
    featuredTourIds: [mongoose.Schema.Types.ObjectId],
    featuredToursCount: { type: Number, default: 8 },
    customSections: [{
      id: String,
      title: String,
      type: String,
      enabled: Boolean,
      order: Number,
      config: mongoose.Schema.Types.Mixed,
    }],
  },
  heroSettings: { type: mongoose.Schema.Types.ObjectId, ref: 'HeroSettings' },
  primaryDestination: { type: mongoose.Schema.Types.ObjectId, ref: 'Destination' },
  allowedDestinations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Destination' }],
  allowedCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  integrations: {
    intercomAppId: String,
    algoliaIndexPrefix: String,
    cloudinaryFolder: String,
    sentryDsn: String,
  },
  customContent: {
    aboutUsContent: String,
    footerContent: String,
    termsContent: String,
    privacyContent: String,
    faqContent: [{
      question: String,
      answer: String,
    }],
  },
  promoBar: {
    enabled: { type: Boolean, default: false },
    text: String,
    link: String,
    backgroundColor: { type: String, default: '#E63946' },
    textColor: { type: String, default: '#FFFFFF' },
    dismissible: { type: Boolean, default: true },
  },
  isActive: { type: Boolean, default: true },
  isDefault: { type: Boolean, default: false },
  websiteStatus: { 
    type: String, 
    enum: ['active', 'coming_soon', 'maintenance', 'offline'], 
    default: 'active' 
  },
}, { timestamps: true });

const Tenant = mongoose.models.Tenant || mongoose.model('Tenant', TenantSchema);

// ============================================================================
// HERO SETTINGS SCHEMA DEFINITION
// ============================================================================
const HeroSettingsSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  backgroundImages: [{
    desktop: String,
    mobile: String,
    alt: String,
    isActive: { type: Boolean, default: true },
  }],
  currentActiveImage: String,
  title: {
    main: String,
    highlight: String,
  },
  searchSuggestions: [String],
  floatingTags: {
    isEnabled: { type: Boolean, default: true },
    tags: [String],
    animationSpeed: { type: Number, default: 3 },
    tagCount: {
      desktop: { type: Number, default: 5 },
      mobile: { type: Number, default: 3 },
    },
  },
  trustIndicators: {
    travelers: String,
    rating: String,
    ratingText: String,
    isVisible: { type: Boolean, default: true },
  },
  overlaySettings: {
    opacity: { type: Number, default: 0.5 },
    gradientType: { type: String, enum: ['dark', 'light', 'custom'], default: 'dark' },
    customGradient: String,
  },
  animationSettings: {
    slideshowSpeed: { type: Number, default: 5 },
    fadeSpeed: { type: Number, default: 800 },
    enableAutoplay: { type: Boolean, default: true },
  },
  metaTitle: String,
  metaDescription: String,
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const HeroSettings = mongoose.models.HeroSettings || mongoose.model('HeroSettings', HeroSettingsSchema);

// ============================================================================
// HELPER: Generate placeholder logo URL
// ============================================================================
function generatePlaceholderLogo(name: string, primaryColor: string, bgColor: string = 'white'): string {
  const encodedName = encodeURIComponent(name);
  const colorCode = primaryColor.replace('#', '');
  const bgColorCode = bgColor === 'white' ? 'FFFFFF' : bgColor.replace('#', '');
  return `https://placehold.co/280x80/${colorCode}/${bgColorCode}?text=${encodedName}&font=montserrat`;
}

function generatePlaceholderFavicon(primaryColor: string): string {
  const colorCode = primaryColor.replace('#', '');
  return `https://placehold.co/32x32/${colorCode}/FFFFFF?text=E&font=montserrat`;
}

function generatePlaceholderOgImage(name: string, primaryColor: string, tagline: string): string {
  const encodedName = encodeURIComponent(name);
  const encodedTagline = encodeURIComponent(tagline);
  const colorCode = primaryColor.replace('#', '');
  return `https://placehold.co/1200x630/${colorCode}/FFFFFF?text=${encodedName}%0A${encodedTagline}&font=montserrat`;
}

// ============================================================================
// TENANT CONFIGURATIONS
// ============================================================================

// 1. HURGHADA EXCURSIONS ONLINE
// Theme: Ocean/Beach vibes - Cyan waters, tropical feel
const hurghadaExcursionsOnline = {
  tenantId: 'hurghada-excursions-online',
  name: 'Hurghada Excursions Online',
  slug: 'hurghada-excursions-online',
  domain: 'hurghadaexcursionsonline.com',
  domains: ['hurghadaexcursionsonline.com', 'www.hurghadaexcursionsonline.com'],
  branding: {
    logo: '/tenants/hurghada-excursions-online/logo.png',
    logoDark: '/tenants/hurghada-excursions-online/logo.png',
    logoAlt: 'Hurghada Excursions Online',
    favicon: '/tenants/hurghada-excursions-online/favicon.ico',
    primaryColor: '#0891B2',      // Cyan-600 (Ocean blue)
    secondaryColor: '#164E63',    // Cyan-900 (Deep ocean)
    accentColor: '#22D3EE',       // Cyan-400 (Bright water)
    backgroundColor: '#FFFFFF',
    textColor: '#0F172A',
    fontFamily: 'Poppins',
    fontFamilyHeading: 'Montserrat',
    borderRadius: '12px',
  },
  theme: {
    themeId: 'ocean-adventure',
    themeName: 'Ocean Adventure',
    colors: {
      primary: '#0891B2',
      primaryHover: '#0E7490',
      primaryLight: '#CFFAFE',
      secondary: '#164E63',
      secondaryHover: '#155E75',
      accent: '#22D3EE',
      accentHover: '#06B6D4',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#3B82F6',
      background: '#FFFFFF',
      backgroundAlt: '#F0FDFA',
      surface: '#FFFFFF',
      surfaceHover: '#ECFEFF',
      text: '#0F172A',
      textMuted: '#64748B',
      textInverse: '#FFFFFF',
      border: '#E2E8F0',
      borderHover: '#CBD5E1',
      divider: '#E2E8F0',
      rating: '#FBBF24',
    },
    gradients: {
      primary: 'linear-gradient(135deg, #0891B2 0%, #06B6D4 100%)',
      secondary: 'linear-gradient(135deg, #164E63 0%, #0E7490 100%)',
      hero: 'linear-gradient(180deg, rgba(8,145,178,0.8) 0%, rgba(6,182,212,0.4) 100%)',
      card: 'linear-gradient(180deg, #ECFEFF 0%, #FFFFFF 100%)',
      button: 'linear-gradient(135deg, #0891B2 0%, #0E7490 100%)',
      overlay: 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.2) 100%)',
    },
    shadows: {
      sm: '0 1px 2px 0 rgba(8, 145, 178, 0.05)',
      md: '0 4px 6px -1px rgba(8, 145, 178, 0.1)',
      lg: '0 10px 15px -3px rgba(8, 145, 178, 0.1)',
      xl: '0 20px 25px -5px rgba(8, 145, 178, 0.1)',
      primary: '0 4px 14px 0 rgba(8, 145, 178, 0.35)',
      card: '0 4px 20px rgba(8, 145, 178, 0.12)',
      button: '0 4px 14px 0 rgba(8, 145, 178, 0.4)',
      dropdown: '0 10px 40px rgba(8, 145, 178, 0.15)',
    },
    typography: {
      fontFamily: 'Poppins, sans-serif',
      fontFamilyHeading: 'Montserrat, sans-serif',
      fontFamilyMono: 'JetBrains Mono, monospace',
      baseFontSize: '16px',
      lineHeight: '1.6',
      headingLineHeight: '1.2',
      fontWeightNormal: 400,
      fontWeightMedium: 500,
      fontWeightSemibold: 600,
      fontWeightBold: 700,
      letterSpacing: '0',
      headingLetterSpacing: '-0.02em',
    },
    layout: {
      borderRadius: '12px',
      borderRadiusSm: '6px',
      borderRadiusLg: '16px',
      borderRadiusXl: '24px',
      borderRadiusFull: '9999px',
      containerMaxWidth: '1280px',
      headerHeight: '72px',
      footerStyle: 'standard' as const,
    },
    components: {
      header: {
        background: 'rgba(255, 255, 255, 0.95)',
        backgroundScrolled: 'rgba(255, 255, 255, 0.98)',
        textColor: '#0F172A',
        style: 'solid' as const,
        position: 'sticky' as const,
        blur: true,
      },
      footer: {
        background: '#164E63',
        textColor: '#FFFFFF',
        style: 'dark' as const,
      },
      buttons: {
        style: 'rounded' as const,
        primaryBg: '#0891B2',
        primaryText: '#FFFFFF',
        primaryHoverBg: '#0E7490',
        secondaryBg: '#164E63',
        secondaryText: '#FFFFFF',
        outlineBorderColor: '#0891B2',
      },
      cards: {
        style: 'elevated' as const,
        background: '#FFFFFF',
        hoverTransform: 'translateY(-6px)',
        imageBorderRadius: '12px',
      },
      badges: {
        background: '#0891B2',
        textColor: '#FFFFFF',
        style: 'pill' as const,
      },
      inputs: {
        background: '#FFFFFF',
        borderColor: '#E2E8F0',
        focusBorderColor: '#0891B2',
        style: 'outlined' as const,
      },
    },
    animations: {
      enabled: true,
      duration: '200ms',
      durationFast: '150ms',
      durationSlow: '300ms',
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      hoverScale: '1.03',
    },
    darkMode: {
      enabled: false,
    },
  },
  seo: {
    defaultTitle: 'Hurghada Excursions Online - Red Sea Tours & Adventures',
    titleSuffix: 'Hurghada Excursions',
    defaultDescription: 'Discover the best Hurghada excursions and Red Sea adventures. Book snorkeling trips, desert safaris, island hopping, and more. Best prices guaranteed!',
    defaultKeywords: [
      'hurghada excursions',
      'hurghada tours',
      'red sea tours',
      'hurghada snorkeling',
      'giftun island',
      'hurghada desert safari',
      'hurghada day trips',
      'hurghada boat trips',
      'orange bay hurghada',
      'hurghada activities',
    ],
    ogImage: generatePlaceholderOgImage('Hurghada+Excursions', '0891B2', 'Red+Sea+Adventures'),
    ogType: 'website',
    structuredDataType: 'TravelAgency',
  },
  contact: {
    email: 'info@hurghadaexcursionsonline.com',
    supportEmail: 'support@hurghadaexcursionsonline.com',
    phone: '+20 100 000 0001',
    whatsapp: '+20 100 000 0001',
    address: 'Hurghada Marina Boulevard',
    city: 'Hurghada',
    country: 'Egypt',
    postalCode: '84511',
    businessHours: '24/7 Support Available',
  },
  socialLinks: {
    facebook: 'https://facebook.com/hurghadaexcursionsonline',
    instagram: 'https://instagram.com/hurghadaexcursionsonline',
    youtube: 'https://youtube.com/@hurghadaexcursionsonline',
    tiktok: 'https://tiktok.com/@hurghadaexcursionsonline',
    tripadvisor: 'https://tripadvisor.com/hurghadaexcursionsonline',
  },
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
    enablePromoBar: true,
    enableHotelPickup: true,
    enableGiftCards: false,
  },
  payments: {
    currency: 'USD',
    currencySymbol: '$',
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'EGP'],
    supportedPaymentMethods: ['card', 'paypal', 'bank'],
    taxRate: 0,
    serviceFeePercent: 0,
    minBookingAmount: 0,
    maxBookingAmount: 50000,
  },
  email: {
    fromName: 'Hurghada Excursions Online',
    fromEmail: 'noreply@hurghadaexcursionsonline.com',
    replyToEmail: 'info@hurghadaexcursionsonline.com',
    emailTemplateTheme: 'ocean',
  },
  localization: {
    defaultLanguage: 'en',
    supportedLanguages: ['en', 'de', 'ru', 'ar', 'fr', 'it'],
    defaultTimezone: 'Africa/Cairo',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
  },
  homepage: {
    heroType: 'slider' as const,
    heroTitle: 'Discover the Magic of Hurghada',
    heroSubtitle: 'Crystal clear waters, vibrant coral reefs, and unforgettable adventures await you on the Red Sea',
    heroImages: [
      'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1920',
      'https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=1920',
      'https://images.unsplash.com/photo-1583212292454-1fe6229603b7?w=1920',
    ],
    showDestinations: false,
    showCategories: true,
    showFeaturedTours: true,
    showPopularInterests: true,
    showDayTrips: true,
    showReviews: true,
    showFAQ: true,
    showAboutUs: true,
    showPromoSection: true,
    featuredToursCount: 8,
  },
  integrations: {
    algoliaIndexPrefix: 'hurghada_excursions_',
    cloudinaryFolder: 'hurghada-excursions-online',
  },
  customContent: {
    aboutUsContent: `
      <h2>Welcome to Hurghada Excursions Online</h2>
      <p>Your gateway to the most incredible Red Sea experiences! We are a team of passionate local experts dedicated to showing you the true beauty of Hurghada and its surrounding areas.</p>
      <p>From thrilling snorkeling adventures at Giftun Island to serene sunset cruises, from adrenaline-pumping desert safaris to relaxing beach days at Orange Bay - we've got your perfect Egyptian adventure covered.</p>
      <h3>Why Book With Us?</h3>
      <ul>
        <li>🌊 Local experts with 15+ years experience</li>
        <li>💰 Best price guarantee - we match any price</li>
        <li>🚐 Free hotel pickup & drop-off included</li>
        <li>🌍 Multilingual guides (EN, DE, RU, AR, FR, IT)</li>
        <li>⭐ 5000+ verified 5-star reviews</li>
        <li>🔒 Secure online booking with instant confirmation</li>
      </ul>
    `,
    faqContent: [
      { question: 'Is hotel pickup included?', answer: 'Yes! Free hotel pickup and drop-off is included for all hotels in Hurghada, Makadi Bay, Sahl Hasheesh, and El Gouna.' },
      { question: 'What should I bring on tours?', answer: 'We recommend sunscreen, sunglasses, comfortable shoes, a hat, swimwear (for water activities), and a camera. All necessary equipment is provided.' },
      { question: 'Can I cancel my booking?', answer: 'Yes, free cancellation is available up to 24 hours before your tour. Full refund guaranteed.' },
      { question: 'Are tours suitable for children?', answer: 'Most tours are family-friendly! Check individual tour pages for age recommendations and child pricing.' },
      { question: 'What payment methods do you accept?', answer: 'We accept all major credit cards, PayPal, and bank transfers. Payment is secure and encrypted.' },
    ],
  },
  promoBar: {
    enabled: true,
    text: '🌊 SUMMER SPECIAL: Book 2 tours and get 15% OFF! Use code SUMMER15',
    link: '/tours',
    backgroundColor: '#0891B2',
    textColor: '#FFFFFF',
    dismissible: true,
  },
  isActive: true,
  isDefault: false,
  websiteStatus: 'active' as const,
};

// 2. CAIRO EXCURSIONS ONLINE
// Theme: Ancient Egyptian luxury - Amber/Gold, royal feel
const cairoExcursionsOnline = {
  tenantId: 'cairo-excursions-online',
  name: 'Cairo Excursions Online',
  slug: 'cairo-excursions-online',
  domain: 'cairoexcursionsonline.com',
  domains: ['cairoexcursionsonline.com', 'www.cairoexcursionsonline.com'],
  branding: {
    logo: '/tenants/cairo-excursions-online/logo.png',
    logoDark: '/tenants/cairo-excursions-online/logo.png',
    logoAlt: 'Cairo Excursions Online',
    favicon: '/tenants/cairo-excursions-online/favicon.ico',
    primaryColor: '#B45309',      // Amber-700 (Golden)
    secondaryColor: '#78350F',    // Amber-900 (Deep bronze)
    accentColor: '#F59E0B',       // Amber-500 (Bright gold)
    backgroundColor: '#FFFBEB',   // Warm white
    textColor: '#1C1917',
    fontFamily: 'Playfair Display',
    fontFamilyHeading: 'Cinzel',
    borderRadius: '8px',
  },
  theme: {
    themeId: 'ancient-gold',
    themeName: 'Ancient Gold',
    colors: {
      primary: '#B45309',
      primaryHover: '#92400E',
      primaryLight: '#FEF3C7',
      secondary: '#78350F',
      secondaryHover: '#451A03',
      accent: '#F59E0B',
      accentHover: '#D97706',
      success: '#059669',
      warning: '#D97706',
      error: '#DC2626',
      info: '#2563EB',
      background: '#FFFBEB',
      backgroundAlt: '#FEF3C7',
      surface: '#FFFFFF',
      surfaceHover: '#FFFBEB',
      text: '#1C1917',
      textMuted: '#57534E',
      textInverse: '#FFFFFF',
      border: '#E7E5E4',
      borderHover: '#D6D3D1',
      divider: '#E7E5E4',
      rating: '#F59E0B',
    },
    gradients: {
      primary: 'linear-gradient(135deg, #B45309 0%, #D97706 100%)',
      secondary: 'linear-gradient(135deg, #78350F 0%, #92400E 100%)',
      hero: 'linear-gradient(180deg, rgba(120,53,15,0.85) 0%, rgba(180,83,9,0.5) 100%)',
      card: 'linear-gradient(180deg, #FEF3C7 0%, #FFFFFF 100%)',
      button: 'linear-gradient(135deg, #B45309 0%, #92400E 100%)',
      overlay: 'linear-gradient(180deg, rgba(28,25,23,0.7) 0%, rgba(28,25,23,0.3) 100%)',
    },
    shadows: {
      sm: '0 1px 2px 0 rgba(180, 83, 9, 0.05)',
      md: '0 4px 6px -1px rgba(180, 83, 9, 0.1)',
      lg: '0 10px 15px -3px rgba(180, 83, 9, 0.1)',
      xl: '0 20px 25px -5px rgba(180, 83, 9, 0.1)',
      primary: '0 4px 14px 0 rgba(180, 83, 9, 0.35)',
      card: '0 4px 20px rgba(180, 83, 9, 0.12)',
      button: '0 4px 14px 0 rgba(180, 83, 9, 0.4)',
      dropdown: '0 10px 40px rgba(180, 83, 9, 0.15)',
    },
    typography: {
      fontFamily: 'Playfair Display, serif',
      fontFamilyHeading: 'Cinzel, serif',
      fontFamilyMono: 'Fira Code, monospace',
      baseFontSize: '16px',
      lineHeight: '1.7',
      headingLineHeight: '1.15',
      fontWeightNormal: 400,
      fontWeightMedium: 500,
      fontWeightSemibold: 600,
      fontWeightBold: 700,
      letterSpacing: '0.01em',
      headingLetterSpacing: '0.05em',
    },
    layout: {
      borderRadius: '8px',
      borderRadiusSm: '4px',
      borderRadiusLg: '12px',
      borderRadiusXl: '16px',
      borderRadiusFull: '9999px',
      containerMaxWidth: '1280px',
      headerHeight: '80px',
      footerStyle: 'expanded' as const,
    },
    components: {
      header: {
        background: 'rgba(255, 251, 235, 0.95)',
        backgroundScrolled: 'rgba(255, 255, 255, 0.98)',
        textColor: '#1C1917',
        style: 'solid' as const,
        position: 'sticky' as const,
        blur: true,
      },
      footer: {
        background: '#78350F',
        textColor: '#FEF3C7',
        style: 'dark' as const,
      },
      buttons: {
        style: 'rounded' as const,
        primaryBg: '#B45309',
        primaryText: '#FFFFFF',
        primaryHoverBg: '#92400E',
        secondaryBg: '#78350F',
        secondaryText: '#FFFFFF',
        outlineBorderColor: '#B45309',
      },
      cards: {
        style: 'elevated' as const,
        background: '#FFFFFF',
        hoverTransform: 'translateY(-4px)',
        imageBorderRadius: '8px',
      },
      badges: {
        background: '#B45309',
        textColor: '#FFFFFF',
        style: 'rounded' as const,
      },
      inputs: {
        background: '#FFFFFF',
        borderColor: '#E7E5E4',
        focusBorderColor: '#B45309',
        style: 'outlined' as const,
      },
    },
    animations: {
      enabled: true,
      duration: '250ms',
      durationFast: '150ms',
      durationSlow: '400ms',
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      hoverScale: '1.02',
    },
    darkMode: {
      enabled: false,
    },
  },
  seo: {
    defaultTitle: 'Cairo Excursions Online - Pyramids & Ancient Egypt Tours',
    titleSuffix: 'Cairo Excursions',
    defaultDescription: 'Explore the wonders of ancient Egypt with Cairo Excursions Online. Visit the Pyramids of Giza, Egyptian Museum, Luxor, Alexandria and more. Expert Egyptologist guides.',
    defaultKeywords: [
      'cairo excursions',
      'pyramids tour',
      'giza pyramids',
      'egyptian museum',
      'cairo day trips',
      'luxor from cairo',
      'alexandria tour',
      'ancient egypt tours',
      'cairo sightseeing',
      'sphinx tour',
    ],
    ogImage: generatePlaceholderOgImage('Cairo+Excursions', 'B45309', 'Ancient+Wonders'),
    ogType: 'website',
    structuredDataType: 'TravelAgency',
  },
  contact: {
    email: 'info@cairoexcursionsonline.com',
    supportEmail: 'support@cairoexcursionsonline.com',
    phone: '+20 100 000 0002',
    whatsapp: '+20 100 000 0002',
    address: 'Tahrir Square, Downtown',
    city: 'Cairo',
    country: 'Egypt',
    postalCode: '11511',
    businessHours: '24/7 Support Available',
  },
  socialLinks: {
    facebook: 'https://facebook.com/cairoexcursionsonline',
    instagram: 'https://instagram.com/cairoexcursionsonline',
    youtube: 'https://youtube.com/@cairoexcursionsonline',
    tiktok: 'https://tiktok.com/@cairoexcursionsonline',
    tripadvisor: 'https://tripadvisor.com/cairoexcursionsonline',
  },
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
    enablePromoBar: true,
    enableHotelPickup: true,
    enableGiftCards: false,
  },
  payments: {
    currency: 'USD',
    currencySymbol: '$',
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'EGP'],
    supportedPaymentMethods: ['card', 'paypal', 'bank'],
    taxRate: 0,
    serviceFeePercent: 0,
    minBookingAmount: 0,
    maxBookingAmount: 50000,
  },
  email: {
    fromName: 'Cairo Excursions Online',
    fromEmail: 'noreply@cairoexcursionsonline.com',
    replyToEmail: 'info@cairoexcursionsonline.com',
    emailTemplateTheme: 'ancient',
  },
  localization: {
    defaultLanguage: 'en',
    supportedLanguages: ['en', 'de', 'fr', 'es', 'it', 'ar', 'ru', 'zh'],
    defaultTimezone: 'Africa/Cairo',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
  },
  homepage: {
    heroType: 'slider' as const,
    heroTitle: 'Journey Through 5000 Years of History',
    heroSubtitle: 'Walk in the footsteps of pharaohs and discover the timeless wonders of Ancient Egypt',
    heroImages: [
      'https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=1920',
      'https://images.unsplash.com/photo-1553913861-c0fddf2619ee?w=1920',
      'https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=1920',
    ],
    showDestinations: true,
    showCategories: true,
    showFeaturedTours: true,
    showPopularInterests: true,
    showDayTrips: true,
    showReviews: true,
    showFAQ: true,
    showAboutUs: true,
    showPromoSection: true,
    featuredToursCount: 8,
  },
  integrations: {
    algoliaIndexPrefix: 'cairo_excursions_',
    cloudinaryFolder: 'cairo-excursions-online',
  },
  customContent: {
    aboutUsContent: `
      <h2>Cairo Excursions Online - Your Gateway to Ancient Egypt</h2>
      <p>Step into a world where history comes alive. Cairo Excursions Online is your premier partner for exploring the magnificent treasures of Egypt, from the iconic Pyramids of Giza to the mystical temples of Luxor.</p>
      <p>Our team of certified Egyptologist guides brings thousands of years of history to life, sharing stories and secrets that make each tour an unforgettable journey through time.</p>
      <h3>Experience the Difference</h3>
      <ul>
        <li>🏛️ Certified Egyptologist guides</li>
        <li>👑 VIP access to archaeological sites</li>
        <li>🚗 Luxury air-conditioned transport</li>
        <li>📸 Professional photography included</li>
        <li>🍽️ Authentic Egyptian cuisine experiences</li>
        <li>🎫 Skip-the-line tickets at all sites</li>
      </ul>
    `,
    faqContent: [
      { question: 'How long is the Pyramids tour?', answer: 'Our standard Pyramids & Sphinx tour is a full day (8-9 hours). We also offer half-day options and extended tours including the Egyptian Museum.' },
      { question: 'Is lunch included?', answer: 'Yes! All full-day tours include a delicious lunch at a local restaurant with vegetarian options available.' },
      { question: 'Can I enter the Pyramids?', answer: 'Yes, you can enter the Great Pyramid or one of the smaller pyramids for an additional fee (paid on-site). We recommend booking early morning tours to avoid crowds.' },
      { question: 'What about dress code?', answer: 'Comfortable, modest clothing is recommended. For mosque visits, women should bring a scarf. Comfortable walking shoes are essential.' },
      { question: 'Are private tours available?', answer: 'Absolutely! We offer private tours with your own guide and vehicle. Perfect for families, couples, or groups wanting a personalized experience.' },
    ],
  },
  promoBar: {
    enabled: true,
    text: '👑 EXCLUSIVE: Private Pyramids tour at sunrise - Limited spots available!',
    link: '/tours/pyramids-sunrise-private',
    backgroundColor: '#B45309',
    textColor: '#FFFFFF',
    dismissible: true,
  },
  isActive: true,
  isDefault: false,
  websiteStatus: 'active' as const,
};

// 3. MAKADI BAY EXCURSIONS
// Theme: Resort/Tropical paradise - Teal, relaxation
const makadiBayExcursions = {
  tenantId: 'makadi-bay',
  name: 'Makadi Bay Excursions',
  slug: 'makadi-bay',
  domain: 'makadibayexcursions.com',
  domains: ['makadibayexcursions.com', 'www.makadibayexcursions.com'],
  branding: {
    logo: '/tenants/makadi-bay/logo.png',
    logoDark: '/tenants/makadi-bay/logo.png',
    logoAlt: 'Makadi Bay Excursions',
    favicon: '/tenants/makadi-bay/favicon.ico',
    primaryColor: '#0D9488',      // Teal-600 (Tropical)
    secondaryColor: '#134E4A',    // Teal-900 (Deep lagoon)
    accentColor: '#2DD4BF',       // Teal-400 (Bright aqua)
    backgroundColor: '#F0FDFA',   // Soft teal tint
    textColor: '#0F172A',
    fontFamily: 'DM Sans',
    fontFamilyHeading: 'Outfit',
    borderRadius: '16px',
  },
  theme: {
    themeId: 'tropical-paradise',
    themeName: 'Tropical Paradise',
    colors: {
      primary: '#0D9488',
      primaryHover: '#0F766E',
      primaryLight: '#CCFBF1',
      secondary: '#134E4A',
      secondaryHover: '#115E59',
      accent: '#2DD4BF',
      accentHover: '#14B8A6',
      success: '#10B981',
      warning: '#FBBF24',
      error: '#F43F5E',
      info: '#0EA5E9',
      background: '#F0FDFA',
      backgroundAlt: '#CCFBF1',
      surface: '#FFFFFF',
      surfaceHover: '#F0FDFA',
      text: '#0F172A',
      textMuted: '#64748B',
      textInverse: '#FFFFFF',
      border: '#99F6E4',
      borderHover: '#5EEAD4',
      divider: '#99F6E4',
      rating: '#FBBF24',
    },
    gradients: {
      primary: 'linear-gradient(135deg, #0D9488 0%, #14B8A6 100%)',
      secondary: 'linear-gradient(135deg, #134E4A 0%, #0F766E 100%)',
      hero: 'linear-gradient(180deg, rgba(13,148,136,0.75) 0%, rgba(45,212,191,0.3) 100%)',
      card: 'linear-gradient(180deg, #CCFBF1 0%, #FFFFFF 100%)',
      button: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
      overlay: 'linear-gradient(180deg, rgba(15,23,42,0.6) 0%, rgba(15,23,42,0.2) 100%)',
    },
    shadows: {
      sm: '0 1px 2px 0 rgba(13, 148, 136, 0.05)',
      md: '0 4px 6px -1px rgba(13, 148, 136, 0.1)',
      lg: '0 10px 15px -3px rgba(13, 148, 136, 0.1)',
      xl: '0 20px 25px -5px rgba(13, 148, 136, 0.1)',
      primary: '0 4px 14px 0 rgba(13, 148, 136, 0.35)',
      card: '0 4px 20px rgba(13, 148, 136, 0.12)',
      button: '0 4px 14px 0 rgba(13, 148, 136, 0.4)',
      dropdown: '0 10px 40px rgba(13, 148, 136, 0.15)',
    },
    typography: {
      fontFamily: 'DM Sans, sans-serif',
      fontFamilyHeading: 'Outfit, sans-serif',
      fontFamilyMono: 'JetBrains Mono, monospace',
      baseFontSize: '16px',
      lineHeight: '1.6',
      headingLineHeight: '1.2',
      fontWeightNormal: 400,
      fontWeightMedium: 500,
      fontWeightSemibold: 600,
      fontWeightBold: 700,
      letterSpacing: '0',
      headingLetterSpacing: '-0.01em',
    },
    layout: {
      borderRadius: '16px',
      borderRadiusSm: '8px',
      borderRadiusLg: '20px',
      borderRadiusXl: '28px',
      borderRadiusFull: '9999px',
      containerMaxWidth: '1280px',
      headerHeight: '72px',
      footerStyle: 'standard' as const,
    },
    components: {
      header: {
        background: 'rgba(240, 253, 250, 0.9)',
        backgroundScrolled: 'rgba(255, 255, 255, 0.95)',
        textColor: '#0F172A',
        style: 'solid' as const,
        position: 'sticky' as const,
        blur: true,
      },
      footer: {
        background: '#134E4A',
        textColor: '#CCFBF1',
        style: 'dark' as const,
      },
      buttons: {
        style: 'pill' as const,
        primaryBg: '#0D9488',
        primaryText: '#FFFFFF',
        primaryHoverBg: '#0F766E',
        secondaryBg: '#134E4A',
        secondaryText: '#FFFFFF',
        outlineBorderColor: '#0D9488',
      },
      cards: {
        style: 'elevated' as const,
        background: '#FFFFFF',
        hoverTransform: 'translateY(-8px)',
        imageBorderRadius: '16px',
      },
      badges: {
        background: '#0D9488',
        textColor: '#FFFFFF',
        style: 'pill' as const,
      },
      inputs: {
        background: '#FFFFFF',
        borderColor: '#99F6E4',
        focusBorderColor: '#0D9488',
        style: 'outlined' as const,
      },
    },
    animations: {
      enabled: true,
      duration: '200ms',
      durationFast: '150ms',
      durationSlow: '350ms',
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      hoverScale: '1.04',
    },
    darkMode: {
      enabled: false,
    },
  },
  seo: {
    defaultTitle: 'Makadi Bay Excursions - Red Sea Resort Tours & Activities',
    titleSuffix: 'Makadi Bay Excursions',
    defaultDescription: 'Discover the best excursions from Makadi Bay resort. Snorkeling, diving, desert safaris, Luxor day trips and more. Your perfect Red Sea holiday starts here!',
    defaultKeywords: [
      'makadi bay excursions',
      'makadi bay tours',
      'makadi bay snorkeling',
      'makadi bay activities',
      'red sea resort tours',
      'makadi bay diving',
      'luxor from makadi bay',
      'makadi bay day trips',
      'makadi bay safari',
      'makadi bay boat trips',
    ],
    ogImage: generatePlaceholderOgImage('Makadi+Bay', '0D9488', 'Resort+Paradise'),
    ogType: 'website',
    structuredDataType: 'TravelAgency',
  },
  contact: {
    email: 'info@makadibayexcursions.com',
    supportEmail: 'support@makadibayexcursions.com',
    phone: '+20 100 000 0003',
    whatsapp: '+20 100 000 0003',
    address: 'Makadi Bay Resort Area',
    city: 'Makadi Bay',
    country: 'Egypt',
    postalCode: '84511',
    businessHours: '8:00 AM - 10:00 PM (Egypt Time)',
  },
  socialLinks: {
    facebook: 'https://facebook.com/makadibayexcursions',
    instagram: 'https://instagram.com/makadibayexcursions',
    youtube: 'https://youtube.com/@makadibayexcursions',
    tripadvisor: 'https://tripadvisor.com/makadibayexcursions',
  },
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
    enablePromoBar: true,
    enableHotelPickup: true,
    enableGiftCards: false,
  },
  payments: {
    currency: 'USD',
    currencySymbol: '$',
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'EGP'],
    supportedPaymentMethods: ['card', 'paypal', 'bank'],
    taxRate: 0,
    serviceFeePercent: 0,
    minBookingAmount: 0,
    maxBookingAmount: 50000,
  },
  email: {
    fromName: 'Makadi Bay Excursions',
    fromEmail: 'noreply@makadibayexcursions.com',
    replyToEmail: 'info@makadibayexcursions.com',
    emailTemplateTheme: 'tropical',
  },
  localization: {
    defaultLanguage: 'en',
    supportedLanguages: ['en', 'de', 'ru', 'pl', 'cz'],
    defaultTimezone: 'Africa/Cairo',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
  },
  homepage: {
    heroType: 'slider' as const,
    heroTitle: 'Your Makadi Bay Adventure Awaits',
    heroSubtitle: 'From pristine beaches to ancient wonders - make the most of your Red Sea resort holiday',
    heroImages: [
      'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1920',
      'https://images.unsplash.com/photo-1559827291-72ee739d0d9a?w=1920',
      'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1920',
    ],
    showDestinations: false,
    showCategories: true,
    showFeaturedTours: true,
    showPopularInterests: true,
    showDayTrips: true,
    showReviews: true,
    showFAQ: true,
    showAboutUs: true,
    showPromoSection: true,
    featuredToursCount: 6,
  },
  integrations: {
    algoliaIndexPrefix: 'makadi_bay_',
    cloudinaryFolder: 'makadi-bay-excursions',
  },
  customContent: {
    aboutUsContent: `
      <h2>Welcome to Makadi Bay Excursions</h2>
      <p>Your one-stop destination for unforgettable experiences during your Makadi Bay holiday! We specialize in curating the perfect excursions for resort guests who want to explore beyond the beach.</p>
      <p>Whether you dream of swimming with dolphins, exploring ancient temples, or riding camels through the desert at sunset, we make it happen with ease and comfort.</p>
      <h3>Resort Guest Benefits</h3>
      <ul>
        <li>🏨 Direct hotel pickup from ALL Makadi Bay resorts</li>
        <li>⏰ Flexible scheduling around your resort activities</li>
        <li>👨‍👩‍👧‍👦 Family-friendly tours designed for all ages</li>
        <li>🌡️ Air-conditioned vehicles for comfort</li>
        <li>📱 Easy WhatsApp booking & support</li>
        <li>💯 100% satisfaction guarantee</li>
      </ul>
    `,
    faqContent: [
      { question: 'Do you pick up from all Makadi Bay hotels?', answer: 'Yes! We provide free pickup and drop-off from every hotel and resort in Makadi Bay, including Jaz, Sunrise, Stella, and all others.' },
      { question: 'How far is Luxor from Makadi Bay?', answer: 'Luxor is approximately 280km (4-hour drive). We offer comfortable day trips with air-conditioned minibuses, or you can choose our domestic flight option.' },
      { question: 'What water activities are available?', answer: 'We offer snorkeling trips, scuba diving (for all levels), glass-bottom boat tours, dolphin watching, semi-submarine rides, and more!' },
      { question: 'Can I book last minute?', answer: 'Yes! We accept bookings up to 12 hours before most tours, subject to availability. For best selection, book 2-3 days ahead.' },
      { question: 'Is insurance included?', answer: 'Yes, all our tours include comprehensive travel insurance for your peace of mind.' },
    ],
  },
  promoBar: {
    enabled: true,
    text: '🌴 RESORT SPECIAL: Book any 3 excursions and save 20%!',
    link: '/tours',
    backgroundColor: '#0D9488',
    textColor: '#FFFFFF',
    dismissible: true,
  },
  isActive: true,
  isDefault: false,
  websiteStatus: 'active' as const,
};

// 4. EL GOUNA EXCURSIONS
// Theme: Modern resort lifestyle - Rose/Coral, vibrant
const elGounaExcursions = {
  tenantId: 'el-gouna',
  name: 'El Gouna Excursions',
  slug: 'el-gouna',
  domain: 'elgounaexcursions.com',
  domains: ['elgounaexcursions.com', 'www.elgounaexcursions.com'],
  branding: {
    logo: '/tenants/el-gouna/logo.png',
    logoDark: '/tenants/el-gouna/logo.png',
    logoAlt: 'El Gouna Excursions',
    favicon: '/tenants/el-gouna/favicon.ico',
    primaryColor: '#E11D48',      // Rose-600 (Coral pink)
    secondaryColor: '#9F1239',    // Rose-800 (Deep rose)
    accentColor: '#FB7185',       // Rose-400 (Soft coral)
    backgroundColor: '#FFF1F2',   // Soft rose tint
    textColor: '#0F172A',
    fontFamily: 'Plus Jakarta Sans',
    fontFamilyHeading: 'Sora',
    borderRadius: '14px',
  },
  theme: {
    themeId: 'modern-coral',
    themeName: 'Modern Coral',
    colors: {
      primary: '#E11D48',
      primaryHover: '#BE123C',
      primaryLight: '#FFE4E6',
      secondary: '#9F1239',
      secondaryHover: '#881337',
      accent: '#FB7185',
      accentHover: '#F43F5E',
      success: '#059669',
      warning: '#F59E0B',
      error: '#DC2626',
      info: '#0EA5E9',
      background: '#FFF1F2',
      backgroundAlt: '#FFE4E6',
      surface: '#FFFFFF',
      surfaceHover: '#FFF1F2',
      text: '#0F172A',
      textMuted: '#64748B',
      textInverse: '#FFFFFF',
      border: '#FECDD3',
      borderHover: '#FDA4AF',
      divider: '#FECDD3',
      rating: '#FBBF24',
    },
    gradients: {
      primary: 'linear-gradient(135deg, #E11D48 0%, #F43F5E 100%)',
      secondary: 'linear-gradient(135deg, #9F1239 0%, #BE123C 100%)',
      hero: 'linear-gradient(180deg, rgba(225,29,72,0.8) 0%, rgba(251,113,133,0.4) 100%)',
      card: 'linear-gradient(180deg, #FFE4E6 0%, #FFFFFF 100%)',
      button: 'linear-gradient(135deg, #E11D48 0%, #BE123C 100%)',
      overlay: 'linear-gradient(180deg, rgba(15,23,42,0.65) 0%, rgba(15,23,42,0.25) 100%)',
    },
    shadows: {
      sm: '0 1px 2px 0 rgba(225, 29, 72, 0.05)',
      md: '0 4px 6px -1px rgba(225, 29, 72, 0.1)',
      lg: '0 10px 15px -3px rgba(225, 29, 72, 0.1)',
      xl: '0 20px 25px -5px rgba(225, 29, 72, 0.1)',
      primary: '0 4px 14px 0 rgba(225, 29, 72, 0.35)',
      card: '0 4px 20px rgba(225, 29, 72, 0.12)',
      button: '0 4px 14px 0 rgba(225, 29, 72, 0.4)',
      dropdown: '0 10px 40px rgba(225, 29, 72, 0.15)',
    },
    typography: {
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontFamilyHeading: 'Sora, sans-serif',
      fontFamilyMono: 'JetBrains Mono, monospace',
      baseFontSize: '16px',
      lineHeight: '1.6',
      headingLineHeight: '1.15',
      fontWeightNormal: 400,
      fontWeightMedium: 500,
      fontWeightSemibold: 600,
      fontWeightBold: 700,
      letterSpacing: '-0.01em',
      headingLetterSpacing: '-0.02em',
    },
    layout: {
      borderRadius: '14px',
      borderRadiusSm: '8px',
      borderRadiusLg: '18px',
      borderRadiusXl: '24px',
      borderRadiusFull: '9999px',
      containerMaxWidth: '1280px',
      headerHeight: '76px',
      footerStyle: 'standard' as const,
    },
    components: {
      header: {
        background: 'rgba(255, 241, 242, 0.92)',
        backgroundScrolled: 'rgba(255, 255, 255, 0.96)',
        textColor: '#0F172A',
        style: 'solid' as const,
        position: 'sticky' as const,
        blur: true,
      },
      footer: {
        background: '#9F1239',
        textColor: '#FFE4E6',
        style: 'dark' as const,
      },
      buttons: {
        style: 'rounded' as const,
        primaryBg: '#E11D48',
        primaryText: '#FFFFFF',
        primaryHoverBg: '#BE123C',
        secondaryBg: '#9F1239',
        secondaryText: '#FFFFFF',
        outlineBorderColor: '#E11D48',
      },
      cards: {
        style: 'elevated' as const,
        background: '#FFFFFF',
        hoverTransform: 'translateY(-6px) scale(1.01)',
        imageBorderRadius: '14px',
      },
      badges: {
        background: '#E11D48',
        textColor: '#FFFFFF',
        style: 'pill' as const,
      },
      inputs: {
        background: '#FFFFFF',
        borderColor: '#FECDD3',
        focusBorderColor: '#E11D48',
        style: 'outlined' as const,
      },
    },
    animations: {
      enabled: true,
      duration: '200ms',
      durationFast: '120ms',
      durationSlow: '300ms',
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      hoverScale: '1.03',
    },
    darkMode: {
      enabled: false,
    },
  },
  seo: {
    defaultTitle: 'El Gouna Excursions - Premium Red Sea Experiences',
    titleSuffix: 'El Gouna Excursions',
    defaultDescription: 'Discover El Gouna\'s finest excursions and activities. From kitesurfing to desert adventures, luxury yacht trips to cultural tours. Your premium Red Sea experience.',
    defaultKeywords: [
      'el gouna excursions',
      'el gouna tours',
      'el gouna activities',
      'el gouna kitesurfing',
      'el gouna diving',
      'el gouna yacht',
      'el gouna desert safari',
      'el gouna day trips',
      'el gouna snorkeling',
      'red sea luxury tours',
    ],
    ogImage: generatePlaceholderOgImage('El+Gouna', 'E11D48', 'Premium+Experiences'),
    ogType: 'website',
    structuredDataType: 'TravelAgency',
  },
  contact: {
    email: 'info@elgounaexcursions.com',
    supportEmail: 'concierge@elgounaexcursions.com',
    phone: '+20 100 000 0004',
    whatsapp: '+20 100 000 0004',
    address: 'Downtown El Gouna, Abu Tig Marina',
    city: 'El Gouna',
    country: 'Egypt',
    postalCode: '84513',
    businessHours: '9:00 AM - 11:00 PM (Egypt Time)',
  },
  socialLinks: {
    facebook: 'https://facebook.com/elgounaexcursions',
    instagram: 'https://instagram.com/elgounaexcursions',
    youtube: 'https://youtube.com/@elgounaexcursions',
    tiktok: 'https://tiktok.com/@elgounaexcursions',
    tripadvisor: 'https://tripadvisor.com/elgounaexcursions',
  },
  features: {
    enableBlog: true,
    enableReviews: true,
    enableWishlist: true,
    enableAISearch: true,
    enableIntercom: false,
    enableMultiCurrency: true,
    enableMultiLanguage: true,
    enableLiveChat: true,
    enableNewsletter: true,
    enablePromoBar: true,
    enableHotelPickup: true,
    enableGiftCards: true,
  },
  payments: {
    currency: 'USD',
    currencySymbol: '$',
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'EGP', 'CHF'],
    supportedPaymentMethods: ['card', 'paypal', 'bank', 'apple_pay', 'google_pay'],
    taxRate: 0,
    serviceFeePercent: 0,
    minBookingAmount: 0,
    maxBookingAmount: 100000,
  },
  email: {
    fromName: 'El Gouna Excursions',
    fromEmail: 'noreply@elgounaexcursions.com',
    replyToEmail: 'info@elgounaexcursions.com',
    emailTemplateTheme: 'modern',
  },
  localization: {
    defaultLanguage: 'en',
    supportedLanguages: ['en', 'de', 'fr', 'it', 'ru', 'ar'],
    defaultTimezone: 'Africa/Cairo',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
  },
  homepage: {
    heroType: 'video' as const,
    heroTitle: 'Experience El Gouna Like Never Before',
    heroSubtitle: 'Where luxury meets adventure on the shores of the Red Sea',
    heroImages: [
      'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=1920',
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920',
      'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1920',
    ],
    showDestinations: false,
    showCategories: true,
    showFeaturedTours: true,
    showPopularInterests: true,
    showDayTrips: true,
    showReviews: true,
    showFAQ: true,
    showAboutUs: true,
    showPromoSection: true,
    featuredToursCount: 8,
  },
  integrations: {
    algoliaIndexPrefix: 'el_gouna_',
    cloudinaryFolder: 'el-gouna-excursions',
  },
  customContent: {
    aboutUsContent: `
      <h2>El Gouna Excursions - Premium Experiences</h2>
      <p>El Gouna is Egypt's premier resort destination, and we're here to help you experience it in style. From adrenaline-pumping watersports to serene sunset cruises, from ancient temples to desert under the stars.</p>
      <p>Our curated collection of experiences caters to the discerning traveler who expects nothing but the best.</p>
      <h3>The El Gouna Difference</h3>
      <ul>
        <li>🛥️ Private yacht charters available</li>
        <li>🪁 Professional kitesurfing instruction</li>
        <li>🍾 VIP & luxury tour options</li>
        <li>🎁 Gift cards for the perfect present</li>
        <li>👔 Concierge-level service</li>
        <li>🌟 Curated premium experiences only</li>
      </ul>
    `,
    faqContent: [
      { question: 'What makes El Gouna excursions different?', answer: 'El Gouna is a premium eco-friendly resort town. Our excursions reflect this with higher quality vehicles, smaller groups, premium guides, and exclusive access options.' },
      { question: 'Do you offer private tours?', answer: 'Absolutely! Most of our tours are available as private experiences. We also offer fully customizable itineraries for special occasions.' },
      { question: 'Is kitesurfing suitable for beginners?', answer: 'Yes! El Gouna is one of the world\'s best spots for learning kitesurfing due to its shallow lagoons and consistent winds. We offer lessons for complete beginners.' },
      { question: 'Can you arrange group events?', answer: 'Yes, we specialize in corporate events, team building activities, and group celebrations. Contact our concierge team for bespoke arrangements.' },
      { question: 'Do you offer gift cards?', answer: 'Yes! Our gift cards make perfect presents for adventure lovers. Available in any amount and valid for 12 months.' },
    ],
  },
  promoBar: {
    enabled: true,
    text: '✨ NEW: Private sunset yacht dinner - Book now for an unforgettable evening!',
    link: '/tours/private-sunset-yacht',
    backgroundColor: '#E11D48',
    textColor: '#FFFFFF',
    dismissible: true,
  },
  isActive: true,
  isDefault: false,
  websiteStatus: 'active' as const,
};

// 5. LUXOR EXCURSIONS
// Theme: Royal/Ancient temples - Purple, majestic
const luxorExcursions = {
  tenantId: 'luxor-excursions',
  name: 'Luxor Excursions',
  slug: 'luxor-excursions',
  domain: 'luxorexcursions.com',
  domains: ['luxorexcursions.com', 'www.luxorexcursions.com'],
  branding: {
    logo: '/tenants/luxor-excursions/logo.png',
    logoDark: '/tenants/luxor-excursions/logo.png',
    logoAlt: 'Luxor Excursions',
    favicon: '/tenants/luxor-excursions/favicon.ico',
    primaryColor: '#7C3AED',      // Violet-600 (Royal purple)
    secondaryColor: '#4C1D95',    // Violet-900 (Deep purple)
    accentColor: '#A78BFA',       // Violet-400 (Soft lavender)
    backgroundColor: '#F5F3FF',   // Soft violet tint
    textColor: '#1E1B4B',
    fontFamily: 'Cormorant Garamond',
    fontFamilyHeading: 'Cinzel Decorative',
    borderRadius: '6px',
  },
  theme: {
    themeId: 'royal-temple',
    themeName: 'Royal Temple',
    colors: {
      primary: '#7C3AED',
      primaryHover: '#6D28D9',
      primaryLight: '#EDE9FE',
      secondary: '#4C1D95',
      secondaryHover: '#5B21B6',
      accent: '#A78BFA',
      accentHover: '#8B5CF6',
      success: '#059669',
      warning: '#D97706',
      error: '#DC2626',
      info: '#2563EB',
      background: '#F5F3FF',
      backgroundAlt: '#EDE9FE',
      surface: '#FFFFFF',
      surfaceHover: '#F5F3FF',
      text: '#1E1B4B',
      textMuted: '#6366F1',
      textInverse: '#FFFFFF',
      border: '#DDD6FE',
      borderHover: '#C4B5FD',
      divider: '#DDD6FE',
      rating: '#FBBF24',
    },
    gradients: {
      primary: 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 100%)',
      secondary: 'linear-gradient(135deg, #4C1D95 0%, #6D28D9 100%)',
      hero: 'linear-gradient(180deg, rgba(76,29,149,0.85) 0%, rgba(124,58,237,0.5) 100%)',
      card: 'linear-gradient(180deg, #EDE9FE 0%, #FFFFFF 100%)',
      button: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
      overlay: 'linear-gradient(180deg, rgba(30,27,75,0.75) 0%, rgba(30,27,75,0.35) 100%)',
    },
    shadows: {
      sm: '0 1px 2px 0 rgba(124, 58, 237, 0.05)',
      md: '0 4px 6px -1px rgba(124, 58, 237, 0.1)',
      lg: '0 10px 15px -3px rgba(124, 58, 237, 0.1)',
      xl: '0 20px 25px -5px rgba(124, 58, 237, 0.1)',
      primary: '0 4px 14px 0 rgba(124, 58, 237, 0.35)',
      card: '0 4px 20px rgba(124, 58, 237, 0.12)',
      button: '0 4px 14px 0 rgba(124, 58, 237, 0.4)',
      dropdown: '0 10px 40px rgba(124, 58, 237, 0.15)',
    },
    typography: {
      fontFamily: 'Cormorant Garamond, serif',
      fontFamilyHeading: 'Cinzel Decorative, serif',
      fontFamilyMono: 'Fira Code, monospace',
      baseFontSize: '17px',
      lineHeight: '1.7',
      headingLineHeight: '1.1',
      fontWeightNormal: 400,
      fontWeightMedium: 500,
      fontWeightSemibold: 600,
      fontWeightBold: 700,
      letterSpacing: '0.01em',
      headingLetterSpacing: '0.1em',
    },
    layout: {
      borderRadius: '6px',
      borderRadiusSm: '4px',
      borderRadiusLg: '10px',
      borderRadiusXl: '14px',
      borderRadiusFull: '9999px',
      containerMaxWidth: '1280px',
      headerHeight: '80px',
      footerStyle: 'expanded' as const,
    },
    components: {
      header: {
        background: 'rgba(245, 243, 255, 0.95)',
        backgroundScrolled: 'rgba(255, 255, 255, 0.98)',
        textColor: '#1E1B4B',
        style: 'solid' as const,
        position: 'sticky' as const,
        blur: true,
      },
      footer: {
        background: '#4C1D95',
        textColor: '#EDE9FE',
        style: 'dark' as const,
      },
      buttons: {
        style: 'rounded' as const,
        primaryBg: '#7C3AED',
        primaryText: '#FFFFFF',
        primaryHoverBg: '#6D28D9',
        secondaryBg: '#4C1D95',
        secondaryText: '#FFFFFF',
        outlineBorderColor: '#7C3AED',
      },
      cards: {
        style: 'bordered' as const,
        background: '#FFFFFF',
        hoverTransform: 'translateY(-4px)',
        imageBorderRadius: '6px',
      },
      badges: {
        background: '#7C3AED',
        textColor: '#FFFFFF',
        style: 'rounded' as const,
      },
      inputs: {
        background: '#FFFFFF',
        borderColor: '#DDD6FE',
        focusBorderColor: '#7C3AED',
        style: 'outlined' as const,
      },
    },
    animations: {
      enabled: true,
      duration: '250ms',
      durationFast: '150ms',
      durationSlow: '400ms',
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      hoverScale: '1.02',
    },
    darkMode: {
      enabled: false,
    },
  },
  seo: {
    defaultTitle: 'Luxor Excursions - Valley of the Kings & Ancient Temples',
    titleSuffix: 'Luxor Excursions',
    defaultDescription: 'Explore the world\'s greatest open-air museum. Visit the Valley of the Kings, Karnak Temple, Queen Hatshepsut Temple and more with expert Egyptologist guides.',
    defaultKeywords: [
      'luxor excursions',
      'valley of the kings',
      'karnak temple',
      'luxor tours',
      'hatshepsut temple',
      'luxor day trips',
      'nile cruise luxor',
      'hot air balloon luxor',
      'luxor west bank',
      'ancient egypt tours',
    ],
    ogImage: generatePlaceholderOgImage('Luxor+Excursions', '7C3AED', 'Ancient+Temples'),
    ogType: 'website',
    structuredDataType: 'TravelAgency',
  },
  contact: {
    email: 'info@luxorexcursions.com',
    supportEmail: 'support@luxorexcursions.com',
    phone: '+20 100 000 0005',
    whatsapp: '+20 100 000 0005',
    address: 'Corniche El Nile, East Bank',
    city: 'Luxor',
    country: 'Egypt',
    postalCode: '85951',
    businessHours: '6:00 AM - 10:00 PM (Egypt Time)',
  },
  socialLinks: {
    facebook: 'https://facebook.com/luxorexcursions',
    instagram: 'https://instagram.com/luxorexcursions',
    youtube: 'https://youtube.com/@luxorexcursions',
    tripadvisor: 'https://tripadvisor.com/luxorexcursions',
  },
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
    enablePromoBar: true,
    enableHotelPickup: true,
    enableGiftCards: false,
  },
  payments: {
    currency: 'USD',
    currencySymbol: '$',
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'EGP'],
    supportedPaymentMethods: ['card', 'paypal', 'bank'],
    taxRate: 0,
    serviceFeePercent: 0,
    minBookingAmount: 0,
    maxBookingAmount: 50000,
  },
  email: {
    fromName: 'Luxor Excursions',
    fromEmail: 'noreply@luxorexcursions.com',
    replyToEmail: 'info@luxorexcursions.com',
    emailTemplateTheme: 'royal',
  },
  localization: {
    defaultLanguage: 'en',
    supportedLanguages: ['en', 'de', 'fr', 'es', 'it', 'ar', 'ru', 'ja', 'zh'],
    defaultTimezone: 'Africa/Cairo',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
  },
  homepage: {
    heroType: 'slider' as const,
    heroTitle: 'Walk Among the Gods',
    heroSubtitle: 'Discover Luxor - the world\'s greatest open-air museum and gateway to Ancient Egypt\'s most magnificent treasures',
    heroImages: [
      'https://images.unsplash.com/photo-1568322445389-f64ac2515020?w=1920',
      'https://images.unsplash.com/photo-1595981234058-a9302fb97229?w=1920',
      'https://images.unsplash.com/photo-1565108941489-e2d8f69f15d8?w=1920',
    ],
    showDestinations: false,
    showCategories: true,
    showFeaturedTours: true,
    showPopularInterests: true,
    showDayTrips: true,
    showReviews: true,
    showFAQ: true,
    showAboutUs: true,
    showPromoSection: true,
    featuredToursCount: 8,
  },
  integrations: {
    algoliaIndexPrefix: 'luxor_excursions_',
    cloudinaryFolder: 'luxor-excursions',
  },
  customContent: {
    aboutUsContent: `
      <h2>Luxor Excursions - Gateway to Ancient Egypt</h2>
      <p>Welcome to Luxor, the ancient city of Thebes, where every stone tells a story of pharaohs, gods, and the magnificent civilization that built the greatest monuments on Earth.</p>
      <p>Our team of certified Egyptologist guides are passionate storytellers who bring these ancient wonders to life, revealing secrets and legends that have fascinated travelers for millennia.</p>
      <h3>Discover the Magic</h3>
      <ul>
        <li>🏛️ Valley of the Kings - Royal tomb exploration</li>
        <li>🎈 Hot air balloon rides at sunrise</li>
        <li>⛵ Traditional felucca Nile cruises</li>
        <li>🌅 Sound & Light shows at Karnak</li>
        <li>📜 Private Egyptologist-led tours</li>
        <li>👑 VIP tomb access (limited availability)</li>
      </ul>
    `,
    faqContent: [
      { question: 'What is the best time to visit Luxor?', answer: 'October to April offers the most comfortable weather (20-30°C). Summer months are very hot (40°C+) but have fewer crowds. Early morning tours are essential in summer.' },
      { question: 'How long do I need in Luxor?', answer: 'Minimum 2 full days to see the highlights. 3-4 days allows for a more relaxed pace and inclusion of a Nile cruise or hot air balloon.' },
      { question: 'Is the hot air balloon safe?', answer: 'Yes! We only partner with safety-certified operators. Flights are at sunrise when conditions are calmest. The experience is magical and highly recommended.' },
      { question: 'Can I enter the tombs in the Valley of the Kings?', answer: 'Your ticket includes entry to 3 tombs. Popular tombs like Tutankhamun\'s and Seti I\'s require additional tickets (purchased on-site or pre-booked through us).' },
      { question: 'Do you offer multi-day Nile cruises?', answer: 'Yes! We offer 3-7 day cruises between Luxor and Aswan on luxury vessels. A fantastic way to see temples along the Nile.' },
    ],
  },
  promoBar: {
    enabled: true,
    text: '🎈 MAGICAL: Sunrise hot air balloon over the Valley of the Kings - Limited spots!',
    link: '/tours/hot-air-balloon-luxor',
    backgroundColor: '#7C3AED',
    textColor: '#FFFFFF',
    dismissible: true,
  },
  isActive: true,
  isDefault: false,
  websiteStatus: 'active' as const,
};

// 6. SHARM EXCURSIONS ONLINE
// Theme: Red Sea diving/marine - Blue, underwater world
const sharmExcursionsOnline = {
  tenantId: 'sharm-excursions-online',
  name: 'Sharm Excursions Online',
  slug: 'sharm-excursions-online',
  domain: 'sharmexcursionsonline.com',
  domains: ['sharmexcursionsonline.com', 'www.sharmexcursionsonline.com'],
  branding: {
    logo: '/tenants/sharm-excursions-online/logo.png',
    logoDark: '/tenants/sharm-excursions-online/logo.png',
    logoAlt: 'Sharm Excursions Online',
    favicon: '/tenants/sharm-excursions-online/favicon.ico',
    primaryColor: '#2563EB',      // Blue-600 (Deep sea)
    secondaryColor: '#1E3A8A',    // Blue-900 (Navy)
    accentColor: '#60A5FA',       // Blue-400 (Light sea)
    backgroundColor: '#EFF6FF',   // Soft blue tint
    textColor: '#0F172A',
    fontFamily: 'Nunito',
    fontFamilyHeading: 'Righteous',
    borderRadius: '10px',
  },
  theme: {
    themeId: 'deep-sea',
    themeName: 'Deep Sea',
    colors: {
      primary: '#2563EB',
      primaryHover: '#1D4ED8',
      primaryLight: '#DBEAFE',
      secondary: '#1E3A8A',
      secondaryHover: '#1E40AF',
      accent: '#60A5FA',
      accentHover: '#3B82F6',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#0EA5E9',
      background: '#EFF6FF',
      backgroundAlt: '#DBEAFE',
      surface: '#FFFFFF',
      surfaceHover: '#EFF6FF',
      text: '#0F172A',
      textMuted: '#64748B',
      textInverse: '#FFFFFF',
      border: '#BFDBFE',
      borderHover: '#93C5FD',
      divider: '#BFDBFE',
      rating: '#FBBF24',
    },
    gradients: {
      primary: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
      secondary: 'linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 100%)',
      hero: 'linear-gradient(180deg, rgba(30,58,138,0.8) 0%, rgba(37,99,235,0.4) 100%)',
      card: 'linear-gradient(180deg, #DBEAFE 0%, #FFFFFF 100%)',
      button: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
      overlay: 'linear-gradient(180deg, rgba(15,23,42,0.6) 0%, rgba(15,23,42,0.2) 100%)',
    },
    shadows: {
      sm: '0 1px 2px 0 rgba(37, 99, 235, 0.05)',
      md: '0 4px 6px -1px rgba(37, 99, 235, 0.1)',
      lg: '0 10px 15px -3px rgba(37, 99, 235, 0.1)',
      xl: '0 20px 25px -5px rgba(37, 99, 235, 0.1)',
      primary: '0 4px 14px 0 rgba(37, 99, 235, 0.35)',
      card: '0 4px 20px rgba(37, 99, 235, 0.12)',
      button: '0 4px 14px 0 rgba(37, 99, 235, 0.4)',
      dropdown: '0 10px 40px rgba(37, 99, 235, 0.15)',
    },
    typography: {
      fontFamily: 'Nunito, sans-serif',
      fontFamilyHeading: 'Righteous, cursive',
      fontFamilyMono: 'JetBrains Mono, monospace',
      baseFontSize: '16px',
      lineHeight: '1.6',
      headingLineHeight: '1.2',
      fontWeightNormal: 400,
      fontWeightMedium: 600,
      fontWeightSemibold: 700,
      fontWeightBold: 800,
      letterSpacing: '0',
      headingLetterSpacing: '0.02em',
    },
    layout: {
      borderRadius: '10px',
      borderRadiusSm: '6px',
      borderRadiusLg: '14px',
      borderRadiusXl: '20px',
      borderRadiusFull: '9999px',
      containerMaxWidth: '1280px',
      headerHeight: '72px',
      footerStyle: 'standard' as const,
    },
    components: {
      header: {
        background: 'rgba(239, 246, 255, 0.92)',
        backgroundScrolled: 'rgba(255, 255, 255, 0.96)',
        textColor: '#0F172A',
        style: 'solid' as const,
        position: 'sticky' as const,
        blur: true,
      },
      footer: {
        background: '#1E3A8A',
        textColor: '#DBEAFE',
        style: 'dark' as const,
      },
      buttons: {
        style: 'rounded' as const,
        primaryBg: '#2563EB',
        primaryText: '#FFFFFF',
        primaryHoverBg: '#1D4ED8',
        secondaryBg: '#1E3A8A',
        secondaryText: '#FFFFFF',
        outlineBorderColor: '#2563EB',
      },
      cards: {
        style: 'elevated' as const,
        background: '#FFFFFF',
        hoverTransform: 'translateY(-6px)',
        imageBorderRadius: '10px',
      },
      badges: {
        background: '#2563EB',
        textColor: '#FFFFFF',
        style: 'pill' as const,
      },
      inputs: {
        background: '#FFFFFF',
        borderColor: '#BFDBFE',
        focusBorderColor: '#2563EB',
        style: 'outlined' as const,
      },
    },
    animations: {
      enabled: true,
      duration: '200ms',
      durationFast: '150ms',
      durationSlow: '300ms',
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      hoverScale: '1.03',
    },
    darkMode: {
      enabled: false,
    },
  },
  seo: {
    defaultTitle: 'Sharm Excursions Online - Red Sea Diving & Adventures',
    titleSuffix: 'Sharm Excursions',
    defaultDescription: 'Discover world-class diving in Sharm El Sheikh! Ras Mohammed, Tiran Island, Blue Hole and more. Plus desert safaris, quad biking, and cultural tours.',
    defaultKeywords: [
      'sharm el sheikh excursions',
      'sharm diving',
      'ras mohammed',
      'tiran island',
      'blue hole dahab',
      'sharm snorkeling',
      'sharm desert safari',
      'sharm quad biking',
      'sharm boat trips',
      'red sea diving',
    ],
    ogImage: generatePlaceholderOgImage('Sharm+Excursions', '2563EB', 'Diving+Paradise'),
    ogType: 'website',
    structuredDataType: 'TravelAgency',
  },
  contact: {
    email: 'info@sharmexcursionsonline.com',
    supportEmail: 'support@sharmexcursionsonline.com',
    phone: '+20 100 000 0006',
    whatsapp: '+20 100 000 0006',
    address: 'Naama Bay, Sharm El Sheikh',
    city: 'Sharm El Sheikh',
    country: 'Egypt',
    postalCode: '46619',
    businessHours: '24/7 Support Available',
  },
  socialLinks: {
    facebook: 'https://facebook.com/sharmexcursionsonline',
    instagram: 'https://instagram.com/sharmexcursionsonline',
    youtube: 'https://youtube.com/@sharmexcursionsonline',
    tiktok: 'https://tiktok.com/@sharmexcursionsonline',
    tripadvisor: 'https://tripadvisor.com/sharmexcursionsonline',
  },
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
    enablePromoBar: true,
    enableHotelPickup: true,
    enableGiftCards: false,
  },
  payments: {
    currency: 'USD',
    currencySymbol: '$',
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'EGP', 'RUB'],
    supportedPaymentMethods: ['card', 'paypal', 'bank'],
    taxRate: 0,
    serviceFeePercent: 0,
    minBookingAmount: 0,
    maxBookingAmount: 50000,
  },
  email: {
    fromName: 'Sharm Excursions Online',
    fromEmail: 'noreply@sharmexcursionsonline.com',
    replyToEmail: 'info@sharmexcursionsonline.com',
    emailTemplateTheme: 'marine',
  },
  localization: {
    defaultLanguage: 'en',
    supportedLanguages: ['en', 'de', 'ru', 'it', 'fr', 'ar', 'pl'],
    defaultTimezone: 'Africa/Cairo',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
  },
  homepage: {
    heroType: 'video' as const,
    heroTitle: 'Dive Into Paradise',
    heroSubtitle: 'World-class diving, pristine coral reefs, and unforgettable Red Sea adventures await in Sharm El Sheikh',
    heroImages: [
      'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1920',
      'https://images.unsplash.com/photo-1682407186023-12c70a4a35e0?w=1920',
      'https://images.unsplash.com/photo-1559827291-72ee739d0d9a?w=1920',
    ],
    showDestinations: false,
    showCategories: true,
    showFeaturedTours: true,
    showPopularInterests: true,
    showDayTrips: true,
    showReviews: true,
    showFAQ: true,
    showAboutUs: true,
    showPromoSection: true,
    featuredToursCount: 8,
  },
  integrations: {
    algoliaIndexPrefix: 'sharm_excursions_',
    cloudinaryFolder: 'sharm-excursions-online',
  },
  customContent: {
    aboutUsContent: `
      <h2>Sharm Excursions Online - Your Red Sea Adventure Hub</h2>
      <p>Welcome to Sharm El Sheikh, one of the world's premier diving and beach destinations! Our mission is to help you discover the incredible underwater world of the Red Sea and the stunning landscapes of the Sinai Peninsula.</p>
      <p>Whether you're a certified diver looking to explore legendary sites like Ras Mohammed, or a first-timer wanting to try snorkeling, we have the perfect adventure for you.</p>
      <h3>Why Dive With Us?</h3>
      <ul>
        <li>🤿 PADI certified dive centers</li>
        <li>🐠 Access to 30+ world-class dive sites</li>
        <li>🚤 Modern, well-maintained boats</li>
        <li>📸 Underwater photography packages</li>
        <li>🏜️ Quad biking & desert adventures</li>
        <li>🌟 Night diving experiences</li>
      </ul>
    `,
    faqContent: [
      { question: 'Do I need to be certified to dive?', answer: 'No! We offer Discover Scuba Diving for beginners (no certification needed) as well as full PADI certification courses. Snorkeling trips require no experience at all.' },
      { question: 'What is Ras Mohammed famous for?', answer: 'Ras Mohammed National Park is home to some of the Red Sea\'s most spectacular coral reefs and marine life. The wall dives here are world-renowned, with visibility often exceeding 30 meters.' },
      { question: 'Can I do a day trip to the Blue Hole?', answer: 'Yes! The famous Blue Hole in Dahab is about 1.5 hours from Sharm. We offer day trips for both diving and snorkeling, including lunch and free time in Dahab.' },
      { question: 'What marine life will I see?', answer: 'The Red Sea is home to over 1,200 fish species! Common sightings include sea turtles, dolphins, moray eels, rays, Napoleon wrasse, and colorful reef fish. Lucky divers may spot sharks!' },
      { question: 'Are night dives available?', answer: 'Yes! Night diving in Sharm is magical. You\'ll see nocturnal creatures like lionfish, octopus, and sleeping sea turtles. Available for certified divers.' },
    ],
  },
  promoBar: {
    enabled: true,
    text: '🤿 DIVE DEAL: Book 3 dives, get 1 FREE! Perfect for exploring multiple sites.',
    link: '/tours/diving',
    backgroundColor: '#2563EB',
    textColor: '#FFFFFF',
    dismissible: true,
  },
  isActive: true,
  isDefault: false,
  websiteStatus: 'active' as const,
};

// ============================================================================
// 7. ASWAN EXCURSIONS
// Theme: Nubian/Ancient - Warm orange-brown, cultural
// ============================================================================
const aswanExcursions = {
  tenantId: 'aswan-excursions',
  name: 'Aswan Excursions',
  slug: 'aswan-excursions',
  domain: 'aswanexcursions.com',
  domains: ['aswanexcursions.com', 'www.aswanexcursions.com'],
  branding: {
    logo: '/tenants/aswan-excursions/logo.png',
    logoDark: '/tenants/aswan-excursions/logo.png',
    logoAlt: 'Aswan Excursions',
    favicon: '/tenants/aswan-excursions/favicon.ico',
    primaryColor: '#C2410C',       // Orange-700 (Nubian warmth)
    secondaryColor: '#7C2D12',     // Orange-900 (Ancient stone)
    accentColor: '#FB923C',        // Orange-400 (Sunset glow)
    backgroundColor: '#FFF7ED',    // Soft orange tint
    textColor: '#0F172A',
    fontFamily: 'Source Sans Pro',
    fontFamilyHeading: 'Playfair Display',
    borderRadius: '12px',
  },
  theme: {
    themeId: 'nubian-warmth',
    themeName: 'Nubian Warmth',
    colors: {
      primary: '#C2410C',
      primaryHover: '#9A3412',
      primaryLight: '#FFEDD5',
      secondary: '#7C2D12',
      secondaryHover: '#6C2710',
      accent: '#FB923C',
      accentHover: '#F97316',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#0EA5E9',
      background: '#FFF7ED',
      backgroundAlt: '#FFEDD5',
      surface: '#FFFFFF',
      surfaceHover: '#FFF7ED',
      text: '#0F172A',
      textMuted: '#64748B',
      textInverse: '#FFFFFF',
      border: '#FED7AA',
      borderHover: '#FDBA74',
      divider: '#FED7AA',
      rating: '#FBBF24',
    },
    gradients: {
      primary: 'linear-gradient(135deg, #C2410C 0%, #EA580C 100%)',
      secondary: 'linear-gradient(135deg, #7C2D12 0%, #9A3412 100%)',
      hero: 'linear-gradient(180deg, rgba(124,45,18,0.8) 0%, rgba(194,65,12,0.4) 100%)',
      card: 'linear-gradient(180deg, #FFEDD5 0%, #FFFFFF 100%)',
      button: 'linear-gradient(135deg, #C2410C 0%, #9A3412 100%)',
      overlay: 'linear-gradient(180deg, rgba(15,23,42,0.6) 0%, rgba(15,23,42,0.2) 100%)',
    },
    shadows: {
      sm: '0 1px 2px 0 rgba(194, 65, 12, 0.05)',
      md: '0 4px 6px -1px rgba(194, 65, 12, 0.1)',
      lg: '0 10px 15px -3px rgba(194, 65, 12, 0.1)',
      xl: '0 20px 25px -5px rgba(194, 65, 12, 0.1)',
      primary: '0 4px 14px 0 rgba(194, 65, 12, 0.35)',
      card: '0 4px 20px rgba(194, 65, 12, 0.12)',
      button: '0 4px 14px 0 rgba(194, 65, 12, 0.4)',
      dropdown: '0 10px 40px rgba(194, 65, 12, 0.15)',
    },
    typography: {
      fontFamily: 'Source Sans Pro, sans-serif',
      fontFamilyHeading: 'Playfair Display, serif',
      fontFamilyMono: 'JetBrains Mono, monospace',
      baseFontSize: '16px',
      lineHeight: '1.6',
      headingLineHeight: '1.2',
      fontWeightNormal: 400,
      fontWeightMedium: 600,
      fontWeightSemibold: 700,
      fontWeightBold: 800,
      letterSpacing: '0',
      headingLetterSpacing: '0.01em',
    },
    layout: {
      borderRadius: '12px',
      borderRadiusSm: '8px',
      borderRadiusLg: '16px',
      borderRadiusXl: '24px',
      borderRadiusFull: '9999px',
      containerMaxWidth: '1280px',
      headerHeight: '72px',
      footerStyle: 'standard' as const,
    },
    components: {
      header: {
        background: 'rgba(255, 247, 237, 0.92)',
        backgroundScrolled: 'rgba(255, 255, 255, 0.96)',
        textColor: '#0F172A',
        style: 'solid' as const,
        position: 'sticky' as const,
        blur: true,
      },
      footer: {
        background: '#7C2D12',
        textColor: '#FFEDD5',
        style: 'dark' as const,
      },
      buttons: {
        style: 'rounded' as const,
        primaryBg: '#C2410C',
        primaryText: '#FFFFFF',
        primaryHoverBg: '#9A3412',
        secondaryBg: '#7C2D12',
        secondaryText: '#FFFFFF',
        outlineBorderColor: '#C2410C',
      },
      cards: {
        style: 'elevated' as const,
        background: '#FFFFFF',
        hoverTransform: 'translateY(-4px)',
        imageBorderRadius: '12px',
      },
      badges: {
        background: '#C2410C',
        textColor: '#FFFFFF',
        style: 'pill' as const,
      },
      inputs: {
        background: '#FFFFFF',
        borderColor: '#FED7AA',
        focusBorderColor: '#C2410C',
        style: 'outlined' as const,
      },
    },
    animations: {
      enabled: true,
      duration: '200ms',
      durationFast: '150ms',
      durationSlow: '300ms',
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      hoverScale: '1.03',
    },
    darkMode: { enabled: false },
  },
  seo: {
    defaultTitle: 'Aswan Excursions - Nubian Culture & Nile Adventures',
    titleSuffix: 'Aswan Excursions',
    defaultDescription: 'Explore Aswan\'s ancient temples, Nubian villages, and stunning Nile landscapes. Visit Abu Simbel, Philae Temple, felucca rides, and more.',
    defaultKeywords: [
      'aswan excursions', 'abu simbel tour', 'philae temple', 'nubian village',
      'aswan felucca', 'nile cruise aswan', 'aswan day trips', 'high dam aswan',
      'kom ombo temple', 'edfu temple', 'aswan boat trips',
    ],
    ogImage: generatePlaceholderOgImage('Aswan+Excursions', 'C2410C', 'Nubian+Adventures'),
    ogType: 'website',
    structuredDataType: 'TravelAgency',
  },
  contact: {
    email: 'info@aswanexcursions.com',
    supportEmail: 'support@aswanexcursions.com',
    phone: '+20 100 000 0007',
    whatsapp: '+20 100 000 0007',
    address: 'Corniche Road, Aswan',
    city: 'Aswan',
    country: 'Egypt',
    postalCode: '81511',
    businessHours: '24/7 Support Available',
  },
  socialLinks: {
    facebook: 'https://facebook.com/aswanexcursions',
    instagram: 'https://instagram.com/aswanexcursions',
    youtube: 'https://youtube.com/@aswanexcursions',
    tiktok: 'https://tiktok.com/@aswanexcursions',
    tripadvisor: 'https://tripadvisor.com/aswanexcursions',
  },
  features: {
    enableBlog: true, enableReviews: true, enableWishlist: true, enableAISearch: true,
    enableIntercom: false, enableMultiCurrency: true, enableMultiLanguage: true,
    enableLiveChat: false, enableNewsletter: true, enablePromoBar: true,
    enableHotelPickup: true, enableGiftCards: false,
  },
  payments: {
    currency: 'USD', currencySymbol: '$',
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'EGP'],
    supportedPaymentMethods: ['card', 'paypal', 'bank'],
    taxRate: 0, serviceFeePercent: 0, minBookingAmount: 0, maxBookingAmount: 50000,
  },
  email: {
    fromName: 'Aswan Excursions', fromEmail: 'noreply@aswanexcursions.com',
    replyToEmail: 'info@aswanexcursions.com', emailTemplateTheme: 'warm',
  },
  localization: {
    defaultLanguage: 'en', supportedLanguages: ['en', 'de', 'fr', 'it', 'ar'],
    defaultTimezone: 'Africa/Cairo', dateFormat: 'DD/MM/YYYY', timeFormat: 'HH:mm',
  },
  homepage: {
    heroType: 'slider' as const,
    heroTitle: 'Discover Ancient Aswan',
    heroSubtitle: 'Journey through Nubian culture, ancient temples, and breathtaking Nile landscapes',
    heroImages: [
      'https://images.unsplash.com/photo-1568322445389-f64ac2515020?w=1920',
      'https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=1920',
    ],
    showDestinations: true, showCategories: true, showFeaturedTours: true,
    showPopularInterests: true, showDayTrips: true, showReviews: true,
    showFAQ: true, showAboutUs: true, showPromoSection: true, featuredToursCount: 8,
  },
  integrations: { algoliaIndexPrefix: 'aswan_excursions_', cloudinaryFolder: 'aswan-excursions' },
  customContent: {
    aboutUsContent: `
      <h2>Aswan Excursions - Gateway to Nubian Heritage</h2>
      <p>Welcome to Aswan, where the Nile is at its most beautiful and ancient civilizations left their greatest monuments. We specialize in authentic cultural experiences that connect you with the rich Nubian heritage and awe-inspiring ancient temples.</p>
      <p>From the magnificent Abu Simbel to the peaceful felucca rides at sunset, every experience is crafted to make your Aswan journey unforgettable.</p>
      <h3>Our Highlights</h3>
      <ul>
        <li>🏛️ Expert-guided temple tours</li>
        <li>⛵ Traditional felucca Nile cruises</li>
        <li>🏘️ Authentic Nubian village visits</li>
        <li>🌅 Abu Simbel sunrise experiences</li>
        <li>🐪 Desert & camel adventures</li>
        <li>🎶 Nubian music & culture evenings</li>
      </ul>
    `,
    faqContent: [
      { question: 'How do I get to Abu Simbel from Aswan?', answer: 'Abu Simbel is about 280km south of Aswan. We offer comfortable minibus tours departing early morning (3am), arriving for sunrise. Flight options are also available for a shorter trip.' },
      { question: 'What is a felucca ride?', answer: 'A felucca is a traditional Egyptian wooden sailing boat. Sailing on the Nile in Aswan is one of the most peaceful and scenic experiences, especially at sunset around Elephantine Island and the Botanical Garden.' },
      { question: 'Can I visit a Nubian village?', answer: 'Yes! Our Nubian village tours take you across the Nile to authentic villages where you can experience Nubian hospitality, colorful architecture, traditional food, and even hold baby crocodiles!' },
      { question: 'What temples can I visit in Aswan?', answer: 'Key sites include Philae Temple (dedicated to Isis), the Unfinished Obelisk, High Dam, Kom Ombo Temple, and Edfu Temple. Abu Simbel is a must-see day trip.' },
      { question: 'Is Aswan safe for tourists?', answer: 'Aswan is one of the safest cities in Egypt for tourists. It is known for its friendly locals and relaxed atmosphere. Tourist police are present at all major sites.' },
    ],
  },
  promoBar: {
    enabled: true,
    text: '🏛️ ABU SIMBEL SPECIAL: Book Abu Simbel + Philae combo and save 15%!',
    link: '/tours',
    backgroundColor: '#C2410C',
    textColor: '#FFFFFF',
    dismissible: true,
  },
  isActive: true,
  isDefault: false,
  websiteStatus: 'active' as const,
};

// ============================================================================
// 8. MARSA ALAM EXCURSIONS
// Theme: Marine/Eco - Emerald green, pristine reef
// ============================================================================
const marsaAlamExcursions = {
  tenantId: 'marsa-alam-excursions',
  name: 'Marsa Alam Excursions',
  slug: 'marsa-alam-excursions',
  domain: 'marsaalamexcursions.online',
  domains: ['marsaalamexcursions.online', 'www.marsaalamexcursions.online', 'marsaalamexcursions.com', 'www.marsaalamexcursions.com'],
  branding: {
    logo: '/tenants/marsa-alam-excursions/logo.png',
    logoDark: '/tenants/marsa-alam-excursions/logo.png',
    logoAlt: 'Marsa Alam Excursions',
    favicon: '/tenants/marsa-alam-excursions/favicon.ico',
    primaryColor: '#059669',       // Emerald-600 (Marine life)
    secondaryColor: '#064E3B',     // Emerald-900 (Deep reef)
    accentColor: '#34D399',        // Emerald-400 (Bright coral)
    backgroundColor: '#ECFDF5',    // Soft emerald tint
    textColor: '#0F172A',
    fontFamily: 'Lato',
    fontFamilyHeading: 'Josefin Sans',
    borderRadius: '14px',
  },
  theme: {
    themeId: 'reef-emerald',
    themeName: 'Reef Emerald',
    colors: {
      primary: '#059669',
      primaryHover: '#047857',
      primaryLight: '#D1FAE5',
      secondary: '#064E3B',
      secondaryHover: '#065F46',
      accent: '#34D399',
      accentHover: '#10B981',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#0EA5E9',
      background: '#ECFDF5',
      backgroundAlt: '#D1FAE5',
      surface: '#FFFFFF',
      surfaceHover: '#ECFDF5',
      text: '#0F172A',
      textMuted: '#64748B',
      textInverse: '#FFFFFF',
      border: '#A7F3D0',
      borderHover: '#6EE7B7',
      divider: '#A7F3D0',
      rating: '#FBBF24',
    },
    gradients: {
      primary: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
      secondary: 'linear-gradient(135deg, #064E3B 0%, #047857 100%)',
      hero: 'linear-gradient(180deg, rgba(6,78,59,0.8) 0%, rgba(5,150,105,0.4) 100%)',
      card: 'linear-gradient(180deg, #D1FAE5 0%, #FFFFFF 100%)',
      button: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
      overlay: 'linear-gradient(180deg, rgba(15,23,42,0.6) 0%, rgba(15,23,42,0.2) 100%)',
    },
    shadows: {
      sm: '0 1px 2px 0 rgba(5, 150, 105, 0.05)',
      md: '0 4px 6px -1px rgba(5, 150, 105, 0.1)',
      lg: '0 10px 15px -3px rgba(5, 150, 105, 0.1)',
      xl: '0 20px 25px -5px rgba(5, 150, 105, 0.1)',
      primary: '0 4px 14px 0 rgba(5, 150, 105, 0.35)',
      card: '0 4px 20px rgba(5, 150, 105, 0.12)',
      button: '0 4px 14px 0 rgba(5, 150, 105, 0.4)',
      dropdown: '0 10px 40px rgba(5, 150, 105, 0.15)',
    },
    typography: {
      fontFamily: 'Lato, sans-serif',
      fontFamilyHeading: 'Josefin Sans, sans-serif',
      fontFamilyMono: 'JetBrains Mono, monospace',
      baseFontSize: '16px', lineHeight: '1.6', headingLineHeight: '1.2',
      fontWeightNormal: 400, fontWeightMedium: 600, fontWeightSemibold: 700, fontWeightBold: 800,
      letterSpacing: '0', headingLetterSpacing: '0.01em',
    },
    layout: {
      borderRadius: '14px', borderRadiusSm: '8px', borderRadiusLg: '18px',
      borderRadiusXl: '24px', borderRadiusFull: '9999px',
      containerMaxWidth: '1280px', headerHeight: '72px', footerStyle: 'standard' as const,
    },
    components: {
      header: { background: 'rgba(236, 253, 245, 0.92)', backgroundScrolled: 'rgba(255, 255, 255, 0.96)', textColor: '#0F172A', style: 'solid' as const, position: 'sticky' as const, blur: true },
      footer: { background: '#064E3B', textColor: '#D1FAE5', style: 'dark' as const },
      buttons: { style: 'rounded' as const, primaryBg: '#059669', primaryText: '#FFFFFF', primaryHoverBg: '#047857', secondaryBg: '#064E3B', secondaryText: '#FFFFFF', outlineBorderColor: '#059669' },
      cards: { style: 'elevated' as const, background: '#FFFFFF', hoverTransform: 'translateY(-4px)', imageBorderRadius: '14px' },
      badges: { background: '#059669', textColor: '#FFFFFF', style: 'pill' as const },
      inputs: { background: '#FFFFFF', borderColor: '#A7F3D0', focusBorderColor: '#059669', style: 'outlined' as const },
    },
    animations: { enabled: true, duration: '200ms', durationFast: '150ms', durationSlow: '300ms', easing: 'cubic-bezier(0.4, 0, 0.2, 1)', hoverScale: '1.03' },
    darkMode: { enabled: false },
  },
  seo: {
    defaultTitle: 'Marsa Alam Excursions - Pristine Reefs & Dugong Adventures',
    titleSuffix: 'Marsa Alam Excursions',
    defaultDescription: 'Discover Marsa Alam\'s untouched coral reefs, swim with dugongs and sea turtles, and explore the pristine Red Sea. Snorkeling, diving, and desert trips.',
    defaultKeywords: [
      'marsa alam excursions', 'marsa alam snorkeling', 'dugong tour', 'sea turtle marsa alam',
      'marsa alam diving', 'port ghalib', 'sataya reef', 'abu dabbab', 'marsa alam desert',
      'elphinstone reef', 'marsa alam boat trips',
    ],
    ogImage: generatePlaceholderOgImage('Marsa+Alam+Excursions', '059669', 'Pristine+Reefs'),
    ogType: 'website',
    structuredDataType: 'TravelAgency',
  },
  contact: {
    email: 'info@marsaalamexcursions.com',
    supportEmail: 'support@marsaalamexcursions.com',
    phone: '+20 100 000 0008',
    whatsapp: '+20 100 000 0008',
    address: 'Port Ghalib, Marsa Alam',
    city: 'Marsa Alam',
    country: 'Egypt',
    postalCode: '84721',
    businessHours: '24/7 Support Available',
  },
  socialLinks: {
    facebook: 'https://facebook.com/marsaalamexcursions',
    instagram: 'https://instagram.com/marsaalamexcursions',
    youtube: 'https://youtube.com/@marsaalamexcursions',
    tiktok: 'https://tiktok.com/@marsaalamexcursions',
    tripadvisor: 'https://tripadvisor.com/marsaalamexcursions',
  },
  features: {
    enableBlog: true, enableReviews: true, enableWishlist: true, enableAISearch: true,
    enableIntercom: false, enableMultiCurrency: true, enableMultiLanguage: true,
    enableLiveChat: false, enableNewsletter: true, enablePromoBar: true,
    enableHotelPickup: true, enableGiftCards: false,
  },
  payments: {
    currency: 'USD', currencySymbol: '$',
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'EGP'],
    supportedPaymentMethods: ['card', 'paypal', 'bank'],
    taxRate: 0, serviceFeePercent: 0, minBookingAmount: 0, maxBookingAmount: 50000,
  },
  email: {
    fromName: 'Marsa Alam Excursions', fromEmail: 'noreply@marsaalamexcursions.com',
    replyToEmail: 'info@marsaalamexcursions.com', emailTemplateTheme: 'marine',
  },
  localization: {
    defaultLanguage: 'en', supportedLanguages: ['en', 'de', 'fr', 'it', 'nl', 'ar'],
    defaultTimezone: 'Africa/Cairo', dateFormat: 'DD/MM/YYYY', timeFormat: 'HH:mm',
  },
  homepage: {
    heroType: 'slider' as const,
    heroTitle: 'Explore Pristine Marsa Alam',
    heroSubtitle: 'Swim with dugongs, discover untouched coral reefs, and experience the Red Sea at its most beautiful',
    heroImages: [
      'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1920',
      'https://images.unsplash.com/photo-1559827291-72ee739d0d9a?w=1920',
    ],
    showDestinations: true, showCategories: true, showFeaturedTours: true,
    showPopularInterests: true, showDayTrips: true, showReviews: true,
    showFAQ: true, showAboutUs: true, showPromoSection: true, featuredToursCount: 8,
  },
  integrations: { algoliaIndexPrefix: 'marsa_alam_excursions_', cloudinaryFolder: 'marsa-alam-excursions' },
  customContent: {
    aboutUsContent: `
      <h2>Marsa Alam Excursions - Where the Red Sea Comes Alive</h2>
      <p>Marsa Alam is Egypt's hidden gem — pristine reefs, crystal-clear waters, and marine encounters you won't find anywhere else. We're passionate about sharing the unspoiled beauty of this coast with visitors from around the world.</p>
      <p>Whether you dream of swimming with dugongs at Abu Dabbab, diving the legendary Elphinstone Reef, or simply relaxing on untouched beaches, we make it happen.</p>
      <h3>What Makes Us Special</h3>
      <ul>
        <li>🐢 Sea turtle & dugong encounters</li>
        <li>🤿 World-class reef diving & snorkeling</li>
        <li>🏖️ Secluded beach experiences</li>
        <li>🐬 Dolphin house trips</li>
        <li>🏜️ Desert stargazing adventures</li>
        <li>🌊 Sataya & Elphinstone reef trips</li>
      </ul>
    `,
    faqContent: [
      { question: 'Can I really swim with dugongs?', answer: 'Yes! Abu Dabbab Bay is one of the few places on earth where you can snorkel alongside wild dugongs (sea cows) and sea turtles in their natural habitat. Sightings are very common.' },
      { question: 'What is the best time to visit Marsa Alam?', answer: 'Marsa Alam is a year-round destination. Water temperatures range from 22°C in winter to 28°C in summer. October to April is peak season with ideal diving conditions.' },
      { question: 'How far is Marsa Alam from Hurghada?', answer: 'Marsa Alam is about 270km south of Hurghada (3-4 hours drive). It has its own international airport with direct flights from Europe.' },
      { question: 'What marine life can I see?', answer: 'Marsa Alam is famous for dugongs, sea turtles, dolphins, reef sharks, manta rays, and incredibly colorful coral reefs. Elphinstone is known for oceanic whitetip sharks.' },
      { question: 'Do I need diving certification to explore reefs?', answer: 'No! Many of our best experiences are snorkeling-based. Abu Dabbab, Dolphin House, and Sataya are all accessible to snorkelers. We also offer discover scuba for beginners.' },
    ],
  },
  promoBar: {
    enabled: true,
    text: '🐢 ECO SPECIAL: Book any snorkeling trip and get free underwater photos!',
    link: '/tours',
    backgroundColor: '#059669',
    textColor: '#FFFFFF',
    dismissible: true,
  },
  isActive: true,
  isDefault: false,
  websiteStatus: 'active' as const,
};

// ============================================================================
// 9. DAHAB EXCURSIONS
// Theme: Bohemian/Adventure - Amber/teal, free-spirited
// ============================================================================
const dahabExcursions = {
  tenantId: 'dahab-excursions',
  name: 'Dahab Excursions',
  slug: 'dahab-excursions',
  domain: 'dahabexcursions.com',
  domains: ['dahabexcursions.com', 'www.dahabexcursions.com'],
  branding: {
    logo: '/tenants/dahab-excursions/logo.png',
    logoDark: '/tenants/dahab-excursions/logo.png',
    logoAlt: 'Dahab Excursions',
    favicon: '/tenants/dahab-excursions/favicon.ico',
    primaryColor: '#D97706',       // Amber-600 (Desert gold)
    secondaryColor: '#92400E',     // Amber-800 (Deep sand)
    accentColor: '#0D9488',        // Teal-600 (Blue Hole)
    backgroundColor: '#FFFBEB',    // Soft amber tint
    textColor: '#0F172A',
    fontFamily: 'Quicksand',
    fontFamilyHeading: 'Pacifico',
    borderRadius: '16px',
  },
  theme: {
    themeId: 'bohemian-gold',
    themeName: 'Bohemian Gold',
    colors: {
      primary: '#D97706',
      primaryHover: '#B45309',
      primaryLight: '#FEF3C7',
      secondary: '#92400E',
      secondaryHover: '#78350F',
      accent: '#0D9488',
      accentHover: '#0F766E',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#0EA5E9',
      background: '#FFFBEB',
      backgroundAlt: '#FEF3C7',
      surface: '#FFFFFF',
      surfaceHover: '#FFFBEB',
      text: '#0F172A',
      textMuted: '#64748B',
      textInverse: '#FFFFFF',
      border: '#FDE68A',
      borderHover: '#FCD34D',
      divider: '#FDE68A',
      rating: '#FBBF24',
    },
    gradients: {
      primary: 'linear-gradient(135deg, #D97706 0%, #F59E0B 100%)',
      secondary: 'linear-gradient(135deg, #92400E 0%, #B45309 100%)',
      hero: 'linear-gradient(180deg, rgba(146,64,14,0.8) 0%, rgba(217,119,6,0.4) 100%)',
      card: 'linear-gradient(180deg, #FEF3C7 0%, #FFFFFF 100%)',
      button: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)',
      overlay: 'linear-gradient(180deg, rgba(15,23,42,0.6) 0%, rgba(15,23,42,0.2) 100%)',
    },
    shadows: {
      sm: '0 1px 2px 0 rgba(217, 119, 6, 0.05)',
      md: '0 4px 6px -1px rgba(217, 119, 6, 0.1)',
      lg: '0 10px 15px -3px rgba(217, 119, 6, 0.1)',
      xl: '0 20px 25px -5px rgba(217, 119, 6, 0.1)',
      primary: '0 4px 14px 0 rgba(217, 119, 6, 0.35)',
      card: '0 4px 20px rgba(217, 119, 6, 0.12)',
      button: '0 4px 14px 0 rgba(217, 119, 6, 0.4)',
      dropdown: '0 10px 40px rgba(217, 119, 6, 0.15)',
    },
    typography: {
      fontFamily: 'Quicksand, sans-serif',
      fontFamilyHeading: 'Pacifico, cursive',
      fontFamilyMono: 'JetBrains Mono, monospace',
      baseFontSize: '16px', lineHeight: '1.6', headingLineHeight: '1.3',
      fontWeightNormal: 400, fontWeightMedium: 600, fontWeightSemibold: 700, fontWeightBold: 800,
      letterSpacing: '0', headingLetterSpacing: '0',
    },
    layout: {
      borderRadius: '16px', borderRadiusSm: '10px', borderRadiusLg: '20px',
      borderRadiusXl: '28px', borderRadiusFull: '9999px',
      containerMaxWidth: '1280px', headerHeight: '72px', footerStyle: 'standard' as const,
    },
    components: {
      header: { background: 'rgba(255, 251, 235, 0.92)', backgroundScrolled: 'rgba(255, 255, 255, 0.96)', textColor: '#0F172A', style: 'solid' as const, position: 'sticky' as const, blur: true },
      footer: { background: '#92400E', textColor: '#FEF3C7', style: 'dark' as const },
      buttons: { style: 'rounded' as const, primaryBg: '#D97706', primaryText: '#FFFFFF', primaryHoverBg: '#B45309', secondaryBg: '#92400E', secondaryText: '#FFFFFF', outlineBorderColor: '#D97706' },
      cards: { style: 'elevated' as const, background: '#FFFFFF', hoverTransform: 'translateY(-4px)', imageBorderRadius: '16px' },
      badges: { background: '#D97706', textColor: '#FFFFFF', style: 'pill' as const },
      inputs: { background: '#FFFFFF', borderColor: '#FDE68A', focusBorderColor: '#D97706', style: 'outlined' as const },
    },
    animations: { enabled: true, duration: '200ms', durationFast: '150ms', durationSlow: '300ms', easing: 'cubic-bezier(0.4, 0, 0.2, 1)', hoverScale: '1.03' },
    darkMode: { enabled: false },
  },
  seo: {
    defaultTitle: 'Dahab Excursions - Blue Hole, Diving & Sinai Adventures',
    titleSuffix: 'Dahab Excursions',
    defaultDescription: 'Experience Dahab\'s legendary Blue Hole, world-class diving, Sinai desert treks, and bohemian Red Sea vibes. The ultimate adventure destination.',
    defaultKeywords: [
      'dahab excursions', 'blue hole dahab', 'dahab diving', 'dahab snorkeling',
      'sinai trekking', 'mount sinai', 'st catherine', 'dahab safari', 'dahab camel ride',
      'three pools dahab', 'dahab freediving',
    ],
    ogImage: generatePlaceholderOgImage('Dahab+Excursions', 'D97706', 'Adventure+Awaits'),
    ogType: 'website',
    structuredDataType: 'TravelAgency',
  },
  contact: {
    email: 'info@dahabexcursions.com',
    supportEmail: 'support@dahabexcursions.com',
    phone: '+20 100 000 0009',
    whatsapp: '+20 100 000 0009',
    address: 'Masbat, Dahab',
    city: 'Dahab',
    country: 'Egypt',
    postalCode: '46617',
    businessHours: '24/7 Support Available',
  },
  socialLinks: {
    facebook: 'https://facebook.com/dahabexcursions',
    instagram: 'https://instagram.com/dahabexcursions',
    youtube: 'https://youtube.com/@dahabexcursions',
    tiktok: 'https://tiktok.com/@dahabexcursions',
    tripadvisor: 'https://tripadvisor.com/dahabexcursions',
  },
  features: {
    enableBlog: true, enableReviews: true, enableWishlist: true, enableAISearch: true,
    enableIntercom: false, enableMultiCurrency: true, enableMultiLanguage: true,
    enableLiveChat: false, enableNewsletter: true, enablePromoBar: true,
    enableHotelPickup: true, enableGiftCards: false,
  },
  payments: {
    currency: 'USD', currencySymbol: '$',
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'EGP'],
    supportedPaymentMethods: ['card', 'paypal', 'bank'],
    taxRate: 0, serviceFeePercent: 0, minBookingAmount: 0, maxBookingAmount: 50000,
  },
  email: {
    fromName: 'Dahab Excursions', fromEmail: 'noreply@dahabexcursions.com',
    replyToEmail: 'info@dahabexcursions.com', emailTemplateTheme: 'adventure',
  },
  localization: {
    defaultLanguage: 'en', supportedLanguages: ['en', 'de', 'fr', 'it', 'ru', 'ar'],
    defaultTimezone: 'Africa/Cairo', dateFormat: 'DD/MM/YYYY', timeFormat: 'HH:mm',
  },
  homepage: {
    heroType: 'slider' as const,
    heroTitle: 'Discover Dahab',
    heroSubtitle: 'Dive the legendary Blue Hole, trek the Sinai mountains, and embrace the bohemian spirit of the Red Sea',
    heroImages: [
      'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1920',
      'https://images.unsplash.com/photo-1682407186023-12c70a4a35e0?w=1920',
    ],
    showDestinations: true, showCategories: true, showFeaturedTours: true,
    showPopularInterests: true, showDayTrips: true, showReviews: true,
    showFAQ: true, showAboutUs: true, showPromoSection: true, featuredToursCount: 8,
  },
  integrations: { algoliaIndexPrefix: 'dahab_excursions_', cloudinaryFolder: 'dahab-excursions' },
  customContent: {
    aboutUsContent: `
      <h2>Dahab Excursions - Adventure Meets Tranquility</h2>
      <p>Dahab is unlike anywhere else in Egypt — a laid-back beach town with world-class diving, dramatic desert mountains, and a bohemian atmosphere that keeps travelers coming back year after year.</p>
      <p>We're locals who know every hidden canyon, every secret reef, and every stunning viewpoint. Let us show you the real Dahab — from the depths of the Blue Hole to the summit of Mount Sinai.</p>
      <h3>Why Choose Dahab</h3>
      <ul>
        <li>🕳️ Blue Hole — world-famous dive site</li>
        <li>⛰️ Mount Sinai sunrise treks</li>
        <li>🏊 Freediving courses & experiences</li>
        <li>🐪 Bedouin desert safaris</li>
        <li>🌊 Three Pools & Canyon snorkeling</li>
        <li>🧘 Yoga & wellness retreats</li>
      </ul>
    `,
    faqContent: [
      { question: 'What is the Blue Hole?', answer: 'The Blue Hole is a 130-meter deep marine sinkhole just north of Dahab. It\'s one of the most famous dive sites in the world, and the shallow rim (6-8 meters) makes it perfect for snorkeling too.' },
      { question: 'Can I climb Mount Sinai from Dahab?', answer: 'Yes! We offer overnight trips departing Dahab in the evening, climbing through the night to reach the summit for sunrise. It\'s about 2.5 hours drive to St. Catherine followed by a 2-3 hour climb.' },
      { question: 'Is Dahab good for beginners?', answer: 'Absolutely! Dahab\'s shore diving is perfect for beginners — you can walk into incredible reef sites. We offer discover scuba, PADI courses, and easy snorkeling spots like the Lighthouse and Three Pools.' },
      { question: 'What is freediving and can I try it?', answer: 'Freediving is diving on a single breath without scuba equipment. Dahab is one of the world\'s top freediving destinations thanks to the Blue Hole\'s calm, deep waters. We offer introductory courses for all levels.' },
      { question: 'How do I get to Dahab?', answer: 'Dahab is about 1 hour north of Sharm El Sheikh airport by car. We can arrange airport transfers. There are also bus services from Cairo (8 hours) and Sharm El Sheikh.' },
    ],
  },
  promoBar: {
    enabled: true,
    text: '🕳️ BLUE HOLE DEAL: Book Blue Hole snorkeling + Mount Sinai trek combo and save 20%!',
    link: '/tours',
    backgroundColor: '#D97706',
    textColor: '#FFFFFF',
    dismissible: true,
  },
  isActive: true,
  isDefault: false,
  websiteStatus: 'active' as const,
};

// ============================================================================
// ALL TENANT CONFIGURATIONS ARRAY
// ============================================================================

const allTenantConfigs = [
  hurghadaExcursionsOnline,
  cairoExcursionsOnline,
  makadiBayExcursions,
  elGounaExcursions,
  luxorExcursions,
  sharmExcursionsOnline,
  aswanExcursions,
  marsaAlamExcursions,
  dahabExcursions,
];

// ============================================================================
// SEED FUNCTION
// ============================================================================

async function seedExcursionsTenants() {
  console.log('🚀 Starting Excursions Tenants Seed Script');
  console.log('=' .repeat(60));
  console.log('📅 Client Request: January 2026 - Foxes Technology Projects\n');

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ MONGODB_URI environment variable is not set');
    process.exit(1);
  }

  try {
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    console.log('📋 Creating/Updating Tenants:\n');

    for (const config of allTenantConfigs) {
      console.log(`   🔄 Processing: ${config.name}...`);
      
      try {
        // Check if tenant exists
        const existingTenant = await Tenant.findOne({ tenantId: config.tenantId });

        if (existingTenant) {
          // Update existing tenant
          await Tenant.updateOne(
            { tenantId: config.tenantId },
            { $set: config }
          );
          console.log(`   ✅ Updated: ${config.name}`);
        } else {
          // Create new tenant
          await Tenant.create(config);
          console.log(`   ✅ Created: ${config.name}`);
        }
      } catch (err) {
        console.error(`   ❌ Error with ${config.name}:`, err);
      }
    }

    // ========================================================================
    // CREATE HERO SETTINGS FOR EACH TENANT
    // ========================================================================
    console.log('\n📸 Creating HeroSettings for each tenant...\n');

    // Hero settings configurations for each tenant
    const heroSettingsConfigs = [
      {
        tenantId: 'hurghada-excursions-online',
        title: { main: 'Discover the Magic of', highlight: 'Hurghada' },
        backgroundImages: [
          { desktop: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1920&q=80', alt: 'Red Sea Hurghada', isActive: true },
          { desktop: 'https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=1920&q=80', alt: 'Snorkeling Red Sea', isActive: true },
          { desktop: 'https://images.unsplash.com/photo-1583212292454-1fe6229603b7?w=1920&q=80', alt: 'Hurghada Beach', isActive: true },
        ],
        searchSuggestions: ['Snorkeling Trip', 'Giftun Island', 'Orange Bay', 'Desert Safari', 'Dolphin Watching'],
        floatingTags: { isEnabled: true, tags: ['Snorkeling', 'Diving', 'Desert Safari', 'Island Hopping', 'Boat Trips'], animationSpeed: 3, tagCount: { desktop: 5, mobile: 3 } },
      },
      {
        tenantId: 'cairo-excursions-online',
        title: { main: 'Journey Through', highlight: 'Ancient Egypt' },
        backgroundImages: [
          { desktop: 'https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=1920&q=80', alt: 'Pyramids of Giza', isActive: true },
          { desktop: 'https://images.unsplash.com/photo-1553913861-c0fddf2619ee?w=1920&q=80', alt: 'Sphinx Cairo', isActive: true },
          { desktop: 'https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=1920&q=80', alt: 'Egyptian Museum', isActive: true },
        ],
        searchSuggestions: ['Pyramids Tour', 'Egyptian Museum', 'Sphinx Visit', 'Khan Khalili', 'Nile Dinner Cruise'],
        floatingTags: { isEnabled: true, tags: ['Pyramids', 'Museum', 'Pharaohs', 'Nile Cruise', 'History'], animationSpeed: 3, tagCount: { desktop: 5, mobile: 3 } },
      },
      {
        tenantId: 'makadi-bay',
        title: { main: 'Paradise Awaits at', highlight: 'Makadi Bay' },
        backgroundImages: [
          { desktop: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1920&q=80', alt: 'Makadi Bay Beach', isActive: true },
          { desktop: 'https://images.unsplash.com/photo-1559827291-72ee739d0d9a?w=1920&q=80', alt: 'Red Sea Resort', isActive: true },
          { desktop: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1920&q=80', alt: 'Makadi Snorkeling', isActive: true },
        ],
        searchSuggestions: ['Snorkeling', 'Luxor Day Trip', 'Quad Safari', 'Glass Boat', 'Dolphin Trip'],
        floatingTags: { isEnabled: true, tags: ['Resort', 'Snorkeling', 'Relaxation', 'Day Trips', 'Beach'], animationSpeed: 3, tagCount: { desktop: 5, mobile: 3 } },
      },
      {
        tenantId: 'el-gouna',
        title: { main: 'Experience Luxury at', highlight: 'El Gouna' },
        backgroundImages: [
          { desktop: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=1920&q=80', alt: 'El Gouna Marina', isActive: true },
          { desktop: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&q=80', alt: 'El Gouna Beach', isActive: true },
          { desktop: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1920&q=80', alt: 'Red Sea El Gouna', isActive: true },
        ],
        searchSuggestions: ['Kitesurfing', 'Yacht Charter', 'Diving Course', 'Desert Adventure', 'Golf'],
        floatingTags: { isEnabled: true, tags: ['Kitesurfing', 'Yacht', 'Diving', 'Luxury', 'Marina'], animationSpeed: 3, tagCount: { desktop: 5, mobile: 3 } },
      },
      {
        tenantId: 'luxor-excursions',
        title: { main: 'Walk Among the', highlight: 'Gods of Luxor' },
        backgroundImages: [
          { desktop: 'https://images.unsplash.com/photo-1568322445389-f64ac2515020?w=1920&q=80', alt: 'Luxor Temple', isActive: true },
          { desktop: 'https://images.unsplash.com/photo-1595981234058-a9302fb97229?w=1920&q=80', alt: 'Valley of Kings', isActive: true },
          { desktop: 'https://images.unsplash.com/photo-1565108941489-e2d8f69f15d8?w=1920&q=80', alt: 'Karnak Temple', isActive: true },
        ],
        searchSuggestions: ['Valley of Kings', 'Karnak Temple', 'Hot Air Balloon', 'Nile Felucca', 'Hatshepsut Temple'],
        floatingTags: { isEnabled: true, tags: ['Temples', 'Tombs', 'Balloon', 'Nile', 'Pharaohs'], animationSpeed: 3, tagCount: { desktop: 5, mobile: 3 } },
      },
      {
        tenantId: 'sharm-excursions-online',
        title: { main: 'Dive Into', highlight: 'Sharm El Sheikh' },
        backgroundImages: [
          { desktop: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1920&q=80', alt: 'Sharm Red Sea', isActive: true },
          { desktop: 'https://images.unsplash.com/photo-1682407186023-12c70a4a35e0?w=1920&q=80', alt: 'Ras Mohammed', isActive: true },
          { desktop: 'https://images.unsplash.com/photo-1559827291-72ee739d0d9a?w=1920&q=80', alt: 'Sharm Diving', isActive: true },
        ],
        searchSuggestions: ['Ras Mohammed', 'Tiran Island', 'Blue Hole Dahab', 'Quad Safari', 'Bedouin Dinner'],
        floatingTags: { isEnabled: true, tags: ['Diving', 'Snorkeling', 'Desert', 'Marine Life', 'Adventure'], animationSpeed: 3, tagCount: { desktop: 5, mobile: 3 } },
      },
      {
        tenantId: 'aswan-excursions',
        title: { main: 'Explore Ancient', highlight: 'Aswan' },
        backgroundImages: [
          { desktop: 'https://images.unsplash.com/photo-1568322445389-f64ac2515020?w=1920&q=80', alt: 'Philae Temple Aswan', isActive: true },
          { desktop: 'https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=1920&q=80', alt: 'Nile Felucca Aswan', isActive: true },
          { desktop: 'https://images.unsplash.com/photo-1595981234058-a9302fb97229?w=1920&q=80', alt: 'Abu Simbel', isActive: true },
        ],
        searchSuggestions: ['Abu Simbel', 'Philae Temple', 'Nubian Village', 'Felucca Ride', 'High Dam'],
        floatingTags: { isEnabled: true, tags: ['Abu Simbel', 'Nubian', 'Felucca', 'Temples', 'Nile'], animationSpeed: 3, tagCount: { desktop: 5, mobile: 3 } },
      },
      {
        tenantId: 'marsa-alam-excursions',
        title: { main: 'Discover Pristine', highlight: 'Marsa Alam' },
        backgroundImages: [
          { desktop: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1920&q=80', alt: 'Marsa Alam Reef', isActive: true },
          { desktop: 'https://images.unsplash.com/photo-1559827291-72ee739d0d9a?w=1920&q=80', alt: 'Marsa Alam Beach', isActive: true },
          { desktop: 'https://images.unsplash.com/photo-1582967788606-a171c1080cb0?w=1920&q=80', alt: 'Snorkeling Marsa Alam', isActive: true },
        ],
        searchSuggestions: ['Dugong Tour', 'Abu Dabbab', 'Sataya Reef', 'Dolphin House', 'Elphinstone'],
        floatingTags: { isEnabled: true, tags: ['Dugong', 'Reef', 'Turtles', 'Dolphins', 'Pristine'], animationSpeed: 3, tagCount: { desktop: 5, mobile: 3 } },
      },
      {
        tenantId: 'dahab-excursions',
        title: { main: 'Adventure Awaits in', highlight: 'Dahab' },
        backgroundImages: [
          { desktop: 'https://images.unsplash.com/photo-1682407186023-12c70a4a35e0?w=1920&q=80', alt: 'Blue Hole Dahab', isActive: true },
          { desktop: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1920&q=80', alt: 'Dahab Coast', isActive: true },
          { desktop: 'https://images.unsplash.com/photo-1559827291-72ee739d0d9a?w=1920&q=80', alt: 'Sinai Mountains', isActive: true },
        ],
        searchSuggestions: ['Blue Hole', 'Mount Sinai', 'Freediving', 'Canyon Snorkeling', 'Bedouin Safari'],
        floatingTags: { isEnabled: true, tags: ['Blue Hole', 'Sinai', 'Freediving', 'Desert', 'Yoga'], animationSpeed: 3, tagCount: { desktop: 5, mobile: 3 } },
      },
    ];

    // Create HeroSettings for each tenant
    for (const heroConfig of heroSettingsConfigs) {
      try {
        const existingHero = await HeroSettings.findOne({ tenantId: heroConfig.tenantId });
        
        const heroData = {
          tenantId: heroConfig.tenantId,
          backgroundImages: heroConfig.backgroundImages,
          currentActiveImage: heroConfig.backgroundImages[0]?.desktop || '',
          title: heroConfig.title,
          searchSuggestions: heroConfig.searchSuggestions,
          floatingTags: heroConfig.floatingTags,
          trustIndicators: {
            travelers: '2M+',
            rating: '4.9/5',
            ratingText: 'rating',
            isVisible: true,
          },
          overlaySettings: {
            opacity: 0.5,
            gradientType: 'dark',
          },
          animationSettings: {
            slideshowSpeed: 5,
            fadeSpeed: 800,
            enableAutoplay: true,
          },
          isActive: true,
        };

        if (existingHero) {
          await HeroSettings.updateOne({ tenantId: heroConfig.tenantId }, { $set: heroData });
          console.log(`   ✅ Updated HeroSettings: ${heroConfig.tenantId}`);
        } else {
          await HeroSettings.create(heroData);
          console.log(`   ✅ Created HeroSettings: ${heroConfig.tenantId}`);
        }
      } catch (err) {
        console.error(`   ❌ Error with HeroSettings for ${heroConfig.tenantId}:`, err);
      }
    }

    console.log('\n' + '=' .repeat(60));
    console.log('📊 SEED SUMMARY\n');

    // Verify all tenants
    for (const config of allTenantConfigs) {
      const tenant = await Tenant.findOne({ tenantId: config.tenantId }).lean();
      const heroSettings = await HeroSettings.findOne({ tenantId: config.tenantId }).lean();
      if (tenant) {
        console.log(`   ✅ ${config.name}`);
        console.log(`      Domain: ${config.domain}`);
        console.log(`      Primary Color: ${config.branding.primaryColor}`);
        console.log(`      Theme: ${config.theme?.themeName || 'Default'}`);
        console.log(`      HeroSettings: ${heroSettings ? '✅ Created' : '❌ Missing'}`);
        console.log('');
      } else {
        console.log(`   ❌ ${config.name} - NOT FOUND`);
      }
    }

    console.log('=' .repeat(60));
    console.log('\n📋 DOMAIN MAPPING (configured in middleware.ts):\n');
    console.log('   Production Domains:');
    for (const config of allTenantConfigs) {
      console.log(`   • ${config.domain} → ${config.tenantId}`);
      console.log(`   • www.${config.domain} → ${config.tenantId}`);
    }
    
    console.log('\n   Localhost Ports (for development):');
    console.log('   • localhost:3005 → hurghada-excursions-online');
    console.log('   • localhost:3006 → cairo-excursions-online');
    console.log('   • localhost:3007 → makadi-bay');
    console.log('   • localhost:3008 → el-gouna');
    console.log('   • localhost:3009 → luxor-excursions');
    console.log('   • localhost:3010 → sharm-excursions-online');

    console.log('\n' + '=' .repeat(60));
    console.log('🎉 SEED COMPLETE!\n');
    console.log('📝 Next Steps:');
    console.log('   1. Replace placeholder logos from admin panel');
    console.log('   2. Create/assign tours to each tenant');
    console.log('   3. Test locally: pnpm dev --port 3005 (etc.)');
    console.log('   4. Configure DNS for each domain');
    console.log('   5. Deploy to production\n');

  } catch (error) {
    console.error('❌ Error running seed script:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB\n');
  }
}

// Run the seed function
seedExcursionsTenants();
