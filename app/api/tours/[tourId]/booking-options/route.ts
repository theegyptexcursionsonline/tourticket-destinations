import { withAdminAudit } from '@/lib/admin/adminAudit';
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import { canAccessTenant, requireAdminAuth, tenantForbiddenResponse } from '@/lib/auth/adminAuth';
import { applyBookingOptionCapacityDefaults, bookingOptionCapacityError } from '@/lib/admin/bookingOptionCapacity';
import {
  cleanBookingOptionGuestPrices,
  hasOnlyConfiguredTimeSlots,
  hasPartialGuestPrices,
} from '@/lib/revenue/guestPrices';
import { preserveBookingOptionPricingKeys } from '@/lib/revenue/pricingKeys';
import { refreshTourPricingSummaries, syncTourPricingSearchIndex } from '@/lib/revenue/pricingSummary';

function generateOptionId() {
  return globalThis.crypto?.randomUUID?.() || `opt-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function PUTHandler(
  request: NextRequest,
  { params }: { params: Promise<{ tourId: string }> }
) {
  try {
    const adminAuth = await requireAdminAuth(request, {
      permissions: ['manageTours'],
    });
    if (adminAuth instanceof NextResponse) return adminAuth;

    await dbConnect();
    
    const { index, option } = await request.json();
    const { tourId } = await params;

    const tour = await Tour.findById(tourId);
    if (!tour) {
      return NextResponse.json({ error: 'Tour not found' }, { status: 404 });
    }
    const sellingTenantIds = [...new Set([String(tour.tenantId || 'default'), ...(tour.tenantIds || []).map(String)])];
    if (!sellingTenantIds.some((tenantId) => canAccessTenant(adminAuth, tenantId))) return tenantForbiddenResponse();
    if (!Number.isInteger(index) || index < 0 || index > (tour.bookingOptions?.length || 0)) {
      return NextResponse.json({ error: 'Invalid booking option index' }, { status: 400 });
    }

    // Ensure bookingOptions array exists
    if (!tour.bookingOptions) {
      tour.bookingOptions = [];
    }

    if (hasPartialGuestPrices(option?.guestPrices)) {
      return NextResponse.json({ error: 'Enter both child and infant prices, or leave both blank.' }, { status: 400 });
    }
    const incoming = cleanBookingOptionGuestPrices({ ...(option || {}) });
    delete incoming.pricingKey;
    applyBookingOptionCapacityDefaults([incoming]);
    const capacityError = bookingOptionCapacityError([incoming]);
    if (capacityError) {
      return NextResponse.json({ error: capacityError }, { status: 400 });
    }
    if (!hasOnlyConfiguredTimeSlots(incoming.timeSlots, tour.availability?.slots || [])) {
      return NextResponse.json({ error: 'Booking option contains a time slot that is not in tour availability' }, { status: 400 });
    }

    // Preserve existing id if caller didn't send it
    if (index < tour.bookingOptions.length) {
      const existing: any = tour.bookingOptions[index];
      if (incoming.id && existing?.id && String(incoming.id) !== String(existing.id)) {
        return NextResponse.json(
          { error: 'Booking options changed while you were editing. Refresh and try again.' },
          { status: 409 },
        );
      }
      if (!incoming.id && existing?.id) incoming.id = existing.id;
      if (!incoming.id) incoming.id = generateOptionId();

      const [keyed] = preserveBookingOptionPricingKeys(
        String(tour._id),
        [existing],
        [incoming],
      ) || [];
      tour.bookingOptions[index] = keyed;
    } else {
      if (!incoming.id) incoming.id = generateOptionId();
      const [keyed] = preserveBookingOptionPricingKeys(String(tour._id), [], [incoming]) || [];
      tour.bookingOptions.push(keyed);
    }

    await tour.save();
    await refreshTourPricingSummaries(String(tour._id), sellingTenantIds);
    if (tour.isPublished) {
      await Promise.all(sellingTenantIds.map((tenantId) => syncTourPricingSearchIndex(String(tour._id), tenantId)));
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Booking option updated successfully',
      bookingOptions: tour.bookingOptions 
    });

  } catch (error: any) {
    console.error('Update booking option error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update booking option' },
      { status: 500 }
    );
  }
}

export const PUT = withAdminAudit(PUTHandler);
