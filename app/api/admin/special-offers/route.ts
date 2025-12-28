// app/api/admin/special-offers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import SpecialOffer from '@/lib/models/SpecialOffer';

export const dynamic = 'force-dynamic';

// GET - Fetch all special offers
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const isActive = searchParams.get('isActive');
    const type = searchParams.get('type');

    // Build query
    const query: Record<string, unknown> = {};
    
    if (tenantId && tenantId !== 'all') {
      query.tenantId = tenantId;
    }
    
    if (isActive !== null && isActive !== '') {
      query.isActive = isActive === 'true';
    }
    
    if (type) {
      query.type = type;
    }

    const offers = await SpecialOffer.find(query)
      .populate('applicableTours', 'title slug')
      .populate('applicableCategories', 'name slug')
      .sort({ priority: -1, createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: offers,
      count: offers.length,
    });
  } catch (error) {
    console.error('Error fetching special offers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch special offers' },
      { status: 500 }
    );
  }
}

// POST - Create new special offer
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();
    
    const {
      name,
      description,
      type,
      discountValue,
      code,
      minBookingValue,
      maxDiscount,
      minGroupSize,
      startDate,
      endDate,
      travelStartDate,
      travelEndDate,
      bookingWindow,
      applicableTours,
      applicableCategories,
      excludedTours,
      usageLimit,
      perUserLimit,
      isActive,
      isFeatured,
      featuredBadgeText,
      priority,
      tenantId,
      terms,
    } = body;

    if (!name || !type || discountValue === undefined || !startDate || !endDate || !tenantId) {
      return NextResponse.json(
        { success: false, error: 'Name, type, discount value, dates, and tenant ID are required' },
        { status: 400 }
      );
    }

    // Check for duplicate code
    if (code) {
      const existing = await SpecialOffer.findOne({ code: code.toUpperCase(), tenantId });
      if (existing) {
        return NextResponse.json(
          { success: false, error: 'Offer code already exists' },
          { status: 400 }
        );
      }
    }

    const offer = new SpecialOffer({
      name,
      description,
      type,
      discountValue,
      code: code?.toUpperCase(),
      minBookingValue,
      maxDiscount,
      minGroupSize,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      travelStartDate: travelStartDate ? new Date(travelStartDate) : undefined,
      travelEndDate: travelEndDate ? new Date(travelEndDate) : undefined,
      bookingWindow,
      applicableTours: applicableTours || [],
      applicableCategories: applicableCategories || [],
      excludedTours: excludedTours || [],
      usageLimit,
      perUserLimit: perUserLimit || 1,
      isActive: isActive !== false,
      isFeatured: isFeatured || false,
      featuredBadgeText: featuredBadgeText || 'Special Offer',
      priority: priority || 0,
      tenantId,
      terms: terms || [],
      usedCount: 0,
    });

    await offer.save();

    return NextResponse.json({
      success: true,
      data: offer,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating special offer:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create special offer' },
      { status: 500 }
    );
  }
}

// PUT - Update special offer
export async function PUT(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();
    const { _id, ...updateData } = body;

    if (!_id) {
      return NextResponse.json(
        { success: false, error: 'Offer ID is required' },
        { status: 400 }
      );
    }

    // Handle date conversions
    if (updateData.startDate) updateData.startDate = new Date(updateData.startDate);
    if (updateData.endDate) updateData.endDate = new Date(updateData.endDate);
    if (updateData.travelStartDate) updateData.travelStartDate = new Date(updateData.travelStartDate);
    if (updateData.travelEndDate) updateData.travelEndDate = new Date(updateData.travelEndDate);
    if (updateData.code) updateData.code = updateData.code.toUpperCase();

    const offer = await SpecialOffer.findByIdAndUpdate(
      _id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!offer) {
      return NextResponse.json(
        { success: false, error: 'Offer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: offer,
    });
  } catch (error) {
    console.error('Error updating special offer:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update special offer' },
      { status: 500 }
    );
  }
}

// DELETE - Delete special offer
export async function DELETE(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Offer ID is required' },
        { status: 400 }
      );
    }

    const offer = await SpecialOffer.findByIdAndDelete(id);

    if (!offer) {
      return NextResponse.json(
        { success: false, error: 'Offer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Offer deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting special offer:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete special offer' },
      { status: 500 }
    );
  }
}

