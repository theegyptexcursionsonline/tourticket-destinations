#!/usr/bin/env npx tsx
// scripts/setup-speedboat-database.ts
// Sets up a separate database for the speedboat domain
// Copies relevant tours and creates all necessary data
// Run with: pnpm tenant:setup-speedboat-db

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config();

const MAIN_MONGODB_URI = process.env.MONGODB_URI;
const SPEEDBOAT_MONGODB_URI = process.env.MONGODB_URI_SPEEDBOAT;

if (!MAIN_MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is required');
  process.exit(1);
}

if (!SPEEDBOAT_MONGODB_URI) {
  console.error('❌ MONGODB_URI_SPEEDBOAT environment variable is required');
  console.error('');
  console.error('Add to your .env.local:');
  console.error('MONGODB_URI_SPEEDBOAT=mongodb+srv://user:pass@cluster.mongodb.net/speedboat-db');
  console.error('');
  process.exit(1);
}

// Keywords that identify speedboat/water activity tours
const SPEEDBOAT_KEYWORDS = [
  'speedboat', 'speed boat', 'motor boat', 'motorboat',
  'giftun', 'orange bay', 'mahmya', 'utopia', 'paradise island',
  'snorkeling', 'snorkel', 'diving', 'dive', 'scuba',
  'dolphin', 'dolphins', 'dolphin house', 'dolphin watching',
  'glass boat', 'glass bottom', 'semi submarine', 'submarine', 'yacht',
  'parasailing', 'jet ski', 'jetski', 'banana boat', 'water sports',
  'fishing', 'fishing trip', 'sunset cruise', 'boat trip', 'boat tour',
  'island trip', 'island tour', 'red sea',
];

interface CopyStats {
  tours: number;
  destinations: number;
  categories: number;
  heroSettings: number;
}

async function setupSpeedboatDatabase() {
  console.log('🚤 Speedboat Database Setup Script');
  console.log('═'.repeat(60));
  console.log('');
  console.log('📋 Configuration:');
  console.log(`   Main DB: ${MAIN_MONGODB_URI?.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`);
  console.log(`   Speedboat DB: ${SPEEDBOAT_MONGODB_URI?.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`);
  console.log('');

  // Create two separate connections
  const mainConn = await mongoose.createConnection(MAIN_MONGODB_URI!).asPromise();
  console.log('✅ Connected to main database');
  
  const speedboatConn = await mongoose.createConnection(SPEEDBOAT_MONGODB_URI!).asPromise();
  console.log('✅ Connected to speedboat database');
  console.log('');

  const stats: CopyStats = {
    tours: 0,
    destinations: 0,
    categories: 0,
    heroSettings: 0,
  };

  try {
    const mainDb = mainConn.db;
    const speedboatDb = speedboatConn.db;

    if (!mainDb || !speedboatDb) {
      throw new Error('Database connections not established');
    }

    // Step 1: Create the speedboat tenant
    console.log('📝 Step 1: Setting up tenant...');
    const tenantsCollection = speedboatDb.collection('tenants');
    
    const speedboatTenant = {
      tenantId: 'hurghada-speedboat',
      name: 'Hurghada Speedboat Adventures',
      slug: 'hurghada-speedboat',
      domain: 'hurghadaspeedboat.com',
      domains: ['hurghadaspeedboat.com', 'www.hurghadaspeedboat.com'],
      branding: {
        logo: '/branding/hurghada-speedboat-logo.png',
        logoAlt: 'Hurghada Speedboat Adventures',
        favicon: '/favicon.ico',
        primaryColor: '#00E0FF',
        secondaryColor: '#001230',
        accentColor: '#64FFDA',
        backgroundColor: '#FFFFFF',
        textColor: '#1F2937',
        fontFamily: 'Inter',
        borderRadius: '12px',
      },
      seo: {
        defaultTitle: 'Hurghada Speedboat Adventures - Red Sea Thrills',
        titleSuffix: 'Hurghada Speedboat',
        defaultDescription: 'Experience the ultimate Red Sea adventure with speedboat tours, snorkeling, and island trips in Hurghada.',
        defaultKeywords: ['hurghada speedboat', 'red sea tours', 'snorkeling hurghada', 'giftun island', 'orange bay'],
        ogImage: '/branding/hurghada-speedboat-og.jpg',
      },
      contact: {
        email: 'info@hurghadaspeedboat.com',
        phone: '+20 100 000 0000',
        whatsapp: '+20 100 000 0000',
      },
      socialLinks: {
        facebook: 'https://facebook.com/hurghadaspeedboat',
        instagram: 'https://instagram.com/hurghadaspeedboat',
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
      },
      email: {
        fromName: 'Hurghada Speedboat Adventures',
        fromEmail: 'noreply@hurghadaspeedboat.com',
      },
      localization: {
        defaultLanguage: 'en',
        supportedLanguages: ['en', 'ar', 'de', 'ru'],
        defaultTimezone: 'Africa/Cairo',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: 'HH:mm',
      },
      homepage: {
        heroType: 'slider',
        showDestinations: false,
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
      isDefault: true, // Default in this database
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await tenantsCollection.deleteMany({ tenantId: 'hurghada-speedboat' });
    await tenantsCollection.insertOne(speedboatTenant);
    console.log('   ✅ Created speedboat tenant\n');

    // Step 2: Copy Hurghada destination
    console.log('📝 Step 2: Copying destinations...');
    const mainDestinations = mainDb.collection('destinations');
    const speedboatDestinations = speedboatDb.collection('destinations');
    
    // Find Hurghada-related destinations
    const hurghadaDestinations = await mainDestinations.find({
      $or: [
        { name: { $regex: /hurghada/i } },
        { slug: { $regex: /hurghada/i } },
        { name: { $regex: /el.?gouna/i } },
        { name: { $regex: /makadi/i } },
        { name: { $regex: /sahl.?hasheesh/i } },
      ]
    }).toArray();

    if (hurghadaDestinations.length > 0) {
      // Clear existing destinations
      await speedboatDestinations.deleteMany({});
      
      // Copy with updated tenantId
      const destinationsToInsert = hurghadaDestinations.map(dest => ({
        ...dest,
        _id: dest._id, // Keep same ID for reference
        tenantId: 'hurghada-speedboat',
        updatedAt: new Date(),
      }));
      
      await speedboatDestinations.insertMany(destinationsToInsert);
      stats.destinations = destinationsToInsert.length;
      console.log(`   ✅ Copied ${stats.destinations} destinations\n`);
    } else {
      // Create a default Hurghada destination
      await speedboatDestinations.deleteMany({});
      await speedboatDestinations.insertOne({
        name: 'Hurghada',
        slug: 'hurghada',
        description: 'Experience the beauty of the Red Sea in Hurghada, Egypt\'s premier beach resort destination.',
        country: 'Egypt',
        image: '/images/hurghada.jpg',
        tenantId: 'hurghada-speedboat',
        isPublished: true,
        featured: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      stats.destinations = 1;
      console.log(`   ✅ Created default Hurghada destination\n`);
    }

    // Step 3: Copy relevant categories
    console.log('📝 Step 3: Copying categories...');
    const mainCategories = mainDb.collection('categories');
    const speedboatCategories = speedboatDb.collection('categories');
    
    const waterCategories = await mainCategories.find({
      $or: [
        { name: { $regex: /boat|snorkel|div|water|sea|island|fish|parasail|dolphin/i } },
        { slug: { $regex: /boat|snorkel|div|water|sea|island|fish|parasail|dolphin/i } },
      ]
    }).toArray();

    await speedboatCategories.deleteMany({});
    
    if (waterCategories.length > 0) {
      const categoriesToInsert = waterCategories.map(cat => ({
        ...cat,
        tenantId: 'hurghada-speedboat',
        updatedAt: new Date(),
      }));
      await speedboatCategories.insertMany(categoriesToInsert);
      stats.categories = categoriesToInsert.length;
    } else {
      // Create default water activity categories
      const defaultCategories = [
        { name: 'Speedboat Tours', slug: 'speedboat-tours', icon: '🚤', description: 'High-speed adventures on the Red Sea' },
        { name: 'Snorkeling', slug: 'snorkeling', icon: '🤿', description: 'Explore crystal-clear waters and coral reefs' },
        { name: 'Island Trips', slug: 'island-trips', icon: '🏝️', description: 'Visit stunning islands and beaches' },
        { name: 'Dolphin Tours', slug: 'dolphin-tours', icon: '🐬', description: 'Meet the friendly dolphins of the Red Sea' },
        { name: 'Sunset Cruises', slug: 'sunset-cruises', icon: '🌅', description: 'Romantic sunset experiences on the water' },
        { name: 'Water Sports', slug: 'water-sports', icon: '🏄', description: 'Parasailing, jet ski, and more' },
        { name: 'Fishing Trips', slug: 'fishing-trips', icon: '🎣', description: 'Deep sea fishing adventures' },
        { name: 'Private Charters', slug: 'private-charters', icon: '⛵', description: 'Exclusive boat rentals for groups' },
      ];
      
      const categoriesToInsert = defaultCategories.map(cat => ({
        ...cat,
        tenantId: 'hurghada-speedboat',
        isPublished: true,
        featured: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
      
      await speedboatCategories.insertMany(categoriesToInsert);
      stats.categories = categoriesToInsert.length;
    }
    console.log(`   ✅ Set up ${stats.categories} categories\n`);

    // Step 4: Copy speedboat-related tours
    console.log('📝 Step 4: Copying speedboat tours...');
    const mainTours = mainDb.collection('tours');
    const speedboatTours = speedboatDb.collection('tours');
    
    // Build regex patterns for keywords
    const keywordRegexes = SPEEDBOAT_KEYWORDS.map(k => new RegExp(k, 'i'));
    
    const matchingTours = await mainTours.find({
      isPublished: true,
      $or: [
        { title: { $in: keywordRegexes } },
        { description: { $in: keywordRegexes } },
        { tags: { $in: keywordRegexes } },
        { highlights: { $in: keywordRegexes } },
      ]
    }).toArray();

    await speedboatTours.deleteMany({});
    
    if (matchingTours.length > 0) {
      const toursToInsert = matchingTours.map(tour => ({
        ...tour,
        tenantId: 'hurghada-speedboat',
        updatedAt: new Date(),
      }));
      
      await speedboatTours.insertMany(toursToInsert);
      stats.tours = toursToInsert.length;
      console.log(`   ✅ Copied ${stats.tours} tours\n`);
      
      // List the tours
      console.log('   📋 Tours copied:');
      for (const tour of matchingTours.slice(0, 15)) {
        console.log(`      • ${tour.title}`);
      }
      if (matchingTours.length > 15) {
        console.log(`      ... and ${matchingTours.length - 15} more`);
      }
      console.log('');
    } else {
      console.log('   ⚠️  No matching tours found in main database');
      console.log('   💡 You can create tours via the admin panel\n');
    }

    // Step 5: Copy hero settings (or create default)
    console.log('📝 Step 5: Setting up hero settings...');
    const speedboatHeroSettings = speedboatDb.collection('herosettings');
    
    await speedboatHeroSettings.deleteMany({});
    await speedboatHeroSettings.insertOne({
      tenantId: 'hurghada-speedboat',
      title: 'Red Sea Adventures Await',
      backgroundImages: [
        '/images/speedboat-hero-1.jpg',
        '/images/speedboat-hero-2.jpg',
        '/images/speedboat-hero-3.jpg',
      ],
      currentActiveImage: 0,
      searchSuggestions: [
        'Giftun Island',
        'Orange Bay',
        'Dolphin House',
        'Snorkeling Trip',
        'Sunset Cruise',
        'Private Boat',
      ],
      floatingTags: [
        { text: 'Speedboat Tours', color: '#00E0FF' },
        { text: 'Snorkeling', color: '#64FFDA' },
        { text: 'Island Trips', color: '#00E0FF' },
        { text: 'Dolphin Watching', color: '#64FFDA' },
      ],
      trustIndicators: [
        { icon: 'shield', text: 'Licensed & Insured' },
        { icon: 'star', text: '5000+ Happy Customers' },
        { icon: 'clock', text: 'Free Cancellation' },
      ],
      overlaySettings: {
        opacity: 0.4,
        gradient: 'linear-gradient(to bottom, rgba(0,18,48,0.7), rgba(0,18,48,0.3))',
      },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    stats.heroSettings = 1;
    console.log('   ✅ Created hero settings\n');

    // Step 6: Copy reviews for the tours (if any)
    console.log('📝 Step 6: Copying reviews...');
    if (stats.tours > 0) {
      const mainReviews = mainDb.collection('reviews');
      const speedboatReviews = speedboatDb.collection('reviews');
      
      const tourIds = matchingTours.map(t => t._id);
      const relatedReviews = await mainReviews.find({
        tour: { $in: tourIds }
      }).toArray();
      
      await speedboatReviews.deleteMany({});
      
      if (relatedReviews.length > 0) {
        const reviewsToInsert = relatedReviews.map(review => ({
          ...review,
          tenantId: 'hurghada-speedboat',
        }));
        await speedboatReviews.insertMany(reviewsToInsert);
        console.log(`   ✅ Copied ${relatedReviews.length} reviews\n`);
      } else {
        console.log('   ℹ️  No reviews to copy\n');
      }
    }

    // Summary
    console.log('═'.repeat(60));
    console.log('                 SETUP COMPLETE');
    console.log('═'.repeat(60));
    console.log('');
    console.log('📊 Summary:');
    console.log(`   • Tenant: Created`);
    console.log(`   • Destinations: ${stats.destinations}`);
    console.log(`   • Categories: ${stats.categories}`);
    console.log(`   • Tours: ${stats.tours}`);
    console.log(`   • Hero Settings: ${stats.heroSettings}`);
    console.log('');
    console.log('🔧 Next Steps:');
    console.log('   1. Add MONGODB_URI_SPEEDBOAT to your production environment');
    console.log('   2. Upload branding assets to /public/branding/');
    console.log('   3. Test locally: PORT=3004 pnpm dev:original');
    console.log('   4. Access admin panel to add/edit tours');
    console.log('');
    console.log('🌐 Access:');
    console.log('   • Local: http://localhost:3004');
    console.log('   • Production: https://hurghadaspeedboat.com');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mainConn.close();
    await speedboatConn.close();
    console.log('📦 Disconnected from databases');
  }
}

// Run the setup
setupSpeedboatDatabase();
