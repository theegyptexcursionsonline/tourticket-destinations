#!/usr/bin/env npx tsx
// scripts/assign-speedboat-tours.ts
// Assigns speedboat-related tours to the hurghada-speedboat tenant
// Run with: pnpm tenant:assign-speedboat-tours

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const SPEEDBOAT_TENANT_ID = 'hurghada-speedboat';

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is required');
  process.exit(1);
}

// Keywords that identify speedboat/water activity tours
const SPEEDBOAT_KEYWORDS = [
  // Primary speedboat keywords
  'speedboat',
  'speed boat',
  'motor boat',
  'motorboat',
  'power boat',
  'powerboat',
  
  // Island and beach trips
  'giftun',
  'orange bay',
  'mahmya',
  'utopia',
  'paradise island',
  'island trip',
  'island tour',
  'island hopping',
  
  // Water activities
  'snorkeling',
  'snorkel',
  'diving',
  'dive',
  'scuba',
  'swimming',
  'swim with',
  
  // Marine life
  'dolphin',
  'dolphins',
  'dolphin house',
  'dolphin watching',
  'whale',
  'turtle',
  'sea turtle',
  'coral',
  'reef',
  
  // Boat types
  'glass boat',
  'glass bottom',
  'semi submarine',
  'semi-submarine',
  'submarine',
  'yacht',
  'catamaran',
  'boat trip',
  'boat tour',
  'boat excursion',
  'boat ride',
  
  // Water sports
  'parasailing',
  'jet ski',
  'jetski',
  'banana boat',
  'water sports',
  'watersports',
  'sea walker',
  'flyboard',
  'wakeboard',
  'kayak',
  'paddleboard',
  
  // Fishing
  'fishing',
  'fishing trip',
  'deep sea fishing',
  
  // Sunset/special trips
  'sunset cruise',
  'sunset boat',
  'dinner cruise',
  'party boat',
  'private boat',
  'private charter',
  
  // Red Sea specific
  'red sea',
  'hurghada sea',
  'hurghada boat',
  'hurghada snorkeling',
  'hurghada diving',
  'hurghada island',
];

// Destination names that indicate Hurghada-based water tours
const HURGHADA_DESTINATIONS = [
  'hurghada',
  'el gouna',
  'el-gouna',
  'makadi',
  'makadi bay',
  'sahl hasheesh',
  'soma bay',
  'safaga',
];

// Tags that strongly indicate speedboat tours
const SPEEDBOAT_TAGS = [
  'speedboat',
  'snorkeling',
  'diving',
  'boat trip',
  'island',
  'dolphin',
  'water sports',
  'red sea',
  'beach',
  'marine',
  'ocean',
  'sea',
  'coral',
  'reef',
];

// Categories that indicate water activities
const WATER_CATEGORIES = [
  'boat trips',
  'snorkeling',
  'diving',
  'water sports',
  'island tours',
  'marine life',
  'sea trips',
  'water activities',
];

interface TourMatch {
  _id: string;
  title: string;
  slug: string;
  matchReason: string[];
  score: number;
  currentTenantId?: string;
}

async function assignSpeedboatTours() {
  console.log('🚤 Speedboat Tours Assignment Script');
  console.log('═'.repeat(60));
  console.log('');

  try {
    // Connect to MongoDB
    console.log('📦 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI!);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    // Step 1: Ensure speedboat tenant exists
    console.log('📝 Step 1: Checking speedboat tenant...');
    const tenantsCollection = db.collection('tenants');
    const existingTenant = await tenantsCollection.findOne({ tenantId: SPEEDBOAT_TENANT_ID });

    if (!existingTenant) {
      console.log('   ⚠️  Speedboat tenant not found!');
      console.log('   💡 Run "pnpm tenant:seed-speedboat" first to create the tenant.');
      console.log('   Creating basic tenant now...\n');
      
      await tenantsCollection.insertOne({
        tenantId: SPEEDBOAT_TENANT_ID,
        name: 'Hurghada Speedboat Adventures',
        slug: SPEEDBOAT_TENANT_ID,
        domain: 'hurghadaspeedboat.com',
        domains: ['hurghadaspeedboat.com', 'www.hurghadaspeedboat.com'],
        branding: {
          logo: '/branding/hurghada-speedboat-logo.png',
          logoAlt: 'Hurghada Speedboat Adventures',
          favicon: '/branding/hurghada-speedboat-favicon.ico',
          primaryColor: '#00E0FF',
          secondaryColor: '#001230',
          accentColor: '#64FFDA',
          fontFamily: 'Inter',
        },
        seo: {
          defaultTitle: 'Hurghada Speedboat Adventures - Red Sea Thrills',
          titleSuffix: 'Hurghada Speedboat',
          defaultDescription: 'Experience the ultimate Red Sea adventure with speedboat tours, snorkeling, and island trips.',
          defaultKeywords: ['hurghada speedboat', 'red sea tours', 'snorkeling hurghada'],
          ogImage: '/branding/hurghada-speedboat-og.jpg',
        },
        contact: {
          email: 'info@hurghadaspeedboat.com',
          phone: '+20 100 000 0000',
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
          heroType: 'video',
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
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log('   ✅ Created speedboat tenant\n');
    } else {
      console.log('   ✅ Speedboat tenant exists\n');
    }

    // Step 2: Get all destinations to map IDs to names
    console.log('📝 Step 2: Loading destinations...');
    const destinationsCollection = db.collection('destinations');
    const destinations = await destinationsCollection.find({}).toArray();
    const destinationMap = new Map(destinations.map(d => [d._id.toString(), d]));
    console.log(`   ✅ Loaded ${destinations.length} destinations\n`);

    // Find Hurghada-related destination IDs
    const hurghadaDestinationIds = destinations
      .filter(d => {
        const name = (d.name || '').toLowerCase();
        const slug = (d.slug || '').toLowerCase();
        return HURGHADA_DESTINATIONS.some(h => name.includes(h) || slug.includes(h));
      })
      .map(d => d._id.toString());
    
    console.log(`   📍 Found ${hurghadaDestinationIds.length} Hurghada-area destinations`);
    
    // Step 3: Get all categories to map IDs to names
    console.log('📝 Step 3: Loading categories...');
    const categoriesCollection = db.collection('categories');
    const categories = await categoriesCollection.find({}).toArray();
    const categoryMap = new Map(categories.map(c => [c._id.toString(), c]));
    console.log(`   ✅ Loaded ${categories.length} categories\n`);

    // Find water-related category IDs
    const waterCategoryIds = categories
      .filter(c => {
        const name = (c.name || '').toLowerCase();
        const slug = (c.slug || '').toLowerCase();
        return WATER_CATEGORIES.some(w => name.includes(w) || slug.includes(w));
      })
      .map(c => c._id.toString());
    
    console.log(`   🏊 Found ${waterCategoryIds.length} water activity categories`);

    // Step 4: Analyze all tours
    console.log('\n📝 Step 4: Analyzing tours for speedboat matches...\n');
    const toursCollection = db.collection('tours');
    const allTours = await toursCollection.find({}).toArray();
    console.log(`   📊 Total tours to analyze: ${allTours.length}\n`);

    const matchedTours: TourMatch[] = [];
    const alreadyAssigned: TourMatch[] = [];

    for (const tour of allTours) {
      const matchReasons: string[] = [];
      let score = 0;

      const title = (tour.title || '').toLowerCase();
      const description = (tour.description || '').toLowerCase();
      const longDescription = (tour.longDescription || '').toLowerCase();
      const location = (tour.location || '').toLowerCase();
      const tags = (tour.tags || []).map((t: string) => t.toLowerCase());
      const highlights = (tour.highlights || []).map((h: string) => h.toLowerCase());

      // Check title (highest weight)
      for (const keyword of SPEEDBOAT_KEYWORDS) {
        if (title.includes(keyword.toLowerCase())) {
          matchReasons.push(`Title contains "${keyword}"`);
          score += 10;
        }
      }

      // Check description
      for (const keyword of SPEEDBOAT_KEYWORDS) {
        if (description.includes(keyword.toLowerCase())) {
          if (!matchReasons.some(r => r.includes(keyword))) {
            matchReasons.push(`Description contains "${keyword}"`);
            score += 5;
          }
        }
      }

      // Check tags
      for (const tag of tags) {
        if (SPEEDBOAT_TAGS.some(st => tag.includes(st.toLowerCase()))) {
          matchReasons.push(`Tag: "${tag}"`);
          score += 7;
        }
      }

      // Check destination
      const destId = tour.destination?.toString();
      if (destId && hurghadaDestinationIds.includes(destId)) {
        const dest = destinationMap.get(destId);
        matchReasons.push(`Hurghada destination: ${dest?.name || destId}`);
        score += 8;
      }

      // Check category
      const categoryIds = Array.isArray(tour.category) 
        ? tour.category.map((c: any) => c.toString())
        : tour.category ? [tour.category.toString()] : [];
      
      for (const catId of categoryIds) {
        if (waterCategoryIds.includes(catId)) {
          const cat = categoryMap.get(catId);
          matchReasons.push(`Water category: ${cat?.name || catId}`);
          score += 6;
        }
      }

      // Check location field
      if (HURGHADA_DESTINATIONS.some(h => location.includes(h))) {
        matchReasons.push(`Location: "${tour.location}"`);
        score += 4;
      }

      // Check highlights
      for (const highlight of highlights) {
        if (SPEEDBOAT_KEYWORDS.some(k => highlight.includes(k.toLowerCase()))) {
          score += 2;
        }
      }

      // If tour matches, add to list
      if (score >= 10) { // Threshold for matching
        const tourMatch: TourMatch = {
          _id: tour._id.toString(),
          title: tour.title,
          slug: tour.slug,
          matchReason: matchReasons.slice(0, 5), // Top 5 reasons
          score,
          currentTenantId: tour.tenantId,
        };

        if (tour.tenantId === SPEEDBOAT_TENANT_ID) {
          alreadyAssigned.push(tourMatch);
        } else {
          matchedTours.push(tourMatch);
        }
      }
    }

    // Sort by score
    matchedTours.sort((a, b) => b.score - a.score);

    // Display results
    console.log('═'.repeat(60));
    console.log('                    ANALYSIS RESULTS');
    console.log('═'.repeat(60));
    console.log('');
    console.log(`📊 Tours already assigned to speedboat: ${alreadyAssigned.length}`);
    console.log(`📊 New tours matching speedboat criteria: ${matchedTours.length}`);
    console.log('');

    if (alreadyAssigned.length > 0) {
      console.log('✅ Already Assigned Tours:');
      console.log('─'.repeat(60));
      for (const tour of alreadyAssigned.slice(0, 10)) {
        console.log(`   • ${tour.title}`);
        console.log(`     Score: ${tour.score} | Reasons: ${tour.matchReason.slice(0, 2).join(', ')}`);
      }
      if (alreadyAssigned.length > 10) {
        console.log(`   ... and ${alreadyAssigned.length - 10} more`);
      }
      console.log('');
    }

    if (matchedTours.length > 0) {
      console.log('🆕 Tours to be Assigned:');
      console.log('─'.repeat(60));
      for (const tour of matchedTours) {
        console.log(`   • ${tour.title}`);
        console.log(`     Score: ${tour.score} | Current Tenant: ${tour.currentTenantId || 'none'}`);
        console.log(`     Reasons: ${tour.matchReason.join(', ')}`);
        console.log('');
      }
    }

    // Step 5: Assign tours
    if (matchedTours.length > 0) {
      console.log('═'.repeat(60));
      console.log('                    ASSIGNING TOURS');
      console.log('═'.repeat(60));
      console.log('');

      const tourIds = matchedTours.map(t => new mongoose.Types.ObjectId(t._id));
      
      const updateResult = await toursCollection.updateMany(
        { _id: { $in: tourIds } },
        { 
          $set: { 
            tenantId: SPEEDBOAT_TENANT_ID,
            updatedAt: new Date()
          } 
        }
      );

      console.log(`✅ Successfully assigned ${updateResult.modifiedCount} tours to "${SPEEDBOAT_TENANT_ID}"`);
      console.log('');

      // List assigned tours
      console.log('📋 Assigned Tours:');
      for (const tour of matchedTours) {
        console.log(`   ✓ ${tour.title} (${tour.slug})`);
      }
    } else {
      console.log('ℹ️  No new tours to assign.');
    }

    // Summary
    console.log('');
    console.log('═'.repeat(60));
    console.log('                       SUMMARY');
    console.log('═'.repeat(60));
    console.log('');
    console.log(`📊 Total speedboat tours: ${alreadyAssigned.length + matchedTours.length}`);
    console.log(`   • Previously assigned: ${alreadyAssigned.length}`);
    console.log(`   • Newly assigned: ${matchedTours.length}`);
    console.log('');
    console.log('🌐 Access speedboat domain:');
    console.log('   • Production: https://hurghadaspeedboat.com');
    console.log('   • Local test: http://localhost:3004');
    console.log('');
    console.log('📝 To test locally:');
    console.log('   PORT=3004 pnpm dev:original');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('📦 Disconnected from MongoDB');
  }
}

// Run the script
assignSpeedboatTours();
