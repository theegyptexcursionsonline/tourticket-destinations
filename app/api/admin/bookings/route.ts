// app/api/admin/bookings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/lib/models/Booking';
import mongoose from 'mongoose';
import { toBookingStatusDb } from '@/lib/constants/bookingStatus';
import { requireAdminAuth } from '@/lib/auth/adminAuth';

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request, { permissions: ['manageBookings'] });
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const tenantId =
      searchParams.get('tenantId') ||
      searchParams.get('brandId') ||
      searchParams.get('brand_id');
    const effectiveTenantId = tenantId && tenantId !== 'all' ? tenantId : undefined;

    // IMPORTANT: connect to tenant-specific DB when a specific brand is selected
    await dbConnect(effectiveTenantId || undefined);
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');
    const search = (searchParams.get('search') || '').trim();
    const status = (searchParams.get('status') || 'all').trim();
    const tourId = (searchParams.get('tourId') || '').trim();
    const purchaseFrom = (searchParams.get('purchaseFrom') || '').trim(); // createdAt range (YYYY-MM-DD)
    const purchaseTo = (searchParams.get('purchaseTo') || '').trim();
    const activityFrom = (searchParams.get('activityFrom') || '').trim(); // booking date range (YYYY-MM-DD)
    const activityTo = (searchParams.get('activityTo') || '').trim();
    const sortParam = (searchParams.get('sort') || 'createdAt_desc').trim();
    
    const page = Math.max(1, Number.parseInt(pageParam || '1', 10) || 1);
    const requestedLimit = Number.parseInt(limitParam || '10', 10) || 10;
    const allowedLimits = new Set([10, 20, 50]);
    const limit = allowedLimits.has(requestedLimit) ? requestedLimit : 10;
    const skip = (page - 1) * limit;

    const baseMatch: Record<string, unknown> = {};

    // Early tenant filter — narrows working set BEFORE expensive $lookups
    if (effectiveTenantId) {
      baseMatch.tenantId = effectiveTenantId;
    }

    // Status filter
    if (status && status !== 'all') {
      // Accept both status codes (e.g. refunded) and DB labels (e.g. Refunded)
      const mapped = toBookingStatusDb(status);
      baseMatch.status = mapped || status;
    }

    // Product filter
    if (tourId && mongoose.Types.ObjectId.isValid(tourId)) {
      baseMatch.tour = new mongoose.Types.ObjectId(tourId);
    }

    // Date helpers (inclusive range)
    const parseDayStartUtc = (dateStr: string): Date | null => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
      return new Date(`${dateStr}T00:00:00.000Z`);
    };
    const parseDayEndUtc = (dateStr: string): Date | null => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
      return new Date(`${dateStr}T23:59:59.999Z`);
    };

    // Purchase date range (createdAt)
    const createdAtFrom = parseDayStartUtc(purchaseFrom);
    const createdAtTo = parseDayEndUtc(purchaseTo);
    if (createdAtFrom || createdAtTo) {
      baseMatch.createdAt = {
        ...(createdAtFrom ? { $gte: createdAtFrom } : {}),
        ...(createdAtTo ? { $lte: createdAtTo } : {}),
      };
    }

    // Activity date range (tour date)
    const dateFrom = parseDayStartUtc(activityFrom);
    const dateTo = parseDayEndUtc(activityTo);
    if (dateFrom || dateTo) {
      baseMatch.date = {
        ...(dateFrom ? { $gte: dateFrom } : {}),
        ...(dateTo ? { $lte: dateTo } : {}),
      };
    }

    // Sort mapping
    const sortMap: Record<string, Record<string, 1 | -1>> = {
      createdAt_desc: { createdAt: -1 },
      createdAt_asc: { createdAt: 1 },
      activityDate_desc: { date: -1 },
      activityDate_asc: { date: 1 },
    };
    const sortStage = sortMap[sortParam] || sortMap.createdAt_desc;

    const bookingsCollection = Booking.collection.name;

    const pipeline: any[] = [
      { $match: baseMatch },
      // Join Tour
      {
        $lookup: {
          from: 'tours',
          localField: 'tour',
          foreignField: '_id',
          as: 'tour',
        },
      },
      { $unwind: { path: '$tour', preserveNullAndEmptyArrays: true } },
      // Tenant filter: strict match when a specific brand is selected;
      // when "all" is selected, show all bookings (no filter).
      ...(effectiveTenantId
        ? [
            {
              $match: {
                $or: [{ tenantId: effectiveTenantId }, { 'tour.tenantId': effectiveTenantId }],
              },
            },
          ]
        : []),
      // Join Destination (optional)
      {
        $lookup: {
          from: 'destinations',
          localField: 'tour.destination',
          foreignField: '_id',
          as: 'destination',
        },
      },
      { $unwind: { path: '$destination', preserveNullAndEmptyArrays: true } },
      // Join User
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      // Derived strings for search
      {
        $addFields: {
          idStr: { $toString: '$_id' },
        },
      },
    ];

    if (search) {
      const safe = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(safe, 'i');
      pipeline.push({
        $match: {
          $or: [
            { bookingReference: { $regex: regex } },
            { idStr: { $regex: regex } },
            { 'user.name': { $regex: regex } },
            { 'user.email': { $regex: regex } },
            { 'user.firstName': { $regex: regex } },
            { 'user.lastName': { $regex: regex } },
            { 'tour.title': { $regex: regex } },
          ],
        },
      });
    }

    pipeline.push(
      { $sort: sortStage },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                _id: 1,
                tenantId: 1,
                bookingReference: 1,
                  source: 1,
                  createdBy: 1,
                date: 1,
                dateString: 1,
                time: 1,
                guests: 1,
                adultGuests: 1,
                childGuests: 1,
                infantGuests: 1,
                totalPrice: 1,
                status: 1,
                paymentMethod: 1,
                  paymentStatus: 1,
                  amountPaid: 1,
                  appliedOffer: 1,
                createdAt: 1,
                updatedAt: 1,
                tour: {
                  _id: '$tour._id',
                  title: '$tour.title',
                  image: '$tour.image',
                  duration: '$tour.duration',
                  tenantId: '$tour.tenantId',
                  destination: {
                    _id: '$destination._id',
                    name: '$destination.name',
                    slug: '$destination.slug',
                  },
                },
                user: {
                  _id: '$user._id',
                  name: '$user.name',
                  firstName: '$user.firstName',
                  lastName: '$user.lastName',
                  email: '$user.email',
                },
              },
            },
          ],
          meta: [{ $count: 'total' }],
        },
      }
    );

    const [result] = await (Booking as any).aggregate(pipeline).allowDiskUse(true);
    const data = result?.data || [];
    const total = result?.meta?.[0]?.total || 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return NextResponse.json({
      success: true,
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        collection: bookingsCollection,
      },
    });
  } catch (error) {
    console.error('Failed to fetch bookings:', error);
    return NextResponse.json({ message: 'Failed to fetch bookings' }, { status: 500 });
  }
}