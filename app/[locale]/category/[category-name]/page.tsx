import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AttractionPageTemplate from '@/components/AttractionPageTemplate';
import { CategoryPageData } from '@/types';
import dbConnect from '@/lib/dbConnect';
import AttractionPageModel from '@/lib/models/AttractionPage';
import Category from '@/lib/models/Category';

interface CategoryPageProps {
  params: Promise<{ 'category-name': string }>;
}

// Fetch category page directly from database
async function getCategoryPage(categoryName: string): Promise<CategoryPageData | null> {
  try {
    await dbConnect();
    
    const page = await AttractionPageModel.findOne({ 
      slug: categoryName, 
      pageType: 'category',
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
    console.error('Error fetching category page:', error);
    return null;
  }
}

// Enable ISR with 60 second revalidation for instant page loads
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

// Skip static generation at build time to avoid MongoDB connection issues on Netlify
// Pages will be generated on-demand with ISR caching
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const page = await getCategoryPage(resolvedParams['category-name']);

  if (!page) {
    return {
      title: 'Category Not Found',
      description: 'The requested category page could not be found.'
    };
  }

  return {
    title: page.metaTitle || page.title,
    description: page.metaDescription || page.description,
    keywords: page.keywords?.join(', '),
    openGraph: {
      title: page.metaTitle || page.title,
      description: page.metaDescription || page.description,
      images: [page.heroImage],
      type: 'website',
    },
    alternates: {
      canonical: `/category/${page.slug}`,
    },
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const resolvedParams = await params;
  const page = await getCategoryPage(resolvedParams['category-name']);

  if (!page) {
    notFound();
  }

  return (
    <>
      <Header />
      <AttractionPageTemplate page={page} urlType="category" />
      <Footer />
    </>
  );
}