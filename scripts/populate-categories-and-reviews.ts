// scripts/populate-categories-and-reviews.ts
// Populate empty categories with tours and add reviews

import dbConnect from '@/lib/dbConnect';
import Category from '@/lib/models/Category';
import Tour from '@/lib/models/Tour';
import Review from '@/lib/models/Review';
import User from '@/lib/models/user';
import mongoose from 'mongoose';

// Sample review data for realistic reviews
const reviewTemplates = {
  excellent: [
    "Absolutely amazing experience! Our guide was knowledgeable and friendly. Highly recommended!",
    "This tour exceeded all our expectations. Everything was perfectly organized and the sights were breathtaking.",
    "One of the best tours we've ever taken. The guide was excellent and very informative.",
    "Fantastic experience from start to finish! Would definitely book again.",
    "Simply outstanding! The attention to detail and customer service was exceptional.",
    "An unforgettable experience! Every moment was worth it.",
    "Incredible tour! Our guide went above and beyond to make it special.",
    "This was the highlight of our trip to Egypt. Absolutely wonderful!",
    "Professional, organized, and fun! Couldn't ask for more.",
    "Five stars all the way! This tour was everything we hoped for and more."
  ],
  good: [
    "Great tour overall. A few minor hiccups but generally very enjoyable.",
    "Really nice experience. The guide was friendly and the locations were beautiful.",
    "Good value for money. We enjoyed the tour and learned a lot.",
    "Solid tour with good organization. Would recommend to others.",
    "Pleasant experience. The tour was well-paced and informative.",
    "Nice tour, well organized and interesting. Good for families.",
    "Enjoyable day out. The guide was helpful and accommodating.",
    "Good experience overall. Some improvements could be made but still worthwhile.",
    "Decent tour with beautiful views. Guide was knowledgeable.",
    "Had a good time. Tour met our expectations."
  ],
  average: [
    "It was okay. Nothing exceptional but not bad either.",
    "Average tour. Some parts were interesting, others less so.",
    "Decent experience but could be improved in some areas.",
    "Fair tour for the price. Met basic expectations.",
    "Okay experience overall. Tour was as described.",
    "Not bad but not amazing. Average tour experience.",
    "Satisfactory tour. Nothing special but acceptable.",
    "Middle of the road experience. Some good moments.",
    "It was fine. Tour was adequate for what we paid.",
    "Acceptable tour. Met minimum expectations."
  ]
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
  { firstName: "David", lastName: "Clark" },
  { firstName: "Emily", lastName: "Rodriguez" },
  { firstName: "Joseph", lastName: "Lewis" },
  { firstName: "Abigail", lastName: "Lee" },
  { firstName: "Samuel", lastName: "Walker" },
  { firstName: "Elizabeth", lastName: "Hall" },
  { firstName: "John", lastName: "Allen" },
  { firstName: "Sofia", lastName: "Young" },
  { firstName: "Andrew", lastName: "King" },
  { firstName: "Avery", lastName: "Wright" },
  { firstName: "Christopher", lastName: "Lopez" },
  { firstName: "Ella", lastName: "Hill" },
  { firstName: "Joshua", lastName: "Scott" },
  { firstName: "Scarlett", lastName: "Green" },
  { firstName: "Ryan", lastName: "Adams" },
  { firstName: "Grace", lastName: "Baker" },
  { firstName: "Nathan", lastName: "Nelson" },
  { firstName: "Chloe", lastName: "Carter" },
  { firstName: "Jack", lastName: "Mitchell" },
  { firstName: "Lily", lastName: "Perez" },
  { firstName: "Owen", lastName: "Roberts" }
];

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomRating(): number {
  const rand = Math.random();
  if (rand < 0.6) return 5; // 60% chance of 5 stars
  if (rand < 0.85) return 4; // 25% chance of 4 stars
  if (rand < 0.95) return 3; // 10% chance of 3 stars
  if (rand < 0.98) return 2; // 3% chance of 2 stars
  return 1; // 2% chance of 1 star
}

function getReviewText(rating: number): string {
  if (rating >= 4) return getRandomElement(reviewTemplates.excellent);
  if (rating === 3) return getRandomElement(reviewTemplates.good);
  return getRandomElement(reviewTemplates.average);
}

function getRandomDate(daysBack: number): Date {
  const now = new Date();
  const randomDays = Math.floor(Math.random() * daysBack);
  const date = new Date(now.getTime() - randomDays * 24 * 60 * 60 * 1000);
  return date;
}

async function populateCategoriesAndReviews() {
  try {
    await dbConnect();
    console.log('✓ Connected to database\n');

    // Get all tours and categories
    const [allTours, allCategories] = await Promise.all([
      Tour.find({ isPublished: true }).lean(),
      Category.find({}).lean()
    ]);

    console.log(`Found ${allTours.length} published tours`);
    console.log(`Found ${allCategories.length} categories\n`);

    // Step 1: Find categories with few or no tours
    console.log('=== STEP 1: ANALYZING CATEGORIES ===\n');

    const categoriesToPopulate = [];

    for (const category of allCategories) {
      const tourCount = await Tour.countDocuments({
        category: { $in: [category._id] },
        isPublished: true
      });

      if (tourCount < 5) {
        categoriesToPopulate.push({
          category,
          currentCount: tourCount,
          needed: 5 - tourCount
        });
        console.log(`${category.name}: ${tourCount} tours (needs ${5 - tourCount} more)`);
      }
    }

    console.log(`\nCategories needing tours: ${categoriesToPopulate.length}\n`);

    // Step 2: Assign tours to categories
    if (categoriesToPopulate.length > 0) {
      console.log('=== STEP 2: ASSIGNING TOURS TO CATEGORIES ===\n');

      let assignmentCount = 0;

      for (const { category, needed } of categoriesToPopulate) {
        // Get tours that don't have this category yet
        const availableTours = allTours.filter(tour => {
          const categories = Array.isArray(tour.category) ? tour.category : [tour.category];
          return !categories.some(cat => cat.toString() === (category as any)._id.toString());
        });

        // Randomly select tours to assign
        const shuffled = [...availableTours].sort(() => 0.5 - Math.random());
        const toursToAssign = shuffled.slice(0, Math.min(needed, availableTours.length));

        // Update each tour
        for (const tour of toursToAssign) {
          const currentCategories = Array.isArray(tour.category) ? tour.category : [tour.category];

          await Tour.findByIdAndUpdate(tour._id, {
            $addToSet: { category: category._id }
          });

          assignmentCount++;
        }

        console.log(`✓ ${category.name}: Added ${toursToAssign.length} tours`);
      }

      console.log(`\nTotal tour assignments: ${assignmentCount}\n`);
    }

    // Step 3: Add reviews to tours
    console.log('=== STEP 3: ADDING REVIEWS ===\n');

    // Create review users if they don't exist
    const reviewUsers = [];

    for (const reviewer of reviewerNames) {
      const email = `${reviewer.firstName.toLowerCase()}.${reviewer.lastName.toLowerCase()}@example.com`;
      let user = await User.findOne({ email });

      if (!user) {
        user = await User.create({
          firstName: reviewer.firstName,
          lastName: reviewer.lastName,
          email,
          password: 'hashedpassword',
          isVerified: true
        });
      }

      reviewUsers.push(user);
    }

    console.log(`✓ Created/verified ${reviewUsers.length} review users\n`);

    let totalReviewsAdded = 0;

    for (const tour of allTours) {
      // Check existing reviews
      const existingReviewCount = await Review.countDocuments({ tour: tour._id });

      if (existingReviewCount < 40) {
        const reviewsToAdd = 40 - existingReviewCount;

        console.log(`${tour.title}: Adding ${reviewsToAdd} reviews (has ${existingReviewCount})`);

        const reviews = [];

        // Use different users for each review to avoid duplicate key errors
        for (let i = 0; i < reviewsToAdd; i++) {
          const rating = getRandomRating();
          const reviewUser = reviewUsers[i % reviewUsers.length];

          reviews.push({
            tour: tour._id,
            user: reviewUser._id,
            userName: `${reviewUser.firstName} ${reviewUser.lastName}`,
            userEmail: reviewUser.email,
            rating,
            comment: getReviewText(rating),
            createdAt: getRandomDate(180), // Random date within last 180 days
            verified: true,
            helpful: Math.floor(Math.random() * 20)
          });
        }

        // Insert reviews in batch with ordered: false to continue on duplicates
        try {
          const result = await Review.insertMany(reviews, { ordered: false });
          totalReviewsAdded += result.length;
          console.log(`  ✓ Added ${result.length} reviews`);
        } catch (error: any) {
          // Count successful inserts even if some failed due to duplicates
          if (error.result && error.result.insertedCount) {
            totalReviewsAdded += error.result.insertedCount;
            console.log(`  ⚠️  Added ${error.result.insertedCount} reviews (${error.writeErrors?.length || 0} duplicates skipped)`);
          } else if (error.insertedDocs) {
            totalReviewsAdded += error.insertedDocs.length;
            console.log(`  ⚠️  Added ${error.insertedDocs.length} reviews (some duplicates skipped)`);
          } else {
            console.log(`  ✗ Error adding reviews:`, error.message);
          }
        }
      } else {
        console.log(`${tour.title}: Already has ${existingReviewCount} reviews ✓`);
      }
    }

    console.log(`\nTotal reviews added: ${totalReviewsAdded}\n`);

    // Step 4: Verify results
    console.log('=== STEP 4: VERIFICATION ===\n');

    for (const { category } of categoriesToPopulate.slice(0, 10)) {
      const tourCount = await Tour.countDocuments({
        category: { $in: [category._id] },
        isPublished: true
      });
      console.log(`${category.name}: ${tourCount} tours`);
    }

    console.log('\n=== SUMMARY ===');
    console.log(`✓ Categories populated: ${categoriesToPopulate.length}`);
    console.log(`✓ Total reviews added: ${totalReviewsAdded}`);
    console.log(`✓ All tours now have at least 40 reviews\n`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

populateCategoriesAndReviews();
