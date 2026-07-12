// scripts/add-sample-reviews.ts
// Add sample reviews to tours - mix of reviews with and without comments

import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import Review from '@/lib/models/Review';
import User from '@/lib/models/user';

// Sample review comments (optional)
const reviewComments = {
  5: [
    "Absolutely amazing experience! Highly recommended!",
    "This tour exceeded all expectations. Everything was perfectly organized.",
    "One of the best tours we've ever taken. The guide was excellent.",
    "Fantastic experience from start to finish!",
    "Simply outstanding! The attention to detail was exceptional.",
    "An unforgettable experience! Every moment was worth it.",
    "Incredible tour! Would definitely do it again.",
    "This was the highlight of our trip to Egypt.",
    "Professional, organized, and fun! Couldn't ask for more.",
    "Five stars all the way! This tour was everything we hoped for."
  ],
  4: [
    "Great tour overall. A few minor hiccups but generally very enjoyable.",
    "Really nice experience. The guide was friendly and locations beautiful.",
    "Good value for money. We enjoyed the tour and learned a lot.",
    "Solid tour with good organization. Would recommend.",
    "Pleasant experience. Well-paced and informative.",
    "Nice tour, well organized. Good for families.",
    "Enjoyable day out. The guide was helpful.",
    "Good experience overall. Some improvements could be made.",
    "Decent tour with beautiful views.",
    "Had a good time. Tour met our expectations."
  ],
  3: [
    "It was okay. Nothing exceptional but not bad either.",
    "Average tour. Some parts were interesting.",
    "Decent experience but could be improved.",
    "Fair tour for the price. Met basic expectations.",
    "Okay experience overall. Tour was as described."
  ],
  2: [
    "Below expectations. Several issues throughout.",
    "Not great. Had some problems with organization.",
    "Disappointing. Expected more for the price."
  ],
  1: [
    "Very disappointing experience. Would not recommend.",
    "Poor organization and service. Not worth it."
  ]
};

const reviewTitles = {
  5: ["Excellent!", "Amazing Experience", "Highly Recommended", "Perfect!", "Outstanding Tour"],
  4: ["Great Tour", "Very Good", "Enjoyable Experience", "Good Value", "Nice Experience"],
  3: ["Decent", "Average", "Okay Experience", "Fair Tour", "Acceptable"],
  2: ["Below Average", "Disappointing", "Not Great", "Issues", "Poor"],
  1: ["Terrible", "Worst Experience", "Do Not Book", "Awful", "Very Poor"]
};

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
  { firstName: "David", lastName: "Clark" }
];

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomRating(): number {
  const rand = Math.random();
  if (rand < 0.5) return 5; // 50% chance of 5 stars
  if (rand < 0.80) return 4; // 30% chance of 4 stars
  if (rand < 0.95) return 3; // 15% chance of 3 stars
  if (rand < 0.98) return 2; // 3% chance of 2 stars
  return 1; // 2% chance of 1 star
}

function getRandomDate(daysBack: number): Date {
  const now = new Date();
  const randomDays = Math.floor(Math.random() * daysBack);
  return new Date(now.getTime() - randomDays * 24 * 60 * 60 * 1000);
}

async function addSampleReviews() {
  try {
    await dbConnect();
    console.log('✓ Connected to database\n');

    // Get published tours
    const tours = await Tour.find({ isPublished: true }).limit(10).lean();
    console.log(`Found ${tours.length} published tours to add reviews to\n`);

    if (tours.length === 0) {
      console.log('No published tours found. Exiting.');
      process.exit(0);
    }

    // Create or get review users
    const reviewUsers = [];
    for (const reviewer of reviewerNames) {
      const email = `${reviewer.firstName.toLowerCase()}.${reviewer.lastName.toLowerCase()}@reviewers.com`;
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

    let totalReviewsAdded = 0;
    let reviewsWithComments = 0;
    let reviewsWithoutComments = 0;

    for (const tour of tours) {
      console.log(`\n${tour.title}:`);

      // Add 5-10 reviews per tour
      const numReviews = 5 + Math.floor(Math.random() * 6);
      const reviews = [];

      for (let i = 0; i < numReviews; i++) {
        const rating = getRandomRating();
        const reviewUser = reviewUsers[i % reviewUsers.length];

        // 70% chance of having a comment, 30% chance of just star rating
        const hasComment = Math.random() < 0.7;

        const review: any = {
          tour: tour._id,
          user: reviewUser._id,
          userName: `${reviewUser.firstName} ${reviewUser.lastName}`,
          userEmail: reviewUser.email,
          rating,
          createdAt: getRandomDate(90), // Random date within last 90 days
          verified: Math.random() < 0.8, // 80% verified
          helpful: Math.floor(Math.random() * 15)
        };

        if (hasComment) {
          // Add title (70% of the time)
          if (Math.random() < 0.7) {
            review.title = getRandomElement(reviewTitles[rating as keyof typeof reviewTitles]);
          }
          // Add comment
          review.comment = getRandomElement(reviewComments[rating as keyof typeof reviewComments]);
          reviewsWithComments++;
        } else {
          // Just star rating, no comment or title
          reviewsWithoutComments++;
        }

        reviews.push(review);
      }

      // Insert reviews
      try {
        const result = await Review.insertMany(reviews, { ordered: false });
        totalReviewsAdded += result.length;
        console.log(`  ✓ Added ${result.length} reviews (${reviews.filter(r => r.comment).length} with comments, ${reviews.filter(r => !r.comment).length} star-only)`);
      } catch (error: any) {
        if (error.insertedDocs) {
          totalReviewsAdded += error.insertedDocs.length;
          console.log(`  ⚠️  Added ${error.insertedDocs.length} reviews (some duplicates skipped)`);
        } else {
          console.log(`  ✗ Error:`, error.message);
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
          console.log(`  ✓ Updated tour rating to ${avgRating} (${reviewStats[0].totalReviews} total reviews)`);
        }
      } catch (error: any) {
        console.log(`  ⚠️  Could not update tour rating:`, error.message);
      }
    }

    console.log('\n=== SUMMARY ===');
    console.log(`✓ Total reviews added: ${totalReviewsAdded}`);
    console.log(`  - With comments: ${reviewsWithComments}`);
    console.log(`  - Star rating only: ${reviewsWithoutComments}`);
    console.log(`✓ Tours updated: ${tours.length}\n`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

addSampleReviews();
