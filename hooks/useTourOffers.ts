// hooks/useTourOffers.ts
/**
 * Custom hook for fetching and managing tour offers
 * 
 * Usage:
 * 
 * // Single tour
 * const { offer, loading } = useTourOffer(tourId, { travelDate, groupSize });
 * 
 * // Multiple tours (batch)
 * const { offers, loading } = useTourOffersBatch(tourIds, tenantId);
 */

import { useState, useEffect, useCallback } from 'react';
import { type OfferData } from '@/lib/utils/offerCalculations';

// Types
export interface TourOfferResult {
  tourId: string;
  originalPrice: number;
  offers: OfferData[];
  bestOffer: {
    originalPrice: number;
    discountedPrice: number;
    discountAmount: number;
    discountPercentage: number;
    offer: OfferData;
    isApplicable: boolean;
    displayText: string;
    timeRemaining: string;
    showUrgency: boolean;
  } | null;
  hasOffers: boolean;
  offerCount: number;
}

export interface TourOfferSummary {
  tourId: string;
  hasOffer: boolean;
  bestOffer?: {
    _id: string;
    name: string;
    type: string;
    discountValue: number;
    displayText: string;
    badgeColor: { bg: string; text: string };
    isFeatured: boolean;
    featuredBadgeText?: string;
    timeRemaining: string;
    showUrgency: boolean;
    endDate: string;
  };
  offerCount: number;
}

interface UseTourOfferOptions {
  travelDate?: Date | string;
  groupSize?: number;
  optionType?: string;
  enabled?: boolean;
}

/**
 * Hook for fetching offers for a single tour
 */
export function useTourOffer(
  tourId: string | undefined,
  options: UseTourOfferOptions = {}
) {
  const [data, setData] = useState<TourOfferResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { travelDate, groupSize = 1, optionType, enabled = true } = options;
  
  const fetchOffer = useCallback(async () => {
    if (!tourId || !enabled) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (travelDate) {
        const dateStr = typeof travelDate === 'string' 
          ? travelDate 
          : travelDate.toISOString();
        params.set('travelDate', dateStr);
      }
      if (groupSize > 1) {
        params.set('groupSize', groupSize.toString());
      }
      if (optionType) {
        params.set('optionType', optionType);
      }
      
      const response = await fetch(`/api/offers/tour/${tourId}?${params.toString()}`);
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Failed to fetch offers');
      }
    } catch (err) {
      console.error('Error fetching tour offer:', err);
      setError('Failed to fetch offers');
    } finally {
      setLoading(false);
    }
  }, [tourId, travelDate, groupSize, optionType, enabled]);
  
  useEffect(() => {
    fetchOffer();
  }, [fetchOffer]);
  
  return {
    data,
    offer: data?.bestOffer ?? null,
    allOffers: data?.offers ?? [],
    hasOffer: data?.hasOffers ?? false,
    loading,
    error,
    refetch: fetchOffer,
  };
}

/**
 * Hook for fetching offers for multiple tours (batch)
 * More efficient for listing pages
 */
export function useTourOffersBatch(
  tourIds: string[],
  tenantId: string | undefined,
  options: { enabled?: boolean } = {}
) {
  const [data, setData] = useState<Map<string, TourOfferSummary>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { enabled = true } = options;
  
  const fetchOffers = useCallback(async () => {
    if (!tourIds.length || !tenantId || !enabled) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/offers/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tourIds, tenantId }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        const offersMap = new Map<string, TourOfferSummary>();
        for (const item of result.data) {
          offersMap.set(item.tourId, item);
        }
        setData(offersMap);
      } else {
        setError(result.error || 'Failed to fetch offers');
      }
    } catch (err) {
      console.error('Error fetching batch offers:', err);
      setError('Failed to fetch offers');
    } finally {
      setLoading(false);
    }
  }, [tourIds.join(','), tenantId, enabled]);
  
  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);
  
  // Helper function to get offer for a specific tour
  const getOfferForTour = useCallback((tourId: string) => {
    return data.get(tourId);
  }, [data]);
  
  // Helper function to check if a tour has an offer
  const hasOfferForTour = useCallback((tourId: string) => {
    return data.get(tourId)?.hasOffer ?? false;
  }, [data]);
  
  return {
    offers: data,
    loading,
    error,
    getOfferForTour,
    hasOfferForTour,
    refetch: fetchOffers,
  };
}

// Default export
export default useTourOffer;

