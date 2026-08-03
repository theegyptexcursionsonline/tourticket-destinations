// app/categories/[slug]/page.tsx
import { notFound } from 'next/navigation';
import dbConnect from '@/lib/dbConnect';
import TourModel from '@/lib/models/Tour';
import CategoryModel from '@/lib/models/Category';
import CategoryPageClient from './CategoryPageClient';
import {
  buildStrictTenantQuery,
  getTenantFromRequest,
  getTenantConfig,
} from '@/lib/tenant';
import { getLocale } from 'next-intl/server';
import { localizeAndDedupeTours } from '@/lib/translation/localizeTourCollection';
import { localizeEntityFields, localizeStructuredEntries } from '@/lib/i18n/contentLocalization';
import { categoryStructuredFields, categoryTranslationFields } from '@/lib/i18n/translationFields';
import CollectionSchema from '@/components/schema/CollectionSchema';

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
    
    await dbConnect();
    
    const category = await CategoryModel.findOne(buildStrictTenantQuery({ slug }, tenantId))
      .select('name description heroImage metaTitle metaDescription keywords')
      .lean() as any;

    if (!category) {
      return {
        title: 'Category Not Found',
        description: 'The category you are looking for does not exist.',
      };
    }

    return {
      title: category.metaTitle || `${category.name} Tours | ${siteName}`,
      description: category.metaDescription || category.description?.substring(0, 160) || `Explore ${category.name} tours and activities`,
      keywords: category.keywords?.join(', '),
      openGraph: {
        title: category.name,
        description: category.description?.substring(0, 160),
        images: category.heroImage ? [category.heroImage] : [],
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
      select: 'name slug image',
      // An unpublished destination must never surface on the storefront rail.
      match: { isPublished: { $ne: false } },
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

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const tenantId = await getTenantFromRequest();
  const locale = await getLocale();
  const { category, categoryTours } = await getPageData(resolvedParams.slug, tenantId);

  if (!category) {
    notFound();
  }

  const relatedInterests = await getRelatedCategoryInterests(
    String(category._id),
    resolvedParams.slug,
    locale,
    tenantId,
  );

  // Apply translations for the current locale
  const localizedTours = localizeAndDedupeTours(categoryTours as any[], locale);
  const catFields = categoryTranslationFields.map(f => f.key);
  const localizedCategory = localizeStructuredEntries(
    localizeEntityFields(category, locale, catFields),
    locale,
    categoryStructuredFields,
  );

  return (
    <>
      <CollectionSchema
        name={(localizedCategory as any).name}
        description={(localizedCategory as any).description}
        url={`/categories/${resolvedParams.slug}`}
        items={(localizedTours as any[]).map((t: any) => ({
          name: t.title,
          url: `/${t.slug}`,
          image: t.image,
        }))}
        breadcrumbs={[
          { name: 'Home', url: '/' },
          { name: 'Categories', url: '/categories' },
          { name: (localizedCategory as any).name, url: `/categories/${resolvedParams.slug}` },
        ]}
      />
      <CategoryPageClient
        category={localizedCategory}
        categoryTours={localizedTours}
        relatedInterests={relatedInterests}
      />
    </>
  );
}
