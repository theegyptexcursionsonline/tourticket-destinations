// components/AttractionLandingPage.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, Star, Clock, Search, 
  Grid, List, Award, 
  ChevronDown, ChevronUp, CheckCircle,
  Target, Info
} from 'lucide-react';
import { Tour, Review } from '@/types';
import TourCard from '@/components/shared/TourCard';
import RelatedInterests from '@/components/RelatedInterests';
import PopularInterestsGrid from '@/components/PopularInterestsGrid';

interface AttractionData {
  _id: string;
  title: string;
  slug: string;
  description: string;
  longDescription?: string;
  heroImage: string;
  images?: string[];
  highlights?: string[];
  features?: string[];
  tours: Tour[];
  totalTours: number;
  reviews: Review[];
  gridTitle: string;
  gridSubtitle?: string;
  showStats: boolean;
  isPublished: boolean;
  featured: boolean;
}

interface AttractionLandingPageProps {
  attraction: AttractionData;
}

const QuickInfo = ({ attraction }: { attraction: AttractionData }) => {
  const avgRating = 4.8;
  const totalReviews = attraction.reviews?.length || 0;
  
  return (
    <div className="flex flex-wrap items-center gap-6 text-sm">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <Star className="w-5 h-5 text-yellow-400 fill-current" />
          <span className="font-bold text-lg">{avgRating}</span>
        </div>
        <span className="text-slate-600">
          ({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})
        </span>
      </div>
      
      <div className="h-4 w-px bg-slate-300" />
      
      <div className="flex items-center gap-2">
        <Target className="w-5 h-5 text-slate-600" />
        <span className="text-slate-700 font-medium">
          {attraction.totalTours} {attraction.totalTours === 1 ? 'activity' : 'activities'}
        </span>
      </div>
      
      <div className="h-4 w-px bg-slate-300" />
      
      <div className="flex items-center gap-2">
        <Clock className="w-5 h-5 text-slate-600" />
        <span className="text-slate-700 font-medium">Flexible duration</span>
      </div>
    </div>
  );
};

const ExpandableDescription = ({ attraction }: { attraction: AttractionData }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const shortDescription = attraction.description;
  const fullDescription = attraction.longDescription || attraction.description;
  const hasMore = fullDescription.length > shortDescription.length;

  return (
    <div className="max-w-4xl">
      <AnimatePresence mode="wait">
        {!isExpanded ? (
          <motion.div
            key="short"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <p className="text-lg text-slate-700 leading-relaxed mb-4">
              {shortDescription}
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="full"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            <p className="text-lg text-slate-700 leading-relaxed">
              {fullDescription}
            </p>
            
            {attraction.highlights && attraction.highlights.length > 0 && (
              <div className="bg-slate-50 rounded-xl p-6 mt-6">
                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Info className="w-5 h-5 text-red-600" />
                  Key Highlights
                </h3>
                <ul className="space-y-2">
                  {attraction.highlights.slice(0, 5).map((highlight, index) => (
                    <li key={index} className="flex items-start gap-3 text-slate-700">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <div className="text-sm text-slate-600 mb-1">Peak Season</div>
                <div className="font-semibold text-slate-900">Nov - April</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <div className="text-sm text-slate-600 mb-1">Avg. Duration</div>
                <div className="font-semibold text-slate-900">3-5 days</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <div className="text-sm text-slate-600 mb-1">Best For</div>
                <div className="font-semibold text-slate-900">All ages</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <div className="text-sm text-slate-600 mb-1">Languages</div>
                <div className="font-semibold text-slate-900">15+ available</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {hasMore && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="inline-flex items-center gap-2 text-red-600 font-semibold hover:text-red-700 transition-colors mt-4"
        >
          {isExpanded ? (
            <>
              Show less
              <ChevronUp className="w-5 h-5" />
            </>
          ) : (
            <>
              Read more
              <ChevronDown className="w-5 h-5" />
            </>
          )}
        </button>
      )}
    </div>
  );
};

const SearchAndFilter = ({ 
  searchQuery, 
  setSearchQuery, 
  viewMode, 
  setViewMode,
  sortBy,
  setSortBy
}: {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
}) => (
  <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
    <div className="flex flex-col md:flex-row items-center gap-3">
      <div className="relative flex-1 w-full">
        <Search className="absolute start-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search activities..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full ps-10 pe-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
        />
      </div>

      <select
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value)}
        className="px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-sm min-w-[180px]"
      >
        <option value="featured">Most popular</option>
        <option value="price_low">Price: Low to High</option>
        <option value="price_high">Price: High to Low</option>
        <option value="rating">Top rated</option>
        <option value="duration">Duration</option>
        <option value="newest">Newest</option>
      </select>

      <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
        <button
          onClick={() => setViewMode('grid')}
          className={`p-2 rounded transition-all ${
            viewMode === 'grid' 
              ? 'bg-white text-red-600 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Grid className="w-4 h-4" />
        </button>
        <button
          onClick={() => setViewMode('list')}
          className={`p-2 rounded transition-all ${
            viewMode === 'list' 
              ? 'bg-white text-red-600 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <List className="w-4 h-4" />
        </button>
      </div>
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
    <section className="py-16 bg-white">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <h2 className="text-3xl font-bold text-slate-900 mb-2">
            Reviews from travelers
          </h2>
          <p className="text-slate-600">
            See what others say about their experience
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {displayedReviews.map((review, index) => (
            <motion.div
              key={review._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-slate-50 p-6 rounded-xl border border-slate-200 hover:border-slate-300 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {review.userName ? review.userName.charAt(0).toUpperCase() : 'A'}
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 text-sm">{review.userName || 'Anonymous'}</h4>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i < review.rating ? 'text-yellow-400 fill-current' : 'text-slate-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              {review.title && (
                <h5 className="font-semibold text-slate-800 mb-2 text-sm">{review.title}</h5>
              )}
              
              <p className="text-slate-600 text-sm leading-relaxed line-clamp-3">
                {review.comment}
              </p>
              
              <div className="text-xs text-slate-500 mt-3">
                {new Date(review.createdAt || review.date || '').toLocaleDateString('en-US', { 
                  month: 'short', 
                  year: 'numeric' 
                })}
              </div>
            </motion.div>
          ))}
        </div>

        {reviews.length > 6 && (
          <div className="text-center">
            <button
              onClick={() => setShowAllReviews(!showAllReviews)}
              className="inline-flex items-center gap-2 px-6 py-2.5 border-2 border-slate-300 text-slate-700 font-semibold rounded-lg hover:border-slate-400 transition-colors"
            >
              {showAllReviews ? (
                <>
                  Show less
                  <ChevronUp className="w-4 h-4" />
                </>
              ) : (
                <>
                  Show all {reviews.length} reviews
                  <ChevronDown className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

const AttractionLandingPage: React.FC<AttractionLandingPageProps> = ({ attraction }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('featured');

  const filteredAndSortedTours = useMemo(() => {
    let filtered = attraction.tours?.filter(tour =>
      tour.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tour.description?.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

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
      default:
        filtered.sort((a, b) => {
          if (a.isFeatured && !b.isFeatured) return -1;
          if (!a.isFeatured && b.isFeatured) return 1;
          return (b.rating || 0) - (a.rating || 0);
        });
    }

    return filtered;
  }, [attraction.tours, searchQuery, sortBy]);

  return (
    <main className="min-h-screen bg-white">
      {/* Clean Hero Section */}
      <section className="relative bg-slate-900">
        <div className="absolute inset-0">
          <Image
            src={attraction.heroImage}
            alt={attraction.title}
            fill
            className="object-cover opacity-40"
            priority
            sizes="100vw"
          />
        </div>
        
        <div className="relative z-10 container mx-auto px-6 py-16 md:py-24">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl"
          >
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm font-medium text-white mb-6">
              <Award className="w-4 h-4" />
              <span>Popular attraction</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Things to do in {attraction.title}
            </h1>
            
            <QuickInfo attraction={attraction} />
          </motion.div>
        </div>
      </section>

      {/* Description Section */}
      <section className="py-12 bg-white border-b border-slate-200">
        <div className="container mx-auto px-6">
          <ExpandableDescription attraction={attraction} />
        </div>
      </section>

      {/* Features Grid */}
      {attraction.features && attraction.features.length > 0 && (
        <section className="py-12 bg-slate-50">
          <div className="container mx-auto px-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">
              What makes this special
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {attraction.features.slice(0, 6).map((feature, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 bg-white p-4 rounded-lg border border-slate-200"
                >
                  <div className="w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <p className="text-slate-700 text-sm leading-relaxed">{feature}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Tours Section */}
      {attraction.tours && attraction.tours.length > 0 && (
        <section id="tours" className="py-12 bg-white">
          <div className="container mx-auto px-6">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">
                {attraction.gridTitle || 'Available activities'}
              </h2>
              {attraction.gridSubtitle && (
                <p className="text-slate-600">{attraction.gridSubtitle}</p>
              )}
            </div>

            <SearchAndFilter
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              viewMode={viewMode}
              setViewMode={setViewMode}
              sortBy={sortBy}
              setSortBy={setSortBy}
            />

            <div className="text-sm text-slate-600 mb-6">
              {filteredAndSortedTours.length} {filteredAndSortedTours.length === 1 ? 'result' : 'results'}
            </div>

            {filteredAndSortedTours.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredAndSortedTours.map((tour, index) => (
                  <TourCard key={tour._id} tour={tour} index={index} />
                ))}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16 bg-slate-50 rounded-xl"
              >
                <Search className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-700 mb-2">No activities found</h3>
                <p className="text-slate-500 mb-4">
                  {searchQuery ? 'Try adjusting your search' : 'Check back soon for new activities'}
                </p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-red-600 font-semibold hover:text-red-700"
                  >
                    Clear search
                  </button>
                )}
              </motion.div>
            )}
          </div>
        </section>
      )}

      {/* Reviews Section */}
      {attraction.reviews && attraction.reviews.length > 0 && (
        <ReviewsSection reviews={attraction.reviews} />
      )}

      {/* Related Interests */}
      <div className="bg-slate-50">
        <RelatedInterests 
          currentSlug={attraction.slug}
          limit={6}
          title="Similar attractions"
          subtitle="Explore more places you might like"
        />
      </div>

      {/* Popular Interests */}
      <PopularInterestsGrid 
        limit={8}
        showFeaturedOnly={true}
        title="Top experiences"
        subtitle="Don't miss these popular activities"
        columns={4}
      />

      {/* Simple CTA */}
      <section className="py-16 bg-red-600 text-white">
        <div className="container mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to explore {attraction.title}?
            </h2>
            <p className="text-lg mb-8 opacity-90">
              Book now and create unforgettable memories
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="#tours"
                className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-white text-red-600 font-semibold rounded-lg hover:bg-slate-100 transition-all"
              >
                View all activities
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 px-8 py-3 border-2 border-white text-white font-semibold rounded-lg hover:bg-white/10 transition-all"
              >
                Contact us
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  );
};

export default AttractionLandingPage;