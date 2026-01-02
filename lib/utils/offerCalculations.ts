/**
 * OFFER CALCULATIONS UTILITY
 * 
 * This module provides functions to calculate and apply special offers to tour prices.
 * 
 * USAGE:
 * 
 * 1. Get applicable offers for a tour:
 *    const offers = await getApplicableOffers(tourId, tenantId, travelDate, groupSize);
 * 
 * 2. Calculate discounted price:
 *    const result = calculateDiscountedPrice(originalPrice, offer, travelDate, groupSize);
 * 
 * 3. Get the best offer for a tour:
 *    const best = getBestOffer(offers, originalPrice, travelDate, groupSize);
 */

export interface OfferData {
  _id: string;
  name: string;
  description?: string;
  type: 'percentage' | 'fixed' | 'bundle' | 'early_bird' | 'last_minute' | 'group' | 'promo_code';
  discountValue: number;
  code?: string;
  minDaysInAdvance?: number;
  maxDaysBeforeTour?: number;
  minBookingValue?: number;
  maxDiscount?: number;
  minGroupSize?: number;
  startDate: string | Date;
  endDate: string | Date;
  travelStartDate?: string | Date;
  travelEndDate?: string | Date;
  applicableTours?: string[];
  tourOptionSelections?: {
    tourId: string;
    selectedOptions?: string[];
    allOptions?: boolean;
  }[];
  excludedTours?: string[];
  usageLimit?: number;
  usedCount: number;
  isActive: boolean;
  isFeatured: boolean;
  featuredBadgeText?: string;
  priority: number;
  tenantId: string;
}

export interface DiscountResult {
  originalPrice: number;
  discountedPrice: number;
  discountAmount: number;
  discountPercentage: number;
  offer: OfferData;
  isApplicable: boolean;
  reason?: string;
}

/**
 * Calculate the number of days between two dates
 */
export function daysBetween(date1: Date, date2: Date): number {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round(Math.abs((date1.getTime() - date2.getTime()) / oneDay));
}

/**
 * Check if an offer is currently valid (within date range and usage limits)
 */
export function isOfferValid(offer: OfferData): boolean {
  const now = new Date();
  const startDate = new Date(offer.startDate);
  const endDate = new Date(offer.endDate);
  
  // Check if offer is active
  if (!offer.isActive) return false;
  
  // Check date validity
  if (now < startDate || now > endDate) return false;
  
  // Check usage limit
  if (offer.usageLimit && offer.usedCount >= offer.usageLimit) return false;
  
  return true;
}

/**
 * Check if an offer applies to a specific tour and option
 */
export function isOfferApplicableToTour(
  offer: OfferData,
  tourId: string,
  optionType?: string
): boolean {
  // Check if tour is excluded
  if (offer.excludedTours?.includes(tourId)) {
    return false;
  }
  
  // If no tours specified, offer applies to all tours
  if (!offer.applicableTours || offer.applicableTours.length === 0) {
    return true;
  }
  
  // Check if tour is in applicable tours
  if (!offer.applicableTours.includes(tourId)) {
    return false;
  }
  
  // Check option-level selections if provided
  if (optionType && offer.tourOptionSelections?.length) {
    const tourSelection = offer.tourOptionSelections.find(
      ts => ts.tourId === tourId
    );
    
    if (tourSelection) {
      // If allOptions is true, apply to all options
      if (tourSelection.allOptions) return true;
      
      // Otherwise, check if specific option is selected
      if (tourSelection.selectedOptions?.length) {
        return tourSelection.selectedOptions.includes(optionType);
      }
    }
  }
  
  return true;
}

/**
 * Check if offer is applicable based on travel date
 */
export function isOfferApplicableByTravelDate(
  offer: OfferData,
  travelDate?: Date
): boolean {
  if (!travelDate) return true;
  
  // Check travel date restrictions
  if (offer.travelStartDate) {
    const travelStart = new Date(offer.travelStartDate);
    if (travelDate < travelStart) return false;
  }
  
  if (offer.travelEndDate) {
    const travelEnd = new Date(offer.travelEndDate);
    if (travelDate > travelEnd) return false;
  }
  
  return true;
}

/**
 * OFFER TYPE LOGIC
 * 
 * Calculate discount based on offer type
 */
export function calculateDiscountedPrice(
  originalPrice: number,
  offer: OfferData,
  travelDate?: Date,
  groupSize: number = 1,
  bookingDate: Date = new Date()
): DiscountResult {
  const result: DiscountResult = {
    originalPrice,
    discountedPrice: originalPrice,
    discountAmount: 0,
    discountPercentage: 0,
    offer,
    isApplicable: false,
  };
  
  // Check basic validity
  if (!isOfferValid(offer)) {
    result.reason = 'Offer is not currently active';
    return result;
  }
  
  // Check travel date restrictions
  if (!isOfferApplicableByTravelDate(offer, travelDate)) {
    result.reason = 'Offer not valid for selected travel date';
    return result;
  }
  
  // Check minimum booking value
  if (offer.minBookingValue && originalPrice < offer.minBookingValue) {
    result.reason = `Minimum booking value of $${offer.minBookingValue} required`;
    return result;
  }
  
  let discountAmount = 0;
  
  switch (offer.type) {
    /**
     * PERCENTAGE DISCOUNT
     * Applies X% off the base price
     */
    case 'percentage': {
      discountAmount = originalPrice * (offer.discountValue / 100);
      result.isApplicable = true;
      break;
    }
    
    /**
     * FIXED AMOUNT
     * Subtracts a fixed amount from the price
     */
    case 'fixed': {
      discountAmount = offer.discountValue;
      result.isApplicable = true;
      break;
    }
    
    /**
     * EARLY BIRD
     * Discount for bookings made X days in advance of tour date
     * Requires travelDate to be provided
     */
    case 'early_bird': {
      if (!travelDate) {
        result.reason = 'Travel date required for early bird discount';
        return result;
      }
      
      const daysUntilTravel = daysBetween(bookingDate, travelDate);
      const minDays = offer.minDaysInAdvance || 7;
      
      if (daysUntilTravel >= minDays) {
        discountAmount = originalPrice * (offer.discountValue / 100);
        result.isApplicable = true;
      } else {
        result.reason = `Book at least ${minDays} days in advance to qualify`;
        return result;
      }
      break;
    }
    
    /**
     * LAST MINUTE
     * Discount for bookings made close to the tour date
     * Requires travelDate to be provided
     */
    case 'last_minute': {
      if (!travelDate) {
        result.reason = 'Travel date required for last minute discount';
        return result;
      }
      
      const daysUntilTravel = daysBetween(bookingDate, travelDate);
      const maxDays = offer.maxDaysBeforeTour || 2;
      
      if (daysUntilTravel <= maxDays && daysUntilTravel >= 0) {
        discountAmount = originalPrice * (offer.discountValue / 100);
        result.isApplicable = true;
      } else {
        result.reason = `Only valid when booking within ${maxDays} days of tour`;
        return result;
      }
      break;
    }
    
    /**
     * GROUP DISCOUNT
     * Discount when booking for multiple people
     */
    case 'group': {
      const minSize = offer.minGroupSize || 2;
      
      if (groupSize >= minSize) {
        discountAmount = originalPrice * (offer.discountValue / 100);
        result.isApplicable = true;
      } else {
        result.reason = `Minimum group size of ${minSize} required`;
        return result;
      }
      break;
    }
    
    /**
     * BUNDLE DEAL
     * Special pricing for tour packages
     */
    case 'bundle': {
      discountAmount = originalPrice * (offer.discountValue / 100);
      result.isApplicable = true;
      break;
    }
    
    /**
     * PROMO CODE
     * Requires code entry (handled at checkout)
     * Here we just calculate what the discount would be
     */
    case 'promo_code': {
      discountAmount = originalPrice * (offer.discountValue / 100);
      result.isApplicable = true;
      result.reason = 'Enter promo code at checkout';
      break;
    }
    
    default:
      result.reason = 'Unknown offer type';
      return result;
  }
  
  // Apply maximum discount cap if set
  if (offer.maxDiscount && discountAmount > offer.maxDiscount) {
    discountAmount = offer.maxDiscount;
  }
  
  // Ensure discount doesn't exceed original price
  if (discountAmount > originalPrice) {
    discountAmount = originalPrice;
  }
  
  result.discountAmount = Math.round(discountAmount * 100) / 100;
  result.discountedPrice = Math.round((originalPrice - discountAmount) * 100) / 100;
  result.discountPercentage = Math.round((discountAmount / originalPrice) * 100);
  
  return result;
}

/**
 * Get the best applicable offer from a list of offers
 * Returns the offer with the highest discount
 */
export function getBestOffer(
  offers: OfferData[],
  originalPrice: number,
  travelDate?: Date,
  groupSize: number = 1
): DiscountResult | null {
  if (!offers || offers.length === 0) return null;
  
  let bestResult: DiscountResult | null = null;
  
  // Sort by priority first
  const sortedOffers = [...offers].sort((a, b) => b.priority - a.priority);
  
  for (const offer of sortedOffers) {
    // Skip promo_code offers - they require explicit code entry
    if (offer.type === 'promo_code') continue;
    
    const result = calculateDiscountedPrice(
      originalPrice,
      offer,
      travelDate,
      groupSize
    );
    
    if (result.isApplicable) {
      if (!bestResult || result.discountAmount > bestResult.discountAmount) {
        bestResult = result;
      }
    }
  }
  
  return bestResult;
}

/**
 * Get display text for an offer
 */
export function getOfferDisplayText(offer: OfferData): string {
  switch (offer.type) {
    case 'percentage':
      return `${offer.discountValue}% OFF`;
    case 'fixed':
      return `$${offer.discountValue} OFF`;
    case 'early_bird':
      return `EARLY BIRD ${offer.discountValue}% OFF`;
    case 'last_minute':
      return `LAST MINUTE ${offer.discountValue}% OFF`;
    case 'group':
      return `GROUP ${offer.discountValue}% OFF`;
    case 'bundle':
      return `BUNDLE ${offer.discountValue}% OFF`;
    case 'promo_code':
      return 'USE CODE';
    default:
      return 'SPECIAL OFFER';
  }
}

/**
 * Get badge color for an offer type
 */
export function getOfferBadgeColor(type: string): { bg: string; text: string } {
  switch (type) {
    case 'percentage':
      return { bg: 'bg-rose-500', text: 'text-white' };
    case 'fixed':
      return { bg: 'bg-amber-500', text: 'text-white' };
    case 'early_bird':
      return { bg: 'bg-emerald-500', text: 'text-white' };
    case 'last_minute':
      return { bg: 'bg-red-600', text: 'text-white' };
    case 'group':
      return { bg: 'bg-blue-500', text: 'text-white' };
    case 'bundle':
      return { bg: 'bg-purple-500', text: 'text-white' };
    case 'promo_code':
      return { bg: 'bg-slate-700', text: 'text-white' };
    default:
      return { bg: 'bg-amber-500', text: 'text-white' };
  }
}

/**
 * Format remaining time until offer ends
 */
export function formatOfferTimeRemaining(endDate: Date | string): string {
  const end = new Date(endDate);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  
  if (diff <= 0) return 'Expired';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 30) return `${Math.floor(days / 30)} months left`;
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} left`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} left`;
  return 'Ends soon';
}

/**
 * Check if offer should show urgency indicator
 */
export function shouldShowUrgency(endDate: Date | string): boolean {
  const end = new Date(endDate);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  return days <= 7 && diff > 0;
}

