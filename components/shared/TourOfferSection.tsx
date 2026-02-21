// components/shared/TourOfferSection.tsx
/**
 * TourOfferSection Component
 * 
 * Displays active special offers for a tour.
 * Can be placed on the tour detail page below the price.
 */

'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Tag, Timer, Clock, Users, Gift, 
  ChevronDown, Percent
} from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';

interface Offer {
  _id: string;
  name: string;
  description?: string;
  type: string;
  discountValue: number;
  code?: string;
  minDaysInAdvance?: number;
  maxDaysBeforeTour?: number;
  minGroupSize?: number;
  minBookingValue?: number;
  startDate: string;
  endDate: string;
  isFeatured: boolean;
  featuredBadgeText?: string;
  displayText: string;
  timeRemaining: string;
  showUrgency: boolean;
  discountResult?: {
    originalPrice: number;
    discountedPrice: number;
    discountAmount: number;
    discountPercentage: number;
    isApplicable: boolean;
    reason?: string;
  };
}

interface TourOfferSectionProps {
  tourId: string;
  originalPrice: number;
  travelDate?: Date;
  groupSize?: number;
  className?: string;
  onOfferApplied?: (offer: Offer | null, discountedPrice: number) => void;
}

// Get icon for offer type
function getOfferIcon(type: string) {
  switch (type) {
    case 'percentage': return Percent;
    case 'early_bird': return Clock;
    case 'last_minute': return Timer;
    case 'group': return Users;
    case 'bundle': return Gift;
    case 'promo_code': return Tag;
    default: return Sparkles;
  }
}

// Get color classes for offer type
function getOfferColors(type: string) {
  switch (type) {
    case 'percentage': return { bg: 'bg-rose-500', text: 'text-white', light: 'bg-rose-50 border-rose-200' };
    case 'early_bird': return { bg: 'bg-emerald-500', text: 'text-white', light: 'bg-emerald-50 border-emerald-200' };
    case 'last_minute': return { bg: 'bg-red-600', text: 'text-white', light: 'bg-red-50 border-red-200' };
    case 'group': return { bg: 'bg-blue-500', text: 'text-white', light: 'bg-blue-50 border-blue-200' };
    case 'bundle': return { bg: 'bg-purple-500', text: 'text-white', light: 'bg-purple-50 border-purple-200' };
    case 'promo_code': return { bg: 'bg-slate-700', text: 'text-white', light: 'bg-slate-50 border-slate-200' };
    default: return { bg: 'bg-amber-500', text: 'text-white', light: 'bg-amber-50 border-amber-200' };
  }
}

const TourOfferSection: React.FC<TourOfferSectionProps> = ({
  tourId,
  originalPrice: _originalPrice,
  travelDate,
  groupSize = 1,
  className = '',
  onOfferApplied
}) => {
  const { formatPrice } = useSettings();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [bestOffer, setBestOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOffers = async () => {
      if (!tourId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const params = new URLSearchParams();
        if (travelDate) {
          params.set('travelDate', travelDate.toISOString());
        }
        if (groupSize > 1) {
          params.set('groupSize', groupSize.toString());
        }
        
        const response = await fetch(`/api/offers/tour/${tourId}?${params.toString()}`);
        const data = await response.json();
        
        if (data.success) {
          setOffers(data.data.offers || []);
          setBestOffer(data.data.bestOffer?.offer ? {
            ...data.data.bestOffer.offer,
            discountResult: {
              originalPrice: data.data.bestOffer.originalPrice,
              discountedPrice: data.data.bestOffer.discountedPrice,
              discountAmount: data.data.bestOffer.discountAmount,
              discountPercentage: data.data.bestOffer.discountPercentage,
              isApplicable: data.data.bestOffer.isApplicable,
            }
          } : null);
          
          // Notify parent of best offer
          if (onOfferApplied && data.data.bestOffer?.offer) {
            onOfferApplied(data.data.bestOffer.offer, data.data.bestOffer.discountedPrice);
          }
        }
      } catch (err) {
        console.error('Error fetching offers:', err);
        setError('Failed to load offers');
      } finally {
        setLoading(false);
      }
    };
    
    fetchOffers();
  }, [tourId, travelDate, groupSize]);

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-24 bg-slate-200 rounded-xl"></div>
      </div>
    );
  }

  if (error || !offers.length) {
    return null; // Don't show anything if no offers
  }

  const displayOffer = bestOffer || offers[0];
  const Icon = getOfferIcon(displayOffer.type);
  const colors = getOfferColors(displayOffer.type);
  const discountResult = displayOffer.discountResult;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border-2 ${colors.light} overflow-hidden ${className}`}
    >
      {/* Main Offer Display */}
      <div 
        className={`${colors.bg} ${colors.text} px-4 py-3 cursor-pointer`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Icon size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg">{displayOffer.displayText}</span>
                {displayOffer.isFeatured && (
                  <span className="px-2 py-0.5 bg-white/20 text-xs font-medium rounded-full">
                    {displayOffer.featuredBadgeText || 'Featured'}
                  </span>
                )}
              </div>
              <p className="text-sm opacity-90">{displayOffer.name}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {displayOffer.showUrgency && (
              <div className="flex items-center gap-1 text-sm opacity-90">
                <Timer size={14} className="animate-pulse" />
                {displayOffer.timeRemaining}
              </div>
            )}
            {offers.length > 1 && (
              <motion.div
                animate={{ rotate: expanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown size={20} />
              </motion.div>
            )}
          </div>
        </div>
      </div>
      
      {/* Price with Discount */}
      {discountResult && discountResult.isApplicable && (
        <div className="px-4 py-3 bg-white flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-600 mb-1">{displayOffer.description || 'Special offer applied'}</p>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              {displayOffer.type === 'early_bird' && displayOffer.minDaysInAdvance && (
                <span>Book {displayOffer.minDaysInAdvance}+ days ahead</span>
              )}
              {displayOffer.type === 'last_minute' && displayOffer.maxDaysBeforeTour && (
                <span>Book within {displayOffer.maxDaysBeforeTour} days</span>
              )}
              {displayOffer.type === 'group' && displayOffer.minGroupSize && (
                <span>Min. {displayOffer.minGroupSize} people</span>
              )}
              {displayOffer.minBookingValue && (
                <span>Min. {formatPrice(displayOffer.minBookingValue)}</span>
              )}
            </div>
          </div>
          
          <div className="text-end">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-600">
                {formatPrice(discountResult.discountedPrice)}
              </span>
              <span className="text-lg text-slate-400 line-through">
                {formatPrice(discountResult.originalPrice)}
              </span>
            </div>
            <div className="text-sm text-emerald-600 font-medium">
              Save {formatPrice(discountResult.discountAmount)} ({discountResult.discountPercentage}% off)
            </div>
          </div>
        </div>
      )}
      
      {/* Expanded: Show All Offers */}
      <AnimatePresence>
        {expanded && offers.length > 1 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-slate-200 bg-slate-50"
          >
            <div className="p-4 space-y-3">
              <p className="text-sm font-medium text-slate-600">More offers available:</p>
              {offers.slice(1).map((offer) => {
                const OfferIcon = getOfferIcon(offer.type);
                const offerColors = getOfferColors(offer.type);
                return (
                  <div 
                    key={offer._id}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 ${offerColors.bg} ${offerColors.text} rounded`}>
                        <OfferIcon size={14} />
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{offer.name}</p>
                        <p className="text-sm text-slate-500">{offer.displayText}</p>
                      </div>
                    </div>
                    {offer.code && (
                      <code className="px-2 py-1 bg-slate-100 text-sm font-mono rounded">
                        {offer.code}
                      </code>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Offer End Date */}
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
        Offer valid until {new Date(displayOffer.endDate).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })}
      </div>
    </motion.div>
  );
};

export default TourOfferSection;

