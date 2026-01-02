// app/api/offers/tour/[tourId]/route.ts
/**
 * API to get applicable offers for a specific tour
 * 
 * GET /api/offers/tour/[tourId]
 * Query params:
 *   - travelDate: ISO date string (optional)
 *   - groupSize: number (optional)
 *   - optionType: string (optional) - specific booking option
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import SpecialOffer from '@/lib/models/SpecialOffer';
import Tour from '@/lib/models/Tour';
import { 
  isOfferValid, 
  isOfferApplicableToTour, 
  isOfferApplicableByTravelDate,
  calculateDiscountedPrice,
  getBestOffer,
  getOfferDisplayText,
  formatOfferTimeRemaining,
  shouldShowUrgency,
  type OfferData
} from '@/lib/utils/offerCalculations';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tourId: string }> }
) {
  try {
    await dbConnect();
    
    const { tourId } = await params;
    const { searchParams } = new URL(request.url);
    const travelDateParam = searchParams.get('travelDate');
    const groupSizeParam = searchParams.get('groupSize');
    const optionType = searchParams.get('optionType') || undefined;
    
    const travelDate = travelDateParam ? new Date(travelDateParam) : undefined;
    const groupSize = groupSizeParam ? parseInt(groupSizeParam, 10) : 1;
    
    // Get the tour to find its tenant and categories
    const tour = await Tour.findById(tourId)
      .select('tenantId category discountPrice price')
      .lean();
    
    if (!tour) {
      return NextResponse.json(
        { success: false, error: 'Tour not found' },
        { status: 404 }
      );
    }
    
    const now = new Date();
    
    // Find all active offers for this tenant
    const offers = await SpecialOffer.find({
      tenantId: tour.tenantId,
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
      $or: [
        { usageLimit: { $exists: false } },
        { usageLimit: null },
        { $expr: { $lt: ['$usedCount', '$usageLimit'] } },
      ],
    })
      .sort({ priority: -1, discountValue: -1 })
      .lean();
    
    // Filter offers applicable to this tour
    const applicableOffers: (OfferData & {
      displayText: string;
      timeRemaining: string;
      showUrgency: boolean;
      discountResult?: ReturnType<typeof calculateDiscountedPrice>;
    })[] = [];
    
    const originalPrice = tour.discountPrice || tour.price || 0;
    
    for (const offer of offers) {
      const offerData = {
        ...offer,
        _id: offer._id.toString(),
        applicableTours: offer.applicableTours?.map((t: { toString: () => string }) => t.toString()) || [],
        excludedTours: offer.excludedTours?.map((t: { toString: () => string }) => t.toString()) || [],
        tourOptionSelections: offer.tourOptionSelections?.map((ts: { tourId: { toString: () => string }; selectedOptions?: string[]; allOptions?: boolean }) => ({
          ...ts,
          tourId: ts.tourId.toString(),
        })) || [],
      } as OfferData;
      
      // Check if offer applies to this tour
      if (!isOfferApplicableToTour(offerData, tourId, optionType)) continue;
      
      // Check travel date restrictions
      if (!isOfferApplicableByTravelDate(offerData, travelDate)) continue;
      
      // Calculate discount
      const discountResult = calculateDiscountedPrice(
        originalPrice,
        offerData,
        travelDate,
        groupSize
      );
      
      applicableOffers.push({
        ...offerData,
        displayText: getOfferDisplayText(offerData),
        timeRemaining: formatOfferTimeRemaining(offer.endDate),
        showUrgency: shouldShowUrgency(offer.endDate),
        discountResult: discountResult.isApplicable ? discountResult : undefined,
      });
    }
    
    // Get the best offer (auto-applied, excludes promo codes)
    const bestOffer = getBestOffer(
      applicableOffers,
      originalPrice,
      travelDate,
      groupSize
    );
    
    return NextResponse.json({
      success: true,
      data: {
        tourId,
        originalPrice,
        offers: applicableOffers,
        bestOffer: bestOffer ? {
          ...bestOffer,
          displayText: getOfferDisplayText(bestOffer.offer),
          timeRemaining: formatOfferTimeRemaining(bestOffer.offer.endDate),
          showUrgency: shouldShowUrgency(bestOffer.offer.endDate),
        } : null,
        hasOffers: applicableOffers.length > 0,
        offerCount: applicableOffers.length,
      },
    });
  } catch (error) {
    console.error('Error fetching tour offers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch offers' },
      { status: 500 }
    );
  }
}

