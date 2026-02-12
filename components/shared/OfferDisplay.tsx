// components/shared/OfferDisplay.tsx
/**
 * OfferDisplay Component
 * 
 * Displays special offer information on tour detail pages.
 * Shows: original price (strikethrough), discounted price, offer name, 
 * offer description, and urgency indicator.
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Tag, Timer, Sparkles, Users, Clock, Gift, 
  CheckCircle, Percent, DollarSign
} from 'lucide-react';
import { 
  type OfferData, 
  type DiscountResult,
  getOfferDisplayText,
  getOfferBadgeColor,
  formatOfferTimeRemaining,
  shouldShowUrgency
} from '@/lib/utils/offerCalculations';

interface OfferDisplayProps {
  offer: OfferData;
  discountResult?: DiscountResult;
  originalPrice: number;
  formatPrice: (price: number) => string;
  variant?: 'badge' | 'card' | 'inline' | 'full';
  className?: string;
}

// Get icon for offer type
function getOfferIcon(type: string) {
  switch (type) {
    case 'percentage':
      return Percent;
    case 'fixed':
      return DollarSign;
    case 'early_bird':
      return Clock;
    case 'last_minute':
      return Timer;
    case 'group':
      return Users;
    case 'bundle':
      return Gift;
    case 'promo_code':
      return Tag;
    default:
      return Sparkles;
  }
}

// Badge variant - small badge for tour cards
export function OfferBadge({ 
  offer, 
  className = '' 
}: { 
  offer: OfferData; 
  className?: string;
}) {
  const { bg, text } = getOfferBadgeColor(offer.type);
  const Icon = getOfferIcon(offer.type);
  const displayText = getOfferDisplayText(offer);
  
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`${bg} ${text} px-3 py-1.5 text-xs font-bold rounded-full shadow-lg flex items-center gap-1.5 ${className}`}
    >
      <Icon size={12} />
      {displayText}
    </motion.div>
  );
}

// Urgency indicator
export function OfferUrgency({ 
  endDate, 
  className = '' 
}: { 
  endDate: Date | string; 
  className?: string;
}) {
  const showUrgency = shouldShowUrgency(endDate);
  const timeRemaining = formatOfferTimeRemaining(endDate);
  
  if (!showUrgency) return null;
  
  return (
    <div className={`flex items-center gap-1.5 text-amber-600 ${className}`}>
      <Timer size={14} className="animate-pulse" />
      <span className="text-xs font-medium">{timeRemaining}</span>
    </div>
  );
}

// Price display with discount
export function OfferPrice({
  originalPrice,
  discountedPrice,
  discountPercentage,
  formatPrice,
  className = ''
}: {
  originalPrice: number;
  discountedPrice: number;
  discountPercentage: number;
  formatPrice: (price: number) => string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col ${className}`}>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-slate-900">
          {formatPrice(discountedPrice)}
        </span>
        {originalPrice > discountedPrice && (
          <>
            <span className="text-lg text-slate-400 line-through">
              {formatPrice(originalPrice)}
            </span>
            <span className="px-2 py-0.5 bg-rose-100 text-rose-600 text-xs font-bold rounded-full">
              -{discountPercentage}%
            </span>
          </>
        )}
      </div>
    </div>
  );
}

// Full offer card for tour detail page
export function OfferCard({
  offer,
  discountResult,
  originalPrice,
  formatPrice,
  className = ''
}: OfferDisplayProps) {
  const { bg } = getOfferBadgeColor(offer.type);
  const Icon = getOfferIcon(offer.type);
  const displayText = getOfferDisplayText(offer);
  const timeRemaining = formatOfferTimeRemaining(offer.endDate);
  const showUrgency = shouldShowUrgency(offer.endDate);
  
  const discountedPrice = discountResult?.discountedPrice ?? originalPrice;
  const _discountPercentage = discountResult?.discountPercentage ?? 0;
  const discountAmount = discountResult?.discountAmount ?? 0;
  const isApplicable = discountResult?.isApplicable ?? false;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className={`${bg} px-4 py-2 flex items-center justify-between`}>
        <div className="flex items-center gap-2 text-white">
          <Icon size={18} />
          <span className="font-bold">{displayText}</span>
        </div>
        {showUrgency && (
          <div className="flex items-center gap-1 text-white/90 text-sm">
            <Timer size={14} className="animate-pulse" />
            {timeRemaining}
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="p-4">
        <h4 className="text-lg font-bold text-slate-800 mb-1">{offer.name}</h4>
        {offer.description && (
          <p className="text-sm text-slate-600 mb-3">{offer.description}</p>
        )}
        
        {/* Price Display */}
        {isApplicable && discountAmount > 0 && (
          <div className="flex items-center gap-4 mb-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-600">
                {formatPrice(discountedPrice)}
              </span>
              <span className="text-lg text-slate-400 line-through">
                {formatPrice(originalPrice)}
              </span>
            </div>
            <div className="px-3 py-1 bg-emerald-100 text-emerald-700 text-sm font-bold rounded-full">
              Save {formatPrice(discountAmount)}
            </div>
          </div>
        )}
        
        {/* Offer conditions */}
        <div className="space-y-2">
          {offer.type === 'early_bird' && offer.minDaysInAdvance && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <CheckCircle size={14} className="text-emerald-500" />
              Book {offer.minDaysInAdvance}+ days in advance
            </div>
          )}
          {offer.type === 'last_minute' && offer.maxDaysBeforeTour && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <CheckCircle size={14} className="text-emerald-500" />
              Book within {offer.maxDaysBeforeTour} days of tour
            </div>
          )}
          {offer.type === 'group' && offer.minGroupSize && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <CheckCircle size={14} className="text-emerald-500" />
              Group of {offer.minGroupSize}+ people
            </div>
          )}
          {offer.minBookingValue && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <CheckCircle size={14} className="text-emerald-500" />
              Min. booking: {formatPrice(offer.minBookingValue)}
            </div>
          )}
          {offer.code && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Tag size={14} className="text-blue-500" />
              Use code: <code className="px-2 py-0.5 bg-slate-100 rounded font-mono font-bold">{offer.code}</code>
            </div>
          )}
        </div>
        
        {/* End date */}
        <div className="mt-3 pt-3 border-t border-amber-200/50 text-xs text-slate-500">
          Offer valid until {new Date(offer.endDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })}
        </div>
      </div>
    </motion.div>
  );
}

// Inline offer display (for booking sidebar)
export function OfferInline({
  offer,
  discountResult,
  originalPrice: _originalPrice,
  formatPrice,
  className = ''
}: OfferDisplayProps) {
  const { bg, text } = getOfferBadgeColor(offer.type);
  const displayText = getOfferDisplayText(offer);
  const discountAmount = discountResult?.discountAmount ?? 0;
  const isApplicable = discountResult?.isApplicable ?? false;
  const reason = discountResult?.reason;
  
  return (
    <div className={`flex items-center justify-between p-3 rounded-xl border ${
      isApplicable 
        ? 'border-emerald-200 bg-emerald-50' 
        : 'border-slate-200 bg-slate-50'
    } ${className}`}>
      <div className="flex items-center gap-3">
        <div className={`${bg} ${text} px-2 py-1 text-xs font-bold rounded-full`}>
          {displayText}
        </div>
        <div>
          <p className="text-sm font-medium text-slate-700">{offer.name}</p>
          {!isApplicable && reason && (
            <p className="text-xs text-slate-500">{reason}</p>
          )}
        </div>
      </div>
      {isApplicable && discountAmount > 0 && (
        <div className="text-emerald-600 font-bold">
          -{formatPrice(discountAmount)}
        </div>
      )}
    </div>
  );
}

// Main export component
const OfferDisplay: React.FC<OfferDisplayProps> = ({
  offer,
  discountResult,
  originalPrice,
  formatPrice,
  variant = 'card',
  className = ''
}) => {
  switch (variant) {
    case 'badge':
      return <OfferBadge offer={offer} className={className} />;
    case 'inline':
      return (
        <OfferInline 
          offer={offer} 
          discountResult={discountResult}
          originalPrice={originalPrice}
          formatPrice={formatPrice}
          className={className} 
        />
      );
    case 'full':
    case 'card':
    default:
      return (
        <OfferCard 
          offer={offer} 
          discountResult={discountResult}
          originalPrice={originalPrice}
          formatPrice={formatPrice}
          className={className} 
        />
      );
  }
};

export default OfferDisplay;

