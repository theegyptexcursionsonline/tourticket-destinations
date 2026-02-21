'use client';

import React from 'react';
import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { Tour } from '@/types';
import { useSettings } from '@/hooks/useSettings';
import { useWishlist } from '@/contexts/WishlistContext';
import { Star, Clock, Trash2, Heart } from 'lucide-react';
import toast from 'react-hot-toast';

interface TourCardProps {
  tour: Tour;
  onRemove?: (tourId: string) => void;
}

// Generic TourCard for general listings (e.g., search results)
const TourCard: React.FC<{ tour: Tour }> = ({ tour }) => {
  const { formatPrice } = useSettings();
  const { addToWishlist, wishlist } = useWishlist();
  const isInWishlist = wishlist.some(item => item._id === tour._id);

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToWishlist(tour);
    toast.success(isInWishlist ? `${tour.title} removed from favorites.` : `${tour.title} added to favorites!`);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden transition-all duration-300 group">
      <Link href={`/${tour.slug}`}>
        <div className="relative w-full h-52">
          <Image
            src={tour.image}
            alt={tour.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
           <button 
            onClick={handleWishlistToggle}
            className="absolute top-3 end-3 p-2 bg-white/80 backdrop-blur-sm rounded-full text-slate-600 hover:text-red-600 hover:bg-white transition-all"
            aria-label="Add to wishlist"
            >
            <Heart size={20} className={isInWishlist ? "text-red-500 fill-current" : ""} />
          </button>
        </div>
        <div className="p-4">
          <h3 className="text-lg font-bold text-slate-900 leading-tight mb-2 line-clamp-2">
              {tour.title}
          </h3>
          <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
            <div className="flex items-center gap-1.5"><Clock size={14} /><span>{tour.duration}</span></div>
            <div className="flex items-center gap-1.5"><Star size={14} className="text-yellow-400 fill-current" /><span>{tour.rating?.toFixed(1) || 'N/A'}</span></div>
          </div>
          <div className="mt-auto flex items-center justify-between">
            <p className="text-sm text-slate-500">From</p>
            <span className="text-xl font-bold text-red-600">{formatPrice(tour.discountPrice)}</span>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default TourCard;


// Specialized UserTourCard for wishlists or user-specific areas
export const UserTourCard: React.FC<TourCardProps> = ({ tour, onRemove }) => {
  const { formatPrice } = useSettings();
  const { removeFromWishlist } = useWishlist();

  const handleRemove = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onRemove) {
      onRemove(tour._id!);
    } else {
      removeFromWishlist(tour._id!);
    }
    toast.success(`${tour.title} removed from favorites.`);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-100 overflow-hidden transition-all duration-300 group">
      <div className="flex flex-col sm:flex-row">
        <div className="relative w-full h-48 sm:w-48 sm:h-auto flex-shrink-0">
          <Link href={`/${tour.slug}`}>
            <Image
              src={tour.image}
              alt={tour.title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 192px"
            />
          </Link>
        </div>
        <div className="p-4 sm:p-5 flex flex-col flex-grow">
          <h3 className="text-lg font-semibold text-slate-900 leading-tight mb-2 line-clamp-2">
            <Link href={`/${tour.slug}`} className="hover:text-red-600 transition-colors">
              {tour.title}
            </Link>
          </h3>
          <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
            <div className="flex items-center gap-1.5"><Clock size={14} /><span>{tour.duration}</span></div>
            <div className="flex items-center gap-1.5"><Star size={14} className="text-yellow-500 fill-current" /><span>{tour.rating}</span></div>
          </div>
          <div className="mt-auto flex items-end justify-between">
            <div className="text-end">
                <span className="text-xl font-bold text-red-600">{formatPrice(tour.discountPrice)}</span>
            </div>
            <button
              onClick={handleRemove}
              className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors text-sm font-medium"
              aria-label="Remove from favorites"
            >
              <Trash2 size={14} />
              <span>Remove</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};