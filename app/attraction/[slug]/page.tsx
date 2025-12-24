import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AttractionLandingPage from '@/components/AttractionLandingPage';
import type { CategoryPageData } from '@/types';
import dbConnect from '@/lib/dbConnect';
import AttractionPageModel from '@/lib/models/AttractionPage';
import Category from '@/lib/models/Category';
import { getTenantFromRequest, getTenantPublicConfig } from '@/lib/tenant';

interface AttractionPageProps {
  params: Promise<{ slug: string }>;
}

// Fetch attraction page directly from database for better performance
async function getAttractionPage(slug: string): Promise<CategoryPageData | null> {
  try {
    await dbConnect();
    
    const page = await AttractionPageModel.findOne({ 
      slug, 
      pageType: 'attraction',
      isPublished: true 
    })
    .populate({
      path: 'categoryId',
      model: Category,
      select: 'name slug'
    })
    .lean();

    if (!page) {
      return null;
    }

    return JSON.parse(JSON.stringify(page));
  } catch (error) {
    console.error('Error fetching attraction page:', error);
    return null;
  }
}

export async function generateMetadata({ params }: AttractionPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tenantId = await getTenantFromRequest();
  const tenant = await getTenantPublicConfig(tenantId);
  const siteName = tenant?.name || 'Tours';
  
  const page = await getAttractionPage(slug);

  if (!page) {
    return {
      title: 'Attraction Not Found',
      description: 'The requested attraction could not be found.',
    };
  }

  return {
    title: page.metaTitle || `${page.title} | ${siteName}`,
    description: page.metaDescription || page.description,
    keywords: page.keywords?.join(', '),
    openGraph: {
      title: page.metaTitle || page.title,
      description: page.metaDescription || page.description,
      images: page.heroImage ? [page.heroImage] : (tenant?.seo.ogImage ? [tenant.seo.ogImage] : []),
      type: 'website',
      siteName: siteName,
      url: `/attraction/${page.slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: page.metaTitle || page.title,
      description: page.metaDescription || page.description,
      images: page.heroImage ? [page.heroImage] : [],
    },
    alternates: {
      canonical: `/attraction/${page.slug}`,
    },
    robots: {
      index: page.isPublished,
      follow: page.isPublished,
    },
  };
}

// Enable ISR with 60 second revalidation for instant page loads
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

// Skip static generation at build time to avoid MongoDB connection issues on Netlify
// Pages will be generated on-demand with ISR caching
export async function generateStaticParams() {
  return [];
}

export default async function AttractionPage({ params }: AttractionPageProps) {
  const { slug } = await params;
  const page = await getAttractionPage(slug);

  if (!page) {
    notFound();
  }

  return (
    <>
      <Header startSolid />
      <AttractionLandingPage attraction={page} />
      <Footer />
    </>
  );
}