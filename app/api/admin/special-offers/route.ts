// app/api/admin/special-offers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import SpecialOffer from '@/lib/models/SpecialOffer';
import { requireAdminAuth } from '@/lib/auth/adminAuth';

export const dynamic = 'force-dynamic';

// GET - Fetch all special offers
export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request, { permissions: ['managePricing'], requireAll: false });
  if (auth instanceof NextResponse) return auth;

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
      .populate('applicableTours', 'title slug bookingOptions')
      .populate('applicableCategories', 'name slug')
      .populate('tourOptionSelections.tourId', 'title slug bookingOptions')
      .sort({ priority: -1, createdAt: -1 })
      .lean();

    // Enhance offers with tour count info
    const enhancedOffers = offers.map(offer => {
      const tourCount = offer.applicableTours?.length || 0;
      const optionSelectionsCount = offer.tourOptionSelections?.length || 0;
      const totalTours = tourCount || optionSelectionsCount;
      const appliesToAllTours = totalTours === 0;
      
      return {
        ...offer,
        tourCount: totalTours,
        appliesToAllTours,
      };
    });

    return NextResponse.json({
      success: true,
      data: enhancedOffers,
      count: enhancedOffers.length,
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
  const auth = await requireAdminAuth(request, { permissions: ['managePricing'] });
  if (auth instanceof NextResponse) return auth;

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
      // Early bird: minimum days before tour required
      minDaysInAdvance,
      // Last minute: maximum days before tour allowed
      maxDaysBeforeTour,
      startDate,
      endDate,
      travelStartDate,
      travelEndDate,
      bookingWindow,
      applicableTours,
      tourOptionSelections,
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

    // Validate required fields
    if (!name || !type || discountValue === undefined || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'Name, type, discount value, and dates are required' },
        { status: 400 }
      );
    }

    // Validate tenant - must not be 'all' or empty
    if (!tenantId || tenantId === 'all') {
      return NextResponse.json(
        { success: false, error: 'Please select a specific brand to create an offer. Offers cannot be created for "All Brands".' },
        { status: 400 }
      );
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end <= start) {
      return NextResponse.json(
        { success: false, error: 'End date must be after start date' },
        { status: 400 }
      );
    }

    // Validate discount value
    if (type === 'percentage' && (discountValue < 0 || discountValue > 100)) {
      return NextResponse.json(
        { success: false, error: 'Percentage discount must be between 0 and 100' },
        { status: 400 }
      );
    }

    // Check for duplicate code within tenant
    if (code && code.trim()) {
      const existing = await SpecialOffer.findOne({ 
        code: code.toUpperCase().trim(), 
        tenantId 
      });
      if (existing) {
        return NextResponse.json(
          { success: false, error: 'Offer code already exists for this brand' },
          { status: 400 }
        );
      }
    }

    const offer = new SpecialOffer({
      name: name.trim(),
      description: description?.trim(),
      type,
      discountValue,
      code: code?.trim() ? code.toUpperCase().trim() : undefined,
      minBookingValue: minBookingValue || undefined,
      maxDiscount: maxDiscount || undefined,
      minGroupSize: minGroupSize || undefined,
      // Early bird & last minute specific fields
      minDaysInAdvance: type === 'early_bird' ? (minDaysInAdvance || 7) : undefined,
      maxDaysBeforeTour: type === 'last_minute' ? (maxDaysBeforeTour || 2) : undefined,
      startDate: start,
      endDate: end,
      travelStartDate: travelStartDate ? new Date(travelStartDate) : undefined,
      travelEndDate: travelEndDate ? new Date(travelEndDate) : undefined,
      bookingWindow: bookingWindow || undefined,
      applicableTours: applicableTours || [],
      tourOptionSelections: tourOptionSelections || [],
      applicableCategories: applicableCategories || [],
      excludedTours: excludedTours || [],
      usageLimit: usageLimit || undefined,
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

    // Populate the response with tour details
    await offer.populate('applicableTours', 'title slug bookingOptions');

    return NextResponse.json({
      success: true,
      data: offer,
      message: 'Offer created successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating special offer:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create special offer';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

// PUT - Update special offer
export async function PUT(request: NextRequest) {
  const auth = await requireAdminAuth(request, { permissions: ['managePricing'] });
  if (auth instanceof NextResponse) return auth;

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
    if (updateData.code) updateData.code = updateData.code.toUpperCase().trim();

    // Validate dates if both provided
    if (updateData.startDate && updateData.endDate && updateData.endDate <= updateData.startDate) {
      return NextResponse.json(
        { success: false, error: 'End date must be after start date' },
        { status: 400 }
      );
    }

    // Validate percentage discount
    if (updateData.type === 'percentage' && updateData.discountValue !== undefined) {
      if (updateData.discountValue < 0 || updateData.discountValue > 100) {
        return NextResponse.json(
          { success: false, error: 'Percentage discount must be between 0 and 100' },
          { status: 400 }
        );
      }
    }

    // Check for duplicate code if updating code
    if (updateData.code) {
      const existingOffer = await SpecialOffer.findById(_id);
      if (existingOffer) {
        const duplicateCode = await SpecialOffer.findOne({
          _id: { $ne: _id },
          code: updateData.code,
          tenantId: existingOffer.tenantId,
        });
        if (duplicateCode) {
          return NextResponse.json(
            { success: false, error: 'Offer code already exists for this brand' },
            { status: 400 }
          );
        }
      }
    }

    const offer = await SpecialOffer.findByIdAndUpdate(
      _id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate('applicableTours', 'title slug bookingOptions')
      .populate('tourOptionSelections.tourId', 'title slug bookingOptions');

    if (!offer) {
      return NextResponse.json(
        { success: false, error: 'Offer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: offer,
      message: 'Offer updated successfully',
    });
  } catch (error) {
    console.error('Error updating special offer:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update special offer';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE - Delete special offer
export async function DELETE(request: NextRequest) {
  const auth = await requireAdminAuth(request, { permissions: ['managePricing'] });
  if (auth instanceof NextResponse) return auth;

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

