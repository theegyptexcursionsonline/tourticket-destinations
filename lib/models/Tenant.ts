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

