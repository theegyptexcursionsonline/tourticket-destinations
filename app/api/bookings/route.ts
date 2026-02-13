// app/api/bookings/route.ts
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/lib/models/Booking';
import Tour from '@/lib/models/Tour';
import User from '@/lib/models/user';
import { verifyToken } from '@/lib/jwt';
import { verifyFirebaseToken } from '@/lib/firebase/admin';
import { getTenantConfigCached, getTenantEmailBranding } from '@/lib/tenant';
import { requireAdminAuth } from '@/lib/auth/adminAuth';
import { EmailService } from '@/lib/email/emailService';

export async function GET(request: NextRequest) {
  await dbConnect();

  try {
    const { searchParams } = new URL(request.url);
    const isAdmin = searchParams.get('admin') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const status = searchParams.get('status');

    let query: any = {};

    if (isAdmin) {
      // Admin requests require proper admin auth with manageBookings permission
      const adminAuth = await requireAdminAuth(request, { permissions: ['manageBookings'] });
      if (adminAuth instanceof NextResponse) return adminAuth;

      if (status) {
        query.status = status;
      }
    } else {
      // All user requests require authentication - derive user from token
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        );
      }

      const token = authHeader.split(' ')[1];

      // Try Firebase authentication first (for regular users)
      const firebaseResult = await verifyFirebaseToken(token);

      if (firebaseResult.success && firebaseResult.uid) {
        // Find user by Firebase UID
        const user = await User.findOne({ firebaseUid: firebaseResult.uid });
        if (!user) {
          return NextResponse.json(
            { success: false, error: 'User not found' },
            { status: 404 }
          );
        }
        query.user = user._id;
      } else {
        // Fallback to JWT (for backwards compatibility)
        const payload = await verifyToken(token);
        if (!payload || !payload.sub) {
          return NextResponse.json(
            { success: false, error: 'Not authenticated: Invalid token' },
            { status: 401 }
          );
        }
        query.user = payload.sub;
      }
    }

    const skip = (page - 1) * limit;

    const bookings = await Booking.find(query)
      .populate({
        path: 'tour',
        model: Tour,
        select: 'title slug image images duration rating discountPrice destination',
        populate: {
          path: 'destination',
          model: 'Destination',
          select: 'name slug',
        },
      })
      .populate({
        path: 'user',
        model: User,
        select: 'firstName lastName email name',
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Filter out bookings where tour is null (deleted tours)
    const validBookings = bookings.filter(booking => booking.tour !== null);

    const totalCount = validBookings.length;
    const totalPages = Math.ceil(totalCount / limit);

    const transformedBookings = validBookings.map((booking: any) => ({
      ...booking,
      id: booking._id,
      bookingDate: booking.date,
      bookingTime: booking.time,
      participants: booking.guests,
      tour: booking.tour ? {
        ...booking.tour,
        id: booking.tour._id,
      } : null,
      user: booking.user ? {
        ...booking.user,
        id: booking.user._id,
        name: booking.user.name || `${booking.user.firstName || ''} ${booking.user.lastName || ''}`.trim(),
      } : null,
    }));

    return NextResponse.json({
      success: true,
      data: transformedBookings,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });

  } catch (error: any) {
    console.error('Failed to fetch bookings:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch bookings',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  await dbConnect();

  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    let userId: string;

    // Try Firebase authentication first (for regular users)
    const firebaseResult = await verifyFirebaseToken(token);

    if (firebaseResult.success && firebaseResult.uid) {
      // Find user by Firebase UID
      const user = await User.findOne({ firebaseUid: firebaseResult.uid });
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        );
      }
      userId = (user._id as any).toString();
    } else {
      // Fallback to JWT (for backwards compatibility)
      const payload = await verifyToken(token);
      if (!payload || !payload.sub) {
        return NextResponse.json(
          { success: false, error: 'Invalid or expired token' },
          { status: 401 }
        );
      }
      userId = payload.sub as string;
    }

    const body = await request.json();
    const {
      tourId,
      date,
      time,
      adults = 1,
      children = 0,
      infants = 0,
      totalPrice,
      specialRequests,
      selectedAddOns = {},
    } = body;

    if (!tourId || !date || !time || !totalPrice) {
      return NextResponse.json(
        { success: false, error: 'Missing required booking information' },
        { status: 400 }
      );
    }

    const tour = await Tour.findById(tourId);
    if (!tour) {
      return NextResponse.json(
        { success: false, error: 'Tour not found' },
        { status: 404 }
      );
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const totalGuests = adults + children + infants;

    // Get tenant config for booking reference prefix
    const tenantId = tour.tenantId || 'default';
    const tenantConfig = await getTenantConfigCached(tenantId);
    
    // Generate tenant-specific booking reference
    let prefix = 'BKG';
    if (tenantConfig?.name) {
      prefix = tenantConfig.name
        .split(' ')
        .map(word => word.charAt(0).toUpperCase())
        .join('')
        .slice(0, 4) || 'BKG';
    } else if (tenantId !== 'default') {
      prefix = tenantId.replace(/-/g, '').slice(0, 4).toUpperCase() || 'BKG';
    }
    
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const bookingReference = `${prefix}-${timestamp}-${random}`;

    const booking = await Booking.create({
      tenantId: tour.tenantId || 'default', // Inherit tenant from tour
      bookingReference,
      tour: tourId,
      user: user._id, // Use the ObjectId from the user document
      date: new Date(date),
      time,
      guests: totalGuests,
      totalPrice: parseFloat(totalPrice),
      status: 'Confirmed',
      adultGuests: adults,
      childGuests: children,
      infantGuests: infants,
      specialRequests,
      selectedAddOns,
    });

    const populatedBooking = await Booking.findById(booking._id)
      .populate({
        path: 'tour',
        model: Tour,
        select: 'title slug image duration rating discountPrice',
      })
      .populate({
        path: 'user',
        model: User,
        select: 'firstName lastName email',
      });

    const transformedBooking = {
      ...populatedBooking?.toObject(),
      id: populatedBooking?._id,
      bookingDate: populatedBooking?.date,
      bookingTime: populatedBooking?.time,
      participants: populatedBooking?.guests,
    };

    // Send admin/operator notification email
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
      const tenantBranding = getTenantEmailBranding(tenantConfig as any, baseUrl);
      const bookingDate = new Date(date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      await EmailService.sendAdminBookingAlert({
        customerName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        customerEmail: user.email,
        customerPhone: (user as any).phone || '',
        tourTitle: tour.title || 'Tour',
        bookingId: bookingReference,
        bookingDate,
        bookingTime: time || undefined,
        totalPrice: `$${parseFloat(totalPrice).toFixed(2)}`,
        paymentMethod: 'Online',
        paymentStatus: 'Paid',
        bookingSource: 'online',
        specialRequests,
        adminDashboardLink: `https://dashboard.egypt-excursionsonline.com/admin/bookings/${booking._id}`,
        baseUrl,
        tours: [
          {
            title: tour.title || 'Tour',
            date: bookingDate,
            time: time || '',
            adults,
            children,
            infants,
            price: `$${parseFloat(totalPrice).toFixed(2)}`,
          },
        ],
        bookedAt: new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }),
        tenantBranding,
        adminEmail: tenantConfig?.contact?.email,
      });
      console.log(`✅ Admin/operator notification email sent for booking ${bookingReference}`);
    } catch (emailError) {
      console.error(`❌ Failed to send admin/operator notification email for booking ${bookingReference}:`, emailError);
      // Don't fail the booking if email fails
    }

    return NextResponse.json({
      success: true,
      data: transformedBooking,
      message: 'Booking created successfully!',
    }, { status: 201 });

  } catch (error: any) {
    console.error('Failed to create booking:', error);

    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        {
          success: false,
          error: 'Booking validation failed',
          errors: validationErrors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create booking',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
