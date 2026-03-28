import React from 'react';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import TourDetailClientPage from './TourDetailClientPage';
import type { Review as ReviewType, Tour as TourType } from '@/types';
import { getTenantFromRequest, getTenantPublicConfig } from '@/lib/tenant';
import { localizeTour } from '@/lib/translation/getLocalizedField';
import { getCachedTour, getCachedReviews } from '@/lib/cache';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import { unstable_cache } from 'next/cache';

interface PageProps {
  params: Promise<{ slug: string; locale: string }>;
}

/**
 * Cached related tours fetcher
 */
const getCachedRelatedTours = (categoryIds: string[], currentTourId: string, tenantId: string) => {
  return unstable_cache(
    async () => {
      await dbConnect();

      if (categoryIds.length === 0) return [];

      const relatedTours = await Tour.find({
        category: { $in: categoryIds },
        _id: { $ne: currentTourId },
        isPublished: true,
        tenantId
      })
        .select('title slug image discountPrice originalPrice duration destination category rating reviewCount translations')
        .populate('destination', 'name')
        .limit(3)
        .lean();

      return JSON.parse(JSON.stringify(relatedTours)) as TourType[];
    },
    [`related-tours-${currentTourId}-${tenantId}`],
    {
      revalidate: 300, // 5 minutes
      tags: ['tours'],
    }
  )();
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const t = await getTranslations('metadata');
  try {
    const { slug } = await params;
    const tenantId = await getTenantFromRequest();
    const tenant = await getTenantPublicConfig(tenantId);
    const siteName = tenant?.name || 'Tours';

    const tour = await getCachedTour(slug, tenantId);

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

// Skip static generation at build time to avoid MongoDB connection issues on Netlify
export async function generateStaticParams() {
  return [];
}

export default async function TourDetailPage({ params }: PageProps) {
  try {
    const { slug, locale } = await params;
    const tenantId = await getTenantFromRequest();

    // Use cached queries — dramatically faster on repeat visits
    const tour = await getCachedTour(slug, tenantId);

    if (!tour) {
      notFound();
    }

    const tourId = (tour._id as any)?.toString();

    // Fetch reviews and related tours in parallel using cached queries
    const [reviews, relatedTours] = await Promise.all([
      getCachedReviews(tourId),
      (() => {
        // Extract category IDs
        const categoryIds: string[] = [];
        const cats = tour.category;
        if (Array.isArray(cats)) {
          cats.forEach((cat: any) => {
            const id = typeof cat === 'object' ? cat._id?.toString() : cat?.toString();
            if (id) categoryIds.push(id);
          });
        } else if (cats) {
          const id = typeof cats === 'object' ? (cats as any)._id?.toString() : cats?.toString();
          if (id) categoryIds.push(id);
        }
        return getCachedRelatedTours(categoryIds, tourId, tenantId);
      })(),
    ]);

    // Apply translations for the current locale
    const localizedTour = localizeTour(tour as any, locale) as any;
    const localizedRelated = relatedTours.map(t => localizeTour(t as any, locale) as any);

    return (
      <>
        <Header startSolid />
        <TourDetailClientPage
          tour={localizedTour}
          relatedTours={localizedRelated}
          initialReviews={reviews as ReviewType[]}
        />
        <Footer />
      </>
    );
  } catch (error) {
    console.error('[Tour] Page error:', error);
    notFound();
  }
}

// ISR: revalidate cached data in background, page stays dynamic for tenant detection
export const revalidate = 60;
export const dynamicParams = true;
