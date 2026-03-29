import React from 'react';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import Review from '@/lib/models/Review';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import TourDetailClientPage from './TourDetailClientPage';
import ClientErrorBoundary from '@/components/ClientErrorBoundary';
import type { Review as ReviewType, Tour as TourType } from '@/types';
import { getTenantFromRequest, getTenantPublicConfig } from '@/lib/tenant';
import { localizeTour } from '@/lib/translation/getLocalizedField';
import { cacheIfAvailable } from '@/lib/cache';

interface PageProps {
  params: Promise<{ slug: string; locale: string }>;
}

/**
 * Get tour by slug with multi-tenant support
 */
const getTourBySlug = cacheIfAvailable(
  async (slug: string, tenantId: string): Promise<{ tour: TourType; reviews: ReviewType[] } | null> => {
  try {
    await dbConnect();

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
    throw error;
  }
  },
  ['tour-page-by-slug'],
  { revalidate: 60, tags: ['tours'] }
);

/**
 * Get related tours
 */
const getRelatedTours = cacheIfAvailable(
  async (categoryIds: string | string[] | any, currentTourId: string, tenantId: string): Promise<TourType[]> => {
  try {
    await dbConnect();

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
      .select('title slug image discountPrice originalPrice duration destination category rating reviewCount translations')
      .populate('destination', 'name')
      .limit(3)
      .lean();

    return JSON.parse(JSON.stringify(relatedTours)) as TourType[];
  } catch (error) {
    console.error('[Tour] Error fetching related tours:', error);
    return [];
  }
  },
  ['tour-related-tours'],
  { revalidate: 120, tags: ['tours'] }
);

const getTourMetadataData = cacheIfAvailable(
  async (slug: string, tenantId: string) => {
    await dbConnect();

    const tenantFilter = tenantId !== 'default'
      ? { $or: [{ tenantId }, { tenantId: 'default' }] }
      : {};

    return Tour.findOne({ slug, ...tenantFilter })
      .select('title description metaTitle metaDescription keywords image destination')
      .populate('destination', 'name')
      .sort({ tenantId: tenantId !== 'default' ? -1 : 1 })
      .lean();
  },
  ['tour-page-metadata'],
  { revalidate: 60, tags: ['tours'] }
);

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const t = await getTranslations('metadata');
  try {
    const { slug } = await params;
    const tenantId = await getTenantFromRequest();
    const tenant = await getTenantPublicConfig(tenantId);
    const siteName = tenant?.name || 'Tours';

    const tour = await getTourMetadataData(slug, tenantId);

    if (!tour) {
      return { title: t('tourNotFound') };
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
    return { title: t('tour') };
  }
}

export default async function TourDetailPage({ params }: PageProps) {
  try {
    const { slug, locale } = await params;
    const tenantId = await getTenantFromRequest();
    const result = await getTourBySlug(slug, tenantId);

    if (!result) {
      notFound();
    }

    const { tour, reviews } = result;
    const relatedTours = await getRelatedTours(tour.category, (tour._id as any)?.toString(), tenantId);

    const localizedTour = localizeTour(tour as any, locale) as any;
    const localizedRelated = relatedTours.map((t: TourType) => localizeTour(t as any, locale) as any);

    return (
      <>
        <Header startSolid />
        <ClientErrorBoundary>
          <TourDetailClientPage
            tour={localizedTour}
            relatedTours={localizedRelated}
            initialReviews={reviews}
          />
        </ClientErrorBoundary>
        <Footer />
      </>
    );
  } catch (error) {
    console.error('[Tour] Page error:', error);
    notFound();
  }
}

export const revalidate = 60;
export const dynamicParams = true;
