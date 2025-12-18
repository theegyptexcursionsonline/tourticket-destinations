// app/destinations/[slug]/page.tsx
import { notFound } from 'next/navigation';
import dbConnect from '@/lib/dbConnect';
import DestinationModel from '@/lib/models/Destination';
import TourModel from '@/lib/models/Tour';
import CategoryModel from '@/lib/models/Category';
import ReviewModel from '@/lib/models/Review';
import DestinationPageClient from './DestinationPageClient';
import { getTenantFromRequest, getTenantConfig, buildTenantQuery } from '@/lib/tenant';

// Enable ISR with 60 second revalidation for fast page loads
export const revalidate = 60;
export const dynamicParams = true;

// Skip static generation at build time to avoid MongoDB connection issues on Netlify
// Pages will be generated on-demand with ISR caching
export async function generateStaticParams() {
  return [];
}

// Generate metadata for SEO (tenant-aware)
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenantId = await getTenantFromRequest();
    const tenantConfig = await getTenantConfig(tenantId);
    const siteName = tenantConfig?.name || 'Egypt Excursions Online';
    
    await dbConnect();
    
    // Find destination by slug with tenant fallback
    let destination = await DestinationModel.findOne({ slug, tenantId })
      .select('name description image country')
      .lean();
    
    if (!destination && tenantId !== 'default') {
      destination = await DestinationModel.findOne({ slug, tenantId: 'default' })
        .select('name description image country')
        .lean();
    }
    
    if (!destination) {
      destination = await DestinationModel.findOne({ slug })
        .select('name description image country')
        .lean();
    }

    if (!destination) {
      return {
        title: 'Destination Not Found',
        description: 'The destination you are looking for does not exist.',
      };
    }

    return {
      title: `${destination.name}, ${destination.country} - Tours & Activities | ${siteName}`,
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
      title: 'Destination - Egypt Excursions Online',
      description: 'Explore amazing destinations in Egypt',
    };
  }
}

async function getPageData(slug: string, tenantId: string) {
  try {
    await dbConnect();

    console.log(`[Destination] Looking for: ${slug}, tenantId: ${tenantId}`);

    // Find destination by slug, first try tenant-specific, then fallback to default/global
    let destination = await DestinationModel.findOne({ slug, tenantId }).lean();
  
  // Fallback: try default tenant
  if (!destination && tenantId !== 'default') {
    destination = await DestinationModel.findOne({ slug, tenantId: 'default' }).lean();
  }
  
  // Final fallback: any destination with this slug (backward compatibility)
  if (!destination) {
    destination = await DestinationModel.findOne({ slug }).lean();
  }
  
  if (!destination) {
    return {
      destination: null,
      destinationTours: [],
      allCategories: [],
      reviews: [],
      relatedDestinations: []
    };
  }

  // Fetch published tours for this destination (filtered by tenant)
  const tourQuery = buildTenantQuery({
    destination: destination._id,
    isPublished: true
  }, tenantId);
  
  const destinationTours = await TourModel.find(tourQuery).lean();

  // Fetch categories (filtered by tenant)
  const categoryQuery = buildTenantQuery({}, tenantId);
  const allCategories = await CategoryModel.find(categoryQuery).lean();

  // Fetch reviews for tours in this destination
  const tourIds = destinationTours.map(tour => tour._id);
  const reviews = await ReviewModel.find({
    tour: { $in: tourIds },
    verified: true
  })
    .sort({ createdAt: -1 })
    .limit(6)
    .lean();

  // Fetch related destinations (same country or similar, with tours for this tenant)
  // Try tenant-specific destinations first, then fall back to default tenant
  let relatedDestinationsRaw = await DestinationModel.find({
    _id: { $ne: destination._id },
    tenantId: tenantId,
    $or: [
      { country: destination.country },
      { featured: true }
    ]
  })
    .limit(8)
    .lean();
  
  // If no tenant-specific destinations found, try default tenant
  if (relatedDestinationsRaw.length === 0 && tenantId !== 'default') {
    relatedDestinationsRaw = await DestinationModel.find({
      _id: { $ne: destination._id },
      tenantId: 'default',
      $or: [
        { country: destination.country },
        { featured: true }
      ]
    })
      .limit(8)
      .lean();
  }

  // Calculate tour count for each related destination (filtered by tenant)
  const relatedDestinations = await Promise.all(
    relatedDestinationsRaw.map(async (dest) => {
      const countQuery = buildTenantQuery({
        destination: dest._id,
        isPublished: true
      }, tenantId);
      
      const tourCount = await TourModel.countDocuments(countQuery);
      return {
        ...dest,
        tourCount
      };
    })
  );
  
  // Filter out destinations with no tours for this tenant and limit to 4
  const filteredRelatedDestinations = relatedDestinations
    .filter(d => d.tourCount > 0)
    .slice(0, 4);

  const serializedDestination = JSON.parse(JSON.stringify(destination));
  const serializedTours = JSON.parse(JSON.stringify(destinationTours));
  const serializedCategories = JSON.parse(JSON.stringify(allCategories));
  const serializedReviews = JSON.parse(JSON.stringify(reviews));
  const serializedRelatedDest = JSON.parse(JSON.stringify(filteredRelatedDestinations));

    console.log(`[Destination] Found: ${destination.name}, Tours: ${destinationTours.length}`);

    return {
      destination: serializedDestination,
      destinationTours: serializedTours,
      allCategories: serializedCategories,
      reviews: serializedReviews,
      relatedDestinations: serializedRelatedDest
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