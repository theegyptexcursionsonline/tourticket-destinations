// scripts/update-tour-ratings.ts
// Script to update all tours with unique, realistic ratings and review counts

import mongoose from 'mongoose';
import Tour from '../lib/models/Tour';
import dbConnect from '../lib/dbConnect';

// Generate a realistic rating between min and max with one decimal place
function generateRating(min: number = 3.5, max: number = 5.0): number {
  const rating = Math.random() * (max - min) + min;
  return Math.round(rating * 10) / 10; // Round to 1 decimal place
}

// Generate a realistic review count with weighted distribution
// More tours should have moderate review counts (50-150)
// Fewer tours should have very high (300+) or very low (5-30) review counts
function generateReviewCount(): number {
  const rand = Math.random();

  if (rand < 0.15) {
    // 15% - Very low reviews (5-30)
    return Math.floor(Math.random() * 26) + 5;
  } else if (rand < 0.35) {
    // 20% - Low-moderate reviews (30-70)
    return Math.floor(Math.random() * 41) + 30;
  } else if (rand < 0.75) {
    // 40% - Moderate reviews (70-200)
    return Math.floor(Math.random() * 131) + 70;
  } else if (rand < 0.92) {
    // 17% - High reviews (200-400)
    return Math.floor(Math.random() * 201) + 200;
  } else {
    // 8% - Very high reviews (400-800)
    return Math.floor(Math.random() * 401) + 400;
  }
}

// Calculate average rating based on review count (more reviews = slightly higher average rating)
function generateSmartRating(reviewCount: number): number {
  // Tours with more reviews tend to have better ratings (survivor bias)
  let baseMin = 3.5;
  let baseMax = 5.0;

  if (reviewCount > 300) {
    // Very popular tours - likely better quality
    baseMin = 4.2;
    baseMax = 5.0;
  } else if (reviewCount > 150) {
    // Popular tours
    baseMin = 3.9;
    baseMax = 4.9;
  } else if (reviewCount > 70) {
    // Moderately popular
    baseMin = 3.7;
    baseMax = 4.8;
  } else if (reviewCount > 30) {
    // Less popular
    baseMin = 3.5;
    baseMax = 4.7;
  } else {
    // New or niche tours - wider variance
    baseMin = 3.3;
    baseMax = 4.9;
  }

  return generateRating(baseMin, baseMax);
}

async function updateTourRatings() {
  try {
    console.log('\n🌟 ============================================');
    console.log('   UPDATING TOUR RATINGS & REVIEW COUNTS');
    console.log('============================================\n');

    await dbConnect();

    // Fetch all tours
    const tours = await Tour.find({});
    console.log(`📊 Found ${tours.length} tours to update\n`);

    if (tours.length === 0) {
      console.log('⚠️  No tours found in database. Please seed tours first.');
      return;
    }

    let updatedCount = 0;
    const updates: Array<{ title: string; rating: number; reviewCount: number }> = [];

    for (const tour of tours) {
      // Generate unique review count
      const reviewCount = generateReviewCount();

      // Generate rating based on review count
      const rating = generateSmartRating(reviewCount);

      // Update the tour
      tour.rating = rating;
      (tour as any).reviewCount = reviewCount;
      await tour.save();

      updatedCount++;
      updates.push({
        title: tour.title,
        rating: rating,
        reviewCount: reviewCount,
      });

      console.log(`✅ ${updatedCount}. ${tour.title.substring(0, 50)}...`);
      console.log(`   Rating: ${rating} ⭐ | Reviews: ${reviewCount} 💬\n`);
    }

    console.log('\n📈 ============================================');
    console.log('   UPDATE STATISTICS');
    console.log('============================================\n');

    // Calculate statistics
    const ratings = updates.map(u => u.rating);
    const reviewCounts = updates.map(u => u.reviewCount);

    const avgRating = (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2);
    const minRating = Math.min(...ratings).toFixed(1);
    const maxRating = Math.max(...ratings).toFixed(1);

    const avgReviews = Math.round(reviewCounts.reduce((a, b) => a + b, 0) / reviewCounts.length);
    const minReviews = Math.min(...reviewCounts);
    const maxReviews = Math.max(...reviewCounts);

    console.log(`   Total Tours Updated: ${updatedCount}`);
    console.log(`\n   Rating Distribution:`);
    console.log(`      Average: ${avgRating} ⭐`);
    console.log(`      Range: ${minRating} - ${maxRating}`);
    console.log(`\n   Review Count Distribution:`);
    console.log(`      Average: ${avgReviews} reviews`);
    console.log(`      Range: ${minReviews} - ${maxReviews} reviews`);

    // Show distribution by rating range
    const ratingRanges = {
      '5.0': ratings.filter(r => r === 5.0).length,
      '4.5-4.9': ratings.filter(r => r >= 4.5 && r < 5.0).length,
      '4.0-4.4': ratings.filter(r => r >= 4.0 && r < 4.5).length,
      '3.5-3.9': ratings.filter(r => r >= 3.5 && r < 4.0).length,
      '<3.5': ratings.filter(r => r < 3.5).length,
    };

    console.log(`\n   Rating Breakdown:`);
    Object.entries(ratingRanges).forEach(([range, count]) => {
      const percentage = ((count / ratings.length) * 100).toFixed(1);
      console.log(`      ${range}: ${count} tours (${percentage}%)`);
    });

    console.log('\n============================================');
    console.log('✨ All tours updated successfully!\n');

    process.exit(0);

  } catch (error: any) {
    console.error('\n❌ Error updating tour ratings:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
updateTourRatings();
