// components/InterestLandingPage.tsx
'use client';

import React, { useState } from 'react';
import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  ArrowRight, Users, Clock, MapPin, Heart,
  MessageCircle, Star, Search, CheckCircle, Shield,
  Award, Navigation, Camera, TrendingUp
} from 'lucide-react';
import { Tour, Review } from '@/types';
import { useSettings } from '@/hooks/useSettings';
import RelatedInterests from './RelatedInterests';
import PopularInterestsGrid from './PopularInterestsGrid';

interface InterestData {
  name: string;
  slug: string;
  description: string;
  longDescription?: string;
  category?: any;
  tours: Tour[];
  totalTours: number;
  reviews: Review[];
  relatedCategories: any[];
  heroImage: string;
  highlights: string[];
  features: string[];
  stats: {
    totalTours: number;
    totalReviews: number;
    averageRating: string;
    happyCustomers: number;
  };
}

interface InterestLandingPageProps {
  interest: InterestData;
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
        href={`/${tour.slug}`}
        className="group bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 block border border-gray-200"
      >
        <div className="relative h-48 overflow-hidden">
          <Image
            src={tour.image}
            alt={tour.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          
          {tour.isFeatured && (
            <div className="absolute top-3 start-3 bg-red-500 text-white px-2 py-1 text-xs font-semibold rounded">
              Bestseller
            </div>
          )}

          <div className="absolute bottom-3 end-3 bg-white px-2 py-1 rounded shadow-lg">
            <div className="text-sm font-bold text-gray-900">
              {formatPrice(tour.discountPrice || tour.price || 0)}
            </div>
          </div>

          <button className="absolute top-3 end-3 bg-white/80 p-1.5 rounded-full text-gray-600 hover:text-red-500 hover:bg-white transition-all duration-200">
            <Heart className="w-4 h-4" />
          </button>
        </div>
        
        <div className="p-4">
          <h3 className="font-semibold text-base mb-2 group-hover:text-red-600 transition-colors duration-200 line-clamp-2">
            {tour.title}
          </h3>
          
          <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{tour.duration}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>Up to {tour.maxGroupSize || 15}</span>
            </div>
          </div>
          
          {destination && (
            <div className="flex items-center gap-1 text-sm text-gray-500 mb-3">
              <MapPin className="w-4 h-4 text-red-500" />
              <span>{destination.name}</span>
            </div>
          )}

          {tour.highlights && tour.highlights.length > 0 && (
            <div className="mb-3">
              <div className="flex flex-wrap gap-1">
                {tour.highlights.slice(0, 2).map((highlight, i) => (
                  <span 
                    key={i}
                    className="px-2 py-1 bg-green-50 text-green-700 rounded text-xs"
                  >
                    {highlight.length > 15 ? highlight.substring(0, 15) + '...' : highlight}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              {tour.originalPrice && tour.originalPrice > (tour.discountPrice || tour.price || 0) && (
                <span className="text-sm text-gray-500 line-through">
                  {formatPrice(tour.originalPrice)}
                </span>
              )}
              <div className="text-lg font-bold text-gray-900">
                {formatPrice(tour.discountPrice || tour.price || 0)}
              </div>
            </div>
            <div className="text-xs text-gray-500">per person</div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

const SearchAndFilter = ({
  searchQuery,
  setSearchQuery,
  sortBy,
  setSortBy,
  selectedDuration,
  setSelectedDuration,
  priceRange,
  setPriceRange
}: {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  selectedDuration: string;
  setSelectedDuration: (duration: string) => void;
  priceRange: string;
  setPriceRange: (range: string) => void;
}) => (
  <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-gray-200">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute start-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search experiences..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full ps-10 pe-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
        />
      </div>

      {/* Duration Filter */}
      <select
        value={selectedDuration}
        onChange={(e) => setSelectedDuration(e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white"
      >
        <option value="">All Durations</option>
        <option value="1 Day">1 Day</option>
        <option value="2 Days">2 Days</option>
        <option value="3 Days">3+ Days</option>
      </select>

      {/* Price Filter */}
      <select
        value={priceRange}
        onChange={(e) => setPriceRange(e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white"
      >
        <option value="">All Prices</option>
        <option value="0-100">$0 - $100</option>
        <option value="100-300">$100 - $300</option>
        <option value="300+">$300+</option>
      </select>

      {/* Sort Dropdown */}
      <select
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white"
      >
        <option value="recommended">Recommended</option>
        <option value="price_low">Price: Low to High</option>
        <option value="price_high">Price: High to Low</option>
        <option value="duration">Duration</option>
        <option value="newest">Newest</option>
      </select>
    </div>
  </div>
);

const StatsSection = ({ interest }: { interest: InterestData }) => {
  // Calculate stats from available data
  const totalTours = interest.tours?.length || interest.totalTours || 0;
  const totalReviews = interest.reviews?.length || 0;

  // Calculate average rating from tours
  let averageRating = '4.9';
  if (interest.tours && interest.tours.length > 0) {
    const toursWithRatings = interest.tours.filter(t => t.rating);
    if (toursWithRatings.length > 0) {
      const sum = toursWithRatings.reduce((acc, t) => acc + (t.rating || 0), 0);
      averageRating = (sum / toursWithRatings.length).toFixed(1);
    }
  }

  // Calculate happy customers from bookings
  let happyCustomers = '10K+';
  if (interest.tours && interest.tours.length > 0) {
    const totalBookings = interest.tours.reduce((acc, t) => acc + ((t as any).bookings || 0), 0);
    if (totalBookings > 0) {
      if (totalBookings >= 1000) {
        happyCustomers = `${Math.floor(totalBookings / 1000)}K+`;
      } else {
        happyCustomers = totalBookings.toString();
      }
    }
  }

  // Don't show section if no meaningful data
  if (totalTours === 0) return null;

  return (
    <section className="py-12 bg-white">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-red-50 to-white p-6 rounded-xl text-center border border-red-100">
            <div className="text-3xl font-bold text-red-600 mb-2">
              {totalTours}
            </div>
            <div className="text-gray-600 font-medium">Tours Available</div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-xl text-center border border-blue-100">
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {totalReviews}
            </div>
            <div className="text-gray-600 font-medium">Customer Reviews</div>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-white p-6 rounded-xl text-center border border-yellow-100">
            <div className="text-3xl font-bold text-yellow-600 mb-2">
              {averageRating}
            </div>
            <div className="text-gray-600 font-medium">Average Rating</div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-white p-6 rounded-xl text-center border border-green-100">
            <div className="text-3xl font-bold text-green-600 mb-2">
              {happyCustomers}
            </div>
            <div className="text-gray-600 font-medium">Happy Customers</div>
          </div>
        </div>
      </div>
    </section>
  );
};

const AboutSection = ({ interest }: { interest: InterestData }) => {
  // Get data from category if available
  const highlights = interest.highlights || interest.category?.highlights || [];
  const features = interest.features || interest.category?.features || [];
  const longDesc = interest.category?.longDescription || interest.longDescription;

  return (
    <section className="py-12 bg-gray-50">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl font-bold text-gray-900 mb-6"
          >
            About {interest.name}
          </motion.h2>

          <div className="prose prose-lg max-w-none">
            {longDesc && (
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-gray-600 leading-relaxed mb-6"
              >
                {longDesc}
              </motion.p>
            )}

            {highlights && highlights.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6"
              >
                <h3 className="text-xl font-semibold text-gray-900 mb-4">What Makes This Special</h3>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {highlights.map((highlight, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{highlight}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}

            {features && features.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6"
              >
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Key Features</h3>
                <ul className="space-y-3">
                  {features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <TrendingUp className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
          >
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Essential Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-red-500" />
                  <span className="text-gray-700">Flexible durations available</span>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-red-500" />
                  <span className="text-gray-700">Small to large groups</span>
                </div>
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-red-500" />
                  <span className="text-gray-700">Fully insured experiences</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Camera className="w-5 h-5 text-red-500" />
                  <span className="text-gray-700">Photo opportunities included</span>
                </div>
                <div className="flex items-center gap-3">
                  <Award className="w-5 h-5 text-red-500" />
                  <span className="text-gray-700">Expert local guides</span>
                </div>
                <div className="flex items-center gap-3">
                  <Navigation className="w-5 h-5 text-red-500" />
                  <span className="text-gray-700">Easy meeting points</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
      </div>
    </section>
  );
};

const ReviewsSection = ({ reviews }: { reviews: Review[] }) => {
  if (!reviews || reviews.length === 0) {
    return null;
  }

  return (
    <section className="py-12 bg-gray-50">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">Customer Reviews</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reviews.slice(0, 6).map((review) => (
            <div
              key={review._id}
              className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
            >
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  {review.userName ? review.userName.charAt(0).toUpperCase() : 'A'}
                </div>
                <div className="ms-3">
                  <h4 className="font-semibold text-gray-900">{review.userName || 'Anonymous'}</h4>
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <p className="text-gray-600 text-sm leading-relaxed line-clamp-4">
                {review.comment}
              </p>

              <div className="text-xs text-gray-500 mt-3">
                {new Date(review.createdAt || review.date || '').toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default function InterestLandingPage({ interest }: InterestLandingPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recommended');
  const [selectedDuration, setSelectedDuration] = useState('');
  const [priceRange, setPriceRange] = useState('');

  const availableTours = interest.tours || [];

  // Filter and sort tours
  const filteredAndSortedTours = React.useMemo(() => {
    let filtered = availableTours.filter(tour => {
      // Search filter
      if (searchQuery && !tour.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !tour.description?.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Duration filter
      if (selectedDuration && !tour.duration.includes(selectedDuration.split(' ')[0])) {
        return false;
      }

      // Price filter
      if (priceRange) {
        const price = tour.discountPrice || tour.price || 0;
        if (priceRange === '0-100' && price > 100) return false;
        if (priceRange === '100-300' && (price < 100 || price > 300)) return false;
        if (priceRange === '300+' && price < 300) return false;
      }

      return true;
    });

    // Sort tours
    switch (sortBy) {
      case 'price_low':
        filtered.sort((a, b) => (a.discountPrice || a.price || 0) - (b.discountPrice || b.price || 0));
        break;
      case 'price_high':
        filtered.sort((a, b) => (b.discountPrice || b.price || 0) - (a.discountPrice || a.price || 0));
        break;
      case 'duration':
        filtered.sort((a, b) => a.duration.localeCompare(b.duration));
        break;
      case 'newest':
        filtered.sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
        break;
      default: // recommended
        filtered.sort((a, b) => {
          if (a.isFeatured && !b.isFeatured) return -1;
          if (!a.isFeatured && b.isFeatured) return 1;
          return 0;
        });
    }

    return filtered;
  }, [availableTours, searchQuery, sortBy, selectedDuration, priceRange]);

  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative h-[400px] md:h-[500px] overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src={interest.heroImage}
            alt={interest.name}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/60" />
        </div>

        <div className="relative z-10 h-full flex items-center justify-center">
          <div className="container mx-auto px-6">
            <div className="text-white text-center max-w-4xl mx-auto">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-4xl md:text-6xl font-bold mb-4"
              >
                {interest.name}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto"
              >
                {interest.description}
              </motion.p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <StatsSection interest={interest} />

      {/* Tours Section */}
      <section className="py-12">
        <div className="container mx-auto px-6">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Things to do in {interest.name}
            </h2>
            <p className="text-gray-600">
              {filteredAndSortedTours.length} experience{filteredAndSortedTours.length !== 1 ? 's' : ''} found
            </p>
          </div>

          {/* Search and Filter */}
          <SearchAndFilter
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            sortBy={sortBy}
            setSortBy={setSortBy}
            selectedDuration={selectedDuration}
            setSelectedDuration={setSelectedDuration}
            priceRange={priceRange}
            setPriceRange={setPriceRange}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredAndSortedTours.map((tour, index) => (
              <TourCard key={tour._id} tour={tour} index={index} />
            ))}
          </div>

          {filteredAndSortedTours.length === 0 && searchQuery && (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No experiences found matching your criteria.</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedDuration('');
                  setPriceRange('');
                }}
                className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Clear all filters
              </button>
            </div>
          )}

          {availableTours.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No experiences available at the moment.</p>
            </div>
          )}
        </div>
      </section>

      {/* About Section */}
      <AboutSection interest={interest} />

      {/* Reviews Section */}
      {interest.reviews && interest.reviews.length > 0 && (
        <ReviewsSection reviews={interest.reviews} />
      )}

      {/* Related Interests Component */}
      <RelatedInterests 
        currentSlug={interest.slug}
        limit={6}
        title="More Experiences You'll Love"
        subtitle="Explore other amazing categories and attractions"
      />

      {/* Popular Interests Grid Component */}
      <PopularInterestsGrid 
        limit={8}
        showFeaturedOnly={false}
        title="Popular Categories in Egypt"
        subtitle="Browse the most sought-after experiences"
        columns={4}
      />

      {/* CTA Section */}
      <section className="py-16 bg-red-600 text-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to explore {interest.name}?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Book your perfect experience today and create unforgettable memories
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/tours"
              className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-white text-red-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
            >
              Browse All Experiences
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 px-8 py-3 border-2 border-white text-white font-semibold rounded-lg hover:bg-white hover:text-red-600 transition-colors"
            >
              Get Help Planning
              <MessageCircle className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}