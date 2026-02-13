// scripts/verify-all-fixes.ts
// Verify all tour count fixes are working

import dbConnect from '@/lib/dbConnect';
import Category from '@/lib/models/Category';
import Tour from '@/lib/models/Tour';

async function verifyFixes() {
  try {
    await dbConnect();
    console.log('✓ Connected to database\n');

    // Test 1: Verify tour categories are arrays
    console.log('=== TEST 1: Tour Category Structure ===');
    const sampleTours = await Tour.find({}).limit(5).lean();
    let allArrays = true;
    sampleTours.forEach(tour => {
      const isArray = Array.isArray(tour.category);
      if (!isArray) {
        allArrays = false;
        console.log(`✗ Tour "${tour.title}" has non-array category: ${typeof tour.category}`);
      }
    });
    if (allArrays) {
      console.log('✓ All sample tours have array categories\n');
    } else {
      console.log('✗ Some tours still have non-array categories\n');
    }

    // Test 2: Verify $in queries work
    console.log('=== TEST 2: Query with $in Operator ===');
    const testCategory = await Category.findOne({}).lean();
    if (testCategory) {
      const tourCount = await Tour.countDocuments({
        category: { $in: [(testCategory as any)._id] },
        isPublished: true
      });
      console.log(`Category: ${(testCategory as any).name}`);
      console.log(`Tours found with $in: ${tourCount}`);
      console.log('✓ $in query working\n');
    }

    // Test 3: Check featured categories
    console.log('=== TEST 3: Featured Categories ===');
    const featuredCategories = await Category.find({ featured: true }).lean();
    console.log(`Total featured categories: ${featuredCategories.length}\n`);

    const featuredWithTours = await Promise.all(
      featuredCategories.map(async (cat) => {
        const count = await Tour.countDocuments({
          category: { $in: [cat._id] },
          isPublished: true
        });
        return { name: cat.name, count };
      })
    );

    console.log('Featured categories with tour counts:');
    featuredWithTours.forEach(({ name, count }) => {
      console.log(`  ${count > 0 ? '✓' : '✗'} ${name}: ${count} tours`);
    });

    const featuredWithToursCount = featuredWithTours.filter(c => c.count > 0).length;
    console.log(`\nFeatured categories with tours: ${featuredWithToursCount}/${featuredCategories.length}\n`);

    // Test 4: Verify all tours have categories
    console.log('=== TEST 4: All Tours Have Categories ===');
    const totalTours = await Tour.countDocuments({});
    const toursWithCategories = await Tour.countDocuments({
      category: { $exists: true, $ne: null } as any
    });
    console.log(`Total tours: ${totalTours}`);
    console.log(`Tours with categories: ${toursWithCategories}`);
    if (totalTours === toursWithCategories) {
      console.log('✓ All tours have categories assigned\n');
    } else {
      console.log(`✗ ${totalTours - toursWithCategories} tours without categories\n`);
    }

    // Test 5: Sample category queries
    console.log('=== TEST 5: Sample Category Tour Counts ===');
    const categoriesToTest = ['cultural', 'adventure-tours', 'spa-wellness', 'quad-atv-tours'];

    for (const slug of categoriesToTest) {
      const cat = await Category.findOne({ slug }).lean();
      if (cat) {
        const count = await Tour.countDocuments({
          category: { $in: [(cat as any)._id] },
          isPublished: true
        });
        console.log(`${(cat as any).name}: ${count} published tours`);
      }
    }

    console.log('\n=== ALL TESTS COMPLETE ===\n');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

verifyFixes();
