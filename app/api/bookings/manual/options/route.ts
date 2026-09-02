import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import { canAccessTenant, requireAdminAuth, tenantForbiddenResponse } from '@/lib/auth/adminAuth';
import { buildStrictTenantQuery } from '@/lib/tenant';
import { effectiveOptionPrice, effectiveTourPrice } from '@/lib/pricing/effectivePrice';
import { STANDARD_OPTION_KEY } from '@/lib/revenue/pricingContract';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request, { permissions: ['manageBookings'] });
  if (auth instanceof NextResponse) return auth;

  const tenantId = request.nextUrl.searchParams.get('tenantId') || '';
  const tourId = request.nextUrl.searchParams.get('tourId') || '';
  if (!tenantId || !tourId) {
    return NextResponse.json({ success: false, error: 'Brand and tour are required.' }, { status: 400 });
  }
  if (!canAccessTenant(auth, tenantId)) return tenantForbiddenResponse();

  try {
    await dbConnect();
    const tour: any = await Tour.findOne(buildStrictTenantQuery({
      _id: tourId,
      archivedAt: null,
    }, tenantId)).select('title discountPrice discountPercent originalPrice duration bookingOptions availability').lean();
    if (!tour) {
      return NextResponse.json({ success: false, error: 'Tour not found.' }, { status: 404 });
    }

    const storedOptions = Array.isArray(tour.bookingOptions) ? tour.bookingOptions : [];
    const options = storedOptions.length > 0
      ? storedOptions.map((option: any, index: number) => {
          const pricing = effectiveOptionPrice(tour, option);
          return {
            id: String(option.id || option._id || `option-${index}`),
            pricingKey: option.pricingKey || null,
            title: option.label || `${tour.title} - ${option.type || 'Experience'}`,
            type: option.type || 'Per Person',
            price: pricing.price,
            originalPrice: pricing.originalPrice,
            minCapacity: option.minCapacity,
            maxCapacity: option.maxCapacity,
            duration: option.duration || tour.duration,
            timeSlots: Array.isArray(option.timeSlots) && option.timeSlots.length > 0
              ? option.timeSlots.map((slot: any, slotIndex: number) => ({ id: `slot-${slotIndex + 1}`, time: slot.time }))
              : (tour.availability?.slots || []).map((slot: any, slotIndex: number) => ({ id: `slot-${slotIndex + 1}`, time: slot.time })),
          };
        })
      : (() => {
          const pricing = effectiveTourPrice(tour);
          return [{
            id: 'standard-default',
            pricingKey: STANDARD_OPTION_KEY,
            title: `${tour.title} - Standard Experience`,
            type: 'Per Person',
            price: pricing.price,
            originalPrice: pricing.originalPrice,
            duration: tour.duration,
            timeSlots: (tour.availability?.slots || []).map((slot: any, slotIndex: number) => ({ id: `slot-${slotIndex + 1}`, time: slot.time })),
          }];
        })();

    return NextResponse.json({ success: true, options }, { headers: { 'Cache-Control': 'no-store, private' } });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to load options.' },
      { status: 500 },
    );
  }
}
