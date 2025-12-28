// lib/models/Tenant.ts
import mongoose, { Document, Schema, Model } from 'mongoose';

// Branding configuration interface
export interface IBranding {
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

// Extended Theme configuration interface for distinct UI/UX per tenant
export interface IThemeConfig {
  // Theme identity
  themeId: string; // e.g., 'ocean-adventure', 'desert-gold', 'modern-minimal'
  themeName: string;
  
  // Color palette (extended)
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
  
  // Gradients
  gradients: {
    primary: string;
    secondary: string;
    hero: string;
    card?: string;
    button?: string;
    overlay?: string;
  };
  
  // Shadows
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
  
  // Typography
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
  
  // Spacing & Layout
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
  
  // Component-specific theming
  components: {
    // Header styles
    header: {
      background: string;
      backgroundScrolled?: string;
      textColor: string;
      style: 'transparent' | 'solid' | 'gradient';
      position: 'fixed' | 'sticky' | 'static';
      blur?: boolean;
    };
    // Footer styles
    footer: {
      background: string;
      textColor: string;
      style: 'dark' | 'light' | 'colored';
    };
    // Button styles
    buttons: {
      style: 'rounded' | 'pill' | 'square';
      primaryBg: string;
      primaryText: string;
      primaryHoverBg: string;
      secondaryBg: string;
      secondaryText: string;
      outlineBorderColor: string;
    };
    // Card styles
    cards: {
      style: 'elevated' | 'bordered' | 'flat';
      background: string;
      hoverTransform?: string;
      imageBorderRadius: string;
    };
    // Badge/Chip styles
    badges: {
      background: string;
      textColor: string;
      style: 'rounded' | 'pill' | 'square';
    };
    // Input styles
    inputs: {
      background: string;
      borderColor: string;
      focusBorderColor: string;
      style: 'outlined' | 'filled' | 'underlined';
    };
  };
  
  // Animation settings
  animations: {
    enabled: boolean;
    duration: string;
    durationFast: string;
    durationSlow: string;
    easing: string;
    hoverScale?: string;
  };
  
  // Dark mode support
  darkMode?: {
    enabled: boolean;
    colors?: Partial<IThemeConfig['colors']>;
  };
}

// SEO configuration interface
export interface ISEO {
  defaultTitle: string;
  titleSuffix: string;
  defaultDescription: string;
  defaultKeywords: string[];
  ogImage: string;
  ogType?: string;
  twitterHandle?: string;
  twitterCardType?: string;
  googleAnalyticsId?: string;
  googleTagManagerId?: string;
  facebookPixelId?: string;
  structuredDataType?: string;
}

// Contact information interface
export interface IContact {
  email: string;
  supportEmail?: string;
  phone: string;
  whatsapp?: string;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  businessHours?: string;
}

// Social links interface
export interface ISocialLinks {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  youtube?: string;
  tiktok?: string;
  linkedin?: string;
  pinterest?: string;
  tripadvisor?: string;
}

// Feature flags interface
export interface IFeatures {
  enableBlog: boolean;
  enableReviews: boolean;
  enableWishlist: boolean;
  enableAISearch: boolean;
  enableIntercom: boolean;
  enableMultiCurrency: boolean;
  enableMultiLanguage: boolean;
  enableLiveChat: boolean;
  enableNewsletter: boolean;
  enablePromoBar: boolean;
  enableHotelPickup: boolean;
  enableGiftCards: boolean;
}

// Payment configuration interface
export interface IPaymentConfig {
  stripeAccountId?: string;
  stripePublishableKey?: string;
  currency: string;
  currencySymbol: string;
  supportedCurrencies?: string[];
  supportedPaymentMethods: string[];
  taxRate?: number;
  serviceFeePercent?: number;
  minBookingAmount?: number;
  maxBookingAmount?: number;
}

// Email configuration interface
export interface IEmailConfig {
  fromName: string;
  fromEmail: string;
  replyToEmail?: string;
  mailgunDomain?: string;
  emailTemplateTheme?: string;
}

// Localization configuration interface
export interface ILocalization {
  defaultLanguage: string;
  supportedLanguages: string[];
  defaultTimezone: string;
  dateFormat: string;
  timeFormat: string;
}

// Homepage configuration interface
export interface IHomepageConfig {
  heroType: 'slider' | 'video' | 'static';
  heroTitle?: string;
  heroSubtitle?: string;
  heroImages?: string[];
  heroVideoUrl?: string;
  showDestinations: boolean;
  showCategories: boolean;
  showFeaturedTours: boolean;
  showPopularInterests: boolean;
  showDayTrips: boolean;
  showReviews: boolean;
  showFAQ: boolean;
  showAboutUs: boolean;
  showPromoSection: boolean;
  // Featured tour IDs to display on homepage (overrides auto-selection)
  featuredTourIds?: mongoose.Types.ObjectId[];
  // Number of featured tours to show (if not using manual selection)
  featuredToursCount?: number;
  customSections?: {
    id: string;
    title: string;
    type: string;
    enabled: boolean;
    order: number;
    config?: Record<string, unknown>;
  }[];
}

// Main Tenant interface
export interface ITenant extends Document {
  // Identity
  tenantId: string;
  name: string;
  slug: string;
  
  // Domains
  domain: string;
  domains: string[];
  
  // Branding
  branding: IBranding;
  
  // Extended Theme (for distinct UI/UX per tenant)
  theme?: IThemeConfig;
  
  // SEO
  seo: ISEO;
  
  // Contact
  contact: IContact;
  
  // Social
  socialLinks: ISocialLinks;
  
  // Features
  features: IFeatures;
  
  // Payments
  payments: IPaymentConfig;
  
  // Email
  email: IEmailConfig;
  
  // Localization
  localization: ILocalization;
  
  // Homepage
  homepage: IHomepageConfig;
  
  // Relationships
  heroSettings?: mongoose.Types.ObjectId;
  primaryDestination?: mongoose.Types.ObjectId;
  allowedDestinations?: mongoose.Types.ObjectId[];
  allowedCategories?: mongoose.Types.ObjectId[];
  
  // Third-party integrations
  integrations: {
    intercomAppId?: string;
    algoliaIndexPrefix?: string;
    cloudinaryFolder?: string;
    sentryDsn?: string;
  };
  
  // Custom content
  customContent: {
    aboutUsContent?: string;
    footerContent?: string;
    termsContent?: string;
    privacyContent?: string;
    faqContent?: { question: string; answer: string }[];
  };
  
  // Promo bar
  promoBar?: {
    enabled: boolean;
    text: string;
    link?: string;
    backgroundColor?: string;
    textColor?: string;
    dismissible?: boolean;
  };
  
  // Status
  isActive: boolean;
  isDefault: boolean;
  websiteStatus: 'active' | 'coming_soon' | 'maintenance' | 'offline';
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Branding Schema
const BrandingSchema = new Schema<IBranding>({
  logo: {
    type: String,
    required: [true, 'Logo URL is required'],
    trim: true,
  },
  logoDark: {
    type: String,
    trim: true,
  },
  logoAlt: {
    type: String,
    required: [true, 'Logo alt text is required'],
    trim: true,
    maxlength: [100, 'Logo alt cannot exceed 100 characters'],
  },
  favicon: {
    type: String,
    required: [true, 'Favicon URL is required'],
    trim: true,
  },
  primaryColor: {
    type: String,
    required: true,
    default: '#E63946',
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Primary color must be a valid hex color'],
  },
  secondaryColor: {
    type: String,
    required: true,
    default: '#1D3557',
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Secondary color must be a valid hex color'],
  },
  accentColor: {
    type: String,
    required: true,
    default: '#F4A261',
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Accent color must be a valid hex color'],
  },
  backgroundColor: {
    type: String,
    default: '#FFFFFF',
  },
  textColor: {
    type: String,
    default: '#1F2937',
  },
  fontFamily: {
    type: String,
    required: true,
    default: 'Inter',
    trim: true,
  },
  fontFamilyHeading: {
    type: String,
    default: 'Inter',
    trim: true,
  },
  borderRadius: {
    type: String,
    default: '8px',
  },
}, { _id: false });

// SEO Schema
const SEOSchema = new Schema<ISEO>({
  defaultTitle: {
    type: String,
    required: [true, 'Default title is required'],
    trim: true,
    maxlength: [70, 'Default title cannot exceed 70 characters'],
  },
  titleSuffix: {
    type: String,
    required: true,
    trim: true,
    maxlength: [30, 'Title suffix cannot exceed 30 characters'],
  },
  defaultDescription: {
    type: String,
    required: [true, 'Default description is required'],
    trim: true,
    maxlength: [160, 'Default description cannot exceed 160 characters'],
  },
  defaultKeywords: [{
    type: String,
    trim: true,
    lowercase: true,
  }],
  ogImage: {
    type: String,
    required: [true, 'OG Image is required'],
    trim: true,
  },
  ogType: {
    type: String,
    default: 'website',
  },
  twitterHandle: {
    type: String,
    trim: true,
  },
  twitterCardType: {
    type: String,
    default: 'summary_large_image',
  },
  googleAnalyticsId: {
    type: String,
    trim: true,
  },
  googleTagManagerId: {
    type: String,
    trim: true,
  },
  facebookPixelId: {
    type: String,
    trim: true,
  },
  structuredDataType: {
    type: String,
    default: 'TravelAgency',
  },
}, { _id: false });

// Contact Schema
const ContactSchema = new Schema<IContact>({
  email: {
    type: String,
    required: [true, 'Contact email is required'],
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
  },
  supportEmail: {
    type: String,
    trim: true,
    lowercase: true,
  },
  phone: {
    type: String,
    required: [true, 'Contact phone is required'],
    trim: true,
  },
  whatsapp: {
    type: String,
    trim: true,
  },
  address: {
    type: String,
    trim: true,
  },
  city: {
    type: String,
    trim: true,
  },
  country: {
    type: String,
    trim: true,
  },
  postalCode: {
    type: String,
    trim: true,
  },
  businessHours: {
    type: String,
    trim: true,
  },
}, { _id: false });

// Social Links Schema
const SocialLinksSchema = new Schema<ISocialLinks>({
  facebook: { type: String, trim: true },
  instagram: { type: String, trim: true },
  twitter: { type: String, trim: true },
  youtube: { type: String, trim: true },
  tiktok: { type: String, trim: true },
  linkedin: { type: String, trim: true },
  pinterest: { type: String, trim: true },
  tripadvisor: { type: String, trim: true },
}, { _id: false });

// Features Schema
const FeaturesSchema = new Schema<IFeatures>({
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
}, { _id: false });

// Payment Config Schema
const PaymentConfigSchema = new Schema<IPaymentConfig>({
  stripeAccountId: { type: String, trim: true },
  stripePublishableKey: { type: String, trim: true },
  currency: {
    type: String,
    required: true,
    default: 'USD',
    uppercase: true,
  },
  currencySymbol: {
    type: String,
    required: true,
    default: '$',
  },
  supportedCurrencies: [{
    type: String,
    uppercase: true,
  }],
  supportedPaymentMethods: [{
    type: String,
    enum: ['card', 'paypal', 'bank', 'cash', 'pay_later', 'apple_pay', 'google_pay'],
  }],
  taxRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  serviceFeePercent: {
    type: Number,
    default: 0,
    min: 0,
    max: 50,
  },
  minBookingAmount: {
    type: Number,
    default: 0,
  },
  maxBookingAmount: {
    type: Number,
    default: 100000,
  },
}, { _id: false });

// Email Config Schema
const EmailConfigSchema = new Schema<IEmailConfig>({
  fromName: {
    type: String,
    required: true,
    trim: true,
  },
  fromEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  replyToEmail: {
    type: String,
    trim: true,
    lowercase: true,
  },
  mailgunDomain: {
    type: String,
    trim: true,
  },
  emailTemplateTheme: {
    type: String,
    default: 'default',
  },
}, { _id: false });

// Localization Schema
const LocalizationSchema = new Schema<ILocalization>({
  defaultLanguage: {
    type: String,
    required: true,
    default: 'en',
    lowercase: true,
  },
  supportedLanguages: [{
    type: String,
    lowercase: true,
  }],
  defaultTimezone: {
    type: String,
    required: true,
    default: 'Africa/Cairo',
  },
  dateFormat: {
    type: String,
    default: 'DD/MM/YYYY',
  },
  timeFormat: {
    type: String,
    default: 'HH:mm',
  },
}, { _id: false });

// Homepage Config Schema
const HomepageConfigSchema = new Schema<IHomepageConfig>({
  heroType: {
    type: String,
    enum: ['slider', 'video', 'static'],
    default: 'slider',
  },
  heroTitle: {
    type: String,
    trim: true,
    maxlength: [200, 'Hero title cannot exceed 200 characters'],
  },
  heroSubtitle: {
    type: String,
    trim: true,
    maxlength: [500, 'Hero subtitle cannot exceed 500 characters'],
  },
  heroImages: [{
    type: String,
    trim: true,
  }],
  heroVideoUrl: {
    type: String,
    trim: true,
  },
  showDestinations: { type: Boolean, default: true },
  showCategories: { type: Boolean, default: true },
  showFeaturedTours: { type: Boolean, default: true },
  showPopularInterests: { type: Boolean, default: true },
  showDayTrips: { type: Boolean, default: true },
  showReviews: { type: Boolean, default: true },
  showFAQ: { type: Boolean, default: true },
  showAboutUs: { type: Boolean, default: true },
  showPromoSection: { type: Boolean, default: false },
  featuredTourIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tour',
  }],
  featuredToursCount: {
    type: Number,
    default: 8,
    min: 1,
    max: 24,
  },
  customSections: [{
    id: String,
    title: String,
    type: String,
    enabled: Boolean,
    order: Number,
    config: Schema.Types.Mixed,
  }],
}, { _id: false });

// Theme Config Schema - Extended theming for distinct UI/UX per tenant
const ThemeColorsSchema = new Schema({
  primary: { type: String, default: '#E63946' },
  primaryHover: { type: String, default: '#D32F3F' },
  primaryLight: { type: String, default: '#FEE2E2' },
  secondary: { type: String, default: '#1D3557' },
  secondaryHover: { type: String },
  accent: { type: String, default: '#F4A261' },
  accentHover: { type: String },
  success: { type: String, default: '#10B981' },
  warning: { type: String, default: '#F59E0B' },
  error: { type: String, default: '#EF4444' },
  info: { type: String, default: '#3B82F6' },
  background: { type: String, default: '#FFFFFF' },
  backgroundAlt: { type: String, default: '#F9FAFB' },
  surface: { type: String, default: '#FFFFFF' },
  surfaceHover: { type: String },
  text: { type: String, default: '#1F2937' },
  textMuted: { type: String, default: '#6B7280' },
  textInverse: { type: String, default: '#FFFFFF' },
  border: { type: String, default: '#E5E7EB' },
  borderHover: { type: String },
  divider: { type: String, default: '#E5E7EB' },
  rating: { type: String, default: '#FBBF24' },
}, { _id: false });

const ThemeGradientsSchema = new Schema({
  primary: { type: String, default: 'linear-gradient(135deg, #E63946 0%, #D32F3F 100%)' },
  secondary: { type: String, default: 'linear-gradient(135deg, #1D3557 0%, #457B9D 100%)' },
  hero: { type: String, default: 'linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 100%)' },
  card: { type: String },
  button: { type: String },
  overlay: { type: String },
}, { _id: false });

const ThemeShadowsSchema = new Schema({
  sm: { type: String, default: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' },
  md: { type: String, default: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' },
  lg: { type: String, default: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' },
  xl: { type: String, default: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' },
  primary: { type: String, default: '0 4px 14px 0 rgba(230, 57, 70, 0.25)' },
  card: { type: String, default: '0 4px 20px rgba(0, 0, 0, 0.1)' },
  button: { type: String },
  dropdown: { type: String },
}, { _id: false });

const ThemeTypographySchema = new Schema({
  fontFamily: { type: String, default: 'Inter' },
  fontFamilyHeading: { type: String, default: 'Inter' },
  fontFamilyMono: { type: String, default: 'SFMono-Regular, Menlo, monospace' },
  baseFontSize: { type: String, default: '16px' },
  lineHeight: { type: String, default: '1.5' },
  headingLineHeight: { type: String, default: '1.2' },
  fontWeightNormal: { type: Number, default: 400 },
  fontWeightMedium: { type: Number, default: 500 },
  fontWeightSemibold: { type: Number, default: 600 },
  fontWeightBold: { type: Number, default: 700 },
  letterSpacing: { type: String, default: '0' },
  headingLetterSpacing: { type: String, default: '-0.02em' },
}, { _id: false });

const ThemeLayoutSchema = new Schema({
  borderRadius: { type: String, default: '8px' },
  borderRadiusSm: { type: String, default: '4px' },
  borderRadiusLg: { type: String, default: '12px' },
  borderRadiusXl: { type: String, default: '16px' },
  borderRadiusFull: { type: String, default: '9999px' },
  containerMaxWidth: { type: String, default: '1280px' },
  headerHeight: { type: String, default: '72px' },
  footerStyle: { type: String, enum: ['minimal', 'standard', 'expanded'], default: 'standard' },
}, { _id: false });

const ThemeComponentsSchema = new Schema({
  header: {
    background: { type: String, default: 'rgba(255, 255, 255, 0.95)' },
    backgroundScrolled: { type: String },
    textColor: { type: String, default: '#1F2937' },
    style: { type: String, enum: ['transparent', 'solid', 'gradient'], default: 'solid' },
    position: { type: String, enum: ['fixed', 'sticky', 'static'], default: 'sticky' },
    blur: { type: Boolean, default: true },
  },
  footer: {
    background: { type: String, default: '#1F2937' },
    textColor: { type: String, default: '#FFFFFF' },
    style: { type: String, enum: ['dark', 'light', 'colored'], default: 'dark' },
  },
  buttons: {
    style: { type: String, enum: ['rounded', 'pill', 'square'], default: 'rounded' },
    primaryBg: { type: String, default: '#E63946' },
    primaryText: { type: String, default: '#FFFFFF' },
    primaryHoverBg: { type: String, default: '#D32F3F' },
    secondaryBg: { type: String, default: '#1D3557' },
    secondaryText: { type: String, default: '#FFFFFF' },
    outlineBorderColor: { type: String, default: '#E5E7EB' },
  },
  cards: {
    style: { type: String, enum: ['elevated', 'bordered', 'flat'], default: 'elevated' },
    background: { type: String, default: '#FFFFFF' },
    hoverTransform: { type: String, default: 'translateY(-4px)' },
    imageBorderRadius: { type: String, default: '8px' },
  },
  badges: {
    background: { type: String, default: '#E63946' },
    textColor: { type: String, default: '#FFFFFF' },
    style: { type: String, enum: ['rounded', 'pill', 'square'], default: 'rounded' },
  },
  inputs: {
    background: { type: String, default: '#FFFFFF' },
    borderColor: { type: String, default: '#E5E7EB' },
    focusBorderColor: { type: String, default: '#E63946' },
    style: { type: String, enum: ['outlined', 'filled', 'underlined'], default: 'outlined' },
  },
}, { _id: false });

const ThemeAnimationsSchema = new Schema({
  enabled: { type: Boolean, default: true },
  duration: { type: String, default: '200ms' },
  durationFast: { type: String, default: '150ms' },
  durationSlow: { type: String, default: '300ms' },
  easing: { type: String, default: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  hoverScale: { type: String, default: '1.02' },
}, { _id: false });

const ThemeConfigSchema = new Schema<IThemeConfig>({
  themeId: { type: String, required: true, default: 'default' },
  themeName: { type: String, required: true, default: 'Default Theme' },
  colors: { type: ThemeColorsSchema, default: {} },
  gradients: { type: ThemeGradientsSchema, default: {} },
  shadows: { type: ThemeShadowsSchema, default: {} },
  typography: { type: ThemeTypographySchema, default: {} },
  layout: { type: ThemeLayoutSchema, default: {} },
  components: { type: ThemeComponentsSchema, default: {} },
  animations: { type: ThemeAnimationsSchema, default: {} },
  darkMode: {
    enabled: { type: Boolean, default: false },
    colors: { type: Schema.Types.Mixed },
  },
}, { _id: false });

// Main Tenant Schema
const TenantSchema: Schema<ITenant> = new Schema({
  // Identity
  tenantId: {
    type: String,
    required: [true, 'Tenant ID is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[a-z0-9-]+$/, 'Tenant ID can only contain lowercase letters, numbers, and hyphens'],
    minlength: [2, 'Tenant ID must be at least 2 characters'],
    maxlength: [50, 'Tenant ID cannot exceed 50 characters'],
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Tenant name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [100, 'Name cannot exceed 100 characters'],
  },
  slug: {
    type: String,
    required: [true, 'Slug is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'],
  },
  
  // Domains
  domain: {
    type: String,
    required: [true, 'Primary domain is required'],
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  domains: [{
    type: String,
    lowercase: true,
    trim: true,
  }],
  
  // Configuration objects
  branding: {
    type: BrandingSchema,
    required: true,
  },
  theme: {
    type: ThemeConfigSchema,
    default: null,
  },
  seo: {
    type: SEOSchema,
    required: true,
  },
  contact: {
    type: ContactSchema,
    required: true,
  },
  socialLinks: {
    type: SocialLinksSchema,
    default: {},
  },
  features: {
    type: FeaturesSchema,
    required: true,
    default: {},
  },
  payments: {
    type: PaymentConfigSchema,
    required: true,
  },
  email: {
    type: EmailConfigSchema,
    required: true,
  },
  localization: {
    type: LocalizationSchema,
    required: true,
    default: {},
  },
  homepage: {
    type: HomepageConfigSchema,
    required: true,
    default: {},
  },
  
  // Relationships
  heroSettings: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HeroSettings',
  },
  primaryDestination: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Destination',
  },
  allowedDestinations: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Destination',
  }],
  allowedCategories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
  }],
  
  // Third-party integrations
  integrations: {
    intercomAppId: { type: String, trim: true },
    algoliaIndexPrefix: { type: String, trim: true },
    cloudinaryFolder: { type: String, trim: true },
    sentryDsn: { type: String, trim: true },
  },
  
  // Custom content
  customContent: {
    aboutUsContent: { type: String },
    footerContent: { type: String },
    termsContent: { type: String },
    privacyContent: { type: String },
    faqContent: [{
      question: String,
      answer: String,
    }],
  },
  
  // Promo bar
  promoBar: {
    enabled: { type: Boolean, default: false },
    text: { type: String, trim: true },
    link: { type: String, trim: true },
    backgroundColor: { type: String, default: '#E63946' },
    textColor: { type: String, default: '#FFFFFF' },
    dismissible: { type: Boolean, default: true },
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  isDefault: {
    type: Boolean,
    default: false,
    index: true,
  },
  websiteStatus: {
    type: String,
    enum: ['active', 'coming_soon', 'maintenance', 'offline'],
    default: 'active',
    index: true,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes for performance
TenantSchema.index({ tenantId: 1 }, { unique: true });
TenantSchema.index({ domain: 1 }, { unique: true });
TenantSchema.index({ domains: 1 });
TenantSchema.index({ isActive: 1, isDefault: 1 });
TenantSchema.index({ slug: 1 }, { unique: true });

// Pre-save middleware
TenantSchema.pre('save', async function(this: ITenant, next: () => void) {
  // Auto-generate slug from tenantId if not provided
  if (this.isModified('tenantId') && !this.isModified('slug')) {
    this.slug = this.tenantId;
  }
  
  // Ensure only one default tenant
  if (this.isDefault && this.isModified('isDefault')) {
    await (this.constructor as Model<ITenant>).updateMany(
      { _id: { $ne: this._id }, isDefault: true },
      { $set: { isDefault: false } }
    );
  }
  
  // Add primary domain to domains array if not present
  if (this.domain && !this.domains.includes(this.domain)) {
    this.domains.unshift(this.domain);
  }
  
  // Add www variant of primary domain
  const wwwDomain = `www.${this.domain}`;
  if (!this.domains.includes(wwwDomain)) {
    this.domains.push(wwwDomain);
  }
  
  next();
});

// Virtual for full URL
TenantSchema.virtual('url').get(function(this: ITenant) {
  return `https://${this.domain}`;
});

// Virtual for all domain URLs
TenantSchema.virtual('allUrls').get(function(this: ITenant) {
  return this.domains.map((d: string) => `https://${d}`);
});

// Static methods
TenantSchema.statics.findByDomain = async function(domain: string) {
  const normalizedDomain = domain.toLowerCase().replace(/^www\./, '');
  return this.findOne({
    $or: [
      { domain: normalizedDomain },
      { domain: `www.${normalizedDomain}` },
      { domains: normalizedDomain },
      { domains: `www.${normalizedDomain}` },
    ],
    isActive: true,
  });
};

TenantSchema.statics.findByTenantId = async function(tenantId: string) {
  return this.findOne({ tenantId, isActive: true });
};

TenantSchema.statics.getDefault = async function() {
  return this.findOne({ isDefault: true, isActive: true });
};

TenantSchema.statics.getAllActive = async function() {
  return this.find({ isActive: true }).sort({ name: 1 });
};

// Instance methods
TenantSchema.methods.getPublicConfig = function() {
  return {
    tenantId: this.tenantId,
    name: this.name,
    domain: this.domain,
    branding: this.branding,
    seo: {
      defaultTitle: this.seo.defaultTitle,
      titleSuffix: this.seo.titleSuffix,
      defaultDescription: this.seo.defaultDescription,
      ogImage: this.seo.ogImage,
    },
    contact: {
      email: this.contact.email,
      phone: this.contact.phone,
      whatsapp: this.contact.whatsapp,
    },
    socialLinks: this.socialLinks,
    features: this.features,
    localization: {
      defaultLanguage: this.localization.defaultLanguage,
      supportedLanguages: this.localization.supportedLanguages,
    },
    payments: {
      currency: this.payments.currency,
      currencySymbol: this.payments.currencySymbol,
      supportedCurrencies: this.payments.supportedCurrencies,
    },
  };
};

const Tenant: Model<ITenant> = mongoose.models.Tenant || mongoose.model<ITenant>('Tenant', TenantSchema);

export default Tenant;

