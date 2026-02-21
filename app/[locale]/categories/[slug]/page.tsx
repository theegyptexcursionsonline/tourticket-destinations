// app/categories/[slug]/page.tsx
import { notFound } from 'next/navigation';
import dbConnect from '@/lib/dbConnect';
import TourModel from '@/lib/models/Tour';
import CategoryModel from '@/lib/models/Category';
import CategoryPageClient from './CategoryPageClient';
import { getTenantFromRequest, getTenantConfig, buildTenantQuery } from '@/lib/tenant';
import { getLocale } from 'next-intl/server';
import { localizeTour } from '@/lib/translation/getLocalizedField';

// Force dynamic rendering to fix ISR caching issues on Netlify
export const dynamic = 'force-dynamic';
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
    
    // Smart tenant detection for metadata
    const ownCatCount = await CategoryModel.countDocuments({ tenantId });
    const metaCatQuery = ownCatCount > 0 ? { slug, tenantId } : { slug };
    const category = await CategoryModel.findOne(metaCatQuery)
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

  // Smart tenant detection: check if tenant has own categories
  const ownCatCount = await CategoryModel.countDocuments({ tenantId });
  const categoryQuery = ownCatCount > 0
    ? { slug, tenantId }
    : { slug };

  const category = await CategoryModel.findOne(categoryQuery).lean() as any;
  if (!category) {
    return { category: null, categoryTours: [] };
  }

  // Smart tenant detection for tours
  const ownTourCount = await TourModel.countDocuments({ tenantId });
  const tourQuery = ownTourCount > 0
    ? { category: { $in: [category._id] }, isPublished: true, tenantId }
    : buildTenantQuery({ category: { $in: [category._id] }, isPublished: true }, tenantId);

  const categoryTours = await TourModel.find(tourQuery).populate('destination').lean();
  
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
  const localizedTours = categoryTours.map((t: any) => localizeTour(t, locale));

  return (
    <CategoryPageClient
      category={category}
      categoryTours={localizedTours}
    />
  );
}
