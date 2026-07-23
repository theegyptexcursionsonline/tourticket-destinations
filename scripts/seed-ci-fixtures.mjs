import mongoose from 'mongoose';

const mongoUri = process.env.MONGODB_URI;

let parsedMongoUri;
try {
  parsedMongoUri = new URL(mongoUri);
} catch {
  parsedMongoUri = null;
}

if (
  parsedMongoUri?.protocol !== 'mongodb:' ||
  !['localhost', '127.0.0.1', '[::1]'].includes(parsedMongoUri.hostname)
) {
  throw new Error('CI fixtures may only be seeded into a local MongoDB instance');
}

const destinationId = new mongoose.Types.ObjectId('66a000000000000000000001');
const categoryId = new mongoose.Types.ObjectId('66a000000000000000000002');
const tourId = new mongoose.Types.ObjectId('66a000000000000000000003');
const now = new Date();

await mongoose.connect(mongoUri, {
  serverSelectionTimeoutMS: 10_000,
});

const database = mongoose.connection.db;
if (!database) {
  throw new Error('CI MongoDB connection did not expose a database');
}

await database.collection('destinations').updateOne(
  { _id: destinationId },
  {
    $set: {
      tenantId: 'default',
      tenantIds: ['default'],
      name: 'Cairo',
      slug: 'cairo',
      country: 'Egypt',
      image: '/hero2.jpg',
      images: ['/hero2.jpg'],
      description: 'Explore Cairo with a deterministic CI fixture.',
      featured: true,
      isPublished: true,
      tourCount: 1,
      updatedAt: now,
    },
    $setOnInsert: { createdAt: now },
  },
  { upsert: true },
);

await database.collection('categories').updateOne(
  { _id: categoryId },
  {
    $set: {
      tenantId: 'default',
      tenantIds: ['default'],
      name: 'Day Trips',
      slug: 'day-trips',
      description: 'Deterministic category for isolated CI checks.',
      heroImage: '/hero1.jpg',
      isPublished: true,
      featured: true,
      order: 1,
      tourCount: 1,
      updatedAt: now,
    },
    $setOnInsert: { createdAt: now },
  },
  { upsert: true },
);

await database.collection('tours').updateOne(
  { _id: tourId },
  {
    $set: {
      tenantId: 'default',
      tenantIds: ['default'],
      title: 'Cairo Highlights Day Tour',
      slug: 'cairo-highlights-day-tour',
      destination: destinationId,
      category: [categoryId],
      description: 'A deterministic published tour used only by isolated CI checks.',
      longDescription: 'Visit Cairo highlights with a deterministic fixture that never touches production data.',
      location: 'Cairo, Egypt',
      price: 80,
      originalPrice: 100,
      discountPrice: 80,
      duration: '8 hours',
      difficulty: 'Easy',
      maxGroupSize: 12,
      image: '/hero1.jpg',
      images: ['/hero1.jpg'],
      highlights: ['Cairo highlights'],
      includes: ['Private transport'],
      isFeatured: true,
      isPublished: true,
      isActive: true,
      rating: 4.8,
      reviewCount: 0,
      bookings: 0,
      reviews: [],
      availability: {
        type: 'daily',
        availableDays: [0, 1, 2, 3, 4, 5, 6],
        slots: [{ time: '10:00', capacity: 12 }],
        blockedDates: [],
      },
      updatedAt: now,
    },
    $setOnInsert: { createdAt: now },
  },
  { upsert: true },
);

await mongoose.disconnect();

console.log('Seeded isolated EEO CI fixtures');
