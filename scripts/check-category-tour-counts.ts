// scripts/check-category-tour-counts.ts
// Diagnostic script to check category and tour relationships

import dbConnect from '@/lib/dbConnect';
import Category from '@/lib/models/Category';
import Tour from '@/lib/models/Tour';

async function checkCategoryTourCounts() {
  try {
    await dbConnect();
    console.log('✓ Connected to database\n');

    // Get all categories
    const categories = await Category.find({}).lean();
    console.log(`Found ${categories.length} categories\n`);

    // Get all tours
    const allTours = await Tour.find({}).lean();
    const publishedTours = await Tour.find({ isPublished: true }).lean();

    console.log(`Total tours: ${allTours.length}`);
    console.log(`Published tours: ${publishedTours.length}\n`);

    // Check tours with categories
    const toursWithCategories = allTours.filter(tour => tour.category && (tour.category as any).length > 0);
    console.log(`Tours with categories assigned: ${toursWithCategories.length}`);
    console.log(`Tours without categories: ${allTours.length - toursWithCategories.length}\n`);

    // Check each category
    console.log('=== CATEGORY BREAKDOWN ===\n');

    for (const category of categories) {
      const tourCount = await Tour.countDocuments({
        category: { $in: [category._id] },
        isPublished: true
      });

      const allTourCount = await Tour.countDocuments({
        category: { $in: [category._id] }
      });

      const status = category.featured ? '⭐ FEATURED' : '  ';
      const published = category.isPublished ? '✓' : '✗';

      console.log(`${status} [${published}] ${category.name}`);
      console.log(`   Slug: ${category.slug}`);
      console.log(`   ID: ${category._id}`);
      console.log(`   Published tours: ${tourCount}`);
      console.log(`   Total tours: ${allTourCount}`);
      console.log('');
    }

    // Sample tour categories
    console.log('\n=== SAMPLE TOUR CATEGORIES ===\n');
    const sampleTours = allTours.slice(0, 5);

    for (const tour of sampleTours) {
      console.log(`Tour: ${tour.title}`);
      console.log(`   Published: ${tour.isPublished ? 'Yes' : 'No'}`);
      console.log(`   Categories: ${tour.category ? JSON.stringify(tour.category) : 'None'}`);
      console.log('');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkCategoryTourCounts();
