'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, Star, Users, Clock, MapPin, Search, Filter, 
  Grid, List, MessageCircle, ChevronDown, ChevronUp
} from 'lucide-react';
import { CategoryPageData, Tour, Review } from '@/types';
import { useSettings } from '@/hooks/useSettings';

interface AttractionPageTemplateProps {
  page: CategoryPageData;
  urlType: 'attraction' | 'category';
}

const TourCard = ({ tour, index }: { tour: Tour; index: number }) => {
  const { formatPrice } = useSettings();
  const destination = typeof tour.destination === 'object' ? tour.destination : null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Link
        href={`/tour/${tour.slug}`}
        className="group bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 block"
      >
        <div className="relative h-48 overflow-hidden">
          <Image
            src={tour.image}
            alt={tour.title}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-500"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          
          {/* Featured Badge */}
          {tour.isFeatured && (
            <div className="absolute top-3 left-3 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white px-3 py-1 text-xs font-bold rounded-full shadow-lg">
              <Star className="w-3 h-3 inline mr-1" />
              Featured
            </div>
          )}
          
          {/* Rating Badge */}
          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-slate-900 px-3 py-1 text-sm rounded-full flex items-center gap-1 shadow-lg">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            {typeof tour.rating === 'number' ? tour.rating.toFixed(1) : '4.5'}
          </div>

          {/* Price Badge */}
          <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm px-3 py-2 rounded-xl shadow-lg">
            <div className="text-lg font-bold text-slate-900">
              {formatPrice(tour.discountPrice || tour.price || 0)}
            </div>
            {tour.originalPrice && tour.originalPrice > (tour.discountPrice || tour.price || 0) && (
              <div className="text-xs text-slate-500 line-through text-center">
                {formatPrice(tour.originalPrice)}
              </div>
            )}
          </div>
        </div>
        
        <div className="p-6">
          <h3 className="font-bold text-lg mb-3 group-hover:text-red-600 transition-colors duration-200 line-clamp-2 leading-tight">
            {tour.title}
          </h3>
          
          {/* Tour Details */}
          <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{tour.duration}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>Max {tour.maxGroupSize || 15}</span>
            </div>
            {(tour as any).reviewCount > 0 && (
              <div className="flex items-center gap-1">
                <MessageCircle className="w-4 h-4" />
                <span>{(tour as any).reviewCount} reviews</span>
              </div>
            )}
          </div>
          
          {/* Destination */}
          {destination && (
            <div className="flex items-center gap-1 text-sm text-slate-500 mb-4">
              <MapPin className="w-4 h-4 text-red-500" />
              <span>{destination.name}</span>
            </div>
          )}

          {/* Description */}
          <p className="text-slate-600 text-sm line-clamp-2 mb-4">
            {tour.description}
          </p>
          
          {/* Tags and Action */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {tour.tags?.slice(0, 2).map((tag, i) => (
                <span 
                  key={i}
                  className="px-2 py-1 bg-red-50 text-red-600 rounded-full text-xs font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
            
            <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
              <ArrowRight className="w-5 h-5 text-red-600" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

const TourListItem = ({ tour, index }: { tour: Tour; index: number }) => {
  const { formatPrice } = useSettings();
  const destination = typeof tour.destination === 'object' ? tour.destination : null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link href={`/tour/${tour.slug}`} className="group">
        <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-6">
          <div className="relative w-32 h-24 rounded-lg overflow-hidden flex-shrink-0">
            <Image
              src={tour.image}
              alt={tour.title}
              fill
              className="object-cover"
              sizes="128px"
            />
            {tour.isFeatured && (
              <div className="absolute top-1 left-1 bg-yellow-500 text-white text-xs px-1 py-0.5 rounded">
                Featured
              </div>
            )}
          </div>
          
          <div className="flex-1">
            <h3 className="text-xl font-bold text-slate-900 group-hover:text-red-600 transition-colors mb-2">
              {tour.title}
            </h3>
            <p className="text-slate-600 text-sm mb-3 line-clamp-2">{tour.description}</p>
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {tour.duration}
              </span>
              <span className="flex items-center gap-1">
                <Star className="h-4 w-4 text-yellow-500 fill-current" />
                {typeof tour.rating === 'number' ? tour.rating.toFixed(1) : '4.5'}
              </span>
              {destination && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {destination.name}
                </span>
              )}
              {(tour as any).reviewCount > 0 && (
                <span className="flex items-center gap-1">
                  <MessageCircle className="h-4 w-4" />
                  {(tour as any).reviewCount} reviews
                </span>
              )}
            </div>
          </div>
          
          <div className="text-right flex-shrink-0">
            <div className="text-2xl font-bold text-slate-900">
              {formatPrice(tour.discountPrice || tour.price || 0)}
            </div>
            {tour.originalPrice && tour.originalPrice > (tour.discountPrice || tour.price || 0) && (
              <div className="text-sm text-slate-500 line-through">
                {formatPrice(tour.originalPrice)}
              </div>
            )}
            <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-red-600 transition-colors mt-2 ml-auto" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

const QuickStats = ({ page }: { page: CategoryPageData }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.3 }}
    className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-6xl mx-auto"
  >
    <div className="bg-white rounded-2xl shadow-lg p-8 text-center hover:shadow-xl transition-shadow duration-300">
      <div className="text-4xl font-black text-red-600 mb-3">
        {page.tours?.length || 0}
      </div>
      <div className="text-slate-600 font-semibold">
        Tours Available
      </div>
    </div>
    
    <div className="bg-white rounded-2xl shadow-lg p-8 text-center hover:shadow-xl transition-shadow duration-300">
      <div className="text-4xl font-black text-red-600 mb-3">
        {page.reviews?.length || 0}
      </div>
      <div className="text-slate-600 font-semibold">
        Customer Reviews
      </div>
    </div>
    
    <div className="bg-white rounded-2xl shadow-lg p-8 text-center hover:shadow-xl transition-shadow duration-300">
      <div className="text-4xl font-black text-red-600 mb-3">
        4.9
      </div>
      <div className="text-slate-600 font-semibold">
        Average Rating
      </div>
    </div>
    
    <div className="bg-white rounded-2xl shadow-lg p-8 text-center hover:shadow-xl transition-shadow duration-300">
      <div className="text-4xl font-black text-red-600 mb-3">
        24/7
      </div>
      <div className="text-slate-600 font-semibold">
        Customer Support
      </div>
    </div>
  </motion.div>
);

const SearchAndFilter = ({ 
  searchQuery, 
  setSearchQuery, 
  viewMode, 
  setViewMode,
  sortBy,
  setSortBy,
  onFilterToggle 
}: {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  onFilterToggle: () => void;
}) => (
  <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
    <div className="flex flex-col md:flex-row items-center gap-4">
      {/* Search Bar */}
      <div className="relative flex-1">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search tours..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
        />
      </div>

      {/* Sort Dropdown */}
      <select
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value)}
        className="px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
      >
        <option value="featured">Featured First</option>
        <option value="price_low">Price: Low to High</option>
        <option value="price_high">Price: High to Low</option>
        <option value="rating">Highest Rated</option>
        <option value="duration">Duration</option>
        <option value="newest">Newest First</option>
      </select>

      {/* View Toggle */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        <button
          onClick={() => setViewMode('grid')}
          className={`p-3 rounded-lg transition-all duration-200 ${
            viewMode === 'grid' 
              ? 'bg-white text-red-600 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Grid className="w-5 h-5" />
        </button>
        <button
          onClick={() => setViewMode('list')}
          className={`p-3 rounded-lg transition-all duration-200 ${
            viewMode === 'list' 
              ? 'bg-white text-red-600 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <List className="w-5 h-5" />
        </button>
      </div>

      {/* Filters Button */}
      <button
        onClick={onFilterToggle}
        className="flex items-center gap-2 px-4 py-3 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors duration-200"
      >
        <Filter className="w-5 h-5" />
        <span>Filters</span>
      </button>
    </div>
  </div>
);

const ReviewsSection = ({ reviews }: { reviews: Review[] }) => {
  const [showAllReviews, setShowAllReviews] = useState(false);
  const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 6);

  if (!reviews || reviews.length === 0) {
    return null;
  }

  return (
    <section className="py-16 bg-gradient-to-r from-slate-50 to-white">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl font-bold text-slate-900 mb-4">
            What Our Customers Say
          </h2>
          <p className="text-xl text-slate-600">
            Read reviews from travelers who have experienced these tours
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {displayedReviews.map((review, index) => (
            <motion.div
              key={review._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300"
            >
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {review.userName ? review.userName.charAt(0).toUpperCase() : 'A'}
                </div>
                <div className="ml-4">
                  <h4 className="font-semibold text-slate-900">{review.userName || 'Anonymous'}</h4>
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < review.rating ? 'text-yellow-400 fill-current' : 'text-slate-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              
              {review.title && (
                <h5 className="font-semibold text-slate-800 mb-2">{review.title}</h5>
              )}
              
              <p className="text-slate-600 text-sm leading-relaxed mb-3 line-clamp-4">
                {review.comment}
              </p>
              
              <div className="text-xs text-slate-500">
                {new Date(review.createdAt || review.date).toLocaleDateString()}
              </div>
            </motion.div>
          ))}
        </div>

        {reviews.length > 6 && (
          <div className="text-center">
            <button
              onClick={() => setShowAllReviews(!showAllReviews)}
              className="inline-flex items-center gap-2 px-8 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors duration-200"
            >
              {showAllReviews ? (
                <>
                  Show Less
                  <ChevronUp className="w-5 h-5" />
                </>
              ) : (
                <>
                  View All {reviews.length} Reviews
                  <ChevronDown className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default function AttractionPageTemplate({ page, urlType }: AttractionPageTemplateProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('featured');
  const [showFilters, setShowFilters] = useState(false);

  // Filter and sort tours based on search and sort criteria
  const filteredAndSortedTours = React.useMemo(() => {
    let filtered = page.tours?.filter(tour =>
      tour.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tour.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tour.highlights?.some(highlight => 
        highlight.toLowerCase().includes(searchQuery.toLowerCase())
      )
    ) || [];

    // Sort tours
    switch (sortBy) {
      case 'price_low':
        filtered.sort((a, b) => (a.discountPrice || a.price || 0) - (b.discountPrice || b.price || 0));
        break;
      case 'price_high':
        filtered.sort((a, b) => (b.discountPrice || b.price || 0) - (a.discountPrice || a.price || 0));
        break;
      case 'rating':
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'duration':
        filtered.sort((a, b) => a.duration.localeCompare(b.duration));
        break;
      case 'newest':
        filtered.sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
        break;
      default: // featured
        filtered.sort((a, b) => {
          if (a.isFeatured && !b.isFeatured) return -1;
          if (!a.isFeatured && b.isFeatured) return 1;
          return (b.rating || 0) - (a.rating || 0);
        });
    }

    return filtered;
  }, [page.tours, searchQuery, sortBy]);

  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
    5: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
    6: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6',
    7: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7',
    8: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8',
  };

  const gridClass = gridCols[page.itemsPerRow as keyof typeof gridCols] || gridCols[4];

  return (
    <>
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-red-50">
        {/* Enhanced Hero Section */}
        <section className="relative h-[70vh] overflow-hidden">
          <div className="absolute inset-0">
            <Image
              src={page.heroImage}
              alt={page.title}
              fill
              className="object-cover"
              priority
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          </div>
          
          <div className="relative z-10 h-full flex items-center justify-center">
            <div className="text-center text-white max-w-5xl mx-auto px-6">
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <h1 className="text-5xl md:text-7xl font-extrabold leading-tight">
                  {page.title}
                </h1>
                <p className="text-xl md:text-2xl font-medium max-w-3xl mx-auto leading-relaxed">
                  {page.description}
                </p>
                
                {/* Enhanced Breadcrumb */}
                <nav className="flex items-center justify-center gap-2 text-sm opacity-90 bg-white/10 backdrop-blur-sm rounded-full px-6 py-3 inline-flex">
                  <Link href="/" className="hover:text-yellow-300 transition-colors">Home</Link>
                  <span>/</span>
                  <span className="capitalize">{urlType}</span>
                  <span>/</span>
                  <span className="text-yellow-300">{page.title}</span>
                </nav>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Content Section */}
        <section className="py-16">
          <div className="container mx-auto px-6">
            {/* Long Description */}
            {page.longDescription && (
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-4xl mx-auto mb-16 text-center"
              >
                <div className="bg-white rounded-2xl shadow-lg p-8">
                  <div className="prose prose-lg mx-auto">
                    <p className="text-slate-700 leading-relaxed text-lg">
                      {page.longDescription}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Highlights */}
            {page.highlights && page.highlights.length > 0 && (
              <div className="max-w-6xl mx-auto mb-16">
                <motion.h2 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-4xl font-bold text-center mb-12 text-slate-900"
                >
                  Why Choose This Experience
                </motion.h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {page.highlights.map((highlight, index) => (
                    <motion.div 
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-white p-8 rounded-2xl shadow-lg text-center hover:shadow-xl transition-shadow duration-300"
                    >
                      <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                        <Star className="w-8 h-8" />
                      </div>
                      <p className="text-slate-700 leading-relaxed">{highlight}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Features */}
            {page.features && page.features.length > 0 && (
              <div className="max-w-5xl mx-auto mb-16">
                <motion.h2 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-4xl font-bold text-center mb-12 text-slate-900"
                >
                  What Makes This Special
                </motion.h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {page.features.map((feature, index) => (
                    <motion.div 
                      key={index}
                      initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-start gap-6 bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300"
                    >
                      <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-lg font-bold">{index + 1}</span>
                      </div>
                      <p className="text-slate-700 leading-relaxed text-lg">{feature}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Tours Grid Section */}
        {page.tours && page.tours.length > 0 && (
          <section className="py-16 bg-white">
            <div className="container mx-auto px-6">
              {/* Grid Header */}
              <div className="text-center mb-12">
                <motion.h2 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-5xl font-bold text-slate-900 mb-6"
                >
                  {page.gridTitle}
                </motion.h2>
                {page.gridSubtitle && (
                  <motion.p 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-xl text-slate-600 max-w-3xl mx-auto"
                  >
                    {page.gridSubtitle}
                  </motion.p>
                )}
              </div>

              {/* Search and Filter */}
              <SearchAndFilter
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                viewMode={viewMode}
                setViewMode={setViewMode}
                sortBy={sortBy}
                setSortBy={setSortBy}
                onFilterToggle={() => setShowFilters(!showFilters)}
              />

              {/* Results Count */}
              <div className="text-center mb-8">
                <p className="text-slate-600">
                  Showing <span className="font-semibold text-slate-900">{filteredAndSortedTours.length}</span> of{' '}
                  <span className="font-semibold text-slate-900">{page.tours.length}</span> tours
                </p>
              </div>

              {/* Tours Display */}
              <AnimatePresence mode="wait">
                {viewMode === 'grid' ? (
                  <motion.div 
                    key="grid"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={`grid ${gridClass} gap-8 mb-16`}
                  >
                    {filteredAndSortedTours.map((tour, index) => (
                      <TourCard key={tour._id} tour={tour} index={index} />
                    ))}
                  </motion.div>
                ) : (
                  <motion.div 
                    key="list"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-6 mb-16"
                  >
                    {filteredAndSortedTours.map((tour, index) => (
                      <TourListItem key={tour._id} tour={tour} index={index} />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Empty State */}
              {filteredAndSortedTours.length === 0 && searchQuery && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-16"
                >
                  <div className="w-24 h-24 mx-auto mb-6 bg-slate-100 rounded-full flex items-center justify-center">
                    <Search className="w-10 h-10 text-slate-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-700 mb-2">No tours found</h3>
                  <p className="text-slate-500 mb-6">
                    Try adjusting your search criteria or browse all tours.
                  </p>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="bg-red-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-red-700 transition-colors"
                  >
                    Clear Search
                  </button>
                </motion.div>
              )}

              {/* Stats */}
              {page.showStats && (
                <div className="mt-20">
                  <h3 className="text-3xl font-bold text-center mb-12 text-slate-900">
                    Why Thousands Choose Us
                  </h3>
                  <QuickStats page={page} />
                </div>
              )}
            </div>
          </section>
        )}

        {/* Reviews Section */}
        {page.reviews && page.reviews.length > 0 && (
          <ReviewsSection reviews={page.reviews} />
        )}

        {/* Enhanced CTA Section */}
        <section className="py-20 bg-gradient-to-r from-red-600 via-red-700 to-red-800 text-white relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full -translate-x-32 -translate-y-32"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-48 translate-y-48"></div>
          </div>
          
          <div className="container mx-auto px-6 text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="max-w-4xl mx-auto"
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Ready to Start Your Adventure?
              </h2>
              <p className="text-xl mb-10 opacity-90 leading-relaxed">
                Join thousands of travelers who have discovered amazing experiences with us. 
                Your perfect adventure is just a click away.
              </p>
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <Link
                  href="/tours"
                  className="inline-flex items-center gap-3 px-8 py-4 bg-white text-red-600 font-bold rounded-xl hover:bg-slate-100 transition-all duration-200 transform hover:scale-105 shadow-lg"
                >
                  Browse All Tours
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-3 px-8 py-4 border-2 border-white text-white font-bold rounded-xl hover:bg-white hover:text-red-600 transition-all duration-200 transform hover:scale-105"
                >
                  Get Expert Advice
                  <Users className="w-5 h-5" />
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      </main>
    </>
  );
}