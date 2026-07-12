// scripts/add-reviews-to-specific-tour.ts
// Add sample reviews to a specific tour by title

import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import Review from '@/lib/models/Review';
import User from '@/lib/models/user';

const reviewComments = {
  5: [
    "Absolutely amazing spa experience! The VIP treatment was incredible.",
    "Best hammam experience in Hurghada! Highly recommend.",
    "Luxurious and relaxing. The transfer service was very professional.",
    "Outstanding service from start to finish. Worth every penny!",
    "Incredible massage and beautiful spa facility. Will definitely return!",
    "Perfect relaxation experience. The staff was so attentive.",
    "This was the highlight of our Hurghada trip. Simply wonderful!",
    "Exceptional quality and service. Better than expected!",
    "Fantastic spa day! The hammam was authentic and the massage divine.",
    "Five stars all the way! Professional, clean, and so relaxing."
  ],
  4: [
    "Great spa experience overall. Really enjoyed the hammam.",
    "Very good value for money. Nice facilities and friendly staff.",
    "Lovely spa day. The massage was excellent.",
    "Good experience, would recommend to friends visiting Hurghada.",
    "Nice and relaxing. Transfer was on time and comfortable.",
    "Enjoyable spa experience. Staff were helpful and professional.",
    "Great way to spend an afternoon. Very relaxing.",
    "Good facilities and service. Had a wonderful time."
  ],
  3: [
    "Decent spa experience. Nothing exceptional but satisfactory.",
    "It was okay. The hammam was nice but could be improved.",
    "Average experience. Expected a bit more for the VIP package."
  ]
};

const reviewTitles = {
  5: ["Amazing!", "Best Spa Experience", "Highly Recommended", "Perfect!", "Outstanding"],
  4: ["Great Experience", "Very Good", "Lovely Spa Day", "Good Value", "Relaxing"],
  3: ["Decent", "Okay", "Average Experience"]
};

const reviewerNames = [
  { firstName: "Jennifer", lastName: "Wilson" },
  { firstName: "Robert", lastName: "Martinez" },
  { firstName: "Lisa", lastName: "Anderson" },
  { firstName: "Thomas", lastName: "Taylor" },
  { firstName: "Maria", lastName: "Garcia" },
  { firstName: "David", lastName: "Robinson" },
  { firstName: "Jessica", lastName: "Lee" },
  { firstName: "Christopher", lastName: "Walker" },
  { firstName: "Amanda", lastName: "Hall" },
  { firstName: "Daniel", lastName: "Young" },
  { firstName: "Michelle", lastName: "King" },
  { firstName: "Matthew", lastName: "Wright" },
  { firstName: "Ashley", lastName: "Lopez" },
  { firstName: "Andrew", lastName: "Hill" },
  { firstName: "Sarah", lastName: "Scott" }
];

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomRating(): number {
  const rand = Math.random();
  if (rand < 0.55) return 5; // 55% chance of 5 stars
  if (rand < 0.85) return 4; // 30% chance of 4 stars
  return 3; // 15% chance of 3 stars
}

function getRandomDate(daysBack: number): Date {
  const now = new Date();
  const randomDays = Math.floor(Math.random() * daysBack);
  return new Date(now.getTime() - randomDays * 24 * 60 * 60 * 1000);
}

async function addReviewsToTour() {
  try {
    await dbConnect();
    console.log('✓ Connected to database\n');

    // Find the tour by title
    const tourTitle = "Hurghada: Luxury VIP Hammam & Spa with Transfer";
    const tour = await Tour.findOne({ title: tourTitle });

    if (!tour) {
      console.log(`❌ Tour "${tourTitle}" not found`);
      process.exit(1);
    }

    console.log(`✓ Found tour: ${tour.title}`);
    console.log(`  Current rating: ${tour.rating || 'No rating'}\n`);

    // Create or get review users
    const reviewUsers = [];
    for (const reviewer of reviewerNames) {
      const email = `${reviewer.firstName.toLowerCase()}.${reviewer.lastName.toLowerCase()}@spa-reviews.com`;
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
    console.log('=== ADDING REVIEWS ===\n');

    // Add 12-15 reviews
    const numReviews = 12 + Math.floor(Math.random() * 4);
    const reviews = [];

    for (let i = 0; i < numReviews; i++) {
      const rating = getRandomRating();
      const reviewUser = reviewUsers[i % reviewUsers.length];

      // 65% chance of having a comment, 35% chance of just star rating
      const hasComment = Math.random() < 0.65;

      const review: any = {
        tour: tour._id,
        user: reviewUser._id,
        userName: `${reviewUser.firstName} ${reviewUser.lastName}`,
        userEmail: reviewUser.email,
        rating,
        createdAt: getRandomDate(60), // Random date within last 60 days
        verified: Math.random() < 0.85, // 85% verified
        helpful: Math.floor(Math.random() * 12)
      };

      if (hasComment) {
        // Add title (75% of the time)
        if (Math.random() < 0.75) {
          review.title = getRandomElement(reviewTitles[rating as keyof typeof reviewTitles]);
        }
        // Add comment
        review.comment = getRandomElement(reviewComments[rating as keyof typeof reviewComments]);
      }

      reviews.push(review);
    }

    // Insert reviews
    try {
      const result = await Review.insertMany(reviews, { ordered: false });
      console.log(`✓ Added ${result.length} reviews`);
      console.log(`  - With comments: ${reviews.filter(r => r.comment).length}`);
      console.log(`  - Star rating only: ${reviews.filter(r => !r.comment).length}\n`);
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

addReviewsToTour();
