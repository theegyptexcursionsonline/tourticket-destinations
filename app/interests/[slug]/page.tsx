import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import InterestLandingPage from '@/components/InterestLandingPage';
import dbConnect from '@/lib/dbConnect';
import Category from '@/lib/models/Category';
import AttractionPage from '@/lib/models/AttractionPage';

// Types
interface InterestPageProps {
  params: Promise<{ slug: string }>;
}

interface InterestData {
  name: string;
  slug: string;
  description: string;
  longDescription?: string;
  category?: any;
  tours: any[];
  totalTours: number;
  reviews: any[];
  relatedCategories: any[];
  heroImage: string;
  type?: string;
  highlights: string[];
  features: string[];
  stats: {
    totalTours: number;
    totalReviews: number;
    averageRating: string;
    happyCustomers: number;
  };
}

// Fetch interest data directly from database (faster!)
async function getInterestData(slug: string): Promise<InterestData | null> {
  try {
    await dbConnect();
    
    // The API uses /api/interests/${slug} which returns data from Category or AttractionPage
    // Let's fetch directly from database instead
    const category = await Category.findOne({ slug }).lean();
    
    if (category) {
      // Return category-based interest data
      const serialized = JSON.parse(JSON.stringify(category));
      return {
        name: serialized.name,
        slug: serialized.slug,
        description: serialized.description || '',
        longDescription: serialized.longDescription,
        category: serialized,
        tours: [], // Will be fetched by InterestLandingPage component
        totalTours: 0,
        reviews: [],
        relatedCategories: [],
        heroImage: serialized.heroImage || '',
        type: 'category',
        highlights: serialized.highlights || [],
        features: serialized.features || [],
        stats: {
          totalTours: 0,
          totalReviews: 0,
          averageRating: '0',
          happyCustomers: 0,
        },
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching interest data:', error);
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

// Generate metadata
export async function generateMetadata(
  { params }: InterestPageProps
): Promise<Metadata> {
  const resolvedParams = await params;
  const interest = await getInterestData(resolvedParams.slug);

  if (!interest) {
    return {
      title: 'Interest Not Found',
      description: 'The requested interest could not be found.',
    };
  }

  return {
    title: `${interest.name} Tours in Egypt | Egypt Excursions Online`,
    description: `Discover the best ${interest.name.toLowerCase()} tours and experiences in Egypt. ${interest.totalTours} amazing tours available.`,
    keywords: [interest.name, 'tours', 'Egypt', 'travel'].join(', '),
    openGraph: {
      title: `${interest.name} Tours in Egypt`,
      description: `Discover the best ${interest.name.toLowerCase()} tours.`,
      images: [interest.heroImage],
      type: 'website',
    },
    alternates: {
      canonical: `/interests/${resolvedParams.slug}`,
    },
  };
}

// Main page component
export default async function Page(props: InterestPageProps) {
  const params = await props.params;
  const interest = await getInterestData(params.slug);

  if (!interest) {
    notFound();
  }

  return (
    <>
      <Header startSolid />
      <InterestLandingPage interest={interest} />
      <Footer />
    </>
  );
}