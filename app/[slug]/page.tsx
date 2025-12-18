import React from 'react';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import Review from '@/lib/models/Review';
import Header2 from '@/components/Header2';
import Footer from '@/components/Footer';
import TourDetailClientPage from './TourDetailClientPage';
import { ITour } from '@/lib/models/Tour';
import { getTenantFromRequest } from '@/lib/tenant';

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Get tour by slug with multi-tenant support
 * Uses ISR via page-level revalidate export
 */
async function getTourBySlug(slug: string, tenantId: string): Promise<{ tour: ITour; reviews: any[] } | null> {
  try {
    await dbConnect();
    
    // Single optimized query with tenant fallback
    const tenantFilter = tenantId !== 'default' 
      ? { $or: [{ tenantId }, { tenantId: 'default' }] }
      : {};
    
    const tour = await Tour.findOne({ slug, ...tenantFilter })
      .populate('destination', 'name slug')
      .populate('category', 'name slug')
      .sort({ tenantId: tenantId !== 'default' ? -1 : 1 })
      .lean();

    if (!tour) return null;

    // Fetch reviews
    const reviews = await Review.find({ tour: tour._id })
      .populate('user', 'firstName lastName picture')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    return {
      tour: JSON.parse(JSON.stringify(tour)),
      reviews: JSON.parse(JSON.stringify(reviews))
    };
  } catch (error) {
    console.error(`[Tour] Error fetching tour ${slug}:`, error);
    return null;
  }
}

/**
 * Get related tours
 */
async function getRelatedTours(categoryIds: string | string[] | any, currentTourId: string, tenantId: string): Promise<ITour[]> {
  try {
    // Extract category IDs
    let categoryIdArray: string[] = [];
    if (Array.isArray(categoryIds)) {
      categoryIdArray = categoryIds.map(cat => typeof cat === 'object' ? cat._id?.toString() : cat?.toString()).filter(Boolean);
    } else if (categoryIds) {
      const catId = typeof categoryIds === 'object' ? categoryIds._id?.toString() : categoryIds?.toString();
      if (catId) categoryIdArray = [catId];
    }

    if (categoryIdArray.length === 0) return [];

    const relatedTours = await Tour.find({
      category: { $in: categoryIdArray },
      _id: { $ne: currentTourId },
      isPublished: true,
      tenantId
    })
      .select('title slug image discountPrice originalPrice duration destination category rating reviewCount')
      .populate('destination', 'name')
      .limit(3)
      .lean();

    return JSON.parse(JSON.stringify(relatedTours));
  } catch (error) {
    console.error('[Tour] Error fetching related tours:', error);
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const { slug } = await params;
    const tenantId = await getTenantFromRequest();
    
    await dbConnect();
    
    // OPTIMIZED: Lightweight query just for metadata
    const tenantFilter = tenantId !== 'default' 
      ? { $or: [{ tenantId }, { tenantId: 'default' }] }
      : {};
    
    const tour = await Tour.findOne({ slug, ...tenantFilter })
      .select('title description metaTitle metaDescription keywords image destination')
      .populate('destination', 'name')
      .sort({ tenantId: tenantId !== 'default' ? -1 : 1 })
      .lean();

    if (!tour) {
      return { title: 'Tour Not Found' };
    }

    const destination = typeof tour.destination === 'object' ? (tour.destination as any) : null;

    return {
      title: tour.metaTitle || `${tour.title} | ${destination?.name || 'Travel'} Tours`,
      description: tour.metaDescription || tour.description?.substring(0, 160),
      openGraph: {
        title: tour.title,
        description: tour.description?.substring(0, 160),
        images: tour.image ? [{ url: tour.image, alt: tour.title }] : [],
        type: 'website',
      },
    };
  } catch (error) {
    console.error('Error generating tour metadata:', error);
    return { title: 'Tour' };
  }
}

// Skip static generation at build time to avoid MongoDB connection issues on Netlify
// Pages will be generated on-demand with ISR caching
export async function generateStaticParams() {
  return [];
}

export default async function TourDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const tenantId = await getTenantFromRequest();
  const result = await getTourBySlug(slug, tenantId);

  if (!result) {
    notFound();
  }

  const { tour, reviews } = result;
  const relatedTours = await getRelatedTours(tour.category, (tour._id as any)?.toString(), tenantId);

  return (
    <>
      <Header2 startSolid />
      <TourDetailClientPage
        tour={tour}
        relatedTours={relatedTours}
        initialReviews={reviews}
      />
      <Footer />
    </>
  );
}

// Enable ISR with 60 second revalidation for instant page loads
export const revalidate = 60;
export const dynamicParams = true;