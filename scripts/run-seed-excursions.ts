#!/usr/bin/env npx tsx
/**
 * Main Runner: Seed all 9 Excursions Online tenants
 *
 * Seeds destinations, categories, tours, reviews & updates tenant config
 * for all 9 Excursions Online tenants.
 *
 * Run: npx tsx scripts/run-seed-excursions.ts
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('❌ MONGODB_URI required'); process.exit(1); }

// Import tenant data
import { hurghada } from './seed-excursions-content';
import { cairo } from './data/cairo-data';
import { makadi } from './data/makadi-data';
import { elgouna } from './data/elgouna-data';
import { luxor } from './data/luxor-data';
import { sharm } from './data/sharm-data';
import { aswan } from './data/aswan-data';
import { marsaAlam } from './data/marsa-alam-data';
import { dahab } from './data/dahab-data';

import type { TenantSeed } from './seed-excursions-content';

// ============================================================================
// REVIEW DATA GENERATOR
// ============================================================================
const reviewerNames = [
  { name: 'Sarah Johnson', email: 'sarah.j@example.com' },
  { name: 'Michael Chen', email: 'michael.c@example.com' },
  { name: 'Emma Williams', email: 'emma.w@example.com' },
  { name: 'Hans Mueller', email: 'hans.m@example.com' },
  { name: 'Maria Garcia', email: 'maria.g@example.com' },
  { name: 'David Brown', email: 'david.b@example.com' },
  { name: 'Sophie Laurent', email: 'sophie.l@example.com' },
  { name: 'James Wilson', email: 'james.w@example.com' },
  { name: 'Anna Petrov', email: 'anna.p@example.com' },
  { name: 'Robert Taylor', email: 'robert.t@example.com' },
  { name: 'Lisa Anderson', email: 'lisa.a@example.com' },
  { name: 'Marco Rossi', email: 'marco.r@example.com' },
  { name: 'Yuki Tanaka', email: 'yuki.t@example.com' },
  { name: 'Ahmed Hassan', email: 'ahmed.h@example.com' },
  { name: 'Charlotte Davis', email: 'charlotte.d@example.com' },
];

const reviewTitles5 = ['Absolutely amazing!', 'Best experience ever!', 'Unforgettable day!', 'Exceeded all expectations!', 'Perfect in every way!', 'Incredible experience!', 'Highly recommend!', 'Worth every penny!'];
const reviewTitles4 = ['Great experience!', 'Really enjoyed it', 'Very good tour', 'Wonderful day out', 'Great value for money'];
const reviewTitles3 = ['Good overall', 'Decent experience', 'Nice tour'];

const reviewComments5 = [
  'This was hands down the best tour we took during our holiday. The guide was incredibly knowledgeable and the whole experience was perfectly organized. Would recommend to anyone!',
  'What an incredible day! Everything was so well organized from the hotel pickup to the drop-off. Our guide made the experience truly special with fascinating stories and insights.',
  'We had an absolute blast! The scenery was breathtaking and the staff were so friendly and professional. Already planning to come back and do it again!',
  'Perfect tour from start to finish. The booking process was easy, pickup was on time, and the experience itself was magical. Definitely the highlight of our trip!',
  'Five stars all the way! Our guide was passionate and knowledgeable. The pace was perfect - not too rushed, not too slow. Every moment was enjoyable.',
];
const reviewComments4 = [
  'Really enjoyable tour! The organization was great and the guide was very informative. Only minor thing was the early pickup time, but it was worth it.',
  'Had a great time! Good value for money with everything included. The guide was friendly and knowledgeable. Would book again.',
  'Very nice experience overall. Well organized with professional staff. The highlights were even better than expected.',
];
const reviewComments3 = [
  'Good tour overall. The guide was nice but the group was quite large. Still enjoyed the experience though.',
];

function generateReviews(tenantId: string, tourId: mongoose.Types.ObjectId, count: number) {
  const reviews: any[] = [];
  const usedReviewers = new Set<number>();

  for (let i = 0; i < count; i++) {
    let reviewerIdx: number;
    do {
      reviewerIdx = Math.floor(Math.random() * reviewerNames.length);
    } while (usedReviewers.has(reviewerIdx) && usedReviewers.size < reviewerNames.length);
    usedReviewers.add(reviewerIdx);

    const reviewer = reviewerNames[reviewerIdx];
    // Weight towards 4-5 star reviews
    const ratingRoll = Math.random();
    let rating: number;
    let title: string;
    let comment: string;

    if (ratingRoll < 0.55) {
      rating = 5;
      title = reviewTitles5[Math.floor(Math.random() * reviewTitles5.length)];
      comment = reviewComments5[Math.floor(Math.random() * reviewComments5.length)];
    } else if (ratingRoll < 0.90) {
      rating = 4;
      title = reviewTitles4[Math.floor(Math.random() * reviewTitles4.length)];
      comment = reviewComments4[Math.floor(Math.random() * reviewComments4.length)];
    } else {
      rating = 3;
      title = reviewTitles3[Math.floor(Math.random() * reviewTitles3.length)];
      comment = reviewComments3[Math.floor(Math.random() * reviewComments3.length)];
    }

    // Create a fake but consistent ObjectId for the user
    const userIdHex = `aaa${tenantId.length.toString(16).padStart(2, '0')}${reviewerIdx.toString(16).padStart(2, '0')}${i.toString(16).padStart(2, '0')}`.padEnd(24, '0');

    reviews.push({
      tenantId,
      tour: tourId,
      user: new mongoose.Types.ObjectId(userIdHex),
      userName: reviewer.name,
      userEmail: reviewer.email,
      rating,
      title,
      comment,
      verified: Math.random() > 0.3,
      helpful: Math.floor(Math.random() * 20),
    });
  }

  return reviews;
}

// ============================================================================
// MAIN SEED FUNCTION
// ============================================================================
async function seedAllTenants() {
  console.log('🌍 Excursions Online Content Seed Script');
  console.log('═'.repeat(70));
  console.log('');

  try {
    console.log('📡 Connecting to database...');
    await mongoose.connect(MONGODB_URI!);
    console.log(`✅ Connected to: ${mongoose.connection.db?.databaseName}\n`);

    // Import models
    const Tenant = mongoose.models.Tenant || (await import('../lib/models/Tenant')).default;
    const Destination = mongoose.models.Destination || (await import('../lib/models/Destination')).default;
    const Category = mongoose.models.Category || (await import('../lib/models/Category')).default;
    const Tour = mongoose.models.Tour || (await import('../lib/models/Tour')).default;
    const Review = mongoose.models.Review || (await import('../lib/models/Review')).default;
    const HeroSettings = mongoose.models.HeroSettings || (await import('../lib/models/HeroSettings')).default;

    const allTenants: TenantSeed[] = [hurghada, cairo, makadi, elgouna, luxor, sharm, aswan, marsaAlam, dahab];

    let totalDests = 0, totalCats = 0, totalTours = 0, totalReviews = 0;

    for (const tenantData of allTenants) {
      const tid = tenantData.tenantId;
      console.log(`\n${'═'.repeat(70)}`);
      console.log(`🏷️  Seeding: ${tid}`);
      console.log(`${'═'.repeat(70)}`);

      // Step 1: Update tenant config
      console.log('  📝 Updating tenant config...');
      const updateResult = await Tenant.findOneAndUpdate(
        { tenantId: tid },
        { $set: tenantData.configUpdate },
        { new: true }
      );
      if (updateResult) {
        console.log('     ✅ Tenant config updated');
      } else {
        console.log(`     ⚠️  Tenant ${tid} not found in DB - skipping config update`);
      }

      // Step 2: Create destinations
      console.log('  📍 Creating destinations...');
      const destIds: Record<string, mongoose.Types.ObjectId> = {};
      for (const dest of tenantData.destinations) {
        try {
          const saved = await Destination.findOneAndUpdate(
            { tenantId: tid, slug: dest.slug },
            dest,
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
          destIds[dest.slug] = saved._id;
          console.log(`     ✅ ${dest.name}`);
        } catch (err: any) {
          console.log(`     ❌ ${dest.name}: ${err.message}`);
        }
      }
      totalDests += Object.keys(destIds).length;

      // Step 3: Create categories
      console.log('  📂 Creating categories...');
      const catIds: Record<string, mongoose.Types.ObjectId> = {};
      for (const cat of tenantData.categories) {
        try {
          const saved = await Category.findOneAndUpdate(
            { tenantId: tid, slug: cat.slug },
            cat,
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
          catIds[cat.slug] = saved._id;
          console.log(`     ✅ ${cat.name}`);
        } catch (err: any) {
          console.log(`     ❌ ${cat.name}: ${err.message}`);
        }
      }
      totalCats += Object.keys(catIds).length;

      // Step 4: Create tours
      console.log('  🎯 Creating tours...');
      const tours = tenantData.createTours(destIds, catIds);
      const tourIds: mongoose.Types.ObjectId[] = [];
      const tourSlugs: string[] = [];
      for (const tourData of tours) {
        try {
          // Remove helper fields
          const { _dest, _cats, ...cleanTour } = tourData;
          const saved = await Tour.findOneAndUpdate(
            { tenantId: tid, slug: cleanTour.slug },
            cleanTour,
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
          tourIds.push(saved._id);
          tourSlugs.push(cleanTour.slug);
          console.log(`     ✅ ${cleanTour.title}`);
        } catch (err: any) {
          console.log(`     ❌ ${tourData.title || 'Unknown'}: ${err.message}`);
        }
      }
      totalTours += tourIds.length;

      // Step 5: Create reviews (5-8 per tour)
      console.log('  ⭐ Creating reviews...');
      let tenantReviewCount = 0;
      for (let i = 0; i < tourIds.length; i++) {
        const reviewCount = 5 + Math.floor(Math.random() * 4); // 5-8 reviews
        const reviews = generateReviews(tid, tourIds[i], reviewCount);
        for (const review of reviews) {
          try {
            await Review.findOneAndUpdate(
              { tenantId: tid, tour: review.tour, user: review.user },
              review,
              { upsert: true, new: true, setDefaultsOnInsert: true }
            );
            tenantReviewCount++;
          } catch (err: any) {
            // Ignore duplicate key errors
            if (!err.message.includes('duplicate')) {
              console.log(`     ❌ Review error: ${err.message}`);
            }
          }
        }
        console.log(`     ✅ ${reviewCount} reviews for "${tourSlugs[i]}"`);
      }
      totalReviews += tenantReviewCount;

      console.log(`\n  📊 ${tid} Summary:`);
      console.log(`     Destinations: ${Object.keys(destIds).length}`);
      console.log(`     Categories: ${Object.keys(catIds).length}`);
      console.log(`     Tours: ${tourIds.length}`);
      console.log(`     Reviews: ${tenantReviewCount}`);
    }

    // Final summary
    console.log(`\n\n${'═'.repeat(70)}`);
    console.log('              🎉 ALL TENANTS SEEDED SUCCESSFULLY! 🎉');
    console.log(`${'═'.repeat(70)}`);
    console.log('');
    console.log('📊 Grand Total:');
    console.log(`   Tenants updated: ${allTenants.length}`);
    console.log(`   Destinations: ${totalDests}`);
    console.log(`   Categories: ${totalCats}`);
    console.log(`   Tours: ${totalTours}`);
    console.log(`   Reviews: ${totalReviews}`);
    console.log('');
    console.log('🌐 Test locally:');
    console.log('   hurghada-excursions-online → http://localhost:3005');
    console.log('   cairo-excursions-online    → http://localhost:3006');
    console.log('   makadi-bay                 → http://localhost:3007');
    console.log('   el-gouna                   → http://localhost:3008');
    console.log('   luxor-excursions           → http://localhost:3009');
    console.log('   sharm-excursions-online    → http://localhost:3010');
    console.log('   aswan-excursions           → http://localhost:3011');
    console.log('   marsa-alam-excursions      → http://localhost:3012');
    console.log('   dahab-excursions           → http://localhost:3013');
    console.log('');

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('📦 Disconnected from database');
  }
}

// Run
seedAllTenants();
