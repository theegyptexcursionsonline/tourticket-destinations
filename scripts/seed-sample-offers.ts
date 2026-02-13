/**
 * SAMPLE OFFERS SEED SCRIPT
 * 
 * Run with: npx tsx scripts/seed-sample-offers.ts
 * 
 * Creates 5 sample special offers demonstrating each offer type
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment');
  process.exit(1);
}

// Import models
import SpecialOffer from '../lib/models/SpecialOffer';
import Tour from '../lib/models/Tour';

async function seedSampleOffers() {
  console.log('🌱 Seeding sample special offers...\n');

  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI as string);
    console.log('✅ Connected to MongoDB\n');

    // Find a sample tour to apply offers to
    const sampleTour = await Tour.findOne({ isPublished: true }).lean();
    if (!sampleTour) {
      console.error('❌ No published tours found. Please create a tour first.');
      process.exit(1);
    }

    console.log(`📍 Using tour: "${sampleTour.title}"\n`);

    const tenantId = sampleTour.tenantId || 'default';
    const tourId = sampleTour._id;

    // Calculate dates
    const today = new Date();
    const startDate = new Date(today);
    const endDate = new Date(today);
    endDate.setMonth(endDate.getMonth() + 3); // Valid for 3 months

    // Sample offers to create - each needs a unique code or no code conflicts
    const sampleOffers = [
      // 1. PERCENTAGE OFF
      {
        name: 'Summer Sale 20% Off',
        description: 'Get 20% off on all bookings during our summer promotion!',
        type: 'percentage' as const,
        discountValue: 20,
        code: 'SUMMER20', // Unique code to avoid null conflicts
        startDate,
        endDate,
        isActive: true,
        isFeatured: true,
        featuredBadgeText: '20% OFF',
        priority: 10,
        tenantId,
        applicableTours: [tourId],
        tourOptionSelections: [{ tourId, allOptions: true, selectedOptions: [] }],
        terms: [
          'Valid for new bookings only',
          'Cannot be combined with other offers',
          'Discount applies to base price only',
        ],
      },
      // 2. FIXED AMOUNT
      {
        name: 'Save $15',
        description: 'Flat $15 discount on your booking!',
        type: 'fixed' as const,
        discountValue: 15,
        code: 'FLAT15', // Unique code
        minBookingValue: 50, // Minimum $50 booking
        startDate,
        endDate,
        isActive: true,
        isFeatured: false,
        priority: 5,
        tenantId,
        applicableTours: [tourId],
        tourOptionSelections: [{ tourId, allOptions: true, selectedOptions: [] }],
        terms: [
          'Minimum booking value of $50 required',
          'One use per customer',
        ],
      },
      // 3. EARLY BIRD
      {
        name: 'Early Bird - Book 14 Days Ahead',
        description: 'Plan ahead and save 15%! Book at least 14 days before your tour.',
        type: 'early_bird' as const,
        discountValue: 15,
        code: 'EARLYBIRD15', // Unique code
        minDaysInAdvance: 14,
        startDate,
        endDate,
        isActive: true,
        isFeatured: true,
        featuredBadgeText: 'Early Bird',
        priority: 8,
        tenantId,
        applicableTours: [tourId],
        tourOptionSelections: [{ tourId, allOptions: true, selectedOptions: [] }],
        terms: [
          'Must book at least 14 days before tour date',
          'Discount automatically applied at checkout',
          'Valid for travel within offer period',
        ],
      },
      // 4. LAST MINUTE
      {
        name: 'Last Minute Deal',
        description: 'Spontaneous traveler? Get 25% off when booking within 48 hours of the tour!',
        type: 'last_minute' as const,
        discountValue: 25,
        code: 'LASTMIN25', // Unique code
        maxDaysBeforeTour: 2, // Within 2 days
        startDate,
        endDate,
        isActive: true,
        isFeatured: true,
        featuredBadgeText: 'Last Minute',
        priority: 9,
        tenantId,
        applicableTours: [tourId],
        tourOptionSelections: [{ tourId, allOptions: true, selectedOptions: [] }],
        terms: [
          'Valid only when booking within 48 hours of tour',
          'Subject to availability',
          'Cannot be combined with other promotions',
        ],
      },
      // 5. PROMO CODE
      {
        name: 'SAVE10 Promo Code',
        description: 'Enter code SAVE10 at checkout to get 10% off!',
        type: 'percentage' as const, // Promo codes use percentage or fixed
        discountValue: 10,
        code: 'SAVE10',
        usageLimit: 100,
        usedCount: 0,
        startDate,
        endDate,
        isActive: true,
        isFeatured: false,
        priority: 3,
        tenantId,
        applicableTours: [tourId],
        tourOptionSelections: [{ tourId, allOptions: true, selectedOptions: [] }],
        terms: [
          'Enter code at checkout',
          'Limited to 100 uses',
          'One code per booking',
        ],
      },
    ];

    // Delete existing sample offers (by name or code)
    const sampleNames = sampleOffers.map(o => o.name);
    const sampleCodes = sampleOffers.map(o => o.code).filter(Boolean);
    const deleteResult = await SpecialOffer.deleteMany({ 
      $or: [
        { name: { $in: sampleNames } },
        { code: { $in: sampleCodes } }
      ]
    });
    if (deleteResult.deletedCount > 0) {
      console.log(`🗑️  Deleted ${deleteResult.deletedCount} existing sample offers\n`);
    }

    // Create new sample offers
    const createdOffers = await SpecialOffer.insertMany(sampleOffers);
    
    console.log('✅ Created sample offers:\n');
    createdOffers.forEach((offer, index) => {
      console.log(`${index + 1}. ${offer.name}`);
      console.log(`   Type: ${offer.type}`);
      console.log(`   Discount: ${offer.type === 'fixed' ? '$' : ''}${offer.discountValue}${offer.type !== 'fixed' ? '%' : ''}`);
      if (offer.code) console.log(`   Code: ${offer.code}`);
      if (offer.minDaysInAdvance) console.log(`   Min Days In Advance: ${offer.minDaysInAdvance}`);
      if (offer.maxDaysBeforeTour) console.log(`   Max Days Before Tour: ${offer.maxDaysBeforeTour}`);
      console.log('');
    });

    console.log('🎉 Sample offers created successfully!');
    console.log('\n📝 View them in the admin panel at /admin/special-offers');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

// Run the script
seedSampleOffers();
