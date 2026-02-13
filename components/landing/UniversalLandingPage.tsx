// components/landing/UniversalLandingPage.tsx
'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { 
  MapPin, Star, Clock, Users, ArrowRight, 
  Grid, List, LayoutGrid, Filter, Search, 
  Award, Globe, Camera, Zap
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface LandingPageProps {
  page: {
    title: string;
    description: string;
    longDescription?: string;
    heroImage: string;
    images?: string[];
    highlights?: string[];
    features?: string[];
    gridTitle?: string;
    gridSubtitle?: string;
    metaTitle?: string;
    metaDescription?: string;
  };
  tours: any[];
  categories: any[];
  destinations: any[];
  relatedPages?: any[];
  reviews?: any[];
  linkTree?: {
    title: string;
    links: { name: string; url: string; icon?: string }[];
  };
  layout?: 'grid' | 'masonry' | 'list' | 'cards';
}

export default function UniversalLandingPage({
  page,
  tours = [],
  categories = [],
  destinations = [],
  relatedPages = [],
  reviews = [],
  linkTree,
  layout = 'grid'
}: LandingPageProps) {
  const [activeTab, setActiveTab] = useState('tours');
  const [viewMode, setViewMode] = useState(layout);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Filter content based on search query
  const filterContent = (items: any[], query: string) => {
    if (!query.trim()) return items;
    return items.filter(item => 
      item.title?.toLowerCase().includes(query.toLowerCase()) ||
      item.name?.toLowerCase().includes(query.toLowerCase()) ||
      item.description?.toLowerCase().includes(query.toLowerCase())
    );
  };

  const filteredTours = filterContent(tours, searchQuery);
  const filteredDestinations = filterContent(destinations, searchQuery);
  const filteredCategories = filterContent(categories, searchQuery);

  return (
    <>
      <Header startSolid />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
        {/* Hero Section */}
        <section className="relative h-[80vh] overflow-hidden">
          <div className="absolute inset-0">
            <Image
              src={page.heroImage}
              alt={page.title}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          </div>
          
          <div className="relative z-10 h-full flex items-center justify-center">
            <div className="text-center text-white max-w-5xl px-6">
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
                
                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
                  <button className="bg-white text-slate-900 px-8 py-4 rounded-xl font-semibold hover:bg-slate-100 transition-all duration-200 transform hover:scale-105">
                    Explore Now
                  </button>
                  <button className="border-2 border-white text-white px-8 py-4 rounded-xl font-semibold hover:bg-white hover:text-slate-900 transition-all duration-200">
                    Learn More
                  </button>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Scroll Indicator */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="w-6 h-10 border-2 border-white rounded-full flex justify-center"
            >
              <div className="w-1 h-3 bg-white rounded-full mt-2"></div>
            </motion.div>
          </div>
        </section>

        {/* Statistics Bar */}
        <section className="bg-white shadow-lg border-b relative z-20">
          <div className="container mx-auto px-6 py-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-indigo-600">{tours.length}+</div>
                <div className="text-slate-600 font-medium">Amazing Tours</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-indigo-600">{destinations.length}+</div>
                <div className="text-slate-600 font-medium">Destinations</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-indigo-600">2M+</div>
                <div className="text-slate-600 font-medium">Happy Travelers</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-indigo-600">4.9</div>
                <div className="text-slate-600 font-medium">Average Rating</div>
              </div>
            </div>
          </div>
        </section>

        {/* Navigation and Search */}
        <section className="bg-white shadow-sm border-b sticky top-0 z-30">
          <div className="container mx-auto px-6">
            <div className="flex flex-col lg:flex-row items-center justify-between py-4 gap-4">
              {/* Tab Navigation */}
              <div className="flex flex-wrap gap-1">
                {[
                  { id: 'tours', label: 'Tours', count: filteredTours.length, icon: Zap },
                  { id: 'destinations', label: 'Destinations', count: filteredDestinations.length, icon: Globe },
                  { id: 'categories', label: 'Categories', count: filteredCategories.length, icon: Grid },
                  { id: 'reviews', label: 'Reviews', count: reviews.length, icon: Star },
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                        activeTab === tab.id
                          ? 'bg-indigo-100 text-indigo-600 shadow-md'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                      {tab.count > 0 && (
                        <span className="ml-1 px-2 py-1 bg-slate-200 text-slate-600 rounded-full text-xs font-semibold">
                          {tab.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              
              {/* Search and View Controls */}
              <div className="flex items-center gap-4">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                {/* Filter Toggle */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <Filter className="h-4 w-4" />
                  <span className="hidden sm:inline">Filters</span>
                </button>
                
                {/* View Mode Toggles */}
                <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
                  {[
                    { mode: 'grid', icon: LayoutGrid },
                    { mode: 'list', icon: List },
                    { mode: 'cards', icon: Grid }
                  ].map(({ mode, icon: Icon }) => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode as any)}
                      className={`p-2 rounded-md transition-all ${
                        viewMode === mode
                          ? 'bg-white text-indigo-600 shadow-sm'
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Filters Panel */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-slate-200 py-4 overflow-hidden"
                >
                  <FiltersPanel />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* Main Content */}
        <section className="container mx-auto px-6 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            
            {/* Main Content Area */}
            <div className="lg:col-span-3">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Tours Tab */}
                  {activeTab === 'tours' && (
                    <ToursGrid tours={filteredTours} viewMode={viewMode} />
                  )}
                  
                  {/* Destinations Tab */}
                  {activeTab === 'destinations' && (
                    <DestinationsGrid destinations={filteredDestinations} viewMode={viewMode} />
                  )}
                  
                  {/* Categories Tab */}
                  {activeTab === 'categories' && (
                    <CategoriesGrid categories={filteredCategories} viewMode={viewMode} />
                  )}
                  
                  {/* Reviews Tab */}
                  {activeTab === 'reviews' && (
                    <ReviewsGrid reviews={reviews} viewMode={viewMode} />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
            
            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-8">
              {/* Link Tree */}
              {linkTree && (
                <LinkTreeWidget linkTree={linkTree} />
              )}
              
              {/* Highlights */}
              {page.highlights && page.highlights.length > 0 && (
                <HighlightsWidget highlights={page.highlights} />
              )}
              
              {/* Features */}
              {page.features && page.features.length > 0 && (
                <FeaturesWidget features={page.features} />
              )}
              
              {/* Quick Stats */}
              <QuickStatsWidget 
                tours={tours}
                destinations={destinations}
                categories={categories}
              />
              
              {/* Related Pages */}
              {relatedPages.length > 0 && (
                <RelatedPagesWidget pages={relatedPages} />
              )}
            </div>
          </div>
        </section>

        {/* Additional Content Sections */}
        {page.longDescription && (
          <section className="bg-white py-16">
            <div className="container mx-auto px-6">
              <div className="max-w-4xl mx-auto">
                <h2 className="text-3xl font-bold text-slate-900 mb-6 text-center">
                  More About {page.title}
                </h2>
                <div className="prose prose-lg max-w-none text-slate-600">
                  <p>{page.longDescription}</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Image Gallery */}
        {page.images && page.images.length > 0 && (
          <section className="py-16">
            <div className="container mx-auto px-6">
              <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">
                Gallery
              </h2>
              <ImageGallery images={page.images} />
            </div>
          </section>
        )}
      </div>
      <Footer />
    </>
  );
}

// Sub-components for different content types
const ToursGrid = ({ tours, viewMode }: { tours: any[], viewMode: string }) => {
  if (tours.length === 0) {
    return <EmptyState type="tours" />;
  }

  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tours.map((tour, index) => (
          <TourCard key={tour._id || index} tour={tour} index={index} />
        ))}
      </div>
    );
  }
  
  if (viewMode === 'list') {
    return (
      <div className="space-y-4">
        {tours.map((tour, index) => (
          <TourListItem key={tour._id || index} tour={tour} index={index} />
        ))}
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {tours.map((tour, index) => (
        <TourLargeCard key={tour._id || index} tour={tour} index={index} />
      ))}
    </div>
  );
};

const DestinationsGrid = ({ destinations, viewMode }: { destinations: any[], viewMode: string }) => {
  if (destinations.length === 0) {
    return <EmptyState type="destinations" />;
  }

  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {destinations.map((destination, index) => (
          <DestinationCard key={destination._id || index} destination={destination} index={index} />
        ))}
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <div className="space-y-4">
        {destinations.map((destination, index) => (
          <DestinationListItem key={destination._id || index} destination={destination} index={index} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {destinations.map((destination, index) => (
        <DestinationLargeCard key={destination._id || index} destination={destination} index={index} />
      ))}
    </div>
  );
};

const CategoriesGrid = ({ categories, viewMode: _viewMode }: { categories: any[], viewMode: string }) => {
  if (categories.length === 0) {
    return <EmptyState type="categories" />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {categories.map((category, index) => (
        <CategoryCard key={category._id || index} category={category} index={index} />
      ))}
    </div>
  );
};

const ReviewsGrid = ({ reviews, viewMode: _viewMode }: { reviews: any[], viewMode: string }) => {
  if (reviews.length === 0) {
    return <EmptyState type="reviews" />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {reviews.map((review, index) => (
        <ReviewCard key={review._id || index} review={review} index={index} />
      ))}
    </div>
  );
};

// Individual Card Components
const TourCard = ({ tour, index }: { tour: any, index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.1 }}
  >
    <Link href={`/${tour.slug}`} className="group block">
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-2">
        <div className="relative h-48">
          <Image
            src={tour.image}
            alt={tour.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-110"
          />
          <div className="absolute top-4 right-4">
            <div className="bg-white/90 backdrop-blur-sm px-3 py-2 rounded-full">
              <span className="text-sm font-bold text-slate-900">
                €{tour.discountPrice || tour.price}
              </span>
            </div>
          </div>
          {tour.isFeatured && (
            <div className="absolute top-4 left-4">
              <div className="bg-yellow-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                <Star className="h-3 w-3 inline mr-1" />
                Featured
              </div>
            </div>
          )}
        </div>
        <div className="p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors line-clamp-2">
            {tour.title}
          </h3>
          <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{tour.duration}</span>
            </div>
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-500 fill-current" />
              <span>{tour.rating || '4.5'}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>Max {tour.maxGroupSize || 10}</span>
            </div>
          </div>
          <p className="text-slate-600 text-sm line-clamp-2">{tour.description}</p>
          
          {tour.destination && (
            <div className="flex items-center gap-1 mt-3 text-xs text-slate-500">
              <MapPin className="h-3 w-3" />
              <span>{tour.destination.name}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  </motion.div>
);

const TourListItem = ({ tour, index }: { tour: any, index: number }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: index * 0.05 }}
  >
    <Link href={`/${tour.slug}`} className="group">
      <div className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-6">
        <div className="relative w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
          <Image
            src={tour.image}
            alt={tour.title}
            fill
            className="object-cover"
          />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
            {tour.title}
          </h3>
          <p className="text-slate-600 text-sm mt-1 line-clamp-1">{tour.description}</p>
          <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {tour.duration}
            </span>
            <span className="flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-500 fill-current" />
              {tour.rating || '4.5'}
            </span>
            {tour.destination && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {tour.destination.name}
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-slate-900">
            €{tour.discountPrice || tour.price}
          </div>
          <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-indigo-600 transition-colors mt-2 ml-auto" />
        </div>
      </div>
    </Link>
  </motion.div>
);

const TourLargeCard = ({ tour, index }: { tour: any, index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.1 }}
  >
    <Link href={`/${tour.slug}`} className="group block">
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-2xl">
        <div className="relative h-64">
          <Image
            src={tour.image}
            alt={tour.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <div className="text-white">
              <h3 className="text-xl font-bold mb-2 group-hover:text-yellow-300 transition-colors">
                {tour.title}
              </h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {tour.duration}
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    {tour.rating || '4.5'}
                  </span>
                </div>
                <div className="text-xl font-bold">
                  €{tour.discountPrice || tour.price}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="p-6">
          <p className="text-slate-600 text-sm line-clamp-3">{tour.description}</p>
          <div className="flex items-center justify-between mt-4">
            {tour.destination && (
              <span className="flex items-center gap-1 text-sm text-slate-500">
                <MapPin className="h-4 w-4" />
                {tour.destination.name}
              </span>
            )}
            <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
          </div>
        </div>
      </div>
    </Link>
  </motion.div>
);

const DestinationCard = ({ destination, index }: { destination: any, index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.1 }}
  >
    <Link href={`/${destination.slug}`} className="group block">
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-2">
        <div className="relative h-48">
          <Image
            src={destination.image || '/images/placeholder-destination.jpg'}
            alt={destination.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <div className="absolute bottom-4 left-4">
            <h3 className="text-xl font-bold text-white group-hover:text-yellow-300 transition-colors">
              {destination.name}
            </h3>
            {destination.country && (
              <p className="text-white/80 text-sm">{destination.country}</p>
            )}
          </div>
        </div>
        <div className="p-6">
          <p className="text-slate-600 text-sm line-clamp-3">{destination.description}</p>
          <div className="flex items-center justify-between mt-4">
            <span className="text-sm text-slate-500">
              {destination.tourCount || 0} tours available
            </span>
            <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
          </div>
        </div>
      </div>
    </Link>
  </motion.div>
);

const DestinationListItem = ({ destination, index }: { destination: any, index: number }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: index * 0.05 }}
  >
    <Link href={`/${destination.slug}`} className="group">
      <div className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-6">
        <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
          <Image
            src={destination.image || '/images/placeholder-destination.jpg'}
            alt={destination.name}
            fill
            className="object-cover"
          />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
            {destination.name}
          </h3>
          {destination.country && (
            <p className="text-slate-500 text-sm">{destination.country}</p>
          )}
          <p className="text-slate-600 text-sm mt-1 line-clamp-1">{destination.description}</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-slate-500">
            {destination.tourCount || 0} tours
          </div>
          <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-indigo-600 transition-colors mt-2 ml-auto" />
        </div>
      </div>
    </Link>
  </motion.div>
);

const DestinationLargeCard = ({ destination, index }: { destination: any, index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.1 }}
  >
    <Link href={`/${destination.slug}`} className="group block">
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-2xl">
        <div className="relative h-64">
          <Image
            src={destination.image || '/images/placeholder-destination.jpg'}
            alt={destination.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <div className="text-white">
              <h3 className="text-xl font-bold mb-1 group-hover:text-yellow-300 transition-colors">
                {destination.name}
              </h3>
              {destination.country && (
                <p className="text-white/80 text-sm">{destination.country}</p>
              )}
            </div>
          </div>
        </div>
        <div className="p-6">
          <p className="text-slate-600 text-sm line-clamp-3">{destination.description}</p>
          <div className="flex items-center justify-between mt-4">
            <span className="text-sm text-slate-500">
              {destination.tourCount || 0} tours available
            </span>
            <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
          </div>
        </div>
      </div>
    </Link>
  </motion.div>
);

const CategoryCard = ({ category, index }: { category: any, index: number }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay: index * 0.1 }}
  >
    <Link href={`/${category.slug}`} className="group block">
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-8 shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 border border-indigo-100">
        <div className="text-center">
          <div className="text-4xl mb-4">{category.icon || '📋'}</div>
          <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">
            {category.name}
          </h3>
          <p className="text-slate-600 text-sm">{category.description || 'Explore this category'}</p>
        </div>
      </div>
    </Link>
  </motion.div>
);

const ReviewCard = ({ review, index }: { review: any, index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.1 }}
  >
    <div className="bg-white rounded-2xl p-6 shadow-lg">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
          {review.userName?.charAt(0) || 'U'}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-semibold text-slate-900">{review.userName}</h4>
            <div className="flex text-yellow-400">
              {Array.from({ length: 5 }, (_, i) => (
                <Star 
                  key={i} 
                  className={`h-4 w-4 ${i < review.rating ? 'fill-current' : ''}`} 
                />
              ))}
            </div>
          </div>
          {review.title && (
            <h5 className="font-medium text-slate-900 mb-2">{review.title}</h5>
          )}
          <p className="text-slate-600 text-sm line-clamp-3">{review.comment}</p>
          <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
            <span>{new Date(review.createdAt).toLocaleDateString()}</span>
            {review.verified && (
              <span className="flex items-center gap-1 text-green-600">
                <Award className="h-3 w-3" />
                Verified
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  </motion.div>
);

// Widget Components
const LinkTreeWidget = ({ linkTree }: { linkTree: any }) => (
  <div className="bg-white rounded-2xl p-6 shadow-lg">
    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
      <Zap className="h-5 w-5 text-indigo-500" />
      {linkTree.title}
    </h3>
    <div className="space-y-3">
      {linkTree.links.map((link: any, index: number) => (
        <Link
          key={index}
          href={link.url}
          className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors group"
        >
          {link.icon && <span className="text-xl">{link.icon}</span>}
          <span className="font-medium text-slate-700 group-hover:text-indigo-600 transition-colors flex-1">
            {link.name}
          </span>
          <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
        </Link>
      ))}
    </div>
  </div>
);

const HighlightsWidget = ({ highlights }: { highlights: string[] }) => (
  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100">
    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
      <Star className="h-5 w-5 text-indigo-500" />
      Highlights
    </h3>
    <ul className="space-y-3">
      {highlights.map((highlight, index) => (
        <li key={index} className="flex items-start gap-3 text-sm text-slate-700">
          <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0" />
          <span>{highlight}</span>
        </li>
      ))}
    </ul>
  </div>
);

const FeaturesWidget = ({ features }: { features: string[] }) => (
  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100">
    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
      <Award className="h-5 w-5 text-green-500" />
      Features
    </h3>
    <ul className="space-y-3">
      {features.map((feature, index) => (
        <li key={index} className="flex items-start gap-3 text-sm text-slate-700">
          <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
          <span>{feature}</span>
        </li>
      ))}
    </ul>
  </div>
);

const QuickStatsWidget = ({ tours, destinations, categories }: { tours: any[], destinations: any[], categories: any[] }) => (
  <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-6 border border-yellow-100">
    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
      <Globe className="h-5 w-5 text-yellow-500" />
      Quick Stats
    </h3>
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-slate-600">Tours</span>
        <span className="font-bold text-slate-900">{tours.length}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-slate-600">Destinations</span>
        <span className="font-bold text-slate-900">{destinations.length}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-slate-600">Categories</span>
        <span className="font-bold text-slate-900">{categories.length}</span>
      </div>
    </div>
  </div>
);

const RelatedPagesWidget = ({ pages }: { pages: any[] }) => (
  <div className="bg-white rounded-2xl p-6 shadow-lg">
    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
      <Globe className="h-5 w-5 text-slate-500" />
      Related Pages
    </h3>
    <div className="space-y-3">
      {pages.map((page: any, index: number) => (
        <Link
          key={index}
          href={`/${page.slug}`}
          className="block p-3 rounded-lg hover:bg-slate-50 transition-colors group"
        >
          <h4 className="font-medium text-slate-900 group-hover:text-indigo-600 transition-colors">
            {page.title || page.name}
          </h4>
          <p className="text-slate-500 text-xs mt-1 line-clamp-2">
            {page.description}
          </p>
        </Link>
      ))}
    </div>
  </div>
);

const EmptyState = ({ type }: { type: string }) => (
  <div className="text-center py-16">
    <div className="w-24 h-24 mx-auto mb-6 bg-slate-100 rounded-full flex items-center justify-center">
      <Search className="w-10 h-10 text-slate-400" />
    </div>
    <h3 className="text-xl font-semibold text-slate-700 mb-2">No {type} found</h3>
    <p className="text-slate-500">
      Try adjusting your search criteria or explore other sections.
    </p>
  </div>
);

const FiltersPanel = () => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">Price Range</label>
      <div className="flex gap-2">
        <input 
          type="number" 
          placeholder="Min" 
          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
        />
        <input 
          type="number" 
          placeholder="Max" 
          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
        />
      </div>
    </div>
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">Duration</label>
      <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
        <option value="">Any Duration</option>
        <option value="half-day">Half Day</option>
        <option value="full-day">Full Day</option>
        <option value="multi-day">Multi Day</option>
      </select>
    </div>
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">Rating</label>
      <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
        <option value="">Any Rating</option>
        <option value="4">4+ Stars</option>
        <option value="4.5">4.5+ Stars</option>
        <option value="5">5 Stars</option>
      </select>
    </div>
  </div>
);

const ImageGallery = ({ images }: { images: string[] }) => (
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
    {images.map((image, index) => (
      <motion.div
        key={index}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.1 }}
        className="relative aspect-square rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 group cursor-pointer"
      >
        <Image
          src={image}
          alt={`Gallery image ${index + 1}`}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <Camera className="h-8 w-8 text-white" />
        </div>
      </motion.div>
    ))}
  </div>
);