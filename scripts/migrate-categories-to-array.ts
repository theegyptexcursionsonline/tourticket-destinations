// scripts/migrate-categories-to-array.ts
// Migrate single category ObjectIds to arrays

import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import mongoose from 'mongoose';

async function migrateCategoriesToArray() {
  try {
    await dbConnect();
    console.log('✓ Connected to database\n');

    // Find all tours
    const allTours = await Tour.find({}).lean();
    console.log(`Found ${allTours.length} total tours\n`);

    // Separate tours by category field type
    const singleCategoryTours = allTours.filter(tour =>
      tour.category &&
      !Array.isArray(tour.category) &&
      mongoose.Types.ObjectId.isValid(tour.category as any)
    );

    const arrayCategoryTours = allTours.filter(tour =>
      tour.category &&
      Array.isArray(tour.category) &&
      tour.category.length > 0
    );

    const noCategoryTours = allTours.filter(tour =>
      !tour.category ||
      (Array.isArray(tour.category) && tour.category.length === 0)
    );

    console.log('=== CURRENT STATE ===');
    console.log(`✓ Tours with array categories: ${arrayCategoryTours.length}`);
    console.log(`⚠️  Tours with single category (needs migration): ${singleCategoryTours.length}`);
    console.log(`❌ Tours with no categories: ${noCategoryTours.length}`);
    console.log('');

    if (singleCategoryTours.length === 0) {
      console.log('✓ All tours already have array categories!');
      process.exit(0);
    }

    // Preview first 10 tours to migrate
    console.log('=== PREVIEW: TOURS TO MIGRATE ===\n');
    for (let i = 0; i < Math.min(10, singleCategoryTours.length); i++) {
      const tour = singleCategoryTours[i];
      console.log(`${i + 1}. ${tour.title}`);
      console.log(`   Current: ${tour.category}`);
      console.log(`   Will become: [${tour.category}]`);
      console.log('');
    }

    if (singleCategoryTours.length > 10) {
      console.log(`... and ${singleCategoryTours.length - 10} more tours\n`);
    }

    // Migrate all tours with single categories
    console.log('\n=== MIGRATING ===\n');

    let migratedCount = 0;
    let errorCount = 0;

    for (const tour of singleCategoryTours) {
      try {
        // Convert single ObjectId to array
        await Tour.updateOne(
          { _id: tour._id },
          { $set: { category: [tour.category] } }
        );

        migratedCount++;

        if (migratedCount <= 10 || migratedCount % 20 === 0) {
          console.log(`✓ Migrated: ${tour.title}`);
        }
      } catch (error) {
        errorCount++;
        console.error(`✗ Error migrating ${tour.title}:`, error);
      }
    }

    console.log('\n=== MIGRATION COMPLETE ===');
    console.log(`✓ Successfully migrated: ${migratedCount} tours`);
    console.log(`✗ Errors: ${errorCount}`);
    console.log('');

    // Verify
    const verifyTours = await Tour.find({}).lean();
    const verifyArrayTours = verifyTours.filter(tour =>
      tour.category && Array.isArray(tour.category) && tour.category.length > 0
    );
    const verifySingleTours = verifyTours.filter(tour =>
      tour.category && !Array.isArray(tour.category)
    );

    console.log('=== VERIFICATION ===');
    console.log(`✓ Tours with array categories: ${verifyArrayTours.length}`);
    console.log(`⚠️  Tours with single category: ${verifySingleTours.length}`);
    console.log(`Total tours: ${verifyTours.length}`);
    console.log('');

    if (verifySingleTours.length === 0) {
      console.log('🎉 All categories successfully migrated to arrays!');
    } else {
      console.log('⚠️  Some tours still have single categories. Re-run the script.');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

migrateCategoriesToArray();
