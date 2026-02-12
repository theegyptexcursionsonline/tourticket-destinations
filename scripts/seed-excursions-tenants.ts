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
    primaryColor: '#EA2B16',      // Brand Red
    secondaryColor: '#1C1917',    // Warm Dark (Stone-900)
    accentColor: '#F59E0B',       // Amber-500 (Gold accent)
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
      primary: '#EA2B16',
      primaryHover: '#C92410',
      primaryLight: '#FEE2E2',
      secondary: '#1C1917',
      secondaryHover: '#292524',
      accent: '#F59E0B',
      accentHover: '#D97706',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#3B82F6',
      background: '#FFFFFF',
      backgroundAlt: '#FEF2F2',
      surface: '#FFFFFF',
      surfaceHover: '#FEF2F2',
      text: '#0F172A',
      textMuted: '#64748B',
      textInverse: '#FFFFFF',
      border: '#E2E8F0',
      borderHover: '#CBD5E1',
      divider: '#E2E8F0',
      rating: '#FBBF24',
    },
    gradients: {
      primary: 'linear-gradient(135deg, #EA2B16 0%, #F04D3A 100%)',
      secondary: 'linear-gradient(135deg, #1C1917 0%, #44403C 100%)',
      hero: 'linear-gradient(180deg, rgba(234,43,22,0.8) 0%, rgba(240,77,58,0.4) 100%)',
      card: 'linear-gradient(180deg, #FEF2F2 0%, #FFFFFF 100%)',
      button: 'linear-gradient(135deg, #EA2B16 0%, #C92410 100%)',
      overlay: 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.2) 100%)',
    },
    shadows: {
      sm: '0 1px 2px 0 rgba(234, 43, 22, 0.05)',
      md: '0 4px 6px -1px rgba(234, 43, 22, 0.1)',
      lg: '0 10px 15px -3px rgba(234, 43, 22, 0.1)',
      xl: '0 20px 25px -5px rgba(234, 43, 22, 0.1)',
      primary: '0 4px 14px 0 rgba(234, 43, 22, 0.35)',
      card: '0 4px 20px rgba(234, 43, 22, 0.12)',
      button: '0 4px 14px 0 rgba(234, 43, 22, 0.4)',
      dropdown: '0 10px 40px rgba(234, 43, 22, 0.15)',
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
        background: '#1C1917',
        textColor: '#FFFFFF',
        style: 'dark' as const,
      },
      buttons: {
        style: 'rounded' as const,
        primaryBg: '#EA2B16',
        primaryText: '#FFFFFF',
        primaryHoverBg: '#C92410',
        secondaryBg: '#1C1917',
        secondaryText: '#FFFFFF',
        outlineBorderColor: '#EA2B16',
      },
      cards: {
        style: 'elevated' as const,
        background: '#FFFFFF',
        hoverTransform: 'translateY(-6px)',
        imageBorderRadius: '12px',
      },
      badges: {
        background: '#EA2B16',
        textColor: '#FFFFFF',
        style: 'pill' as const,
      },
      inputs: {
        background: '#FFFFFF',
        borderColor: '#E2E8F0',
        focusBorderColor: '#EA2B16',
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
    ogImage: generatePlaceholderOgImage('Hurghada+Excursions', 'EA2B16', 'Red+Sea+Adventures'),
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
    backgroundColor: '#EA2B16',
    textColor: '#FFFFFF',
    dismissible: true,
  },
  isActive: true,
  isDefault: false,
  websiteStatus: 'active' as const,
};

// 2. CAIRO EXCURSIONS ONLINE
// Theme: Royal Blue - Modern, trustworthy, historic
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
    primaryColor: '#0F73BA',      // Brand Blue
    secondaryColor: '#1E3A5F',    // Deep Navy
    accentColor: '#38BDF8',       // Sky Blue accent
    backgroundColor: '#FFFFFF',
    textColor: '#1C1917',
    fontFamily: 'Playfair Display',
    fontFamilyHeading: 'Cinzel',
    borderRadius: '8px',
  },
  theme: {
    themeId: 'royal-blue',
    themeName: 'Royal Blue',
    colors: {
      primary: '#0F73BA',
      primaryHover: '#0C5F9A',
      primaryLight: '#DBEAFE',
      secondary: '#1E3A5F',
      secondaryHover: '#15304F',
      accent: '#38BDF8',
      accentHover: '#0EA5E9',
      success: '#059669',
      warning: '#F59E0B',
      error: '#DC2626',
      info: '#2563EB',
      background: '#FFFFFF',
      backgroundAlt: '#EFF6FF',
      surface: '#FFFFFF',
      surfaceHover: '#F0F9FF',
      text: '#1C1917',
      textMuted: '#57534E',
      textInverse: '#FFFFFF',
      border: '#E2E8F0',
      borderHover: '#CBD5E1',
      divider: '#E2E8F0',
      rating: '#FBBF24',
    },
    gradients: {
      primary: 'linear-gradient(135deg, #0F73BA 0%, #38BDF8 100%)',
      secondary: 'linear-gradient(135deg, #1E3A5F 0%, #0C5F9A 100%)',
      hero: 'linear-gradient(180deg, rgba(15,115,186,0.85) 0%, rgba(56,189,248,0.4) 100%)',
      card: 'linear-gradient(180deg, #EFF6FF 0%, #FFFFFF 100%)',
      button: 'linear-gradient(135deg, #0F73BA 0%, #0C5F9A 100%)',
      overlay: 'linear-gradient(180deg, rgba(28,25,23,0.7) 0%, rgba(28,25,23,0.3) 100%)',
    },
    shadows: {
      sm: '0 1px 2px 0 rgba(15, 115, 186, 0.05)',
      md: '0 4px 6px -1px rgba(15, 115, 186, 0.1)',
      lg: '0 10px 15px -3px rgba(15, 115, 186, 0.1)',
      xl: '0 20px 25px -5px rgba(15, 115, 186, 0.1)',
      primary: '0 4px 14px 0 rgba(15, 115, 186, 0.35)',
      card: '0 4px 20px rgba(15, 115, 186, 0.12)',
      button: '0 4px 14px 0 rgba(15, 115, 186, 0.4)',
      dropdown: '0 10px 40px rgba(15, 115, 186, 0.15)',
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
        background: 'rgba(255, 255, 255, 0.95)',
        backgroundScrolled: 'rgba(255, 255, 255, 0.98)',
        textColor: '#1C1917',
        style: 'solid' as const,
        position: 'sticky' as const,
        blur: true,
      },
      footer: {
        background: '#1E3A5F',
        textColor: '#FFFFFF',
        style: 'dark' as const,
      },
      buttons: {
        style: 'rounded' as const,
        primaryBg: '#0F73BA',
        primaryText: '#FFFFFF',
        primaryHoverBg: '#0C5F9A',
        secondaryBg: '#1E3A5F',
        secondaryText: '#FFFFFF',
        outlineBorderColor: '#0F73BA',
      },
      cards: {
        style: 'elevated' as const,
        background: '#FFFFFF',
        hoverTransform: 'translateY(-4px)',
        imageBorderRadius: '8px',
      },
      badges: {
        background: '#0F73BA',
        textColor: '#FFFFFF',
        style: 'rounded' as const,
      },
      inputs: {
        background: '#FFFFFF',
        borderColor: '#E2E8F0',
        focusBorderColor: '#0F73BA',
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
    ogImage: generatePlaceholderOgImage('Cairo+Excursions', '0F73BA', 'Ancient+Wonders'),
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
    backgroundColor: '#0F73BA',
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
    primaryColor: '#FF7105',      // Vibrant Orange
    secondaryColor: '#A64903',    // Deep Orange
    accentColor: '#FFA35D',       // Light Orange
    backgroundColor: '#FFF8F3',   // Soft orange tint
    textColor: '#0F172A',
    fontFamily: 'DM Sans',
    fontFamilyHeading: 'Outfit',
    borderRadius: '16px',
  },
  theme: {
    themeId: 'tropical-paradise',
    themeName: 'Tropical Paradise',
    colors: {
      primary: '#FF7105',
      primaryHover: '#D96004',
      primaryLight: '#FFF1E6',
      secondary: '#A64903',
      secondaryHover: '#994403',
      accent: '#FFA35D',
      accentHover: '#FF8D37',
      success: '#10B981',
      warning: '#FBBF24',
      error: '#F43F5E',
      info: '#0EA5E9',
      background: '#FFF8F3',
      backgroundAlt: '#FFEADA',
      surface: '#FFFFFF',
      surfaceHover: '#FFF8F3',
      text: '#0F172A',
      textMuted: '#64748B',
      textInverse: '#FFFFFF',
      border: '#FFD4B4',
      borderHover: '#FFBF8F',
      divider: '#FFD4B4',
      rating: '#FBBF24',
    },
    gradients: {
      primary: 'linear-gradient(135deg, #FF7105 0%, #FFA35D 100%)',
      secondary: 'linear-gradient(135deg, #A64903 0%, #D96004 100%)',
      hero: 'linear-gradient(180deg, rgba(255,113,5,0.75) 0%, rgba(255,163,93,0.3) 100%)',
      card: 'linear-gradient(180deg, #FFF1E6 0%, #FFFFFF 100%)',
      button: 'linear-gradient(135deg, #FF7105 0%, #D96004 100%)',
      overlay: 'linear-gradient(180deg, rgba(15,23,42,0.6) 0%, rgba(15,23,42,0.2) 100%)',
    },
    shadows: {
      sm: '0 1px 2px 0 rgba(255, 113, 5, 0.05)',
      md: '0 4px 6px -1px rgba(255, 113, 5, 0.1)',
      lg: '0 10px 15px -3px rgba(255, 113, 5, 0.1)',
      xl: '0 20px 25px -5px rgba(255, 113, 5, 0.1)',
      primary: '0 4px 14px 0 rgba(255, 113, 5, 0.35)',
      card: '0 4px 20px rgba(255, 113, 5, 0.12)',
      button: '0 4px 14px 0 rgba(255, 113, 5, 0.4)',
      dropdown: '0 10px 40px rgba(255, 113, 5, 0.15)',
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
        background: 'rgba(255, 248, 243, 0.9)',
        backgroundScrolled: 'rgba(255, 255, 255, 0.95)',
        textColor: '#0F172A',
        style: 'solid' as const,
        position: 'sticky' as const,
        blur: true,
      },
      footer: {
        background: '#A64903',
        textColor: '#FFF1E6',
        style: 'dark' as const,
      },
      buttons: {
        style: 'pill' as const,
        primaryBg: '#FF7105',
        primaryText: '#FFFFFF',
        primaryHoverBg: '#D96004',
        secondaryBg: '#A64903',
        secondaryText: '#FFFFFF',
        outlineBorderColor: '#FF7105',
      },
      cards: {
        style: 'elevated' as const,
        background: '#FFFFFF',
        hoverTransform: 'translateY(-8px)',
        imageBorderRadius: '16px',
      },
      badges: {
        background: '#FF7105',
        textColor: '#FFFFFF',
        style: 'pill' as const,
      },
      inputs: {
        background: '#FFFFFF',
        borderColor: '#FFD4B4',
        focusBorderColor: '#FF7105',
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
    ogImage: generatePlaceholderOgImage('Makadi+Bay', 'FF7105', 'Resort+Paradise'),
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
    backgroundColor: '#FF7105',
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
    primaryColor: '#35CBFE',      // Sky Blue
    secondaryColor: '#2284A5',    // Deep Blue
    accentColor: '#7CDDFE',       // Light Sky Blue
    backgroundColor: '#F5FCFF',   // Soft blue tint
    textColor: '#0F172A',
    fontFamily: 'Plus Jakarta Sans',
    fontFamilyHeading: 'Sora',
    borderRadius: '14px',
  },
  theme: {
    themeId: 'sky-blue',
    themeName: 'Sky Blue',
    colors: {
      primary: '#35CBFE',
      primaryHover: '#2DADD8',
      primaryLight: '#EBFAFF',
      secondary: '#2284A5',
      secondaryHover: '#207A98',
      accent: '#7CDDFE',
      accentHover: '#5DD5FE',
      success: '#059669',
      warning: '#F59E0B',
      error: '#DC2626',
      info: '#0EA5E9',
      background: '#F5FCFF',
      backgroundAlt: '#E1F7FF',
      surface: '#FFFFFF',
      surfaceHover: '#F5FCFF',
      text: '#0F172A',
      textMuted: '#64748B',
      textInverse: '#FFFFFF',
      border: '#C2EFFF',
      borderHover: '#A4E8FF',
      divider: '#C2EFFF',
      rating: '#FBBF24',
    },
    gradients: {
      primary: 'linear-gradient(135deg, #35CBFE 0%, #7CDDFE 100%)',
      secondary: 'linear-gradient(135deg, #2284A5 0%, #2DADD8 100%)',
      hero: 'linear-gradient(180deg, rgba(53,203,254,0.8) 0%, rgba(124,221,254,0.4) 100%)',
      card: 'linear-gradient(180deg, #EBFAFF 0%, #FFFFFF 100%)',
      button: 'linear-gradient(135deg, #35CBFE 0%, #2DADD8 100%)',
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
        background: '#2284A5',
        textColor: '#EBFAFF',
        style: 'dark' as const,
      },
      buttons: {
        style: 'rounded' as const,
        primaryBg: '#35CBFE',
        primaryText: '#FFFFFF',
        primaryHoverBg: '#2DADD8',
        secondaryBg: '#2284A5',
        secondaryText: '#FFFFFF',
        outlineBorderColor: '#35CBFE',
      },
      cards: {
        style: 'elevated' as const,
        background: '#FFFFFF',
        hoverTransform: 'translateY(-6px) scale(1.01)',
        imageBorderRadius: '14px',
      },
      badges: {
        background: '#35CBFE',
        textColor: '#FFFFFF',
        style: 'pill' as const,
      },
      inputs: {
        background: '#FFFFFF',
        borderColor: '#C2EFFF',
        focusBorderColor: '#35CBFE',
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
    ogImage: generatePlaceholderOgImage('El+Gouna', '35CBFE', 'Premium+Experiences'),
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
    backgroundColor: '#35CBFE',
    textColor: '#FFFFFF',
    dismissible: true,
  },
  isActive: true,
  isDefault: false,
  websiteStatus: 'active' as const,
};

// 5. LUXOR EXCURSIONS
// Theme: Desert Sand - Warm sand tones, ancient temples
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
    primaryColor: '#BA9C7E',      // Warm Sand
    secondaryColor: '#796552',    // Deep Brown
    accentColor: '#D2BFAB',       // Light Sand
    backgroundColor: '#FCFAF9',   // Soft cream tint
    textColor: '#3D2B1F',
    fontFamily: 'Cormorant Garamond',
    fontFamilyHeading: 'Cinzel Decorative',
    borderRadius: '6px',
  },
  theme: {
    themeId: 'desert-sand',
    themeName: 'Desert Sand',
    colors: {
      primary: '#BA9C7E',
      primaryHover: '#9E856B',
      primaryLight: '#F8F5F2',
      secondary: '#796552',
      secondaryHover: '#705E4C',
      accent: '#D2BFAB',
      accentHover: '#C8B098',
      success: '#059669',
      warning: '#D97706',
      error: '#DC2626',
      info: '#2563EB',
      background: '#FCFAF9',
      backgroundAlt: '#F5F0EC',
      surface: '#FFFFFF',
      surfaceHover: '#FCFAF9',
      text: '#3D2B1F',
      textMuted: '#8B7D72',
      textInverse: '#FFFFFF',
      border: '#EAE1D8',
      borderHover: '#E0D2C5',
      divider: '#EAE1D8',
      rating: '#FBBF24',
    },
    gradients: {
      primary: 'linear-gradient(135deg, #BA9C7E 0%, #D2BFAB 100%)',
      secondary: 'linear-gradient(135deg, #796552 0%, #9E856B 100%)',
      hero: 'linear-gradient(180deg, rgba(121,101,82,0.85) 0%, rgba(186,156,126,0.5) 100%)',
      card: 'linear-gradient(180deg, #F8F5F2 0%, #FFFFFF 100%)',
      button: 'linear-gradient(135deg, #BA9C7E 0%, #9E856B 100%)',
      overlay: 'linear-gradient(180deg, rgba(61,43,31,0.75) 0%, rgba(61,43,31,0.35) 100%)',
    },
    shadows: {
      sm: '0 1px 2px 0 rgba(186, 156, 126, 0.05)',
      md: '0 4px 6px -1px rgba(186, 156, 126, 0.1)',
      lg: '0 10px 15px -3px rgba(186, 156, 126, 0.1)',
      xl: '0 20px 25px -5px rgba(186, 156, 126, 0.1)',
      primary: '0 4px 14px 0 rgba(186, 156, 126, 0.35)',
      card: '0 4px 20px rgba(186, 156, 126, 0.12)',
      button: '0 4px 14px 0 rgba(186, 156, 126, 0.4)',
      dropdown: '0 10px 40px rgba(186, 156, 126, 0.15)',
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
        background: 'rgba(252, 250, 249, 0.95)',
        backgroundScrolled: 'rgba(255, 255, 255, 0.98)',
        textColor: '#3D2B1F',
        style: 'solid' as const,
        position: 'sticky' as const,
        blur: true,
      },
      footer: {
        background: '#796552',
        textColor: '#F8F5F2',
        style: 'dark' as const,
      },
      buttons: {
        style: 'rounded' as const,
        primaryBg: '#BA9C7E',
        primaryText: '#FFFFFF',
        primaryHoverBg: '#9E856B',
        secondaryBg: '#796552',
        secondaryText: '#FFFFFF',
        outlineBorderColor: '#BA9C7E',
      },
      cards: {
        style: 'bordered' as const,
        background: '#FFFFFF',
        hoverTransform: 'translateY(-4px)',
        imageBorderRadius: '6px',
      },
      badges: {
        background: '#BA9C7E',
        textColor: '#FFFFFF',
        style: 'rounded' as const,
      },
      inputs: {
        background: '#FFFFFF',
        borderColor: '#EAE1D8',
        focusBorderColor: '#BA9C7E',
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
    ogImage: generatePlaceholderOgImage('Luxor+Excursions', 'BA9C7E', 'Ancient+Temples'),
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
    backgroundColor: '#BA9C7E',
    textColor: '#FFFFFF',
    dismissible: true,
  },
  isActive: true,
  isDefault: false,
  websiteStatus: 'active' as const,
};

// 6. SHARM EXCURSIONS ONLINE
// Theme: Emerald Reef - Green, marine paradise
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
    primaryColor: '#109D58',      // Emerald Green
    secondaryColor: '#0A6639',    // Deep Green
    accentColor: '#64BF92',       // Light Green
    backgroundColor: '#F3FAF7',   // Soft green tint
    textColor: '#0F172A',
    fontFamily: 'Nunito',
    fontFamilyHeading: 'Righteous',
    borderRadius: '10px',
  },
  theme: {
    themeId: 'emerald-reef',
    themeName: 'Emerald Reef',
    colors: {
      primary: '#109D58',
      primaryHover: '#0E854B',
      primaryLight: '#E7F5EE',
      secondary: '#0A6639',
      secondaryHover: '#0A5E35',
      accent: '#64BF92',
      accentHover: '#40B179',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#0EA5E9',
      background: '#F3FAF7',
      backgroundAlt: '#DBF0E6',
      surface: '#FFFFFF',
      surfaceHover: '#F3FAF7',
      text: '#0F172A',
      textMuted: '#64748B',
      textInverse: '#FFFFFF',
      border: '#B7E2CD',
      borderHover: '#93D3B4',
      divider: '#B7E2CD',
      rating: '#FBBF24',
    },
    gradients: {
      primary: 'linear-gradient(135deg, #109D58 0%, #64BF92 100%)',
      secondary: 'linear-gradient(135deg, #0A6639 0%, #0E854B 100%)',
      hero: 'linear-gradient(180deg, rgba(10,102,57,0.8) 0%, rgba(16,157,88,0.4) 100%)',
      card: 'linear-gradient(180deg, #E7F5EE 0%, #FFFFFF 100%)',
      button: 'linear-gradient(135deg, #109D58 0%, #0E854B 100%)',
      overlay: 'linear-gradient(180deg, rgba(15,23,42,0.6) 0%, rgba(15,23,42,0.2) 100%)',
    },
    shadows: {
      sm: '0 1px 2px 0 rgba(16, 157, 88, 0.05)',
      md: '0 4px 6px -1px rgba(16, 157, 88, 0.1)',
      lg: '0 10px 15px -3px rgba(16, 157, 88, 0.1)',
      xl: '0 20px 25px -5px rgba(16, 157, 88, 0.1)',
      primary: '0 4px 14px 0 rgba(16, 157, 88, 0.35)',
      card: '0 4px 20px rgba(16, 157, 88, 0.12)',
      button: '0 4px 14px 0 rgba(16, 157, 88, 0.4)',
      dropdown: '0 10px 40px rgba(16, 157, 88, 0.15)',
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
        background: 'rgba(243, 250, 247, 0.92)',
        backgroundScrolled: 'rgba(255, 255, 255, 0.96)',
        textColor: '#0F172A',
        style: 'solid' as const,
        position: 'sticky' as const,
        blur: true,
      },
      footer: {
        background: '#0A6639',
        textColor: '#E7F5EE',
        style: 'dark' as const,
      },
      buttons: {
        style: 'rounded' as const,
        primaryBg: '#109D58',
        primaryText: '#FFFFFF',
        primaryHoverBg: '#0E854B',
        secondaryBg: '#0A6639',
        secondaryText: '#FFFFFF',
        outlineBorderColor: '#109D58',
      },
      cards: {
        style: 'elevated' as const,
        background: '#FFFFFF',
        hoverTransform: 'translateY(-6px)',
        imageBorderRadius: '10px',
      },
      badges: {
        background: '#109D58',
        textColor: '#FFFFFF',
        style: 'pill' as const,
      },
      inputs: {
        background: '#FFFFFF',
        borderColor: '#B7E2CD',
        focusBorderColor: '#109D58',
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
    ogImage: generatePlaceholderOgImage('Sharm+Excursions', '109D58', 'Diving+Paradise'),
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
    backgroundColor: '#109D58',
    textColor: '#FFFFFF',
    dismissible: true,
  },
  isActive: true,
  isDefault: false,
  websiteStatus: 'active' as const,
};

// ============================================================================
// 7. ASWAN EXCURSIONS
// Theme: Desert Stone - Warm Stone, Deep Stone, Light Stone, Soft stone tint
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
    primaryColor: '#8C827C',       // Warm Stone
    secondaryColor: '#5B5551',     // Deep Stone
    accentColor: '#B4AEAA',        // Light Stone
    backgroundColor: '#F9F9F8',   // Soft stone tint
    textColor: '#0F172A',
    fontFamily: 'Source Sans Pro',
    fontFamilyHeading: 'Playfair Display',
    borderRadius: '12px',
  },
  theme: {
    themeId: 'desert-stone',
    themeName: 'Desert Stone',
    colors: {
      primary: '#8C827C',
      primaryHover: '#776F69',
      primaryLight: '#F4F3F2',
      secondary: '#5B5551',
      secondaryHover: '#544E4A',
      accent: '#B4AEAA',
      accentHover: '#A39B96',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#0EA5E9',
      background: '#F9F9F8',
      backgroundAlt: '#EEECEB',
      surface: '#FFFFFF',
      surfaceHover: '#F9F9F8',
      text: '#0F172A',
      textMuted: '#64748B',
      textInverse: '#FFFFFF',
      border: '#DDDAD8',
      borderHover: '#CBC7C4',
      divider: '#DDDAD8',
      rating: '#FBBF24',
    },
    gradients: {
      primary: 'linear-gradient(135deg, #8C827C 0%, #B4AEAA 100%)',
      secondary: 'linear-gradient(135deg, #5B5551 0%, #776F69 100%)',
      hero: 'linear-gradient(180deg, rgba(91,85,81,0.8) 0%, rgba(140,130,124,0.4) 100%)',
      card: 'linear-gradient(180deg, #F4F3F2 0%, #FFFFFF 100%)',
      button: 'linear-gradient(135deg, #8C827C 0%, #776F69 100%)',
      overlay: 'linear-gradient(180deg, rgba(15,23,42,0.6) 0%, rgba(15,23,42,0.2) 100%)',
    },
    shadows: {
      sm: '0 1px 2px 0 rgba(140, 130, 124, 0.05)',
      md: '0 4px 6px -1px rgba(140, 130, 124, 0.1)',
      lg: '0 10px 15px -3px rgba(140, 130, 124, 0.1)',
      xl: '0 20px 25px -5px rgba(140, 130, 124, 0.1)',
      primary: '0 4px 14px 0 rgba(140, 130, 124, 0.35)',
      card: '0 4px 20px rgba(140, 130, 124, 0.12)',
      button: '0 4px 14px 0 rgba(140, 130, 124, 0.4)',
      dropdown: '0 10px 40px rgba(140, 130, 124, 0.15)',
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
        background: 'rgba(249, 249, 248, 0.92)',
        backgroundScrolled: 'rgba(255, 255, 255, 0.96)',
        textColor: '#0F172A',
        style: 'solid' as const,
        position: 'sticky' as const,
        blur: true,
      },
      footer: {
        background: '#5B5551',
        textColor: '#F4F3F2',
        style: 'dark' as const,
      },
      buttons: {
        style: 'rounded' as const,
        primaryBg: '#8C827C',
        primaryText: '#FFFFFF',
        primaryHoverBg: '#776F69',
        secondaryBg: '#5B5551',
        secondaryText: '#FFFFFF',
        outlineBorderColor: '#8C827C',
      },
      cards: {
        style: 'elevated' as const,
        background: '#FFFFFF',
        hoverTransform: 'translateY(-4px)',
        imageBorderRadius: '12px',
      },
      badges: {
        background: '#8C827C',
        textColor: '#FFFFFF',
        style: 'pill' as const,
      },
      inputs: {
        background: '#FFFFFF',
        borderColor: '#DDDAD8',
        focusBorderColor: '#8C827C',
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
    ogImage: generatePlaceholderOgImage('Aswan+Excursions', '8C827C', 'Nubian+Adventures'),
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
    backgroundColor: '#8C827C',
    textColor: '#FFFFFF',
    dismissible: true,
  },
  isActive: true,
  isDefault: false,
  websiteStatus: 'active' as const,
};

// ============================================================================
// 8. MARSA ALAM EXCURSIONS
// Theme: Forest Reef - Forest Green, Deep Forest, Light Forest Green, Soft green tint
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
    primaryColor: '#599345',       // Forest Green
    secondaryColor: '#3A602D',     // Deep Forest
    accentColor: '#93B986',         // Light Forest Green
    backgroundColor: '#F7FAF6',    // Soft green tint
    textColor: '#0F172A',
    fontFamily: 'Lato',
    fontFamilyHeading: 'Josefin Sans',
    borderRadius: '14px',
  },
  theme: {
    themeId: 'forest-reef',
    themeName: 'Forest Reef',
    colors: {
      primary: '#599345',
      primaryHover: '#4C7D3B',
      primaryLight: '#EEF4EC',
      secondary: '#3A602D',
      secondaryHover: '#355829',
      accent: '#93B986',
      accentHover: '#7AA96A',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#0EA5E9',
      background: '#F7FAF6',
      backgroundAlt: '#E6EFE3',
      surface: '#FFFFFF',
      surfaceHover: '#F7FAF6',
      text: '#0F172A',
      textMuted: '#64748B',
      textInverse: '#FFFFFF',
      border: '#CDDFC7',
      borderHover: '#B4CEAB',
      divider: '#CDDFC7',
      rating: '#FBBF24',
    },
    gradients: {
      primary: 'linear-gradient(135deg, #599345 0%, #93B986 100%)',
      secondary: 'linear-gradient(135deg, #3A602D 0%, #4C7D3B 100%)',
      hero: 'linear-gradient(180deg, rgba(58,96,45,0.8) 0%, rgba(89,147,69,0.4) 100%)',
      card: 'linear-gradient(180deg, #EEF4EC 0%, #FFFFFF 100%)',
      button: 'linear-gradient(135deg, #599345 0%, #4C7D3B 100%)',
      overlay: 'linear-gradient(180deg, rgba(15,23,42,0.6) 0%, rgba(15,23,42,0.2) 100%)',
    },
    shadows: {
      sm: '0 1px 2px 0 rgba(89, 147, 69, 0.05)',
      md: '0 4px 6px -1px rgba(89, 147, 69, 0.1)',
      lg: '0 10px 15px -3px rgba(89, 147, 69, 0.1)',
      xl: '0 20px 25px -5px rgba(89, 147, 69, 0.1)',
      primary: '0 4px 14px 0 rgba(89, 147, 69, 0.35)',
      card: '0 4px 20px rgba(89, 147, 69, 0.12)',
      button: '0 4px 14px 0 rgba(89, 147, 69, 0.4)',
      dropdown: '0 10px 40px rgba(89, 147, 69, 0.15)',
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
      header: { background: 'rgba(247, 250, 246, 0.92)', backgroundScrolled: 'rgba(255, 255, 255, 0.96)', textColor: '#0F172A', style: 'solid' as const, position: 'sticky' as const, blur: true },
      footer: { background: '#3A602D', textColor: '#EEF4EC', style: 'dark' as const },
      buttons: { style: 'rounded' as const, primaryBg: '#599345', primaryText: '#FFFFFF', primaryHoverBg: '#4C7D3B', secondaryBg: '#3A602D', secondaryText: '#FFFFFF', outlineBorderColor: '#599345' },
      cards: { style: 'elevated' as const, background: '#FFFFFF', hoverTransform: 'translateY(-4px)', imageBorderRadius: '14px' },
      badges: { background: '#599345', textColor: '#FFFFFF', style: 'pill' as const },
      inputs: { background: '#FFFFFF', borderColor: '#CDDFC7', focusBorderColor: '#599345', style: 'outlined' as const },
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
    ogImage: generatePlaceholderOgImage('Marsa+Alam+Excursions', '599345', 'Pristine+Reefs'),
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
    backgroundColor: '#599345',
    textColor: '#FFFFFF',
    dismissible: true,
  },
  isActive: true,
  isDefault: false,
  websiteStatus: 'active' as const,
};

// ============================================================================
// 9. DAHAB EXCURSIONS
// Theme: Serene Blue - Soft Blue, Deep Blue-Gray, Light Soft Blue, Soft blue tint
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
    primaryColor: '#9ABBDE',       // Soft Blue
    secondaryColor: '#647A90',     // Deep Blue-Gray
    accentColor: '#BDD3EA',        // Light Soft Blue
    backgroundColor: '#FAFCFD',    // Soft blue tint
    textColor: '#0F172A',
    fontFamily: 'Quicksand',
    fontFamilyHeading: 'Pacifico',
    borderRadius: '16px',
  },
  theme: {
    themeId: 'serene-blue',
    themeName: 'Serene Blue',
    colors: {
      primary: '#9ABBDE',
      primaryHover: '#839FBD',
      primaryLight: '#F5F8FC',
      secondary: '#647A90',
      secondaryHover: '#5C7085',
      accent: '#BDD3EA',
      accentHover: '#AEC9E5',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#0EA5E9',
      background: '#FAFCFD',
      backgroundAlt: '#F0F5FA',
      surface: '#FFFFFF',
      surfaceHover: '#FAFCFD',
      text: '#0F172A',
      textMuted: '#64748B',
      textInverse: '#FFFFFF',
      border: '#E1EBF5',
      borderHover: '#D2E0F0',
      divider: '#E1EBF5',
      rating: '#FBBF24',
    },
    gradients: {
      primary: 'linear-gradient(135deg, #9ABBDE 0%, #BDD3EA 100%)',
      secondary: 'linear-gradient(135deg, #647A90 0%, #839FBD 100%)',
      hero: 'linear-gradient(180deg, rgba(100,122,144,0.8) 0%, rgba(154,187,222,0.4) 100%)',
      card: 'linear-gradient(180deg, #F5F8FC 0%, #FFFFFF 100%)',
      button: 'linear-gradient(135deg, #9ABBDE 0%, #839FBD 100%)',
      overlay: 'linear-gradient(180deg, rgba(15,23,42,0.6) 0%, rgba(15,23,42,0.2) 100%)',
    },
    shadows: {
      sm: '0 1px 2px 0 rgba(154, 187, 222, 0.05)',
      md: '0 4px 6px -1px rgba(154, 187, 222, 0.1)',
      lg: '0 10px 15px -3px rgba(154, 187, 222, 0.1)',
      xl: '0 20px 25px -5px rgba(154, 187, 222, 0.1)',
      primary: '0 4px 14px 0 rgba(154, 187, 222, 0.35)',
      card: '0 4px 20px rgba(154, 187, 222, 0.12)',
      button: '0 4px 14px 0 rgba(154, 187, 222, 0.4)',
      dropdown: '0 10px 40px rgba(154, 187, 222, 0.15)',
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
      header: { background: 'rgba(250, 252, 253, 0.92)', backgroundScrolled: 'rgba(255, 255, 255, 0.96)', textColor: '#0F172A', style: 'solid' as const, position: 'sticky' as const, blur: true },
      footer: { background: '#647A90', textColor: '#F5F8FC', style: 'dark' as const },
      buttons: { style: 'rounded' as const, primaryBg: '#9ABBDE', primaryText: '#FFFFFF', primaryHoverBg: '#839FBD', secondaryBg: '#647A90', secondaryText: '#FFFFFF', outlineBorderColor: '#9ABBDE' },
      cards: { style: 'elevated' as const, background: '#FFFFFF', hoverTransform: 'translateY(-4px)', imageBorderRadius: '16px' },
      badges: { background: '#9ABBDE', textColor: '#FFFFFF', style: 'pill' as const },
      inputs: { background: '#FFFFFF', borderColor: '#E1EBF5', focusBorderColor: '#9ABBDE', style: 'outlined' as const },
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
    ogImage: generatePlaceholderOgImage('Dahab+Excursions', '9ABBDE', 'Adventure+Awaits'),
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
    backgroundColor: '#9ABBDE',
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
