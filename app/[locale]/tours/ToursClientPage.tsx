'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { Clock, Star, MapPin, Search, X, SlidersHorizontal, Tag } from 'lucide-react';
import { ITour } from '@/lib/models/Tour';
import { useSettings } from '@/hooks/useSettings';
import { motion, AnimatePresence } from 'framer-motion';

interface TourWithDetails extends Omit<ITour, 'destination' | 'categories'> {
  destination: { name: string };
  categories: { name: string }[];
  reviewCount?: number;
}

interface ToursClientPageProps {
  tours: TourWithDetails[];
}

const TourCard = ({ tour }: { tour: TourWithDetails }) => {
  const { formatPrice } = useSettings();
  const discountPercent = tour.originalPrice && tour.discountPrice
    ? Math.round(((tour.originalPrice - tour.discountPrice) / tour.originalPrice) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -8 }}
    >
      <Link href={`/tour/${tour.slug}`} className="group block bg-white rounded-2xl transition-all duration-300 overflow-hidden border border-slate-100">
        <div className="relative h-56 overflow-hidden">
          <Image
            src={tour.image || '/images/placeholder.png'}
            alt={`Image of ${tour.title}`}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>

          {/* Destination Badge */}
          {tour.destination?.name && (
            <div className="absolute top-3 start-3 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-xs font-semibold text-slate-700">{tour.destination.name}</span>
            </div>
          )}

          {/* Discount Badge */}
          {discountPercent > 0 && (
            <div className="absolute top-3 end-3 bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-1.5 rounded-full shadow-lg">
              <span className="text-xs font-bold">-{discountPercent}% OFF</span>
            </div>
          )}

          {/* Featured Badge */}
          {tour.isFeatured && (
            <div className="absolute bottom-3 start-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1.5 rounded-full flex items-center gap-1 shadow-lg">
              <Star className="w-3 h-3 fill-current" />
              <span className="text-xs font-bold">Featured</span>
            </div>
          )}
        </div>

        <div className="p-5">
          <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors mb-3 line-clamp-2 leading-snug min-h-[3.5rem]">
            {tour.title}
          </h3>

          <div className="space-y-2.5 mb-4">
            {/* Duration and Rating */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1.5 text-slate-600">
                <Clock className="w-4 h-4 text-blue-500" />
                <span className="font-medium">{tour.duration}</span>
              </div>
              {tour.rating && (
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  <span className="font-semibold text-slate-700">{tour.rating}</span>
                  {tour.reviewCount && (
                    <span className="text-xs text-slate-500">({tour.reviewCount})</span>
                  )}
                </div>
              )}
            </div>

            {/* Category Tags */}
            {tour.categories && tour.categories.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tour.categories.slice(0, 2).map((cat, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-1 rounded-md text-xs font-medium">
                    <Tag className="w-3 h-3" />
                    {cat.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Price Section */}
          <div className="pt-4 border-t border-slate-100 flex justify-between items-end">
            <div>
              {tour.originalPrice && tour.discountPrice < tour.originalPrice && (
                <div className="text-sm text-slate-400 line-through">
                  {formatPrice(tour.originalPrice)}
                </div>
              )}
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-blue-600">
                  {formatPrice(tour.discountPrice)}
                </span>
                <span className="text-xs text-slate-500">per person</span>
              </div>
            </div>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm hover:shadow-md">
              View Details
            </button>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default function ToursClientPage({ tours }: ToursClientPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDestination, setSelectedDestination] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'price-low' | 'price-high' | 'rating'>('newest');
  const [showFilters, setShowFilters] = useState(false);

  // Extract unique destinations and categories
  const destinations = useMemo(() => {
    const destSet = new Set<string>();
    tours.forEach(tour => {
      if (tour.destination?.name) destSet.add(tour.destination.name);
    });
    return Array.from(destSet).sort();
  }, [tours]);

  const categories = useMemo(() => {
    const catSet = new Set<string>();
    tours.forEach(tour => {
      if (tour.categories) {
        tour.categories.forEach(cat => catSet.add(cat.name));
      }
    });
    return Array.from(catSet).sort();
  }, [tours]);

  // Filter and sort tours
  const filteredTours = useMemo(() => {
    let filtered = tours.filter(tour => {
      const matchesSearch = tour.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           tour.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDestination = selectedDestination === 'all' || tour.destination?.name === selectedDestination;
      const matchesCategory = selectedCategory === 'all' ||
                             tour.categories?.some(cat => cat.name === selectedCategory);

      return matchesSearch && matchesDestination && matchesCategory;
    });

    // Sort
    switch (sortBy) {
      case 'price-low':
        filtered.sort((a, b) => (a.discountPrice || 0) - (b.discountPrice || 0));
        break;
      case 'price-high':
        filtered.sort((a, b) => (b.discountPrice || 0) - (a.discountPrice || 0));
        break;
      case 'rating':
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'newest':
      default:
        // Already sorted by createdAt in server
        break;
    }

    return filtered;
  }, [tours, searchQuery, selectedDestination, selectedCategory, sortBy]);

  const activeFiltersCount =
    (selectedDestination !== 'all' ? 1 : 0) +
    (selectedCategory !== 'all' ? 1 : 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white py-16 px-4">
        <div className="container mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-4">
              Explore All Tours
            </h1>
            <p className="text-lg sm:text-xl text-blue-100 max-w-3xl mx-auto mb-8">
              Discover {tours.length} handpicked experiences across {destinations.length} destinations. Your next adventure starts here!
            </p>

            {/* Search Bar */}
            <div className="max-w-2xl mx-auto relative">
              <div className="relative">
                <Search className="absolute start-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search tours by name or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full ps-12 pe-12 py-4 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-white/20 shadow-2xl text-base"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute end-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto max-w-7xl px-4 py-8 sm:py-12">
        {/* Filters Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl shadow-sm border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all font-medium text-slate-700"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>Filters</span>
                {activeFiltersCount > 0 && (
                  <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              {activeFiltersCount > 0 && (
                <button
                  onClick={() => {
                    setSelectedDestination('all');
                    setSelectedCategory('all');
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Clear all
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <label className="text-sm font-medium text-slate-600 whitespace-nowrap">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="flex-1 sm:flex-none bg-white px-4 py-2.5 rounded-xl shadow-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium text-slate-700"
              >
                <option value="newest">Newest First</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
              </select>
            </div>
          </div>

          {/* Expandable Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
                  {/* Destination Filter */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                      <MapPin className="w-4 h-4 text-blue-600" />
                      Destination
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setSelectedDestination('all')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          selectedDestination === 'all'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        All Destinations
                      </button>
                      {destinations.map(dest => (
                        <button
                          key={dest}
                          onClick={() => setSelectedDestination(dest)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            selectedDestination === dest
                              ? 'bg-blue-600 text-white shadow-md'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {dest}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Category Filter */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                      <Tag className="w-4 h-4 text-purple-600" />
                      Category
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setSelectedCategory('all')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          selectedCategory === 'all'
                            ? 'bg-purple-600 text-white shadow-md'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        All Categories
                      </button>
                      {categories.map(cat => (
                        <button
                          key={cat}
                          onClick={() => setSelectedCategory(cat)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            selectedCategory === cat
                              ? 'bg-purple-600 text-white shadow-md'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-slate-600 font-medium">
            Showing <span className="text-blue-600 font-bold">{filteredTours.length}</span> of <span className="font-bold">{tours.length}</span> tours
          </p>
        </div>

        {/* Tours Grid */}
        {filteredTours.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredTours.map((tour) => (
              <TourCard key={String(tour._id)} tour={tour} />
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20 bg-white rounded-2xl shadow-sm border border-slate-200"
          >
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No tours found</h3>
            <p className="text-slate-500 mb-6">Try adjusting your filters or search query</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedDestination('all');
                setSelectedCategory('all');
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Clear All Filters
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
