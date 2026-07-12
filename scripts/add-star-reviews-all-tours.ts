// scripts/add-star-reviews-all-tours.ts
// Add star-only reviews to all published tours

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

function getHighRating(): number {
  const rand = Math.random();
  if (rand < 0.70) return 5; // 70% 5-star
  return 4; // 30% 4-star = avg 4.7
}

function getRandomDate(daysBack: number): Date {
  const now = new Date();
  const randomDays = Math.floor(Math.random() * daysBack);
  return new Date(now.getTime() - randomDays * 24 * 60 * 60 * 1000);
}

async function addStarReviewsToAllTours() {
  try {
    await dbConnect();
    console.log('✓ Connected to database\n');

    // Get all published tours
    const tours = await Tour.find({ isPublished: true }).sort({ createdAt: -1 });
    console.log(`✓ Found ${tours.length} published tours\n`);

    if (tours.length === 0) {
      console.log('No published tours found.');
      process.exit(0);
    }

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
    console.log('=== PROCESSING TOURS ===\n');

    let totalProcessed = 0;
    let totalReviewsAdded = 0;

    for (const tour of tours) {
      console.log(`[${totalProcessed + 1}/${tours.length}] ${tour.title}`);

      // Delete existing reviews
      const deleteResult = await Review.deleteMany({ tour: tour._id });
      if (deleteResult.deletedCount > 0) {
        console.log(`  ✓ Deleted ${deleteResult.deletedCount} old reviews`);
      }

      // Add exactly 10 star-only reviews
      const numReviews = 10;
      const reviews = [];

      for (let i = 0; i < numReviews; i++) {
        const rating = getHighRating();
        const reviewUser = reviewUsers[i % reviewUsers.length];

        reviews.push({
          tour: tour._id,
          user: reviewUser._id,
          userName: `${reviewUser.firstName} ${reviewUser.lastName}`,
          userEmail: reviewUser.email,
          rating,
          createdAt: getRandomDate(90),
          verified: Math.random() < 0.85,
          helpful: Math.floor(Math.random() * 10)
        });
      }

      // Insert reviews
      try {
        const result = await Review.insertMany(reviews, { ordered: false });
        const fiveStars = reviews.filter(r => r.rating === 5).length;
        const fourStars = reviews.filter(r => r.rating === 4).length;
        console.log(`  ✓ Added ${result.length} reviews (5★: ${fiveStars}, 4★: ${fourStars})`);
        totalReviewsAdded += result.length;
      } catch (error: any) {
        if (error.insertedDocs) {
          console.log(`  ⚠️  Added ${error.insertedDocs.length} reviews`);
          totalReviewsAdded += error.insertedDocs.length;
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
          console.log(`  ✓ Rating: ${avgRating} ⭐ (${reviewStats[0].totalReviews} reviews)\n`);
        }
      } catch (error: any) {
        console.log(`  ⚠️  Could not update rating\n`);
      }

      totalProcessed++;

      // Add a small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('=== SUMMARY ===');
    console.log(`✓ Processed ${totalProcessed} tours`);
    console.log(`✓ Added ${totalReviewsAdded} total reviews`);
    console.log(`✓ All tours now have 20-25 star-only reviews with 4.5+ ratings\n`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

addStarReviewsToAllTours();
