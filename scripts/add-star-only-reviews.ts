// scripts/add-star-only-reviews.ts
// Add star-only reviews (no comments) to tours with high ratings (4.5+)

import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import Review from '@/lib/models/Review';
import User from '@/lib/models/user';

const reviewerNames = [
  { firstName: "Sarah", lastName: "Johnson" },
  { firstName: "Michael", lastName: "Smith" },
  { firstName: "Emma", lastName: "Williams" },
  { firstName: "James", lastName: "Brown" },
  { firstName: "Olivia", lastName: "Davis" },
  { firstName: "William", lastName: "Miller" },
  { firstName: "Sophia", lastName: "Wilson" },
  { firstName: "Benjamin", lastName: "Moore" },
  { firstName: "Isabella", lastName: "Taylor" },
  { firstName: "Lucas", lastName: "Anderson" },
  { firstName: "Mia", lastName: "Thomas" },
  { firstName: "Alexander", lastName: "Jackson" },
  { firstName: "Charlotte", lastName: "White" },
  { firstName: "Ethan", lastName: "Harris" },
  { firstName: "Amelia", lastName: "Martin" },
  { firstName: "Daniel", lastName: "Thompson" },
  { firstName: "Harper", lastName: "Garcia" },
  { firstName: "Matthew", lastName: "Martinez" },
  { firstName: "Evelyn", lastName: "Robinson" },
  { firstName: "David", lastName: "Clark" },
  { firstName: "Emily", lastName: "Rodriguez" },
  { firstName: "Joseph", lastName: "Lewis" },
  { firstName: "Abigail", lastName: "Lee" },
  { firstName: "Samuel", lastName: "Walker" },
  { firstName: "Elizabeth", lastName: "Hall" }
];

// Rating distribution to ensure average > 4.5
// 70% 5-star, 30% 4-star = average 4.7
function getHighRating(): number {
  const rand = Math.random();
  if (rand < 0.70) return 5; // 70% chance of 5 stars
  return 4; // 30% chance of 4 stars
}

function getRandomDate(daysBack: number): Date {
  const now = new Date();
  const randomDays = Math.floor(Math.random() * daysBack);
  return new Date(now.getTime() - randomDays * 24 * 60 * 60 * 1000);
}

async function addStarOnlyReviews(tourSlug: string) {
  try {
    await dbConnect();
    console.log('✓ Connected to database\n');

    // Find the tour
    const tour = await Tour.findOne({ slug: tourSlug });
    if (!tour) {
      console.log(`❌ Tour with slug "${tourSlug}" not found`);
      process.exit(1);
    }

    console.log(`✓ Found tour: ${tour.title}\n`);

    // Delete existing reviews for this tour
    const deleteResult = await Review.deleteMany({ tour: tour._id });
    console.log(`✓ Deleted ${deleteResult.deletedCount} existing reviews\n`);

    // Create or get review users
    const reviewUsers = [];
    for (const reviewer of reviewerNames) {
      const email = `${reviewer.firstName.toLowerCase()}.${reviewer.lastName.toLowerCase()}@ratings.com`;
      let user = await User.findOne({ email });

      if (!user) {
        user = await User.create({
          firstName: reviewer.firstName,
          lastName: reviewer.lastName,
          email,
          password: 'hashedpassword123',
          isVerified: true
        });
      }

      reviewUsers.push(user);
    }

    console.log(`✓ Prepared ${reviewUsers.length} review users\n`);
    console.log('=== ADDING STAR-ONLY REVIEWS ===\n');

    // Add 20-25 reviews
    const numReviews = 20 + Math.floor(Math.random() * 6);
    const reviews = [];

    for (let i = 0; i < numReviews; i++) {
      const rating = getHighRating();
      const reviewUser = reviewUsers[i % reviewUsers.length];

      // Star rating ONLY - no comment, no title
      reviews.push({
        tour: tour._id,
        user: reviewUser._id,
        userName: `${reviewUser.firstName} ${reviewUser.lastName}`,
        userEmail: reviewUser.email,
        rating,
        createdAt: getRandomDate(90), // Random date within last 90 days
        verified: Math.random() < 0.85, // 85% verified
        helpful: Math.floor(Math.random() * 10)
      });
    }

    // Insert reviews
    try {
      const result = await Review.insertMany(reviews, { ordered: false });
      console.log(`✓ Added ${result.length} star-only reviews`);

      const fiveStarCount = reviews.filter(r => r.rating === 5).length;
      const fourStarCount = reviews.filter(r => r.rating === 4).length;
      console.log(`  - 5 stars: ${fiveStarCount}`);
      console.log(`  - 4 stars: ${fourStarCount}\n`);
    } catch (error: any) {
      if (error.insertedDocs) {
        console.log(`⚠️  Added ${error.insertedDocs.length} reviews (some duplicates skipped)\n`);
      } else {
        console.log(`✗ Error:`, error.message);
        process.exit(1);
      }
    }

    // Update tour rating
    try {
      const reviewStats = await Review.aggregate([
        { $match: { tour: tour._id } },
        {
          $group: {
            _id: null,
            avgRating: { $avg: '$rating' },
            totalReviews: { $sum: 1 }
          }
        }
      ]);

      if (reviewStats.length > 0) {
        const avgRating = Math.round(reviewStats[0].avgRating * 10) / 10;
        await Tour.findByIdAndUpdate(tour._id, {
          rating: avgRating,
          reviewCount: reviewStats[0].totalReviews
        });
        console.log(`✓ Updated tour rating to ${avgRating} ⭐`);
        console.log(`✓ Total reviews: ${reviewStats[0].totalReviews}\n`);
      }
    } catch (error: any) {
      console.log(`⚠️  Could not update tour rating:`, error.message);
    }

    console.log('=== COMPLETED ===\n');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Get tour slug from command line argument
const tourSlug = process.argv[2];

if (!tourSlug) {
  console.log('Usage: npx tsx scripts/add-star-only-reviews.ts <tour-slug>');
  console.log('Example: npx tsx scripts/add-star-only-reviews.ts hurghada-luxury-vip-hammam-spa');
  process.exit(1);
}

addStarOnlyReviews(tourSlug);
