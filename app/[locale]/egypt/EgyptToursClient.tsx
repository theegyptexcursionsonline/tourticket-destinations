// app/egypt/EgyptToursClient.tsx
'use client';

import React, { useState } from 'react';
import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { ArrowRight, Star, ShoppingCart, Clock, Users, ImageIcon } from 'lucide-react';
import BookingSidebar from '@/components/BookingSidebar';
import { Tour } from '@/types';
import { useSettings } from '@/hooks/useSettings';

interface EgyptToursClientProps {
  tours: Tour[];
}

// Safe Image Component
const SafeImage = ({
  src,
  alt,
  className
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
}) => {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  if (!src || src.trim() === '' || imageError) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 ${className}`}
        role="img"
        aria-label="No image available"
      >
        <ImageIcon size={48} className="text-gray-400 mb-3" />
        <span className="text-gray-500 text-sm font-medium">Image unavailable</span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div
          className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse rounded-t-2xl"
          aria-hidden
        />
      )}
      <Image
        src={src}
        alt={alt}
        fill
        className={className}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setImageError(true);
          setIsLoading(false);
        }}
        priority={false}
        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
      />
    </div>
  );
};

// Helper functions
const formatBookings = (num?: number) => {
  if (!num) return '0';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}m`;
  if (num >= 1000) return `${Math.floor(num / 1000)}k`;
  return num.toString();
};

const getTagColor = (tag: string) => {
  if (tag.includes('%')) return 'bg-red-500 text-white';
  if (tag === 'Staff favourite') return 'bg-indigo-500 text-white';
  if (tag === 'Online only deal') return 'bg-emerald-500 text-white';
  if (tag === 'New') return 'bg-purple-500 text-white';
  if (tag === 'Best for Kids') return 'bg-yellow-400 text-black';
  return 'bg-white/95 text-gray-800';
};

// Simplified Tour Card Component
const SimpleTourCard = ({ tour, onAddToCartClick }: { tour: Tour; onAddToCartClick: (tour: Tour) => void }) => {
  const { formatPrice } = useSettings();

  return (
    <Link
      href={`/tour/${tour.slug || '#'}`}
      className="block w-full bg-white rounded-2xl overflow-hidden border border-gray-200 transform transition-all duration-300 hover:-translate-y-1 group focus:outline-none"
      style={{ boxShadow: 'none' }}
      aria-label={`Open tour ${tour.title || 'tour'}`}
    >
      <div className="relative h-56">
        <SafeImage
          src={tour.image}
          alt={tour.title || 'Tour image'}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />

        {/* Provider Badge */}
        <div className="absolute top-4 start-4 z-20">
          <span className="px-3 py-1.5 text-xs font-bold text-white bg-slate-900/80 backdrop-blur-sm rounded-full">
            Egypt Excursions Online
          </span>
        </div>

        {/* Tags */}
        {tour.tags && tour.tags.length > 0 && (
          <div className="absolute top-14 start-4 flex flex-wrap gap-2 z-20">
            {tour.tags.slice(0, 2).map((tag, i) => (
              <span
                key={i}
                className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wide rounded-full backdrop-blur-sm ${getTagColor(tag)}`}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Rating Badge */}
        <div className="absolute top-4 end-4 z-20">
          <div className="bg-white/95 backdrop-blur-sm px-3 py-2 rounded-full flex items-center gap-2 border border-white/20">
            <Star size={16} className="text-yellow-500 fill-yellow-500" />
            <span className="text-sm font-bold text-gray-800">
              {tour.rating ? tour.rating.toFixed(1) : '0.0'}
            </span>
          </div>
        </div>

        {/* Price Badge */}
        <div className="absolute start-4 bottom-4 z-20">
          <div className="bg-gradient-to-r from-amber-500 to-amber-400 text-black px-3 py-2 rounded-full font-black text-sm sm:text-base border-2 border-white/20">
            {formatPrice(tour.discountPrice || tour.originalPrice || 0)}
            {tour.originalPrice && tour.discountPrice && tour.originalPrice > tour.discountPrice && (
              <span className="ms-2 text-xs font-medium line-through opacity-70">
                {formatPrice(tour.originalPrice)}
              </span>
            )}
          </div>
        </div>

        {/* Add to Cart Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onAddToCartClick(tour);
          }}
          className="absolute bottom-4 end-4 z-30 bg-white text-amber-600 p-3 rounded-full border-2 border-amber-100 transition-all duration-300 transform hover:scale-110 hover:bg-amber-600 hover:text-white hover:border-amber-600 focus:outline-none"
          aria-label={`Add ${tour.title || 'tour'} to cart`}
          title="Add to cart"
        >
          <ShoppingCart size={18} className="transition-transform duration-300 group-hover:scale-110" />
        </button>
      </div>

      {/* Card Content */}
      <div className="p-5 bg-white">
        <div className="mb-3">
          <h3 className="text-lg font-bold text-gray-900 leading-tight mb-2 line-clamp-2 group-hover:text-amber-600 transition-colors duration-300">
            {tour.title || 'Untitled Tour'}
          </h3>

          <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
            {tour.description || 'A beautifully curated experience — enjoy local highlights, guided commentary, and flexible booking.'}
          </p>
        </div>

        <div className="flex items-center gap-4 mb-3 text-sm text-gray-500">
          <div className="flex items-center gap-1.5">
            <Clock size={14} className="text-gray-400" />
            <span className="font-medium">{tour.duration || 'Duration not specified'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users size={14} className="text-gray-400" />
            <span className="font-medium">{formatBookings(tour.bookings)} booked</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="text-start">
            <div className="text-xs text-gray-500 mb-0.5">Starting from</div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black text-gray-900">
                {formatPrice(tour.discountPrice || tour.originalPrice || 0)}
              </span>
              {tour.originalPrice && tour.discountPrice && tour.originalPrice > tour.discountPrice && (
                <span className="text-xs text-gray-400 line-through">
                  {formatPrice(tour.originalPrice)}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span className="text-xs text-gray-500 hidden sm:inline">View</span>
            <ArrowRight size={14} className="text-amber-600 transition-transform duration-300 group-hover:translate-x-1" />
          </div>
        </div>
      </div>
    </Link>
  );
};

export default function EgyptToursClient({ tours }: EgyptToursClientProps) {
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null);
  const [isBookingSidebarOpen, setBookingSidebarOpen] = useState(false);

  const handleAddToCartClick = (tour: Tour) => {
    setSelectedTour(tour);
    setBookingSidebarOpen(true);
  };

  const closeSidebar = () => {
    setBookingSidebarOpen(false);
    setTimeout(() => setSelectedTour(null), 300);
  };

  return (
    <>
      {tours.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {tours.map((tour) => (
              <SimpleTourCard
                key={tour._id}
                tour={tour}
                onAddToCartClick={handleAddToCartClick}
              />
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              href="/tours"
              className="inline-flex items-center gap-3 px-10 py-4 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-black font-semibold hover:scale-[1.02] transition-all duration-300"
            >
              <span>View All Tours</span>
              <ArrowRight size={18} />
            </Link>
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500">No tours available at the moment. Please check back soon!</p>
        </div>
      )}

      {/* Booking Sidebar */}
      {selectedTour && (
        <BookingSidebar
          isOpen={isBookingSidebarOpen}
          onClose={closeSidebar}
          tour={selectedTour as any}
        />
      )}

      <style jsx global>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </>
  );
}
