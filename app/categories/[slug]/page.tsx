// app/categories/[slug]/page.tsx
import { notFound, redirect } from 'next/navigation';
import dbConnect from '@/lib/dbConnect';
import TourModel from '@/lib/models/Tour';
import CategoryModel from '@/lib/models/Category';
import { Tour, Category } from '@/types';
import CategoryPageClient from './CategoryPageClient';
import { getTenantFromRequest, getTenantConfig, buildTenantQuery } from '@/lib/tenant';

// Enable ISR with 60 second revalidation for instant page loads
export const revalidate = 60;
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
    
    const category = await CategoryModel.findOne({ slug })
      .select('name description heroImage metaTitle metaDescription keywords')
      .lean();

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
      title: 'Category - Egypt Excursions Online',
      description: 'Explore our tour categories',
    };
  }
}

async function getPageData(slug: string, tenantId: string) {
  await dbConnect();

  const category = await CategoryModel.findOne({ slug }).lean();
  if (!category) {
    return { category: null, categoryTours: [] };
  }

  // Build tenant-filtered query for tours
  const tourQuery = buildTenantQuery({
    category: { $in: [category._id] },
    isPublished: true
  }, tenantId);

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
  const { category, categoryTours } = await getPageData(resolvedParams.slug, tenantId);

  if (!category) {
    notFound();
  }

  return (
    <CategoryPageClient
      category={category}
      categoryTours={categoryTours}
    />
  );
}
