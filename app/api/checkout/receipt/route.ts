// app/api/checkout/receipt/route.ts - Premium Ticket-Style Receipt
// Uses the shared generateReceiptPdf utility for consistency
import { NextRequest, NextResponse } from 'next/server';
import { generateReceiptPdf } from '@/lib/utils/generateReceiptPdf';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/lib/models/Booking';
import Tour from '@/lib/models/Tour';
import User from '@/lib/models/user';
import { verifyToken } from '@/lib/jwt';
import { getTenantFromRequest } from '@/lib/tenant';

export async function POST(req: NextRequest) {
  try {
    const { receiptToken } = await req.json();
    if (typeof receiptToken !== 'string' || receiptToken.length > 10_000) {
      return NextResponse.json({ message: 'Receipt authorization required' }, { status: 401 });
    }
    const claims = await verifyToken(receiptToken);
    if (
      !claims || claims.scope !== 'receipt' || typeof claims.tenantId !== 'string' ||
      typeof claims.orderId !== 'string' || !Array.isArray(claims.bookingIds) ||
      claims.bookingIds.length === 0 || claims.bookingIds.length > 10
    ) {
      return NextResponse.json({ message: 'Invalid or expired receipt authorization' }, { status: 401 });
    }
    const requestTenantId = await getTenantFromRequest();
    if (requestTenantId !== claims.tenantId) {
      return NextResponse.json({ message: 'Receipt not found' }, { status: 404 });
    }

    await dbConnect(claims.tenantId);
    const bookingIds = claims.bookingIds.filter((id): id is string => typeof id === 'string');
    const bookings: any[] = await Booking.find({
      _id: { $in: bookingIds },
      tenantId: claims.tenantId,
    })
      .populate({ path: 'tour', model: Tour, select: 'title image' })
      .populate({ path: 'user', model: User, select: 'firstName lastName email' })
      .sort({ createdAt: 1 })
      .lean();
    if (bookings.length !== bookingIds.length) {
      return NextResponse.json({ message: 'Receipt not found' }, { status: 404 });
    }

    const first = bookings[0];
    const user = first.user || {};
    const pricing = claims.pricing && typeof claims.pricing === 'object' ? claims.pricing as any : {};
    const orderedItems = bookings.map((entry) => ({
      title: entry.tour?.title || 'Tour',
      quantity: entry.adultGuests || 0,
      childQuantity: entry.childGuests || 0,
      infantQuantity: entry.infantGuests || 0,
      totalPrice: entry.totalPrice,
      finalPrice: entry.totalPrice,
      selectedBookingOption: entry.selectedBookingOption
        ? { title: entry.selectedBookingOption.title, price: entry.selectedBookingOption.price }
        : undefined,
      selectedAddOns: entry.selectedAddOns || {},
      selectedAddOnDetails: entry.selectedAddOnDetails || {},
    }));
    const orderId = claims.orderId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://egypt-excursionsonline.com';
    const payload = {
      orderId,
      customer: {
        name: [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Guest',
        email: user.email,
        phone: first.customerPhone,
      },
      orderedItems,
      pricing,
      booking: {
        date: first.dateString || first.date,
        time: first.time,
        guests: bookings.reduce((sum, entry) => sum + Number(entry.guests || 0), 0),
        specialRequests: first.specialRequests || '',
      },
      qrData: `${baseUrl.replace(/\/$/, '')}/booking/verify/${first.bookingReference}`,
    };

    // Use the shared PDF generation utility
    const pdfBuffer = await generateReceiptPdf(payload);

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="ticket-${orderId}.pdf"`,
        'Cache-Control': 'private, no-store',
      },
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Receipt route error:', message);
    return NextResponse.json({
      message: 'Failed to generate receipt',
      error: message
    }, { status: 500 });
  }
}
