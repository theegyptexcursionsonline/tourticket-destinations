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
import { localizeEntityFields } from '@/lib/i18n/contentLocalization';
import { categoryTranslationFields } from '@/lib/i18n/translationFields';
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

  const category = await CategoryModel.findOne(buildStrictTenantQuery({ slug }, tenantId)).lean() as any;
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

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const tenantId = await getTenantFromRequest();
  const locale = await getLocale();
  const { category, categoryTours } = await getPageData(resolvedParams.slug, tenantId);

  if (!category) {
    notFound();
  }

  // Apply translations for the current locale
  const localizedTours = localizeAndDedupeTours(categoryTours as any[], locale);
  const catFields = categoryTranslationFields.map(f => f.key);
  const localizedCategory = localizeEntityFields(category, locale, catFields);

  return (
    <>
      <CollectionSchema
        name={(localizedCategory as any).name}
        description={(localizedCategory as any).description}
        url={`/categories/${resolvedParams.slug}`}
        items={(localizedTours as any[]).map((t: any) => ({
          name: t.title,
          url: `/tour/${t.slug}`,
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
      />
    </>
  );
}
