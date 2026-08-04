// app/destinations/[slug]/page.tsx
import { notFound, permanentRedirect } from 'next/navigation';
import dbConnect from '@/lib/dbConnect';
import DestinationModel from '@/lib/models/Destination';
import TourModel from '@/lib/models/Tour';
import CategoryModel from '@/lib/models/Category';
import ReviewModel from '@/lib/models/Review';
import DestinationPageClient from './DestinationPageClient';
import {
  buildStrictTenantQuery,
  getTenantFromRequest,
  getTenantPublicConfig,
} from '@/lib/tenant';
import { getLocale } from 'next-intl/server';
import { localizeAndDedupeTours } from '@/lib/translation/localizeTourCollection';
import { localizeEntityFields, localizeStructuredEntries } from '@/lib/i18n/contentLocalization';
import { destinationTranslationFields, categoryTranslationFields, destinationStructuredFields } from '@/lib/i18n/translationFields';
import DestinationSchema from '@/components/schema/DestinationSchema';
import { decideForSegment } from '@/lib/content/resolveContentBySlug';

// Force dynamic rendering to fix 500 errors
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

// Generate metadata for SEO (tenant-aware) - OPTIMIZED
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenantId = await getTenantFromRequest();
    const tenant = await getTenantPublicConfig(tenantId);
    const siteName = tenant?.name || 'Tours & Activities';
    
    await dbConnect();
    
    const destination = await DestinationModel.findOne(
      buildStrictTenantQuery({ slug }, tenantId)
    )
      .select('name description image country metaTitle metaDescription')
      .lean() as any;

    if (!destination) {
      return {
        title: 'Destination Not Found',
        description: 'The destination you are looking for does not exist.',
      };
    }

    // Country is optional — never let a blank one print "undefined" in the title.
    const namePart = destination.country
      ? `${destination.name}, ${destination.country}`
      : destination.name;

    // What the editor typed wins; the generated title is only a fallback.
    const metaTitle = destination.metaTitle?.trim();
    const metaDescription = destination.metaDescription?.trim();
    const title = metaTitle || `${namePart} - Tours & Activities | ${siteName}`;
    const description = metaDescription
      || destination.description?.substring(0, 160)
      || `Discover the best tours and activities in ${destination.name} with ${siteName}`;

    return {
      title,
      description,
      openGraph: {
        title: metaTitle || namePart,
        description,
        images: destination.image ? [destination.image] : (tenant?.seo.ogImage ? [tenant.seo.ogImage] : []),
        type: 'website',
        siteName: siteName,
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

/**
 * Get destination page data
 * Uses direct dynamic rendering on Netlify.
 */
async function getPageData(slug: string, tenantId: string) {
  try {
    await dbConnect();

    const destination = await DestinationModel.findOne(
      buildStrictTenantQuery({ slug }, tenantId)
    )
      .lean() as any;
  
    if (!destination) {
      return {
        destination: null,
        destinationTours: [],
        allCategories: [],
        reviews: [],
        relatedDestinations: []
      };
    }

    // Run all queries in parallel
    const [destinationTours, allCategories, relatedDestinationsRaw] = await Promise.all([
      TourModel.find({
        ...buildStrictTenantQuery({
          destination: destination._id,
          isPublished: true,
        }, tenantId),
      }).lean(),
      
      CategoryModel.find(buildStrictTenantQuery({}, tenantId)).limit(20).lean(),
      
      DestinationModel.find({
        $and: [
          buildStrictTenantQuery({ _id: { $ne: destination._id } }, tenantId),
          { $or: [{ country: destination.country }, { featured: true }] },
        ],
      }).limit(4).lean()
    ]);

    const relatedDestinationIds = relatedDestinationsRaw.map((related: any) => related._id);
    const relatedTourCounts = relatedDestinationIds.length > 0
      ? await TourModel.aggregate([
          {
            $match: buildStrictTenantQuery({
              destination: { $in: relatedDestinationIds },
              isPublished: true,
            }, tenantId),
          },
          { $group: { _id: '$destination', count: { $sum: 1 } } },
        ]).catch(() => [])
      : [];
    const relatedTourCountMap = new Map(
      relatedTourCounts.map((item: any) => [String(item._id), Number(item.count) || 0])
    );
    const relatedDestinations = relatedDestinationsRaw
      .map((related: any) => ({
        ...related,
        tourCount: relatedTourCountMap.get(String(related._id)) || 0,
      }))
      .filter((related: any) => related.tourCount > 0);

    // Fetch reviews only if we have tours
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
      relatedDestinations: JSON.parse(JSON.stringify(relatedDestinations))
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

export async function renderDestinationPage(slug: string) {
  try {
    const tenantId = await getTenantFromRequest();
    const locale = await getLocale();
    const { destination, destinationTours, allCategories, reviews, relatedDestinations } = await getPageData(slug, tenantId);

    if (!destination) {
      notFound();
    }

    // Apply translations for the current locale
    const localizedTours = localizeAndDedupeTours(destinationTours as any[], locale);
    const destFields = destinationTranslationFields.map(f => f.key);
    const catFields = categoryTranslationFields.map(f => f.key);
    const localizedDestination = localizeEntityFields(
      localizeStructuredEntries(destination, locale, destinationStructuredFields),
      locale,
      destFields,
    );
    const localizedCategories = allCategories.map((c: any) => localizeEntityFields(c, locale, catFields));
    const localizedRelated = relatedDestinations.map((d: any) => localizeEntityFields(d, locale, destFields));

    return (
      <>
        <DestinationSchema
          name={(localizedDestination as any).name}
          slug={(localizedDestination as any).slug}
          description={(localizedDestination as any).description}
          image={(localizedDestination as any).image}
          country={(localizedDestination as any).country}
          tours={(localizedTours as any[]).map((t: any) => ({
            title: t.title,
            slug: t.slug,
            image: t.image,
            discountPrice: t.discountPrice,
            originalPrice: t.originalPrice,
            rating: t.rating,
            reviewCount: t.reviewCount,
          }))}
        />
        <DestinationPageClient
          tenantId={tenantId}
          destination={localizedDestination}
          destinationTours={localizedTours}
          allCategories={localizedCategories}
          reviews={reviews}
          relatedDestinations={localizedRelated}
        />
      </>
    );
  } catch (error) {
    console.error('[Destination] Page error:', error);
    notFound();
  }
}

export default async function DestinationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getLocale();
  const decision = await decideForSegment(slug, 'destinations', locale);
  if (decision.action === 'redirect') permanentRedirect(decision.to);
  if (decision.action === 'notFound' || decision.match.type !== 'destination') notFound();
  return renderDestinationPage(slug);
}
