import React from 'react';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import Review from '@/lib/models/Review';
import Header2 from '@/components/Header2';
import Footer from '@/components/Footer';
import TourDetailClientPage from './TourDetailClientPage';
import { ITour } from '@/lib/models/Tour';

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getTourBySlug(slug: string): Promise<{ tour: ITour; reviews: any[] } | null> {
  await dbConnect();
  const tour = await Tour.findOne({ slug })
    .populate('destination', 'name slug')
    .populate('category', 'name slug')
    .lean();

  if (!tour) {
    return null;
  }

  // Fetch reviews separately
  const reviews = await Review.find({ tour: tour._id })
    .populate('user', 'firstName lastName picture')
    .sort({ createdAt: -1 })
    .lean();

  return {
    tour: JSON.parse(JSON.stringify(tour)),
    reviews: JSON.parse(JSON.stringify(reviews))
  };
}

async function getRelatedTours(categoryIds: string | string[] | any, currentTourId: string): Promise<ITour[]> {
  await dbConnect();

  // Extract category IDs from populated categories or use the IDs directly
  let categoryIdArray: string[] = [];
  if (Array.isArray(categoryIds)) {
    categoryIdArray = categoryIds.map(cat => typeof cat === 'object' ? cat._id?.toString() : cat?.toString()).filter(Boolean);
  } else if (categoryIds) {
    const catId = typeof categoryIds === 'object' ? categoryIds._id?.toString() : categoryIds?.toString();
    if (catId) categoryIdArray = [catId];
  }

  if (categoryIdArray.length === 0) {
    return [];
  }

  const relatedTours = await Tour.find({
    category: { $in: categoryIdArray },
    _id: { $ne: currentTourId },
    isPublished: true
  })
    .populate('destination', 'name')
    .populate('category', 'name')
    .limit(3)
    .lean();

  return JSON.parse(JSON.stringify(relatedTours));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getTourBySlug(slug);

  if (!result) {
    return {
      title: 'Tour Not Found',
    };
  }

  const { tour } = result;
  const destination = typeof tour.destination === 'object' ? (tour.destination as any) : null;

  return {
    title: tour.metaTitle || `${tour.title} | ${destination?.name || 'Travel'} Tours`,
    description: tour.metaDescription || tour.description,
    keywords: tour.keywords || [tour.title, destination?.name].filter(Boolean),
    openGraph: {
      title: tour.title,
      description: tour.description,
      images: tour.image ? [{ url: tour.image, alt: tour.title }] : [],
      type: 'website',
    },
  };
}

// Skip static generation at build time to avoid MongoDB connection issues on Netlify
// Pages will be generated on-demand with ISR caching
export async function generateStaticParams() {
  return [];
}

export default async function TourDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const result = await getTourBySlug(slug);

  if (!result) {
    notFound();
  }

  const { tour, reviews } = result;
  const relatedTours = await getRelatedTours(tour.category, (tour._id as any)?.toString());

  return (
    <>
      <Header2 startSolid />
      <TourDetailClientPage
        tour={tour}
        relatedTours={relatedTours}
        initialReviews={reviews}
      />
      <Footer />
    </>
  );
}

// Enable ISR with 60 second revalidation for instant page loads
export const revalidate = 60;
export const dynamicParams = true;