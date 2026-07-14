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
import {
  buildStrictTenantQuery,
  getTenantFromRequest,
  getTenantPublicConfig,
} from '@/lib/tenant';
import { localizeTour } from '@/lib/translation/getLocalizedField';
import {
  localizeAndDedupeTours,
  selectLocalizedTourCandidate,
} from '@/lib/translation/localizeTourCollection';
import { cacheIfAvailable } from '@/lib/cache';
import TourSchema from '@/components/schema/TourSchema';
import { getStopSaleDatesForTour } from '@/lib/stopSaleFetcher';

interface PageProps {
  params: Promise<{ slug: string; locale: string }>;
}

/**
 * Get tour by slug with multi-tenant support
 */
const getTourBySlug = cacheIfAvailable(
  async (slug: string, tenantId: string, locale: string): Promise<{ tour: TourType; reviews: ReviewType[] } | null> => {
  try {
    await dbConnect();

    console.log(`[Tour] Fetching: slug=${slug}, tenantId=${tenantId}`);

    const tourCandidates = await Tour.find(buildStrictTenantQuery({ slug }, tenantId))
      .populate('destination', 'name slug description')
      .populate('category', 'name slug')
      .lean();

    const tour = selectLocalizedTourCandidate(
      JSON.parse(JSON.stringify(tourCandidates)) as TourType[],
      locale
    );

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
      ...buildStrictTenantQuery({
        isPublished: true,
      }, tenantId),
    })
      .select('title slug image discountPrice originalPrice duration destination category rating reviewCount translations tags')
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
  async (slug: string, tenantId: string, locale: string) => {
    await dbConnect();

    const candidates = await Tour.find(buildStrictTenantQuery({ slug }, tenantId))
      .select('title description metaTitle metaDescription keywords image destination')
      .populate('destination', 'name')
      .lean();

    return selectLocalizedTourCandidate(
      JSON.parse(JSON.stringify(candidates)) as TourType[],
      locale
    );
  },
  ['tour-page-metadata'],
  { revalidate: 60, tags: ['tours'] }
);

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const t = await getTranslations('metadata');
  try {
    const { slug, locale } = await params;
    const tenantId = await getTenantFromRequest();
    const tenant = await getTenantPublicConfig(tenantId);
    const siteName = tenant?.name || 'Tours';

    const tour = await getTourMetadataData(slug, tenantId, locale);

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
    const result = await getTourBySlug(slug, tenantId, locale);

    if (!result) {
      notFound();
    }

    const { tour, reviews } = result;
    const tourIdString = (tour._id as any)?.toString?.() || '';

    // Fire related-tours + stop-sale prefetch in parallel. Stop-sale prefetch
    // ensures BookingSidebar's calendar shows accurate "Unavailable" state on
    // first paint rather than doing 6 client-side fetches on mount.
    const [relatedTours, initialStopSaleDates] = await Promise.all([
      getRelatedTours(tour.category, tourIdString, tenantId),
      getStopSaleDatesForTour(tourIdString, tenantId, 6),
    ]);

    const localizedTour = localizeTour(tour as any, locale) as any;
    const localizedRelated = localizeAndDedupeTours(relatedTours as any[], locale) as any;

    return (
      <>
        <TourSchema tour={localizedTour as any} reviews={reviews as any} />
        <Header startSolid />
        <ClientErrorBoundary>
          <TourDetailClientPage
            tour={localizedTour}
            relatedTours={localizedRelated}
            initialReviews={reviews}
            initialStopSaleDates={initialStopSaleDates}
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

export const revalidate = 900; // 15 min — per-domain edge cache; stale-while-revalidate keeps clicks instant
export const dynamicParams = true;
