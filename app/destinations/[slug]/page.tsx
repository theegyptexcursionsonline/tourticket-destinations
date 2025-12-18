// app/destinations/[slug]/page.tsx
import { notFound } from 'next/navigation';
import dbConnect from '@/lib/dbConnect';
import DestinationModel from '@/lib/models/Destination';
import TourModel from '@/lib/models/Tour';
import CategoryModel from '@/lib/models/Category';
import ReviewModel from '@/lib/models/Review';
import DestinationPageClient from './DestinationPageClient';
import { getTenantFromRequest } from '@/lib/tenant';

// Enable ISR with 60 second revalidation for fast page loads
export const revalidate = 60;
export const dynamicParams = true;

// Skip static generation at build time to avoid MongoDB connection issues on Netlify
// Pages will be generated on-demand with ISR caching
export async function generateStaticParams() {
  return [];
}

// Generate metadata for SEO (tenant-aware) - OPTIMIZED
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenantId = await getTenantFromRequest();
    
    await dbConnect();
    
    // OPTIMIZED: Single query with $or for tenant fallback
    const tenantFilter = tenantId !== 'default' 
      ? { $or: [{ tenantId }, { tenantId: 'default' }] }
      : { tenantId: 'default' };
    
    const destination = await DestinationModel.findOne({ slug, ...tenantFilter })
      .select('name description image country')
      .sort({ tenantId: tenantId !== 'default' ? -1 : 1 })
      .lean();

    if (!destination) {
      return {
        title: 'Destination Not Found',
        description: 'The destination you are looking for does not exist.',
      };
    }

    return {
      title: `${destination.name}, ${destination.country} - Tours & Activities`,
      description: destination.description?.substring(0, 160) || `Discover the best tours and activities in ${destination.name}`,
      openGraph: {
        title: `${destination.name}, ${destination.country}`,
        description: destination.description?.substring(0, 160),
        images: destination.image ? [destination.image] : [],
        type: 'website',
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Destination',
      description: 'Explore amazing destinations',
    };
  }
}

async function getPageData(slug: string, tenantId: string) {
  try {
    await dbConnect();

    // OPTIMIZED: Single query with $or for tenant fallback instead of 3 sequential queries
    const tenantFilter = tenantId !== 'default' 
      ? { $or: [{ tenantId }, { tenantId: 'default' }] }
      : { tenantId: 'default' };
    
    const destination = await DestinationModel.findOne({ 
      slug, 
      ...tenantFilter 
    })
      .sort({ tenantId: tenantId !== 'default' ? -1 : 1 }) // Prefer tenant-specific
      .lean();
  
    if (!destination) {
      return {
        destination: null,
        destinationTours: [],
        allCategories: [],
        reviews: [],
        relatedDestinations: []
      };
    }

    // OPTIMIZED: Run all queries in parallel
    const [destinationTours, allCategories, relatedDestinationsRaw] = await Promise.all([
      // Tours for this destination
      TourModel.find({
        destination: destination._id,
        isPublished: true,
        tenantId
      }).lean(),
      
      // Categories for tenant
      CategoryModel.find({ tenantId }).limit(20).lean(),
      
      // Related destinations (limit to 4, no need for tour count loop)
      DestinationModel.find({
        _id: { $ne: destination._id },
        tenantId,
        $or: [{ country: destination.country }, { featured: true }]
      }).limit(4).lean()
    ]);

    // Fetch reviews only if we have tours (skip if none)
    let reviews: any[] = [];
    if (destinationTours.length > 0) {
      const tourIds = destinationTours.map(tour => tour._id);
      reviews = await ReviewModel.find({
        tour: { $in: tourIds },
        verified: true
      })
        .sort({ createdAt: -1 })
        .limit(6)
        .lean();
    }

    return {
      destination: JSON.parse(JSON.stringify(destination)),
      destinationTours: JSON.parse(JSON.stringify(destinationTours)),
      allCategories: JSON.parse(JSON.stringify(allCategories)),
      reviews: JSON.parse(JSON.stringify(reviews)),
      relatedDestinations: JSON.parse(JSON.stringify(relatedDestinationsRaw))
    };
  } catch (error) {
    console.error(`[Destination] Error fetching page data for ${slug}:`, error);
    return {
      destination: null,
      destinationTours: [],
      allCategories: [],
      reviews: [],
      relatedDestinations: []
    };
  }
}

export default async function DestinationPage({ params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenantId = await getTenantFromRequest();
    const { destination, destinationTours, allCategories, reviews, relatedDestinations } = await getPageData(slug, tenantId);

    if (!destination) {
      notFound();
    }

    return (
      <DestinationPageClient
        destination={destination}
        destinationTours={destinationTours}
        allCategories={allCategories}
        reviews={reviews}
        relatedDestinations={relatedDestinations}
      />
    );
  } catch (error) {
    console.error('[Destination] Page error:', error);
    notFound();
  }
}