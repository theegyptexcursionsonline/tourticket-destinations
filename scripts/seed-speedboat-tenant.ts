#!/usr/bin/env npx tsx
// scripts/seed-speedboat-tenant.ts
// Seed script to create/update the hurghada-speedboat tenant

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config();

// Define the Tenant schema inline to avoid import issues
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
    primaryColor: { type: String, default: '#00E0FF' },
    secondaryColor: { type: String, default: '#001230' },
    accentColor: { type: String, default: '#64FFDA' },
    backgroundColor: { type: String, default: '#FFFFFF' },
    textColor: { type: String, default: '#1F2937' },
    fontFamily: { type: String, default: 'Inter' },
    fontFamilyHeading: String,
    borderRadius: { type: String, default: '8px' },
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
    backgroundColor: { type: String, default: '#00E0FF' },
    textColor: { type: String, default: '#001230' },
    dismissible: { type: Boolean, default: true },
  },
  isActive: { type: Boolean, default: true },
  isDefault: { type: Boolean, default: false },
}, { timestamps: true });

const Tenant = mongoose.models.Tenant || mongoose.model('Tenant', TenantSchema);

// Speedboat tenant configuration
const speedboatTenantConfig = {
  tenantId: 'hurghada-speedboat',
  name: 'Hurghada Speedboat Adventures',
  slug: 'hurghada-speedboat',
  domain: 'hurghadaspeedboat.com',
  domains: [
    'hurghadaspeedboat.com',
    'www.hurghadaspeedboat.com',
  ],
  branding: {
    logo: '/branding/hurghada-speedboat-logo.png',
    logoDark: '/branding/hurghada-speedboat-logo-dark.png',
    logoAlt: 'Hurghada Speedboat Adventures',
    favicon: '/branding/hurghada-speedboat-favicon.ico',
    primaryColor: '#00E0FF',
    secondaryColor: '#001230',
    accentColor: '#64FFDA',
    backgroundColor: '#FFFFFF',
    textColor: '#1F2937',
    fontFamily: 'Inter',
    fontFamilyHeading: 'Cinzel',
    borderRadius: '12px',
  },
  seo: {
    defaultTitle: 'Hurghada Speedboat Adventures - Red Sea Thrills',
    titleSuffix: 'Hurghada Speedboat',
    defaultDescription: 'Experience the ultimate Red Sea adventure! High-speed boat tours, snorkeling at Giftun Island, Orange Bay trips, sunset cruises, and private charters in Hurghada.',
    defaultKeywords: [
      'hurghada speedboat',
      'red sea speedboat',
      'giftun island tour',
      'orange bay hurghada',
      'snorkeling hurghada',
      'boat trip hurghada',
      'hurghada water sports',
      'private boat charter hurghada',
      'sunset cruise hurghada',
      'dolphin watching hurghada',
    ],
    ogImage: '/branding/hurghada-speedboat-og.jpg',
    ogType: 'website',
    structuredDataType: 'TravelAgency',
  },
  contact: {
    email: 'info@hurghadaspeedboat.com',
    supportEmail: 'support@hurghadaspeedboat.com',
    phone: '+20 100 000 0000',
    whatsapp: '+20 100 000 0000',
    address: 'Hurghada Marina',
    city: 'Hurghada',
    country: 'Egypt',
    businessHours: '7:00 AM - 8:00 PM (Egypt Time)',
  },
  socialLinks: {
    facebook: 'https://facebook.com/hurghadaspeedboat',
    instagram: 'https://instagram.com/hurghadaspeedboat',
    youtube: 'https://youtube.com/@hurghadaspeedboat',
    tiktok: 'https://tiktok.com/@hurghadaspeedboat',
    tripadvisor: 'https://tripadvisor.com/hurghadaspeedboat',
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
    enablePromoBar: false,
    enableHotelPickup: true,
    enableGiftCards: false,
  },
  payments: {
    currency: 'USD',
    currencySymbol: '$',
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'EGP'],
    supportedPaymentMethods: ['card', 'paypal'],
    taxRate: 0,
    serviceFeePercent: 0,
    minBookingAmount: 0,
    maxBookingAmount: 10000,
  },
  email: {
    fromName: 'Hurghada Speedboat Adventures',
    fromEmail: 'noreply@hurghadaspeedboat.com',
    replyToEmail: 'info@hurghadaspeedboat.com',
    emailTemplateTheme: 'speedboat',
  },
  localization: {
    defaultLanguage: 'en',
    supportedLanguages: ['en', 'ar', 'de', 'ru'],
    defaultTimezone: 'Africa/Cairo',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
  },
  homepage: {
    heroType: 'video' as const,
    heroTitle: 'Red Sea Speed Rush',
    heroSubtitle: 'Experience the thrill of high-speed adventures on the crystal-clear waters of Hurghada',
    heroImages: [
      '/images/speedboat-hero-1.jpg',
      '/images/speedboat-hero-2.jpg',
      '/images/speedboat-hero-3.jpg',
    ],
    showDestinations: false, // Speedboat is focused on Hurghada only
    showCategories: true,
    showFeaturedTours: true,
    showPopularInterests: true,
    showDayTrips: true,
    showReviews: true,
    showFAQ: true,
    showAboutUs: true,
    showPromoSection: false,
    featuredToursCount: 6,
  },
  integrations: {
    algoliaIndexPrefix: 'speedboat_',
    cloudinaryFolder: 'hurghada-speedboat',
  },
  customContent: {
    aboutUsContent: `
      <h2>About Hurghada Speedboat Adventures</h2>
      <p>We are Hurghada's premier speedboat tour operator, offering unforgettable experiences on the Red Sea since 2015.</p>
      <p>Our fleet of modern speedboats takes you to the most breathtaking spots along the Egyptian coast - from the pristine waters of Giftun Island to the stunning Orange Bay, and secret snorkeling coves that few tourists ever see.</p>
      <h3>Why Choose Us?</h3>
      <ul>
        <li>Professional, certified captains and crew</li>
        <li>Modern, well-maintained speedboats</li>
        <li>Premium snorkeling equipment included</li>
        <li>Small group sizes for personalized experiences</li>
        <li>Free hotel pickup & drop-off</li>
        <li>Multilingual guides (English, German, Russian, Arabic)</li>
      </ul>
    `,
    faqContent: [
      {
        question: 'What should I bring on a speedboat tour?',
        answer: 'We recommend bringing sunscreen (reef-safe preferred), a towel, sunglasses, a hat, and your camera. Snorkeling equipment is provided. Wear comfortable swimwear and bring a change of clothes.'
      },
      {
        question: 'Is hotel pickup included?',
        answer: 'Yes! Free hotel pickup and drop-off is included for all hotels in Hurghada, El Gouna, Makadi Bay, and Sahl Hasheesh.'
      },
      {
        question: 'Can I book a private speedboat?',
        answer: 'Absolutely! We offer private charter options for couples, families, and groups. Contact us for custom itineraries and pricing.'
      },
      {
        question: 'What about seasickness?',
        answer: 'Our experienced captains ensure smooth rides. However, if you are prone to motion sickness, we recommend taking medication 30 minutes before departure and choosing a seat at the center of the boat.'
      },
      {
        question: 'Are the tours suitable for children?',
        answer: 'Yes! Most of our tours are family-friendly. Children under 12 get discounted rates, and we have life jackets in all sizes. Minimum age varies by tour - check individual tour descriptions.'
      },
      {
        question: 'What is your cancellation policy?',
        answer: 'Free cancellation up to 24 hours before your tour. Cancellations made less than 24 hours before are subject to a 50% fee. No-shows are non-refundable.'
      },
    ],
  },
  promoBar: {
    enabled: false,
    text: '🚤 Early Bird Special: Book 7 days ahead and save 15%!',
    link: '/tours',
    backgroundColor: '#00E0FF',
    textColor: '#001230',
    dismissible: true,
  },
  isActive: true,
  isDefault: false,
};

async function seedSpeedboatTenant() {
  console.log('🚀 Starting Hurghada Speedboat tenant seed...\n');

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ MONGODB_URI environment variable is not set');
    process.exit(1);
  }

  try {
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Check if tenant already exists
    const existingTenant = await Tenant.findOne({ tenantId: 'hurghada-speedboat' });

    if (existingTenant) {
      console.log('📋 Existing speedboat tenant found. Updating...');
      
      // Update the tenant with new configuration
      await Tenant.updateOne(
        { tenantId: 'hurghada-speedboat' },
        { $set: speedboatTenantConfig }
      );
      
      console.log('✅ Hurghada Speedboat tenant updated successfully!\n');
    } else {
      console.log('📋 Creating new speedboat tenant...');
      
      // Create new tenant
      await Tenant.create(speedboatTenantConfig);
      
      console.log('✅ Hurghada Speedboat tenant created successfully!\n');
    }

    // Verify the tenant
    const tenant = await Tenant.findOne({ tenantId: 'hurghada-speedboat' }).lean();
    
    console.log('📊 Tenant Details:');
    console.log('   ID:', (tenant as any)?.tenantId);
    console.log('   Name:', (tenant as any)?.name);
    console.log('   Domain:', (tenant as any)?.domain);
    console.log('   Active:', (tenant as any)?.isActive);
    console.log('   Primary Color:', (tenant as any)?.branding?.primaryColor);
    console.log('   Created:', (tenant as any)?.createdAt);
    console.log('   Updated:', (tenant as any)?.updatedAt);
    console.log('');

    // Show domain mapping instructions
    console.log('📋 Domain Mapping (already configured in middleware.ts):');
    console.log('   • hurghadaspeedboat.com → hurghada-speedboat');
    console.log('   • www.hurghadaspeedboat.com → hurghada-speedboat');
    console.log('   • localhost:3004 → hurghada-speedboat (for local testing)');
    console.log('');

    console.log('🎉 Speedboat tenant setup complete!');
    console.log('');
    console.log('📝 Next steps:');
    console.log('   1. Create/assign tours with tenantId: "hurghada-speedboat"');
    console.log('   2. Upload branding assets to /public/branding/');
    console.log('   3. Test locally: pnpm dev then visit http://localhost:3004');
    console.log('   4. Configure DNS for hurghadaspeedboat.com → your hosting');

  } catch (error) {
    console.error('❌ Error seeding tenant:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n📡 Disconnected from MongoDB');
  }
}

// Run the seed function
seedSpeedboatTenant();
