// scripts/migrate-to-multi-tenant.ts
// Migration script to convert existing single-tenant data to multi-tenant
// Run with: npx tsx scripts/migrate-to-multi-tenant.ts

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is required');
  process.exit(1);
}

// Default tenant ID for existing data
const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || 'default';

// Tenant configurations for initial setup
const INITIAL_TENANTS = [
  {
    tenantId: 'default',
    name: 'Egypt Excursions Online',
    domain: 'egyptexcursionsonline.com',
    isDefault: true,
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
      defaultDescription: 'Discover Egypt\'s wonders with unforgettable tours and experiences. From Pyramids to Nile cruises, book your adventure today.',
      defaultKeywords: ['egypt tours', 'egypt excursions', 'pyramids tour', 'nile cruise', 'cairo tours'],
      ogImage: '/hero1.jpg',
    },
    contact: {
      email: 'info@egyptexcursionsonline.com',
      phone: '+20 100 000 0000',
      whatsapp: '+20100000000',
    },
  },
  {
    tenantId: 'hurghada',
    name: 'Hurghada Tours & Excursions',
    domain: 'hurghadatours.com',
    isDefault: false,
    branding: {
      logo: '/EEO-logo.png', // Update with Hurghada-specific logo
      logoAlt: 'Hurghada Tours',
      favicon: '/favicon.ico',
      primaryColor: '#0EA5E9', // Sky blue for beach/sea theme
      secondaryColor: '#0369A1',
      accentColor: '#FCD34D', // Sandy gold
      backgroundColor: '#FFFFFF',
      textColor: '#1F2937',
      fontFamily: 'Inter',
      borderRadius: '8px',
    },
    seo: {
      defaultTitle: 'Hurghada Tours & Excursions - Red Sea Adventures',
      titleSuffix: 'Hurghada Tours',
      defaultDescription: 'Book the best Hurghada tours and excursions. Snorkeling, diving, desert safaris, and island trips from Hurghada.',
      defaultKeywords: ['hurghada tours', 'hurghada excursions', 'red sea diving', 'hurghada snorkeling', 'giftun island'],
      ogImage: '/hero1.jpg',
    },
    contact: {
      email: 'info@hurghadatours.com',
      phone: '+20 100 000 0001',
      whatsapp: '+20100000001',
    },
  },
  {
    tenantId: 'cairo',
    name: 'Cairo Tours & Excursions',
    domain: 'cairotours.com',
    isDefault: false,
    branding: {
      logo: '/EEO-logo.png', // Update with Cairo-specific logo
      logoAlt: 'Cairo Tours',
      favicon: '/favicon.ico',
      primaryColor: '#C2410C', // Warm orange/terracotta
      secondaryColor: '#7C2D12',
      accentColor: '#FCD34D',
      backgroundColor: '#FFFFFF',
      textColor: '#1F2937',
      fontFamily: 'Inter',
      borderRadius: '8px',
    },
    seo: {
      defaultTitle: 'Cairo Tours & Excursions - Pyramids & Ancient Egypt',
      titleSuffix: 'Cairo Tours',
      defaultDescription: 'Explore Cairo with expert guides. Visit the Pyramids, Egyptian Museum, Khan el-Khalili, and more.',
      defaultKeywords: ['cairo tours', 'pyramids tour', 'egyptian museum', 'khan el khalili', 'giza pyramids'],
      ogImage: '/hero1.jpg',
    },
    contact: {
      email: 'info@cairotours.com',
      phone: '+20 100 000 0002',
      whatsapp: '+20100000002',
    },
  },
  {
    tenantId: 'luxor',
    name: 'Luxor Tours & Excursions',
    domain: 'luxortours.com',
    isDefault: false,
    branding: {
      logo: '/EEO-logo.png', // Update with Luxor-specific logo
      logoAlt: 'Luxor Tours',
      favicon: '/favicon.ico',
      primaryColor: '#B45309', // Ancient gold/amber
      secondaryColor: '#78350F',
      accentColor: '#059669',
      backgroundColor: '#FFFFFF',
      textColor: '#1F2937',
      fontFamily: 'Inter',
      borderRadius: '8px',
    },
    seo: {
      defaultTitle: 'Luxor Tours & Excursions - Valley of the Kings',
      titleSuffix: 'Luxor Tours',
      defaultDescription: 'Discover Luxor\'s ancient wonders. Visit the Valley of the Kings, Karnak Temple, and cruise the Nile.',
      defaultKeywords: ['luxor tours', 'valley of the kings', 'karnak temple', 'luxor temple', 'hot air balloon luxor'],
      ogImage: '/hero1.jpg',
    },
    contact: {
      email: 'info@luxortours.com',
      phone: '+20 100 000 0003',
      whatsapp: '+20100000003',
    },
  },
  {
    tenantId: 'sharm',
    name: 'Sharm El Sheikh Tours',
    domain: 'sharmtours.com',
    isDefault: false,
    branding: {
      logo: '/EEO-logo.png',
      logoAlt: 'Sharm Tours',
      favicon: '/favicon.ico',
      primaryColor: '#0891B2', // Teal/cyan for water
      secondaryColor: '#155E75',
      accentColor: '#F59E0B',
      backgroundColor: '#FFFFFF',
      textColor: '#1F2937',
      fontFamily: 'Inter',
      borderRadius: '8px',
    },
    seo: {
      defaultTitle: 'Sharm El Sheikh Tours - Sinai Adventures',
      titleSuffix: 'Sharm Tours',
      defaultDescription: 'Explore Sharm El Sheikh with diving, desert safaris, and Mount Sinai tours.',
      defaultKeywords: ['sharm el sheikh tours', 'sinai tours', 'ras mohammed', 'mount sinai', 'dahab day trip'],
      ogImage: '/hero1.jpg',
    },
    contact: {
      email: 'info@sharmtours.com',
      phone: '+20 100 000 0004',
      whatsapp: '+20100000004',
    },
  },
  {
    tenantId: 'aswan',
    name: 'Aswan Tours & Excursions',
    domain: 'aswantours.com',
    isDefault: false,
    branding: {
      logo: '/EEO-logo.png',
      logoAlt: 'Aswan Tours',
      favicon: '/favicon.ico',
      primaryColor: '#7C3AED', // Purple for Nubian theme
      secondaryColor: '#5B21B6',
      accentColor: '#F59E0B',
      backgroundColor: '#FFFFFF',
      textColor: '#1F2937',
      fontFamily: 'Inter',
      borderRadius: '8px',
    },
    seo: {
      defaultTitle: 'Aswan Tours & Excursions - Nubian Adventures',
      titleSuffix: 'Aswan Tours',
      defaultDescription: 'Discover Aswan with felucca rides, Philae Temple, and Abu Simbel tours.',
      defaultKeywords: ['aswan tours', 'abu simbel', 'philae temple', 'nubian village', 'felucca ride aswan'],
      ogImage: '/hero1.jpg',
    },
    contact: {
      email: 'info@aswantours.com',
      phone: '+20 100 000 0005',
      whatsapp: '+20100000005',
    },
  },
];

// Helper to add common fields to tenant
function buildFullTenant(tenant: any) {
  return {
    ...tenant,
    slug: tenant.tenantId,
    domains: [tenant.domain, `www.${tenant.domain}`],
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
      fromName: tenant.name,
      fromEmail: `noreply@${tenant.domain}`,
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
    integrations: {},
    customContent: {},
  };
}

async function migrate() {
  console.log('🚀 Starting multi-tenant migration...\n');
  
  try {
    // Connect to MongoDB
    console.log('📦 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI!);
    console.log('✅ Connected to MongoDB\n');
    
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }
    
    // Step 1: Create Tenants collection and seed initial tenants
    console.log('📝 Step 1: Creating initial tenants...');
    const tenantsCollection = db.collection('tenants');
    
    for (const tenant of INITIAL_TENANTS) {
      const fullTenant = buildFullTenant(tenant);
      
      const existingTenant = await tenantsCollection.findOne({ tenantId: tenant.tenantId });
      
      if (existingTenant) {
        console.log(`   ⏭️  Tenant "${tenant.tenantId}" already exists, skipping...`);
      } else {
        await tenantsCollection.insertOne({
          ...fullTenant,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log(`   ✅ Created tenant: ${tenant.name} (${tenant.tenantId})`);
      }
    }
    console.log('');
    
    // Step 2: Add tenantId to existing Tours
    console.log('📝 Step 2: Adding tenantId to Tours...');
    const toursCollection = db.collection('tours');
    const toursResult = await toursCollection.updateMany(
      { tenantId: { $exists: false } },
      { $set: { tenantId: DEFAULT_TENANT_ID } }
    );
    console.log(`   ✅ Updated ${toursResult.modifiedCount} tours with tenantId: "${DEFAULT_TENANT_ID}"\n`);
    
    // Step 3: Add tenantId to existing Destinations
    console.log('📝 Step 3: Adding tenantId to Destinations...');
    const destinationsCollection = db.collection('destinations');
    const destinationsResult = await destinationsCollection.updateMany(
      { tenantId: { $exists: false } },
      { $set: { tenantId: DEFAULT_TENANT_ID } }
    );
    console.log(`   ✅ Updated ${destinationsResult.modifiedCount} destinations\n`);
    
    // Step 4: Add tenantId to existing Categories
    console.log('📝 Step 4: Adding tenantId to Categories...');
    const categoriesCollection = db.collection('categories');
    const categoriesResult = await categoriesCollection.updateMany(
      { tenantId: { $exists: false } },
      { $set: { tenantId: DEFAULT_TENANT_ID } }
    );
    console.log(`   ✅ Updated ${categoriesResult.modifiedCount} categories\n`);
    
    // Step 5: Add tenantId to existing Bookings
    console.log('📝 Step 5: Adding tenantId to Bookings...');
    const bookingsCollection = db.collection('bookings');
    const bookingsResult = await bookingsCollection.updateMany(
      { tenantId: { $exists: false } },
      { $set: { tenantId: DEFAULT_TENANT_ID } }
    );
    console.log(`   ✅ Updated ${bookingsResult.modifiedCount} bookings\n`);
    
    // Step 6: Add tenantId to existing Reviews
    console.log('📝 Step 6: Adding tenantId to Reviews...');
    const reviewsCollection = db.collection('reviews');
    const reviewsResult = await reviewsCollection.updateMany(
      { tenantId: { $exists: false } },
      { $set: { tenantId: DEFAULT_TENANT_ID } }
    );
    console.log(`   ✅ Updated ${reviewsResult.modifiedCount} reviews\n`);
    
    // Step 7: Add tenantId to existing Blogs
    console.log('📝 Step 7: Adding tenantId to Blogs...');
    const blogsCollection = db.collection('blogs');
    const blogsResult = await blogsCollection.updateMany(
      { tenantId: { $exists: false } },
      { $set: { tenantId: DEFAULT_TENANT_ID } }
    );
    console.log(`   ✅ Updated ${blogsResult.modifiedCount} blog posts\n`);
    
    // Step 8: Add tenantId to existing AttractionPages
    console.log('📝 Step 8: Adding tenantId to AttractionPages...');
    const attractionPagesCollection = db.collection('attractionpages');
    const attractionPagesResult = await attractionPagesCollection.updateMany(
      { tenantId: { $exists: false } },
      { $set: { tenantId: DEFAULT_TENANT_ID } }
    );
    console.log(`   ✅ Updated ${attractionPagesResult.modifiedCount} attraction pages\n`);
    
    // Step 9: Add tenantId to existing HeroSettings
    console.log('📝 Step 9: Adding tenantId to HeroSettings...');
    const heroSettingsCollection = db.collection('herosettings');
    const heroSettingsResult = await heroSettingsCollection.updateMany(
      { tenantId: { $exists: false } },
      { $set: { tenantId: DEFAULT_TENANT_ID } }
    );
    console.log(`   ✅ Updated ${heroSettingsResult.modifiedCount} hero settings\n`);
    
    // Step 10: Add tenantId to existing Discounts
    console.log('📝 Step 10: Adding tenantId to Discounts...');
    const discountsCollection = db.collection('discounts');
    const discountsResult = await discountsCollection.updateMany(
      { tenantId: { $exists: false } },
      { $set: { tenantId: DEFAULT_TENANT_ID } }
    );
    console.log(`   ✅ Updated ${discountsResult.modifiedCount} discounts\n`);
    
    // Step 11: Create indexes for multi-tenant queries
    console.log('📝 Step 11: Creating multi-tenant indexes...');
    
    // Tours indexes
    try {
      await toursCollection.createIndex({ tenantId: 1, slug: 1 }, { unique: true, background: true });
      await toursCollection.createIndex({ tenantId: 1, isPublished: 1 }, { background: true });
      await toursCollection.createIndex({ tenantId: 1, isFeatured: 1, isPublished: 1 }, { background: true });
      console.log('   ✅ Created indexes for tours');
    } catch (e) {
      console.log('   ⚠️  Some tour indexes may already exist');
    }
    
    // Destinations indexes
    try {
      await destinationsCollection.createIndex({ tenantId: 1, slug: 1 }, { unique: true, background: true });
      await destinationsCollection.createIndex({ tenantId: 1, isPublished: 1 }, { background: true });
      console.log('   ✅ Created indexes for destinations');
    } catch (e) {
      console.log('   ⚠️  Some destination indexes may already exist');
    }
    
    // Categories indexes
    try {
      await categoriesCollection.createIndex({ tenantId: 1, slug: 1 }, { unique: true, background: true });
      await categoriesCollection.createIndex({ tenantId: 1, isPublished: 1 }, { background: true });
      console.log('   ✅ Created indexes for categories');
    } catch (e) {
      console.log('   ⚠️  Some category indexes may already exist');
    }
    
    // Bookings indexes
    try {
      await bookingsCollection.createIndex({ tenantId: 1, bookingReference: 1 }, { unique: true, background: true });
      await bookingsCollection.createIndex({ tenantId: 1, user: 1, createdAt: -1 }, { background: true });
      console.log('   ✅ Created indexes for bookings');
    } catch (e) {
      console.log('   ⚠️  Some booking indexes may already exist');
    }
    
    console.log('\n');
    
    // Summary
    console.log('═══════════════════════════════════════════════════════');
    console.log('                  MIGRATION COMPLETE');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log('📊 Summary:');
    console.log(`   • Tenants created: ${INITIAL_TENANTS.length}`);
    console.log(`   • Tours migrated: ${toursResult.modifiedCount}`);
    console.log(`   • Destinations migrated: ${destinationsResult.modifiedCount}`);
    console.log(`   • Categories migrated: ${categoriesResult.modifiedCount}`);
    console.log(`   • Bookings migrated: ${bookingsResult.modifiedCount}`);
    console.log(`   • Reviews migrated: ${reviewsResult.modifiedCount}`);
    console.log(`   • Blogs migrated: ${blogsResult.modifiedCount}`);
    console.log(`   • Attraction Pages migrated: ${attractionPagesResult.modifiedCount}`);
    console.log(`   • Hero Settings migrated: ${heroSettingsResult.modifiedCount}`);
    console.log(`   • Discounts migrated: ${discountsResult.modifiedCount}`);
    console.log('');
    console.log('🎉 All existing data has been assigned to tenant: "' + DEFAULT_TENANT_ID + '"');
    console.log('');
    console.log('📋 Next steps:');
    console.log('   1. Update your .env.local with TENANT_DOMAINS mapping');
    console.log('   2. Configure DNS for your tenant domains');
    console.log('   3. Add domain aliases in Netlify');
    console.log('   4. Create tenant-specific tours via admin dashboard');
    console.log('');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('📦 Disconnected from MongoDB');
  }
}

// Run migration
migrate();

