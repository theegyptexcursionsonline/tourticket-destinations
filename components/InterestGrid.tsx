'use client';

import React, { useEffect, useState } from "react";
import { useTenant } from '@/contexts/TenantContext';
import Link from "next/link";
import {
  ArrowRight,
  Package,
  Search,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Compass,
  Mountain,
  Waves,
  Palmtree,
  Landmark,
  Camera,
  UtensilsCrossed,
  Ticket,
  Users,
  Heart,
  Star,
  Globe,
  Binoculars,
  Plane,
  Ship,
  Map,
  Calendar,
  TreePine,
  Castle,
  Church,
  Building2,
  Tent,
  Footprints,
  Sunset,
  Sparkles
} from "lucide-react";
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Grid } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/grid';

interface Interest {
  _id?: string;
  type?: 'category' | 'attraction';
  name: string;
  slug: string;
  products: number;
  featured?: boolean;
}

interface CategoryPage {
  _id: string;
  title: string;
  slug: string;
  pageType: 'category';
  categoryId?: {
    _id: string;
    name: string;
    slug: string;
  };
  isPublished: boolean;
  heroImage?: string;
}

// Icon Mapping System - Professional category icons
const getIconForInterest = (name: string, _slug: string) => {
  const lowerName = name.toLowerCase();
  
  // Historical & Cultural
  if (lowerName.includes('pyramid') || lowerName.includes('giza')) return { Icon: Landmark, gradient: 'from-amber-500 to-yellow-600' };
  if (lowerName.includes('museum') || lowerName.includes('antiquities')) return { Icon: Building2, gradient: 'from-purple-500 to-indigo-600' };
  if (lowerName.includes('temple') || lowerName.includes('luxor') || lowerName.includes('karnak')) return { Icon: Church, gradient: 'from-orange-500 to-red-600' };
  if (lowerName.includes('castle') || lowerName.includes('fortress') || lowerName.includes('citadel')) return { Icon: Castle, gradient: 'from-slate-600 to-slate-800' };
  if (lowerName.includes('historic') || lowerName.includes('ancient') || lowerName.includes('pharaoh')) return { Icon: Landmark, gradient: 'from-amber-600 to-orange-700' };
  
  // Nature & Adventure
  if (lowerName.includes('desert') || lowerName.includes('safari') || lowerName.includes('sand')) return { Icon: Sunset, gradient: 'from-orange-400 to-red-500' };
  if (lowerName.includes('mountain') || lowerName.includes('hiking') || lowerName.includes('trek')) return { Icon: Mountain, gradient: 'from-emerald-500 to-teal-600' };
  if (lowerName.includes('beach') || lowerName.includes('sea') || lowerName.includes('diving') || lowerName.includes('snorkel')) return { Icon: Waves, gradient: 'from-cyan-500 to-blue-600' };
  if (lowerName.includes('oasis') || lowerName.includes('palm')) return { Icon: Palmtree, gradient: 'from-green-500 to-emerald-600' };
  if (lowerName.includes('camping') || lowerName.includes('outdoor')) return { Icon: Tent, gradient: 'from-lime-500 to-green-600' };
  if (lowerName.includes('wildlife') || lowerName.includes('nature')) return { Icon: TreePine, gradient: 'from-green-600 to-emerald-700' };
  
  // Activities & Tours
  if (lowerName.includes('cruise') || lowerName.includes('nile') || lowerName.includes('boat')) return { Icon: Ship, gradient: 'from-blue-500 to-indigo-600' };
  if (lowerName.includes('tour') || lowerName.includes('sightseeing') || lowerName.includes('guided')) return { Icon: Binoculars, gradient: 'from-violet-500 to-purple-600' };
  if (lowerName.includes('photo') || lowerName.includes('photography')) return { Icon: Camera, gradient: 'from-pink-500 to-rose-600' };
  if (lowerName.includes('food') || lowerName.includes('culinary') || lowerName.includes('dining')) return { Icon: UtensilsCrossed, gradient: 'from-red-500 to-orange-600' };
  if (lowerName.includes('walking') || lowerName.includes('walk')) return { Icon: Footprints, gradient: 'from-teal-500 to-cyan-600' };
  if (lowerName.includes('day trip') || lowerName.includes('excursion')) return { Icon: Calendar, gradient: 'from-indigo-500 to-blue-600' };
  
  // City & Urban
  if (lowerName.includes('city') || lowerName.includes('cairo') || lowerName.includes('alexandria')) return { Icon: Building2, gradient: 'from-slate-500 to-gray-600' };
  if (lowerName.includes('market') || lowerName.includes('bazaar') || lowerName.includes('shopping')) return { Icon: Package, gradient: 'from-fuchsia-500 to-pink-600' };
  
  // Special Interests
  if (lowerName.includes('family') || lowerName.includes('kids') || lowerName.includes('children')) return { Icon: Users, gradient: 'from-yellow-500 to-amber-600' };
  if (lowerName.includes('romantic') || lowerName.includes('couple') || lowerName.includes('honeymoon')) return { Icon: Heart, gradient: 'from-rose-500 to-red-600' };
  if (lowerName.includes('luxury') || lowerName.includes('premium') || lowerName.includes('vip')) return { Icon: Star, gradient: 'from-amber-500 to-yellow-600' };
  if (lowerName.includes('adventure') || lowerName.includes('extreme')) return { Icon: Compass, gradient: 'from-red-500 to-orange-600' };
  
  // Transport related
  if (lowerName.includes('flight') || lowerName.includes('air')) return { Icon: Plane, gradient: 'from-sky-500 to-blue-600' };
  if (lowerName.includes('transfer') || lowerName.includes('transport')) return { Icon: Map, gradient: 'from-gray-500 to-slate-600' };
  
  // Attractions
  if (lowerName.includes('attraction') || lowerName.includes('landmark')) return { Icon: MapPin, gradient: 'from-red-600 to-rose-700' };
  if (lowerName.includes('ticket') || lowerName.includes('pass')) return { Icon: Ticket, gradient: 'from-purple-500 to-violet-600' };
  
  // Default
  return { Icon: Globe, gradient: 'from-blue-500 to-cyan-600' };
};

// --- Premium InterestCard Component ---
const InterestCard = ({
  interest,
  categoryPage
}: {
  interest: Interest;
  categoryPage?: CategoryPage;
}) => {
  const getLink = () => {
    if (categoryPage && categoryPage.isPublished) {
      return `/category/${categoryPage.slug}`;
    }
    
    if (interest.type === 'attraction') {
      return `/attraction/${interest.slug}`;
    }
    
    return `/interests/${interest.slug}`;
  };

  const linkUrl = getLink();
  const { Icon, gradient } = getIconForInterest(interest.name, interest.slug);

  return (
    <Link
      href={linkUrl}
      className="group relative block text-left bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 border border-slate-200 hover:border-red-300 h-full"
    >
      {/* Animated Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-50/50 via-orange-50/30 to-amber-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Shimmer Effect */}
      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      
      {/* Content Container */}
      <div className="relative z-10 p-5 sm:p-6 flex flex-col h-full">
        {/* Top Section - Icon & Badge */}
        <div className="flex items-start justify-between gap-3 mb-4">
          {/* Icon Badge - More prominent */}
          <div className={`flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br ${gradient} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
            <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-white" strokeWidth={2} />
          </div>
          
          {/* Featured Badge */}
          {interest.featured && (
            <span className="px-2.5 py-1 bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-700 text-xs font-bold rounded-full border border-amber-200 flex items-center gap-1">
              <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
              Featured
            </span>
          )}
        </div>

        {/* Title Section */}
        <div className="flex-grow mb-4">
          <h4 className="font-bold text-slate-900 text-base sm:text-lg leading-snug group-hover:text-red-600 transition-colors duration-300 line-clamp-2">
            {interest.name}
          </h4>
        </div>

        {/* Footer Section */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-auto">
          {/* Tour Count */}
          <div className="flex items-center gap-2.5">
            <div className={`flex items-center justify-center w-9 h-9 bg-gradient-to-br ${gradient} opacity-10 group-hover:opacity-20 rounded-lg transition-all`}>
              <Package className="w-4 h-4 text-slate-700" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-slate-500 font-medium leading-tight">Available</span>
              <span className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                {interest.products} {interest.products === 1 ? 'tour' : 'tours'}
              </span>
            </div>
          </div>

          {/* Arrow Button - More prominent */}
          <div className={`w-10 h-10 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center transition-all duration-300 shadow-md group-hover:shadow-lg group-hover:scale-110`}>
            <ArrowRight className="w-5 h-5 text-white transform group-hover:translate-x-0.5 transition-transform duration-300" strokeWidth={2.5} />
          </div>
        </div>
      </div>

      {/* Hover Accent Line */}
      <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left`} />
    </Link>
  );
};

// --- Premium Loading Skeleton ---
const LoadingSkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5 md:gap-6">
    {[...Array(20)].map((_, i) => (
      <div key={i} className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200 animate-pulse">
        <div className="flex items-start justify-between mb-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-slate-200 rounded-2xl"></div>
        </div>
        <div className="space-y-3 mb-4">
          <div className="h-5 w-3/4 bg-slate-200 rounded-lg"></div>
          <div className="h-4 w-1/2 bg-slate-200 rounded-lg"></div>
        </div>
        <div className="flex justify-between items-center pt-4 border-t border-slate-100">
          <div className="h-9 w-24 bg-slate-200 rounded-lg"></div>
          <div className="w-10 h-10 bg-slate-200 rounded-xl"></div>
        </div>
      </div>
    ))}
  </div>
);

// --- Premium Error Display ---
const ErrorDisplay = ({ error, onRetry }: { error: string; onRetry: () => void }) => (
  <div className="text-center py-12 sm:py-16">
    <div className="max-w-md mx-auto bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200 rounded-2xl p-6 sm:p-8 shadow-xl">
      <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
        <Package className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
      </div>
      <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">Unable to Load Experiences</h3>
      <p className="text-slate-700 text-sm mb-6 leading-relaxed">{error}</p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl hover:from-red-700 hover:to-orange-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm sm:text-base"
      >
        <span>Try Again</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  </div>
);

// --- Premium Empty State ---
const EmptyState = () => (
  <div className="text-center py-12 sm:py-16">
    <div className="max-w-md mx-auto bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xl">
      <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-slate-400 to-slate-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
        <Compass className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
      </div>
      <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">No Experiences Available</h3>
      <p className="text-slate-600 text-sm mb-6 leading-relaxed">
        Check back soon for amazing experiences across Egypt!
      </p>
      <Link
        href="/tours"
        className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-xl hover:from-slate-900 hover:to-black transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm sm:text-base"
      >
        <span>Browse All Tours</span>
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  </div>
);

// --- Main Component ---
export default function InterestGrid() {
  const { getSiteName } = useTenant();
  const [interests, setInterests] = useState<Interest[]>([]);
  const [categoryPages, setCategoryPages] = useState<CategoryPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [swiperRef, setSwiperRef] = useState<SwiperType | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [interestsResponse, categoryPagesResponse] = await Promise.all([
        fetch('/api/interests'),
        fetch('/api/categories/pages')
      ]);

      if (!interestsResponse.ok) {
        throw new Error(`Failed to fetch interests: ${interestsResponse.status}`);
      }

      const interestsData = await interestsResponse.json();

      if (interestsData.success) {
        const availableInterests = interestsData.data.filter((interest: Interest) => {
          const products = typeof interest.products === 'number' ? interest.products : Number(interest.products) || 0;
          return products > 0;
        });
        setInterests(availableInterests);
      } else {
        throw new Error(interestsData.error || 'Failed to fetch interests');
      }

      if (categoryPagesResponse.ok) {
        const categoryPagesData = await categoryPagesResponse.json();
        if (categoryPagesData.success) {
          setCategoryPages(categoryPagesData.data || []);
        }
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getCategoryPageForInterest = (interest: Interest): CategoryPage | undefined => {
    return categoryPages.find(page => {
      if (!page.isPublished || page.pageType !== 'category') return false;

      if (page.categoryId) {
        const categoryName = typeof page.categoryId === 'object' ? page.categoryId.name : '';
        const categorySlug = typeof page.categoryId === 'object' ? page.categoryId.slug : '';

        return categoryName.toLowerCase() === interest.name.toLowerCase() ||
               categorySlug.toLowerCase() === (interest.slug || interest.name.toLowerCase().replace(/\s+/g, '-'));
      }

      return false;
    });
  };

  // Filter interests based on search
  const filteredInterests = interests.filter(interest =>
    interest.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderContent = () => {
    if (isLoading) {
      return <LoadingSkeleton />;
    }

    if (error) {
      return <ErrorDisplay error={error} onRetry={fetchData} />;
    }

    if (interests.length === 0) {
      return <EmptyState />;
    }

    if (filteredInterests.length === 0) {
      return (
        <div className="text-center py-12 sm:py-16">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-slate-300 to-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Search className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">No Results Found</h3>
          <p className="text-slate-600 text-sm">
            Try adjusting your search terms
          </p>
        </div>
      );
    }

    return (
      <div className="relative px-2 sm:px-4 lg:px-8">
        {/* Custom Navigation Buttons */}
        <button
          onClick={() => swiperRef?.slidePrev()}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-11 h-11 sm:w-12 sm:h-12 bg-white hover:bg-gradient-to-br hover:from-red-500 hover:to-orange-500 text-slate-700 hover:text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group -translate-x-3 sm:-translate-x-4 lg:-translate-x-6 hidden lg:flex border border-slate-200 hover:border-transparent"
          aria-label="Previous slide"
        >
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.5} />
        </button>

        <button
          onClick={() => swiperRef?.slideNext()}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-11 h-11 sm:w-12 sm:h-12 bg-white hover:bg-gradient-to-br hover:from-red-500 hover:to-orange-500 text-slate-700 hover:text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group translate-x-3 sm:translate-x-4 lg:translate-x-6 hidden lg:flex border border-slate-200 hover:border-transparent"
          aria-label="Next slide"
        >
          <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.5} />
        </button>

        {/* Swiper with Grid Layout (2 rows) */}
        <Swiper
          modules={[Navigation, Pagination, Grid]}
          onSwiper={setSwiperRef}
          spaceBetween={16}
          slidesPerView={1}
          grid={{
            rows: 2,
            fill: 'row'
          }}
          pagination={{
            clickable: true,
            dynamicBullets: true,
          }}
          breakpoints={{
            640: {
              slidesPerView: 2,
              spaceBetween: 20,
              grid: {
                rows: 2,
                fill: 'row'
              }
            },
            768: {
              slidesPerView: 3,
              spaceBetween: 20,
              grid: {
                rows: 2,
                fill: 'row'
              }
            },
            1024: {
              slidesPerView: 4,
              spaceBetween: 24,
              grid: {
                rows: 2,
                fill: 'row'
              }
            },
            1280: {
              slidesPerView: 5,
              spaceBetween: 24,
              grid: {
                rows: 2,
                fill: 'row'
              }
            }
          }}
          className="!pb-12 sm:!pb-14 md:!pb-16"
        >
          {filteredInterests.map((interest) => {
            const categoryPage = getCategoryPageForInterest(interest);
            return (
              <SwiperSlide key={interest.slug || interest.name} className="h-auto">
                <InterestCard
                  interest={interest}
                  categoryPage={categoryPage}
                />
              </SwiperSlide>
            );
          })}
        </Swiper>
      </div>
    );
  };

  return (
    <section className="relative bg-gradient-to-b from-white via-slate-50 to-white py-8 sm:py-12 md:py-16 lg:py-20">
      {/* Background Decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-72 h-72 sm:w-96 sm:h-96 bg-red-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 sm:w-96 sm:h-96 bg-orange-500/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-3 sm:px-4 max-w-[1400px] relative z-10">
        {/* Premium Header */}
        <div className="text-center mb-6 sm:mb-8 md:mb-10 lg:mb-12">
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-red-100 to-orange-100 rounded-full mb-3 sm:mb-4 border border-red-200">
            <Sparkles className="w-3 sm:w-4 h-3 sm:h-4 text-red-600" />
            <span className="text-xs sm:text-sm font-bold text-red-700">{getSiteName()}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-slate-900 mb-2 sm:mb-3 md:mb-4 leading-tight px-2 sm:px-4">
            Browse All{' '}
            <span className="bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
              Experiences
            </span>
          </h2>

          <p className="text-sm sm:text-base md:text-lg lg:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed px-4">
            Explore our complete collection of unforgettable tours and experiences
          </p>
        </div>

        {/* Premium Search Bar */}
        <div className="max-w-2xl mx-auto mb-6 sm:mb-8 md:mb-10 lg:mb-12 px-2 sm:px-0">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl blur-md opacity-0 group-hover:opacity-20 group-focus-within:opacity-20 transition-opacity" />
            <div className="relative flex items-center">
              <Search className="absolute left-3 sm:left-4 md:left-5 w-4 sm:w-5 h-4 sm:h-5 text-slate-400 group-hover:text-red-500 group-focus-within:text-red-500 transition-colors z-10" />
              <input
                type="text"
                placeholder="Search experiences by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 sm:pl-12 md:pl-14 pr-4 sm:pr-5 py-2.5 sm:py-3 md:py-4 bg-white border-2 border-slate-200 rounded-2xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all text-sm sm:text-base text-slate-900 placeholder:text-slate-400 shadow-sm hover:shadow-md font-medium"
              />
            </div>
          </div>
        </div>

        {/* Main Content */}
        {renderContent()}
      </div>

      {/* Custom Pagination Styles */}
      <style jsx global>{`
        .swiper-pagination-bullet {
          width: 8px;
          height: 8px;
          background: #cbd5e1;
          opacity: 1;
          transition: all 0.3s ease;
        }
        
        .swiper-pagination-bullet-active {
          background: linear-gradient(135deg, #dc2626 0%, #ea580c 100%);
          width: 24px;
          border-radius: 4px;
        }
        
        @media (min-width: 640px) {
          .swiper-pagination-bullet {
            width: 10px;
            height: 10px;
          }
          
          .swiper-pagination-bullet-active {
            width: 28px;
          }
        }
      `}</style>
    </section>
  );
}