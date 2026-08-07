// app/categories/[slug]/page.tsx
import { notFound, permanentRedirect } from 'next/navigation';
import dbConnect from '@/lib/dbConnect';
import TourModel from '@/lib/models/Tour';
import CategoryModel from '@/lib/models/Category';
import CategoryPageClient from './CategoryPageClient';
import { resolveLinkedPageCards } from '@/lib/attractionPages/pageContent';
import {
  buildStrictTenantQuery,
  getTenantFromRequest,
  getTenantConfig,
} from '@/lib/tenant';
import { getLocale } from 'next-intl/server';
import { localizeAndDedupeTours } from '@/lib/translation/localizeTourCollection';
import { localizeEntityFields, localizeStructuredEntries } from '@/lib/i18n/contentLocalization';
import { categoryStructuredFields, categoryTranslationFields } from '@/lib/i18n/translationFields';
import { localizeDestinationRecord } from '@/lib/i18n/localizeDestinationRecord';
import { metadataAlternates } from '@/lib/i18n/metadataAlternates';
import CollectionSchema from '@/components/schema/CollectionSchema';
import { decideForSegment } from '@/lib/content/resolveContentBySlug';
import { contentPath } from '@/lib/content/contentUrl';

// Force dynamic rendering to fix ISR caching issues on Netlify
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

// Generate metadata for SEO (tenant-aware)
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenantId = await getTenantFromRequest();
    const tenantConfig = await getTenantConfig(tenantId);
    const siteName = tenantConfig?.name || 'Egypt Excursions Online';
    const locale = await getLocale();
    
    await dbConnect();
    
    const category = await CategoryModel.findOne(buildStrictTenantQuery({ slug }, tenantId))
      .select('name description heroImage metaTitle metaDescription keywords translations urlType parentPage')
      .populate({ path: 'parentPage', select: 'slug' })
      .lean() as any;

    if (!category) {
      return {
        title: 'Category Not Found',
        description: 'The category you are looking for does not exist.',
      };
    }

    const localizedCategory = localizeEntityFields(
      category,
      locale,
      categoryTranslationFields.map((field) => field.key),
    );
    const title = localizedCategory.metaTitle || `${localizedCategory.name} Tours | ${siteName}`;
    const description = localizedCategory.metaDescription
      || (typeof localizedCategory.description === 'string'
        ? localizedCategory.description.substring(0, 160)
        : undefined)
      || `Explore ${localizedCategory.name} tours and activities`;

    return {
      title,
      description,
      keywords: Array.isArray(localizedCategory.keywords)
        ? localizedCategory.keywords.join(', ')
        : undefined,
      // A category's public path depends on its urlType — new categories default
      // to 'direct' (/{slug}), so hardcoding /categories/{slug} pointed the
      // canonical and every hreflang at a URL that 301s back here. Redirecting
      // hreflang URLs are discarded wholesale, which would have silently voided
      // the multilingual work this metadata exists to deliver.
      alternates: metadataAlternates(
        locale,
        contentPath('category', slug, category.urlType, undefined, category.parentPage?.slug),
      ),
      openGraph: {
        title,
        description,
        images: localizedCategory.heroImage ? [String(localizedCategory.heroImage)] : [],
        type: 'website',
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Category',
      description: 'Explore our tour categories',
    };
  }
}

async function getPageData(slug: string, tenantId: string) {
  await dbConnect();

  const category = await CategoryModel.findOne(buildStrictTenantQuery({ slug }, tenantId))
    .populate({
      path: 'popularDestinationIds',
      select: 'name slug image urlType parentPage translations faqs travelTips imageMetadata',
      // An unpublished destination must never surface on the storefront rail —
      // and neither must another brand's. The ids are stored ObjectIds written
      // straight from the admin body, so the join is a real tenant boundary:
      // without this scope one brand's rail could render a second brand's
      // destination, and (with the widened select above) ship its FAQs, travel
      // tips, captions and every locale translation into this brand's page.
      match: buildStrictTenantQuery({ isPublished: { $ne: false } }, tenantId),
    })
    .lean() as any;
  if (!category) {
    return { category: null, categoryTours: [] };
  }

  const categoryTours = await TourModel.find(
    buildStrictTenantQuery({ category: { $in: [category._id] }, isPublished: true }, tenantId)
  )
    .populate('destination')
    .lean();
  
  const serializedCategory = JSON.parse(JSON.stringify(category));
  const serializedTours = JSON.parse(JSON.stringify(categoryTours));

  return { 
    category: serializedCategory, 
    categoryTours: serializedTours,
  };
}

// The "Explore More Interests" rail, resolved server-side so the section
// renders with the page instead of flashing a client-fetch skeleton (or
// silently disappearing on a slow /api/interests response).
async function getRelatedCategoryInterests(
  currentCategoryId: string,
  currentSlug: string,
  locale: string,
  tenantId: string,
) {
  const relatedCategories = await CategoryModel.find(
    buildStrictTenantQuery({
      isPublished: true,
      slug: { $ne: currentSlug },
      _id: { $ne: currentCategoryId },
    }, tenantId)
  )
    .select('name slug heroImage featured order description translations')
    .sort({ featured: -1, order: 1, name: 1 })
    .limit(12)
    .lean();

  if (relatedCategories.length === 0) {
    return [];
  }

  const categoryIds = relatedCategories.map((category: any) => category._id);
  const counts = await TourModel.aggregate<{ _id: unknown; count: number }>([
    {
      $match: {
        ...buildStrictTenantQuery({ isPublished: true }, tenantId),
        category: { $in: categoryIds },
      },
    },
    { $unwind: '$category' },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
      },
    },
  ]).catch(() => []);

  const countMap = new Map(counts.map((item) => [String(item._id), Number(item.count) || 0]));

  return (JSON.parse(JSON.stringify(relatedCategories)) as Record<string, unknown>[])
    .map((category) => {
      const localized = localizeEntityFields(category, locale, ['name', 'description']);
      return {
        type: 'category' as const,
        _id: String(category._id),
        slug: String(category.slug || ''),
        name: String(localized.name || category.name || ''),
        image: typeof category.heroImage === 'string' ? category.heroImage : undefined,
        featured: Boolean(category.featured),
        products: countMap.get(String(category._id)) || 0,
      };
    })
    .filter((category) => category.products > 0);
}

export async function renderCategoryPage(slug: string) {
  const tenantId = await getTenantFromRequest();
  const locale = await getLocale();
  const { category, categoryTours } = await getPageData(slug, tenantId);

  if (!category) {
    notFound();
  }

  // Curated "other page listings". Resolved with the request tenant so a
  // stored id can only ever surface this brand's own pages.
  const linkedPages = await resolveLinkedPageCards(category, tenantId, locale);

  const relatedInterests = await getRelatedCategoryInterests(
    String(category._id),
    slug,
    locale,
    tenantId,
  );

  // Apply translations for the current locale
  const localizedTours = localizeAndDedupeTours(categoryTours as any[], locale)
    .map((tour: any) => ({
      ...tour,
      destination: tour.destination && typeof tour.destination === 'object'
        ? localizeDestinationRecord(tour.destination, locale)
        : tour.destination,
    }));
  const catFields = categoryTranslationFields.map(f => f.key);
  const localizedCategoryBase = localizeStructuredEntries(
    localizeEntityFields(category, locale, catFields),
    locale,
    categoryStructuredFields,
  );
  const localizedCategory = {
    ...localizedCategoryBase,
    popularDestinationIds: Array.isArray((localizedCategoryBase as any).popularDestinationIds)
      ? (localizedCategoryBase as any).popularDestinationIds.map((destination: unknown) => (
        destination && typeof destination === 'object'
          ? localizeDestinationRecord(destination as Record<string, unknown>, locale)
          : destination
      ))
      : [],
  };

  return (
    <>
      <CollectionSchema
        name={(localizedCategory as any).name}
        description={(localizedCategory as any).description}
        url={`/categories/${slug}`}
        items={(localizedTours as any[]).map((t: any) => ({
          name: t.title,
          url: contentPath(
            'tour',
            t.slug,
            t.urlType,
            t.destination && typeof t.destination === 'object' ? t.destination.slug : undefined,
            t.parentPage?.slug,
          ),
          image: t.image,
        }))}
        breadcrumbs={[
          { name: 'Home', url: '/' },
          { name: 'Categories', url: '/categories' },
          { name: (localizedCategory as any).name, url: `/categories/${slug}` },
        ]}
      />
      <CategoryPageClient
        category={localizedCategory}
        categoryTours={localizedTours}
        relatedInterests={relatedInterests}
        linkedPages={linkedPages}
      />
    </>
  );
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getLocale();
  const decision = await decideForSegment(slug, 'categories', locale);
  if (decision.action === 'redirect') permanentRedirect(decision.to);
  if (decision.action === 'notFound' || decision.match.type !== 'category') notFound();
  return renderCategoryPage(slug);
}
