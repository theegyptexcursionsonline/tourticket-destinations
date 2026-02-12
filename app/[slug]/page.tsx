import React from 'react';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import Review from '@/lib/models/Review';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import TourDetailClientPage from './TourDetailClientPage';
import type { Review as ReviewType, Tour as TourType } from '@/types';
import { getTenantFromRequest, getTenantPublicConfig } from '@/lib/tenant';

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Get tour by slug with multi-tenant support
 */
async function getTourBySlug(slug: string, tenantId: string): Promise<{ tour: TourType; reviews: ReviewType[] } | null> {
  try {
    await dbConnect();
    
    // OPTIMIZED: Single query with $or for tenant fallback, sort to prefer tenant-specific
    const tenantFilter = tenantId !== 'default' 
      ? { $or: [{ tenantId }, { tenantId: 'default' }] }
      : {};
    
    console.log(`[Tour] Fetching: slug=${slug}, tenantId=${tenantId}`);
    
    const tour = await Tour.findOne({ slug, ...tenantFilter })
      .populate('destination', 'name slug description')
      .populate('category', 'name slug')
      .sort({ tenantId: tenantId !== 'default' ? -1 : 1 })
      .lean();
    
    if (!tour) {
      console.log(`[Tour] Not found: slug=${slug}`);
      return null;
    }
    
    console.log(`[Tour] Found: ${tour.title}, tenantId=${(tour as any).tenantId}`);
    
    // Fetch reviews in parallel (limit for performance)
    const reviews = await Review.find({ tourId: tour._id })
      .populate('userId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    
    return {
      tour: JSON.parse(JSON.stringify(tour)) as TourType,
      reviews: JSON.parse(JSON.stringify(reviews)) as ReviewType[],
    };
  } catch (error) {
    console.error('[Tour] Error fetching tour:', error);
    return null;
  }
}

/**
 * Get related tours
 */
async function getRelatedTours(categoryIds: string | string[] | any, currentTourId: string, tenantId: string): Promise<TourType[]> {
  try {
    await dbConnect();
    
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

    return JSON.parse(JSON.stringify(relatedTours)) as TourType[];
  } catch (error) {
    console.error('[Tour] Error fetching related tours:', error);
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const { slug } = await params;
    const tenantId = await getTenantFromRequest();
    const tenant = await getTenantPublicConfig(tenantId);
    const siteName = tenant?.name || 'Tours';
    
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

    return {
      title: tour.metaTitle || `${tour.title} | ${siteName}`,
      description: tour.metaDescription || tour.description?.substring(0, 160),
      openGraph: {
        title: tour.title,
        description: tour.description?.substring(0, 160),
        images: tour.image ? [{ url: tour.image, alt: tour.title }] : (tenant?.seo.ogImage ? [tenant.seo.ogImage] : []),
        type: 'website',
        siteName: siteName,
      },
    };
  } catch (error) {
    console.error('Error generating tour metadata:', error);
    return { title: 'Tour' };
  }
}

// Skip static generation at build time to avoid MongoDB connection issues on Netlify
export async function generateStaticParams() {
  return [];
}

export default async function TourDetailPage({ params }: PageProps) {
  try {
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
        <Header startSolid />
        <TourDetailClientPage
          tour={tour}
          relatedTours={relatedTours}
          initialReviews={reviews}
        />
        <Footer />
      </>
    );
  } catch (error) {
    console.error('[Tour] Page error:', error);
    notFound();
  }
}

// Force dynamic rendering to fix ISR caching issues on Netlify
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
