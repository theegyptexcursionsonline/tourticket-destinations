// app/api/offers/batch/route.ts
/**
 * API to get applicable offers for multiple tours at once
 * Used by tour listing pages to show offer badges efficiently
 * 
 * POST /api/offers/batch
 * Body: { tourIds: string[], tenantId: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import SpecialOffer from '@/lib/models/SpecialOffer';
import { 
  getOfferDisplayText,
  getOfferBadgeColor,
  formatOfferTimeRemaining,
  shouldShowUrgency,
  type OfferData
} from '@/lib/utils/offerCalculations';

export const dynamic = 'force-dynamic';

interface TourOfferSummary {
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

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const body = await request.json();
    const { tourIds, tenantId } = body;
    
    if (!tourIds || !Array.isArray(tourIds) || tourIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'tourIds array is required' },
        { status: 400 }
      );
    }
    
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'tenantId is required' },
        { status: 400 }
      );
    }
    
    const now = new Date();
    
    // Fetch all active offers for this tenant that don't require promo codes
    const offers = await SpecialOffer.find({
      tenantId,
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
      type: { $ne: 'promo_code' }, // Exclude promo codes from automatic display
      $or: [
        { usageLimit: { $exists: false } },
        { usageLimit: null },
        { $expr: { $lt: ['$usedCount', '$usageLimit'] } },
      ],
    })
      .sort({ priority: -1, discountValue: -1 })
      .lean();
    
    // Create a map for quick tour-offer lookup
    const tourOffersMap: Map<string, TourOfferSummary> = new Map();
    
    // Initialize all tours with no offer
    for (const tourId of tourIds) {
      tourOffersMap.set(tourId, {
        tourId,
        hasOffer: false,
        offerCount: 0,
      });
    }
    
    // Process each offer and map to applicable tours
    for (const offer of offers) {
      const offerData = {
        ...offer,
        _id: offer._id.toString(),
        applicableTours: offer.applicableTours?.map((t: { toString: () => string }) => t.toString()) || [],
        excludedTours: offer.excludedTours?.map((t: { toString: () => string }) => t.toString()) || [],
      } as OfferData;
      
      // Check if this offer applies to all tours (empty applicableTours)
      const appliesToAll = !offerData.applicableTours || offerData.applicableTours.length === 0;
      
      for (const tourId of tourIds) {
        // Check if tour is excluded
        if (offerData.excludedTours?.includes(tourId)) continue;
        
        // Check if offer applies to this specific tour
        if (!appliesToAll && !offerData.applicableTours.includes(tourId)) continue;
        
        const existing = tourOffersMap.get(tourId);
        if (!existing) continue;
        
        existing.offerCount++;
        existing.hasOffer = true;
        
        // Keep the best offer (first one due to sorting by priority and discount)
        if (!existing.bestOffer) {
          existing.bestOffer = {
            _id: offerData._id,
            name: offerData.name,
            type: offerData.type,
            discountValue: offerData.discountValue,
            displayText: getOfferDisplayText(offerData),
            badgeColor: getOfferBadgeColor(offerData.type),
            isFeatured: offerData.isFeatured,
            featuredBadgeText: offerData.featuredBadgeText,
            timeRemaining: formatOfferTimeRemaining(offerData.endDate),
            showUrgency: shouldShowUrgency(offerData.endDate),
            endDate: new Date(offerData.endDate).toISOString(),
          };
        }
      }
    }
    
    // Convert map to array
    const result = Array.from(tourOffersMap.values());
    
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching batch offers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch offers' },
      { status: 500 }
    );
  }
}

