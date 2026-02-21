'use client';

import React, { useState } from 'react';
import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  Star, Clock, Users, MapPin, Heart, ShoppingCart, ArrowRight,
  Languages, Award, Zap, Mountain,
  Smartphone, CheckCircle, Tag, Sparkles, Timer
} from 'lucide-react';
import { Tour } from '@/types';
import { useSettings } from '@/hooks/useSettings';
import { useTranslations } from 'next-intl';
import { useWishlist } from '@/contexts/WishlistContext';
import { useCart } from '@/hooks/useCart';
import { useTenant } from '@/contexts/TenantContext';
import toast from 'react-hot-toast';
import { toDateOnlyString } from '@/utils/date';

// Offer badge data interface
export interface OfferBadgeData {
  _id: string;
  name: string;
  type: string;
  discountValue: number;
  displayText: string;
  badgeColor: { bg: string; text: string };
  isFeatured: boolean;
  featuredBadgeText?: string;
  timeRemaining?: string;
  showUrgency?: boolean;
  endDate?: string;
}

interface TourCardProps {
  tour: Tour;
  index?: number;
  variant?: 'default' | 'compact' | 'featured';
  showQuickAdd?: boolean;
  className?: string;
  onAddToCartClick?: (tour: Tour) => void;
  // New: Special offer data
  offerBadge?: OfferBadgeData;
  hasOffer?: boolean;
}

const TourCard: React.FC<TourCardProps> = ({
  tour,
  index = 0,
  showQuickAdd = true,
  className = '',
  onAddToCartClick,
  offerBadge,
  hasOffer = false
}) => {
  const { formatPrice } = useSettings();
  const t = useTranslations();
  const { addToWishlist, removeFromWishlist, isWishlisted } = useWishlist();
  const { addToCart } = useCart();
  const { tenant: _tenant } = useTenant();
  const [isHovered, setIsHovered] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  
  // Calculate if there's a discount to show (from offer or original price)
  const showOfferBadge = hasOffer && offerBadge;

  const destination = typeof tour.destination === 'object' ? tour.destination : null;

  // Handle category as array or single object
  let categories: any[] = [];
  if (Array.isArray(tour.category)) {
    categories = tour.category.filter(cat => typeof cat === 'object');
  } else if (typeof tour.category === 'object' && tour.category) {
    categories = [tour.category];
  }

  const tourIsWishlisted = isWishlisted(tour._id);

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (tourIsWishlisted) {
      removeFromWishlist(tour._id);
      toast.success(t('tourCard.removedFromWishlist'));
    } else {
      addToWishlist(tour);
      toast.success(t('tourCard.addedToWishlist'));
    }
  };

  const handleQuickAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // If onAddToCartClick is provided, use it to open booking sidebar
    if (onAddToCartClick) {
      onAddToCartClick(tour);
      return;
    }

    // Otherwise, use the default quick add to cart behavior
    if (isAdding) return;
    setIsAdding(true);

    try {
      const quickAddCartItem = {
        ...tour,
        uniqueId: `${tour._id}-quick-add-${Date.now()}`,
        quantity: 1,
        childQuantity: 0,
        infantQuantity: 0,
        selectedDate: toDateOnlyString(new Date()),
        selectedTime: 'Anytime',
        selectedAddOns: {},
        totalPrice: tour.discountPrice,
      };

      addToCart(quickAddCartItem);
      toast.success(t('tourCard.addedToCart'));
    } catch {
      toast.error(t('tourCard.failedToAdd'));
    } finally {
      setIsAdding(false);
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { delay: index * 0.1, duration: 0.5 }
    }
  };

  const imageVariants = {
    hover: { scale: 1.1 },
    initial: { scale: 1 }
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className={`group ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link href={`/${tour.slug}`} className="block">
        <div className="bg-white rounded-2xl overflow-hidden transition-all duration-500 sm:hover:-translate-y-2 border border-slate-100">
          {/* Image Section */}
          <div className="relative h-56 overflow-hidden">
            <motion.div
              variants={imageVariants}
              animate={isHovered ? "hover" : "initial"}
              transition={{ duration: 0.5 }}
              className="w-full h-full"
            >
              <Image
                src={tour.image}
                alt={tour.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            </motion.div>
            
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            
            {/* Top Badges */}
            <div className="absolute top-4 start-4 flex flex-col gap-2">
              {/* Special Offer Badge - Priority Display */}
              {showOfferBadge && offerBadge && (
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={`${offerBadge.badgeColor.bg} ${offerBadge.badgeColor.text} px-3 py-1.5 text-xs font-bold rounded-full shadow-lg flex items-center gap-1.5`}
                >
                  {offerBadge.type === 'percentage' || offerBadge.type === 'early_bird' || offerBadge.type === 'last_minute' ? (
                    <Tag size={12} />
                  ) : offerBadge.type === 'group' ? (
                    <Users size={12} />
                  ) : (
                    <Sparkles size={12} />
                  )}
                  {offerBadge.displayText}
                </motion.div>
              )}
              
              {/* Urgency Indicator */}
              {showOfferBadge && offerBadge?.showUrgency && offerBadge.timeRemaining && (
                <div className="bg-black/70 backdrop-blur-sm text-amber-400 px-2 py-1 text-[10px] font-medium rounded-full flex items-center gap-1">
                  <Timer size={10} className="animate-pulse" />
                  {offerBadge.timeRemaining}
                </div>
              )}
              
              {tour.isFeatured && !showOfferBadge && (
                <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-3 py-1 text-xs font-bold rounded-full shadow-lg flex items-center gap-1">
                  <Award size={12} />
                  {t('tourCard.featured')}
                </div>
              )}
              
              {!showOfferBadge && tour.tags && tour.tags.slice(0, 1).map((tag, i) => {
                const isDeal = tag.includes('%') || tag.toLowerCase().includes('deal') || tag.toLowerCase().includes('discount');
                return (
                  <div key={i} className={`px-3 py-1 text-xs font-semibold rounded-full shadow-lg ${
                    isDeal
                      ? 'text-white'
                      : tag.toLowerCase().includes('bestseller') || tag.toLowerCase().includes('popular')
                      ? 'bg-green-600 text-white'
                      : 'bg-blue-600 text-white'
                  }`}
                  style={isDeal ? { backgroundColor: 'var(--primary-color)' } : undefined}>
                    {tag}
                  </div>
                );
              })}
            </div>

            {/* Top Right Actions */}
            <div className="absolute top-4 end-4 flex flex-col gap-2">
              <button
                onClick={handleWishlistToggle}
                className={`p-2 rounded-full backdrop-blur-sm transition-all duration-200 ${
                  tourIsWishlisted
                    ? 'text-white shadow-lg'
                    : 'bg-white/90 text-slate-600 hover:bg-[var(--primary-hover)] hover:text-white'
                }`}
                style={tourIsWishlisted ? { backgroundColor: 'var(--primary-color)' } : undefined}
                aria-label={tourIsWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                <Heart size={16} fill={tourIsWishlisted ? 'currentColor' : 'none'} />
              </button>

              {showQuickAdd && (
                <motion.button
                  onClick={handleQuickAdd}
                  disabled={isAdding}
                  className="p-2 bg-white/90 backdrop-blur-sm rounded-full text-slate-600 hover:bg-green-600 hover:text-white transition-all duration-200 opacity-0 group-hover:opacity-100"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  aria-label="Quick add to cart"
                >
                  {isAdding ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ShoppingCart size={16} />
                  )}
                </motion.button>
              )}
            </div>

            {/* Bottom Right Rating & Price */}
            <div className="absolute bottom-4 end-4 flex flex-col items-end gap-2">
              <div className="bg-white/95 backdrop-blur-sm text-slate-900 px-3 py-1 text-sm rounded-full flex items-center gap-1 shadow-lg">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                {tour.rating?.toFixed(1) || '4.5'}
              </div>

              <div className="bg-white/95 backdrop-blur-sm px-3 py-2 rounded-xl shadow-lg text-end">
                <div className="text-lg font-bold text-slate-900">
                  {formatPrice(tour.discountPrice)}
                </div>
                {tour.originalPrice && tour.originalPrice > tour.discountPrice && (
                  <div className="text-xs text-slate-500 line-through">
                    {formatPrice(tour.originalPrice)}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Left Quick Info */}
            <div className="absolute bottom-4 start-4">
              <div className="bg-black/50 backdrop-blur-sm text-white px-3 py-1 text-sm rounded-full">
                <Clock className="w-3 h-3 inline me-1" />
                {tour.duration}
              </div>
            </div>
          </div>
          
          {/* Content Section */}
          <div className="p-6">
            <div className="mb-4">
              <h3 className="font-bold text-lg text-slate-900 group-hover:text-[var(--primary-color)] transition-colors duration-200 line-clamp-2 leading-tight mb-2">
                {tour.title}
              </h3>
              
              {/* Location & Category */}
              <div className="flex items-center gap-4 text-sm text-slate-500 mb-3">
                {destination && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" style={{ color: 'var(--primary-color)' }} />
                    <span>{destination.name}</span>
                  </div>
                )}
                {categories.length > 0 && (
                  <div className="flex items-center gap-1">
                    <Zap className="w-4 h-4 text-blue-500" />
                    <span>{categories.map(cat => cat.name).join(', ')}</span>
                  </div>
                )}
              </div>
              
              {/* Description */}
              <p className="text-slate-600 text-sm line-clamp-2 leading-relaxed">
                {tour.description}
              </p>
            </div>
            
            {/* Tour Details */}
            <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{t('tourCard.max')} {tour.maxGroupSize || 15}</span>
              </div>
              
              {tour.difficulty && (
                <div className="flex items-center gap-1">
                  <Mountain className="w-4 h-4" />
                  <span>{tour.difficulty}</span>
                </div>
              )}
              
              {tour.languages && tour.languages.length > 0 && (
                <div className="flex items-center gap-1">
                  <Languages className="w-4 h-4" />
                  <span>{tour.languages[0]}</span>
                </div>
              )}
            </div>
            
            {/* Highlights */}
            {tour.highlights && tour.highlights.length > 0 && (
              <div className="mb-4">
                <div className="flex flex-wrap gap-2">
                  {tour.highlights.slice(0, 3).map((highlight, i) => (
                    <span 
                      key={i}
                      className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium"
                    >
                      {highlight.length > 25 ? highlight.substring(0, 25) + '...' : highlight}
                    </span>
                  ))}
                  {tour.highlights.length > 3 && (
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">
                      +{tour.highlights.length - 3} {t('tourCard.more')}
                    </span>
                  )}
                </div>
              </div>
            )}
            
            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span>{t('tourCard.freeCancellation')}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <Smartphone className="w-3 h-3 text-blue-500" />
                  <span>{t('tourCard.mobileTicket')}</span>
                </div>
              </div>
              
              <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                <ArrowRight className="w-5 h-5" style={{ color: 'var(--primary-color)' }} />
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default TourCard;