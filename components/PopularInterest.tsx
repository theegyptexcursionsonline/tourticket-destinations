'use client';

import React, { useState, useEffect } from 'react';
import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { ArrowRight, AlertCircle, Star, Sparkles, TrendingUp } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Autoplay, EffectCoverflow } from 'swiper/modules';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/effect-coverflow';

// --- TYPES ---
interface Interest {
  _id: string;
  type: 'category' | 'attraction';
  name: string;
  slug: string;
  products: number;
  featured?: boolean;
  image?: string;
}

interface CategoryPage {
  _id: string;
  slug: string;
  pageType: 'category';
  isPublished: boolean;
  heroImage?: string;
  categoryId?: {
    name: string;
    slug: string;
  };
}

// Default fallback image for categories without images
const DEFAULT_CATEGORY_IMAGE = '/placeholder-category.jpg';

// --- COMPONENTS ---
const InterestCard = ({ 
  interest, 
  categoryPage 
}: { 
  interest: Interest;
  categoryPage?: CategoryPage;
}) => {
  const linkUrl = categoryPage?.isPublished
    ? `/category/${categoryPage.slug}`
    : interest.type === 'attraction'
      ? `/attraction/${interest.slug}`
      : `/categories/${interest.slug}`;

  // Only use actual database images - no mock images
  const imageUrl = categoryPage?.heroImage || interest.image || DEFAULT_CATEGORY_IMAGE;

  return (
    <Link
      href={linkUrl}
      className="group relative block overflow-hidden rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:scale-105"
      style={{ width: '100%', height: 420 }}
    >
      {/* Image */}
      <div className="relative w-full h-full">
        <Image
          src={imageUrl}
          alt={interest.name}
          fill
          unoptimized
          className="object-cover transition-transform duration-700 group-hover:scale-110"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 400px"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        {/* Hover Effect */}
        <div className="absolute inset-0 bg-gradient-to-t from-red-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </div>

      {/* Featured Badge */}
      {interest.featured && (
        <div className="absolute top-4 end-4 z-20 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          Featured
        </div>
      )}

      {/* Trending Badge */}
      {interest.products > 50 && (
        <div className="absolute top-4 start-4 z-20 bg-gradient-to-r from-green-400 to-emerald-500 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
          <TrendingUp className="w-3 h-3" />
          Trending
        </div>
      )}

      {/* Content */}
      <div className="absolute bottom-0 start-0 end-0 p-6 z-10">
        <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-yellow-300 transition-colors">
          {interest.name}
        </h3>
        <div className="flex items-center justify-between">
          <p className="text-white/90 font-medium">
            {interest.products} experiences
          </p>
          <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:bg-white/30 transition-all">
            <ArrowRight className="w-5 h-5 text-white transform group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </Link>
  );
};

const LoadingSkeleton = () => (
  <div className="flex gap-6 px-4 overflow-hidden">
    {[...Array(3)].map((_, i) => (
      <div
        key={i}
        className="relative flex-shrink-0 rounded-2xl bg-slate-200 animate-pulse"
        style={{ width: 400, height: 420 }}
      />
    ))}
  </div>
);

const ErrorState = ({ error }: { error: string }) => (
  <div className="text-center py-12">
    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
    <h3 className="text-xl font-bold text-slate-900 mb-2">Unable to Load Featured Categories</h3>
    <p className="text-slate-600">{error}</p>
  </div>
);

const EmptyState = () => (
  <div className="text-center py-12">
    <Star className="w-12 h-12 text-slate-400 mx-auto mb-3" />
    <h3 className="text-xl font-bold text-slate-900 mb-2">No Featured Experiences Yet</h3>
    <p className="text-slate-600 mb-4">Check back soon for curated experiences!</p>
    <Link
      href="/tours"
      className="inline-flex items-center gap-2 px-6 py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors font-semibold"
    >
      Browse All Tours <ArrowRight className="w-4 h-4" />
    </Link>
  </div>
);

// --- MAIN COMPONENT ---
export default function PopularInterests() {
  const [interests, setInterests] = useState<Interest[]>([]);
  const [categoryPages, setCategoryPages] = useState<CategoryPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      try {
        const [interestsResponse, categoryPagesResponse] = await Promise.all([
          fetch('/api/interests'),
          fetch('/api/categories/pages')
        ]);

        if (!interestsResponse.ok) {
          throw new Error(`HTTP ${interestsResponse.status}`);
        }

        const interestsData = await interestsResponse.json();

        if (!mounted) return;

        if (interestsData.success && Array.isArray(interestsData.data)) {
          // Filter: Only show featured categories/interests (must be explicitly true)
          const filtered = interestsData.data.filter((item: Interest) => item.featured === true);
          console.log('Total interests from API:', interestsData.data.length);
          console.log('Featured interests:', filtered.length);
          console.log('Filtered data:', filtered.map((i: Interest) => ({ name: i.name, featured: i.featured })));
          setInterests(filtered);
        }

        if (categoryPagesResponse.ok) {
          const pagesData = await categoryPagesResponse.json();
          if (pagesData.success) {
            setCategoryPages(pagesData.data || []);
          }
        }
      } catch (err: any) {
        console.error('Error fetching:', err);
        if (!mounted) return;
        setError(err?.message || 'Failed to load content');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, []);

  const getCategoryPage = (interest: Interest): CategoryPage | undefined => {
    return categoryPages.find(page => {
      if (!page.isPublished || page.pageType !== 'category') return false;
      
      if (page.categoryId) {
        const categoryName = page.categoryId.name;
        const categorySlug = page.categoryId.slug;
        
        return categoryName.toLowerCase() === interest.name.toLowerCase() ||
               categorySlug.toLowerCase() === interest.slug?.toLowerCase();
      }
      
      return false;
    });
  };

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorState error={error} />;
  if (interests.length === 0) return <EmptyState />;

  return (
    <section className="bg-gradient-to-b from-slate-900 to-slate-800 py-12 sm:py-16 md:py-20 overflow-hidden">
      <div className="container mx-auto px-4 max-w-[1400px]">
        {/* Header */}
        <div className="text-center mb-10 sm:mb-12 md:mb-14">
          <div className="inline-flex items-center gap-2 bg-yellow-400/20 text-yellow-300 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full mb-3 sm:mb-4">
            <Sparkles className="w-3 sm:w-4 h-3 sm:h-4" />
            <span className="text-xs sm:text-sm font-bold">Featured Experiences</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3 sm:mb-4 px-4">
          Top Experience Categories.
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-slate-300 max-w-2xl mx-auto px-4">
            Discover our most loved experiences curated for unforgettable adventures
          </p>
        </div>

        {/* Carousel */}
        <Swiper
          modules={[Navigation, Autoplay, EffectCoverflow]}
          spaceBetween={30}
          slidesPerView={1}
          loop={true}
          navigation={true}
          centeredSlides={true}
          autoplay={{
            delay: 4000,
            disableOnInteraction: false,
          }}
          effect="coverflow"
          coverflowEffect={{
            rotate: 10,
            stretch: 0,
            depth: 100,
            modifier: 1.5,
            slideShadows: false,
          }}
          breakpoints={{
            640: { slidesPerView: 1.5, spaceBetween: 20 },
            768: { slidesPerView: 2, spaceBetween: 24 },
            1024: { slidesPerView: 2.5, spaceBetween: 28 },
            1280: { slidesPerView: 3, spaceBetween: 32 },
          }}
          className="!pb-12"
        >
          {interests.map((interest) => {
            const categoryPage = getCategoryPage(interest);
            return (
              <SwiperSlide key={interest._id}>
                <InterestCard interest={interest} categoryPage={categoryPage} />
              </SwiperSlide>
            );
          })}
        </Swiper>

        {/* CTA */}
        <div className="text-center mt-8 sm:mt-10 md:mt-12 px-4">
          <Link
            href="/interests"
            className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-white text-slate-900 rounded-xl text-sm sm:text-base font-bold hover:bg-slate-100 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105"
          >
            Explore All
            <ArrowRight className="w-4 sm:w-5 h-4 sm:h-5" />
          </Link>
        </div>
      </div>

      <style jsx global>{`
        .swiper-button-next,
        .swiper-button-prev {
          color: white;
          background-color: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 50%;
          width: 50px;
          height: 50px;
          transition: all 0.3s ease;
        }

        /* Hide navigation buttons on mobile */
        @media (max-width: 768px) {
          .swiper-button-next,
          .swiper-button-prev {
            display: none;
          }
        }

        .swiper-button-next:hover,
        .swiper-button-prev:hover {
          background-color: rgba(255, 255, 255, 0.2);
          transform: scale(1.1);
        }

        .swiper-button-next::after,
        .swiper-button-prev::after {
          font-size: 20px;
        }
      `}</style>
    </section>
  );
}