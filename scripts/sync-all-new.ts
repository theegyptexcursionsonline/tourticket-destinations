// Sync ALL data to NEW Algolia account
import 'dotenv/config';
import { algoliasearch } from 'algoliasearch';
import dbConnect from '../lib/dbConnect';
import Tour from '../lib/models/Tour';

const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be configured.`);
  return value;
};

const ALGOLIA_APP_ID = requireEnv('NEXT_PUBLIC_ALGOLIA_APP_ID');
const ALGOLIA_ADMIN_KEY = requireEnv('ALGOLIA_ADMIN_API_KEY');

const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY);

// Format functions
const formatTourForAlgolia = (tour: any) => ({
  objectID: tour._id.toString(),
  title: tour.title || '',
  slug: tour.slug || '',
  description: tour.description || '',
  location: tour.location || '',
  price: tour.price || 0,
  discountPrice: tour.discountPrice || tour.price || 0,
  rating: tour.rating || 0,
  reviewCount: tour.reviewCount || 0,
  duration: tour.duration || 0,
  image: tour.image || '',
  images: tour.images || [],
  tags: tour.tags || [],
  category: tour.category ? {
    _id: tour.category._id?.toString() || tour.category.toString(),
    name: tour.category.name || ''
  } : null,
  destination: tour.destination ? {
    _id: tour.destination._id?.toString() || tour.destination.toString(),
    name: tour.destination.name || ''
  } : null,
  isPublished: tour.isPublished || false,
  isFeatured: tour.isFeatured || false,
  _tags: [
    ...(tour.tags || []),
    tour.category?.name || '',
    tour.destination?.name || '',
    tour.location || ''
  ].filter(Boolean)
});

async function syncAll() {
  try {
    console.log('🚀 Syncing ALL data to NEW Algolia...\n');
    await dbConnect();
    console.log('✅ Connected to MongoDB\n');

    // Sync Tours
    console.log('📦 Syncing Tours...');
    const tours = await Tour.find({ isPublished: true })
      .populate('category', 'name')
      .populate('destination', 'name')
      .lean();
    
    if (tours.length > 0) {
      const formattedTours = tours.map(formatTourForAlgolia);
      await client.saveObjects({
        indexName: 'foxes_technology',
        objects: formattedTours
      });
      console.log(`✅ Synced ${tours.length} tours\n`);
    }

    console.log('═══════════════════════════════════════');
    console.log('🎉 SYNC COMPLETE!');
    console.log(`📊 Total: ${tours.length} tours`);
    console.log('═══════════════════════════════════════');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

syncAll();
