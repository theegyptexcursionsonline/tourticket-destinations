// app/api/bookings/manual/route.ts
/**
 * Manual Booking API (Admin-only)
 *
 * POST /api/bookings/manual
 * Creates a booking for phone/walk-in/corporate bookings.
 *
 * Requirements handled:
 * - Admin auth + createdBy
 * - source = 'manual'
 * - Tenant/brand selection required
 * - Auto-calc pricing from booking option + participants
 * - Apply best active offer
 * - Generate tenant-prefixed unique booking reference
 * - Optional confirmation email
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/lib/models/Booking';
import Tour from '@/lib/models/Tour';
import User from '@/lib/models/user';
import SpecialOffer from '@/lib/models/SpecialOffer';
import { requireAdminAuth } from '@/lib/auth/adminAuth';
import { getTenantConfigCached } from '@/lib/tenant';
import { ITenant } from '@/lib/models/Tenant';
import { EmailService } from '@/lib/email/emailService';
import { TenantEmailBranding } from '@/lib/email/type';
import {
  getBestOffer,
  isOfferApplicableToTour,
  isOfferApplicableByTravelDate,
  type OfferData,
} from '@/lib/utils/offerCalculations';

function splitName(fullName: string): { firstName: string; lastName: string } {
  const safe = String(fullName || '').trim();
  if (!safe) return { firstName: 'Guest', lastName: 'Customer' };
  const parts = safe.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

function ensureDateOnlyString(dateInput: string): string | null {
  const match = String(dateInput || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function getTenantEmailBranding(tenantConfig: ITenant | null, baseUrl: string): TenantEmailBranding | undefined {
  if (!tenantConfig) return undefined;

  return {
    tenantId: tenantConfig.tenantId,
    companyName: tenantConfig.name,
    logo: tenantConfig.branding?.logo,
    primaryColor: tenantConfig.branding?.primaryColor || '#E63946',
    secondaryColor: tenantConfig.branding?.secondaryColor || '#1D3557',
    accentColor: tenantConfig.branding?.accentColor || '#F4A261',
    contactEmail: tenantConfig.contact?.email || 'info@tours.com',
    contactPhone: tenantConfig.contact?.phone || '+20 000 000 0000',
    website: baseUrl || tenantConfig.domain,
    supportEmail: tenantConfig.contact?.supportEmail || tenantConfig.contact?.email,
    socialLinks: {
      facebook: tenantConfig.socialLinks?.facebook,
      instagram: tenantConfig.socialLinks?.instagram,
      twitter: tenantConfig.socialLinks?.twitter,
    },
    fromName: tenantConfig.email?.fromName || tenantConfig.name,
    fromEmail: tenantConfig.email?.fromEmail,
  };
}

async function generateUniqueBookingReference(tenantId: string, tenantConfig?: ITenant | null): Promise<string> {
  const maxAttempts = 10;

  let prefix = 'BKG';
  if (tenantConfig?.name) {
    prefix =
      tenantConfig.name
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase())
        .join('')
        .slice(0, 4) || 'BKG';
  } else if (tenantId) {
    prefix = tenantId.replace(/-/g, '').slice(0, 4).toUpperCase() || 'BKG';
  }

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const reference = `${prefix}-${timestamp}-${random}`;
    const existing = await Booking.findOne({ tenantId, bookingReference: reference }).lean();
    if (!existing) return reference;
    await new Promise((r) => setTimeout(r, 50));
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 12).toUpperCase()}`;
}

function formatMoney(amount: number, symbol = '$'): string {
  const safe = Number.isFinite(amount) ? Number(amount) : 0;
  return `${symbol}${safe.toFixed(2)}`;
}

function computeSubtotal(basePrice: number, adults: number, children: number): number {
  const adultTotal = basePrice * adults;
  const childTotal = (basePrice / 2) * children; // matches existing UI breakdown
  return adultTotal + childTotal;
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth(request, { permissions: ['manageBookings'] });
  if (auth instanceof NextResponse) return auth;

  await dbConnect();

  try {
    const body = await request.json();

    const {
      tenantId,
      tourId,
      bookingOptionType, // Tour.bookingOptions[].type
      date, // YYYY-MM-DD
      time, // HH:MM
      adults = 1,
      children = 0,
      infants = 0,

      customerName,
      customerEmail,
      customerPhone,
      customerCountry,
      specialRequests,

      pickupLocation,
      pickupAddress,
      hotelPickupDetails,

      paymentStatus = 'paid', // paid | pending | pay_on_arrival
      paymentMethod = 'cash', // cash | card | bank | other
      amountPaid,

      internalNotes,
      sendConfirmationEmail = true,
    } = body || {};

    if (!tenantId || tenantId === 'all') {
      return NextResponse.json(
        { success: false, error: 'Brand selection is required.' },
        { status: 400 },
      );
    }

    if (!tourId || !bookingOptionType || !date || !time) {
      return NextResponse.json(
        { success: false, error: 'Tour, option, date, and time are required.' },
        { status: 400 },
      );
    }

    if (!customerName || !customerEmail || !customerPhone) {
      return NextResponse.json(
        { success: false, error: 'Customer name, email, and phone are required.' },
        { status: 400 },
      );
    }

    const dateString = ensureDateOnlyString(date);
    if (!dateString) {
      return NextResponse.json({ success: false, error: 'Invalid date format.' }, { status: 400 });
    }

    const numericAdults = Math.max(0, Number(adults) || 0);
    const numericChildren = Math.max(0, Number(children) || 0);
    const numericInfants = Math.max(0, Number(infants) || 0);
    const totalGuests = numericAdults + numericChildren + numericInfants;
    if (totalGuests < 1) {
      return NextResponse.json(
        { success: false, error: 'At least 1 participant is required.' },
        { status: 400 },
      );
    }

    const tour = await Tour.findById(tourId).lean();
    if (!tour) {
      return NextResponse.json({ success: false, error: 'Tour not found.' }, { status: 404 });
    }

    if (tour.tenantId !== tenantId) {
      return NextResponse.json(
        { success: false, error: 'Selected tour does not belong to selected brand.' },
        { status: 400 },
      );
    }

    const bookingOptions = Array.isArray(tour.bookingOptions) ? tour.bookingOptions : [];
    const selectedOption = bookingOptions.find((o: any) => o?.type === bookingOptionType);
    if (!selectedOption) {
      return NextResponse.json(
        { success: false, error: 'Selected booking option not found for this tour.' },
        { status: 400 },
      );
    }

    const basePrice = Number(selectedOption.price) || 0;
    const subtotal = computeSubtotal(basePrice, numericAdults, numericChildren);

    // Apply best active offer (server-side)
    const now = new Date();
    const travelDate = new Date(`${dateString}T00:00:00.000Z`);

    const activeOffersRaw = await SpecialOffer.find({
      tenantId,
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

      if (!isOfferApplicableToTour(normalized, String(tourId), String(bookingOptionType))) continue;
      if (!isOfferApplicableByTravelDate(normalized, travelDate)) continue;
      applicableOffers.push(normalized);
    }

    const best = getBestOffer(applicableOffers, subtotal, travelDate, totalGuests);
    const discountedTotal = best?.discountedPrice ?? subtotal;
    const discountAmount = best?.discountAmount ?? 0;

    // Payment mapping
    const normalizedPaymentStatus =
      paymentStatus === 'pay_on_arrival' ? 'pay_on_arrival' : paymentStatus === 'pending' ? 'pending' : 'paid';

    const normalizedPaymentMethod =
      paymentMethod === 'card' ? 'card' : paymentMethod === 'bank' ? 'bank' : paymentMethod === 'other' ? 'other' : 'cash';

    const bookingStatus: 'Confirmed' | 'Pending' | 'Cancelled' =
      normalizedPaymentStatus === 'paid' ? 'Confirmed' : 'Pending';

    // Find or create user by email
    const emailLower = String(customerEmail).trim().toLowerCase();
    let user: any = await User.findOne({ email: emailLower }).lean();
    if (!user) {
      const nameParts = splitName(String(customerName));
      const created = await User.create({
        firstName: nameParts.firstName,
        lastName: nameParts.lastName,
        email: emailLower,
        authProvider: 'jwt',
        emailVerified: false,
        // role defaults to customer via schema default
      });
      user = created.toObject();
    }

    const tenantConfig = await getTenantConfigCached(tenantId);
    const bookingReference = await generateUniqueBookingReference(tenantId, tenantConfig);

    const bookingDoc = await Booking.create({
      tenantId,
      bookingReference,
      tour: tourId,
      user: (user as any)._id,
      source: 'manual',
      createdBy: auth.userId === 'env-admin' ? undefined : auth.userId,
      customerPhone: String(customerPhone),
      customerCountry: customerCountry ? String(customerCountry) : undefined,
      date: new Date(`${dateString}T00:00:00.000Z`),
      dateString,
      time: String(time),
      guests: totalGuests,
      totalPrice: discountedTotal,
      status: bookingStatus,
      paymentMethod: normalizedPaymentMethod,
      paymentStatus: normalizedPaymentStatus,
      amountPaid: amountPaid !== undefined && amountPaid !== '' ? Number(amountPaid) : undefined,
      specialRequests: specialRequests ? String(specialRequests) : undefined,
      pickupLocation: pickupLocation ? String(pickupLocation) : undefined,
      pickupAddress: pickupAddress ? String(pickupAddress) : undefined,
      hotelPickupDetails: hotelPickupDetails ? String(hotelPickupDetails) : undefined,
      internalNotes: internalNotes ? String(internalNotes) : undefined,
      adultGuests: numericAdults,
      childGuests: numericChildren,
      infantGuests: numericInfants,
      selectedBookingOption: {
        id: String(selectedOption.type),
        title: String(selectedOption.label),
        price: basePrice,
        originalPrice: selectedOption.originalPrice ? Number(selectedOption.originalPrice) : undefined,
        duration: selectedOption.duration ? String(selectedOption.duration) : undefined,
        badge: selectedOption.badge ? String(selectedOption.badge) : undefined,
      },
      appliedOffer: best
        ? {
            id: best.offer._id,
            name: best.offer.name,
            offerType: best.offer.type,
            discountAmount: best.discountAmount,
            discountValue: best.offer.discountValue,
            endDate: best.offer.endDate ? new Date(best.offer.endDate) : undefined,
          }
        : undefined,
    });

    // Optional confirmation email
    if (sendConfirmationEmail) {
      try {
        const emailBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
        await EmailService.sendBookingConfirmation({
          customerName: String(customerName),
          customerEmail: emailLower,
          customerPhone: String(customerPhone),
          tourTitle: (tour as any).title || 'Tour',
          bookingDate: new Date(`${dateString}T00:00:00.000Z`).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
          bookingTime: String(time),
          participants: `${totalGuests} participant${totalGuests !== 1 ? 's' : ''}`,
          participantBreakdown: [
            numericAdults > 0 ? `${numericAdults} x Adult ($${basePrice.toFixed(2)})` : null,
            numericChildren > 0 ? `${numericChildren} x Child ($${(basePrice / 2).toFixed(2)})` : null,
            numericInfants > 0 ? `${numericInfants} x Infant (Free)` : null,
          ]
            .filter(Boolean)
            .join(', '),
          totalPrice: formatMoney(discountedTotal),
          bookingId: bookingDoc.bookingReference || (bookingDoc._id as any).toString(),
          bookingOption: String(selectedOption.label),
          specialRequests: specialRequests ? String(specialRequests) : undefined,
          hotelPickupDetails: hotelPickupDetails ? String(hotelPickupDetails) : undefined,
          meetingPoint: (tour as any).meetingPoint || 'Meeting point will be confirmed',
          contactNumber: tenantConfig?.contact?.phone || undefined,
          tourImage: (tour as any).image,
          baseUrl: emailBaseUrl,
          orderedItems: [
            {
              title: (tour as any).title || 'Tour',
              quantity: numericAdults,
              childQuantity: numericChildren,
              infantQuantity: numericInfants,
              price: basePrice,
              totalPrice: formatMoney(discountedTotal),
              selectedBookingOption: String(selectedOption.label),
            },
          ],
          pricingDetails: {
            currencySymbol: '$',
            subtotal: formatMoney(subtotal),
            serviceFee: formatMoney(0),
            tax: formatMoney(0),
            discount: formatMoney(discountAmount),
            total: formatMoney(discountedTotal),
          },
          tenantBranding: getTenantEmailBranding(tenantConfig, emailBaseUrl),
        } as any);
      } catch (e) {
        // Don't fail booking creation if email fails
        console.error('Manual booking: failed to send confirmation email', e);
      }
    }

    // Admin/operator alert email (always try; independent of customer confirmation toggle)
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
      const operatorEmail = tenantConfig?.contact?.email || process.env.ADMIN_NOTIFICATION_EMAIL;
      console.log(`📧 [Manual Booking] Sending operator notification for booking ${bookingDoc.bookingReference || bookingDoc._id} to: ${operatorEmail || 'NOT CONFIGURED'}`);

      await EmailService.sendAdminBookingAlert({
        customerName: String(customerName),
        customerEmail: emailLower,
        customerPhone: String(customerPhone),
        tourTitle: (tour as any).title || 'Tour',
        bookingId: bookingDoc.bookingReference || String(bookingDoc._id),
        bookingDate: new Date(`${dateString}T00:00:00.000Z`).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        totalPrice: formatMoney(discountedTotal),
        paymentMethod: normalizedPaymentMethod,
        specialRequests: specialRequests ? String(specialRequests) : undefined,
        hotelPickupDetails: hotelPickupDetails ? String(hotelPickupDetails) : undefined,
        adminDashboardLink: baseUrl ? `${baseUrl}/admin/bookings/${String(bookingDoc._id)}` : undefined,
        baseUrl,
        tours: [
          {
            title: (tour as any).title || 'Tour',
            date: new Date(`${dateString}T00:00:00.000Z`).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            }),
            time: String(time),
            adults: numericAdults,
            children: numericChildren,
            infants: numericInfants,
            bookingOption: String(selectedOption.label),
            price: formatMoney(discountedTotal),
          },
        ],
        tenantBranding: getTenantEmailBranding(tenantConfig, baseUrl),
        // Prefer tenant contact email if set; EmailService will fallback to ADMIN_NOTIFICATION_EMAIL
        adminEmail: tenantConfig?.contact?.email,
      } as any);
    } catch (e) {
      console.error(`❌ [Manual Booking] Failed to send operator notification email for booking ${bookingDoc.bookingReference || bookingDoc._id}:`, e);
    }

    return NextResponse.json({
      success: true,
      data: {
        id: (bookingDoc._id as any).toString(),
        bookingReference: bookingDoc.bookingReference,
        totalPrice: bookingDoc.totalPrice,
        subtotal,
        discountAmount,
        appliedOffer: bookingDoc.appliedOffer,
        status: bookingDoc.status,
        paymentStatus: bookingDoc.paymentStatus,
      },
    });
  } catch (error: any) {
    console.error('Failed to create manual booking:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to create manual booking' },
      { status: 500 },
    );
  }
}


