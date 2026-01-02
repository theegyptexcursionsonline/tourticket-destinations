// app/api/bookings/manual/[id]/route.ts
/**
 * Manual Booking Update API (Admin-only)
 *
 * PUT /api/bookings/manual/[id]
 * Allows editing manual bookings (date/time/participants/payment/pickup/notes),
 * and re-calculates pricing + best offer server-side.
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/lib/models/Booking';
import Tour from '@/lib/models/Tour';
import SpecialOffer from '@/lib/models/SpecialOffer';
import { requireAdminAuth } from '@/lib/auth/adminAuth';
import {
  calculateDiscountedPrice,
  getBestOffer,
  isOfferApplicableByTravelDate,
  isOfferApplicableToTour,
  type OfferData,
} from '@/lib/utils/offerCalculations';

function ensureDateOnlyString(dateInput: string): string | null {
  const match = String(dateInput || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function computeSubtotal(basePrice: number, adults: number, children: number): number {
  const adultTotal = basePrice * adults;
  const childTotal = (basePrice / 2) * children;
  return adultTotal + childTotal;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminAuth(request, { permissions: ['manageBookings'] });
  if (auth instanceof NextResponse) return auth;

  await dbConnect();

  try {
    const { id } = await params;
    const booking = await Booking.findById(id);
    if (!booking) {
      return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
    }

    if (booking.source !== 'manual') {
      return NextResponse.json(
        { success: false, error: 'Only manual bookings can be edited via this endpoint.' },
        { status: 400 },
      );
    }

    const body = await request.json();
    const {
      date, // YYYY-MM-DD
      time,
      adults,
      children,
      infants,
      bookingOptionType,
      paymentStatus,
      paymentMethod,
      amountPaid,
      specialRequests,
      pickupLocation,
      pickupAddress,
      hotelPickupDetails,
      internalNotes,
    } = body || {};

    const tour = await Tour.findById(booking.tour).lean();
    if (!tour) {
      return NextResponse.json({ success: false, error: 'Tour not found' }, { status: 404 });
    }

    const nextDateString = date ? ensureDateOnlyString(date) : booking.dateString || ensureDateOnlyString(booking.date.toISOString());
    if (!nextDateString) {
      return NextResponse.json({ success: false, error: 'Invalid date format' }, { status: 400 });
    }

    const nextTime = time ? String(time) : booking.time;
    const numericAdults = Math.max(0, Number(adults ?? booking.adultGuests ?? 1) || 0);
    const numericChildren = Math.max(0, Number(children ?? booking.childGuests ?? 0) || 0);
    const numericInfants = Math.max(0, Number(infants ?? booking.infantGuests ?? 0) || 0);
    const totalGuests = numericAdults + numericChildren + numericInfants;
    if (totalGuests < 1) {
      return NextResponse.json({ success: false, error: 'At least 1 participant is required' }, { status: 400 });
    }

    const nextOptionType = bookingOptionType ? String(bookingOptionType) : booking.selectedBookingOption?.id;
    if (!nextOptionType) {
      return NextResponse.json({ success: false, error: 'Booking option is required' }, { status: 400 });
    }

    const bookingOptions = Array.isArray((tour as any).bookingOptions) ? (tour as any).bookingOptions : [];
    const selectedOption = bookingOptions.find((o: any) => o?.type === nextOptionType);
    if (!selectedOption) {
      return NextResponse.json({ success: false, error: 'Selected booking option not found for this tour' }, { status: 400 });
    }

    const basePrice = Number(selectedOption.price) || 0;
    const subtotal = computeSubtotal(basePrice, numericAdults, numericChildren);
    const travelDate = new Date(`${nextDateString}T00:00:00.000Z`);

    // Apply offers (server-side)
    const now = new Date();
    const activeOffersRaw = await SpecialOffer.find({
      tenantId: booking.tenantId,
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

    const applicableOffers: OfferData[] = [];
    for (const offer of activeOffersRaw) {
      const normalized: OfferData = {
        ...(offer as any),
        _id: String((offer as any)._id),
        applicableTours: (offer as any).applicableTours?.map((t: any) => String(t)) || [],
        excludedTours: (offer as any).excludedTours?.map((t: any) => String(t)) || [],
        tourOptionSelections:
          (offer as any).tourOptionSelections?.map((ts: any) => ({
            tourId: String(ts.tourId),
            selectedOptions: ts.selectedOptions || [],
            allOptions: ts.allOptions !== false,
          })) || [],
      };

      if (!isOfferApplicableToTour(normalized, String((tour as any)._id), String(nextOptionType))) continue;
      if (!isOfferApplicableByTravelDate(normalized, travelDate)) continue;
      applicableOffers.push(normalized);
    }

    const best = getBestOffer(applicableOffers, subtotal, travelDate, totalGuests);
    const discountedTotal = best?.discountedPrice ?? subtotal;

    // Apply updates to booking
    booking.date = new Date(`${nextDateString}T00:00:00.000Z`);
    booking.dateString = nextDateString;
    booking.time = nextTime;
    booking.guests = totalGuests;
    booking.adultGuests = numericAdults;
    booking.childGuests = numericChildren;
    booking.infantGuests = numericInfants;
    booking.totalPrice = discountedTotal;

    booking.selectedBookingOption = {
      id: String(selectedOption.type),
      title: String(selectedOption.label),
      price: basePrice,
      originalPrice: selectedOption.originalPrice ? Number(selectedOption.originalPrice) : undefined,
      duration: selectedOption.duration ? String(selectedOption.duration) : undefined,
      badge: selectedOption.badge ? String(selectedOption.badge) : undefined,
    };

    if (paymentStatus) booking.paymentStatus = paymentStatus;
    if (paymentMethod) booking.paymentMethod = paymentMethod;
    if (amountPaid !== undefined) booking.amountPaid = amountPaid === '' ? undefined : Number(amountPaid);
    if (specialRequests !== undefined) booking.specialRequests = specialRequests ? String(specialRequests) : undefined;
    if (pickupLocation !== undefined) booking.pickupLocation = pickupLocation ? String(pickupLocation) : undefined;
    if (pickupAddress !== undefined) booking.pickupAddress = pickupAddress ? String(pickupAddress) : undefined;
    if (hotelPickupDetails !== undefined) booking.hotelPickupDetails = hotelPickupDetails ? String(hotelPickupDetails) : undefined;
    if (internalNotes !== undefined) booking.internalNotes = internalNotes ? String(internalNotes) : undefined;

    booking.appliedOffer = best
      ? {
          id: best.offer._id,
          name: best.offer.name,
          offerType: best.offer.type,
          discountAmount: best.discountAmount,
          discountValue: best.offer.discountValue,
          endDate: best.offer.endDate ? new Date(best.offer.endDate) : undefined,
        }
      : undefined;

    // Keep status consistent with paymentStatus for manual bookings
    if (booking.paymentStatus === 'paid') booking.status = 'Confirmed';
    if (booking.paymentStatus === 'pending' || booking.paymentStatus === 'pay_on_arrival') booking.status = 'Pending';

    await booking.save();

    return NextResponse.json({
      success: true,
      data: {
        id: String(booking._id),
        bookingReference: booking.bookingReference,
        totalPrice: booking.totalPrice,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        appliedOffer: booking.appliedOffer,
      },
    });
  } catch (error: any) {
    console.error('Failed to update manual booking:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update manual booking' },
      { status: 500 },
    );
  }
}


