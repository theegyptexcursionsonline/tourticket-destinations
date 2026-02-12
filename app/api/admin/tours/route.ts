// app/api/admin/tours/route.ts
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import { NextRequest, NextResponse } from 'next/server';
import { syncTourToAlgolia } from '@/lib/algolia';
import { requireAdminAuth } from '@/lib/auth/adminAuth';

function generateOptionId() {
  return globalThis.crypto?.randomUUID?.() || `opt-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// Helper function to clean booking options
function cleanBookingOptions(bookingOptions: any[]): any[] {
  if (!Array.isArray(bookingOptions)) return [];
  
  return bookingOptions.map(option => {
    const cleanedOption = { ...option };

    // Ensure stable option id exists (required for option-level stop-sale)
    if (!cleanedOption.id) {
      cleanedOption.id = generateOptionId();
    }
    
    // Remove empty or invalid difficulty values
    if (!cleanedOption.difficulty || cleanedOption.difficulty.trim() === '') {
      delete cleanedOption.difficulty;
    } else {
      const validDifficulties = ['Easy', 'Moderate', 'Challenging', 'Difficult'];
      if (!validDifficulties.includes(cleanedOption.difficulty)) {
        delete cleanedOption.difficulty;
      }
    }
    
    // Clean other optional fields
    if (!cleanedOption.badge || cleanedOption.badge.trim() === '') {
      delete cleanedOption.badge;
    }
    
    if (!cleanedOption.description || cleanedOption.description.trim() === '') {
      delete cleanedOption.description;
    }
    
    if (!cleanedOption.duration || cleanedOption.duration.trim() === '') {
      delete cleanedOption.duration;
    }
    
    if (!cleanedOption.groupSize || cleanedOption.groupSize.trim() === '') {
      delete cleanedOption.groupSize;
    }
    
    // Ensure arrays are properly handled
    if (!Array.isArray(cleanedOption.languages)) {
      cleanedOption.languages = [];
    }
    
    if (!Array.isArray(cleanedOption.highlights)) {
      cleanedOption.highlights = [];
    }
    
    // Ensure numeric fields are properly typed
    if (cleanedOption.price) {
      cleanedOption.price = Number(cleanedOption.price);
    }
    
    if (cleanedOption.originalPrice) {
      cleanedOption.originalPrice = Number(cleanedOption.originalPrice);
    }
    
    if (cleanedOption.discount) {
      cleanedOption.discount = Number(cleanedOption.discount);
    }
    
    return cleanedOption;
  });
}

async function fetchToursWithPopulate(filter: Record<string, unknown> = {}) {
  try {
    return await Tour.find(filter)
      .populate('category')
      .populate('destination')
      .populate('reviews')
      .populate('attractions')
      .populate('interests')
      .sort({ createdAt: -1 })
      .lean();
  } catch (err) {
    console.warn('Populate failed, retrying with strictPopulate:false', err);
    return await Tour.find(filter)
      .populate({ path: 'category', strictPopulate: false })
      .populate({ path: 'destination', strictPopulate: false })
      .populate({ path: 'reviews', strictPopulate: false })
      .populate({ path: 'attractions', strictPopulate: false })
      .populate({ path: 'interests', strictPopulate: false })
      .sort({ createdAt: -1 })
      .lean();
  }
}

// GET all tours (with optional tenant filter)
export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request, { permissions: ['manageTours'] });
  if (auth instanceof NextResponse) return auth;
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId');
  const effectiveTenantId = tenantId && tenantId !== 'all' ? tenantId : undefined;
  await dbConnect(effectiveTenantId || undefined);

  try {
    const published = searchParams.get('published');
    const featured = searchParams.get('featured');
    
    // Build filter object
    const filter: Record<string, unknown> = {};
    
    // Filter by tenant if specified (and not 'all')
    if (tenantId && tenantId !== 'all') {
      filter.tenantId = tenantId;
    }
    
    // Filter by published status if specified
    if (published === 'true') {
      filter.isPublished = true;
    } else if (published === 'false') {
      filter.isPublished = false;
    }
    
    // Filter by featured status if specified
    if (featured === 'true') {
      filter.isFeatured = true;
    }
    
    const tours = await fetchToursWithPopulate(filter);

    return NextResponse.json({ 
      success: true, 
      data: tours,
      meta: {
        total: tours.length,
        tenantId: tenantId || 'all',
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching tours:', error);
    const message = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST a new tour
export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth(request, { permissions: ['manageTours'] });
  if (auth instanceof NextResponse) return auth;

  await dbConnect();
  
  try {
    const body = await request.json();
    
    // Map 'faqs' from form to 'faq' in the database model
    if (body.faqs) {
      body.faq = body.faqs;
      delete body.faqs;
    }

    // Clean booking options to remove invalid enum values
    if (body.bookingOptions && Array.isArray(body.bookingOptions)) {
      body.bookingOptions = cleanBookingOptions(body.bookingOptions);
    }

    // Handle category, attractions and interests arrays
    if (body.category && Array.isArray(body.category)) {
      body.category = body.category.filter(id => id && id.trim());
    }
    if (body.attractions && Array.isArray(body.attractions)) {
      body.attractions = body.attractions.filter(id => id && id.trim());
    }
    if (body.interests && Array.isArray(body.interests)) {
      body.interests = body.interests.filter(id => id && id.trim());
    }

    const tour = await Tour.create(body);
    
    let populated = tour;
    try {
      populated = await Tour.findById(tour._id)
        .populate('category')
        .populate('destination')
        .populate('reviews')
        .populate('attractions')
        .populate('interests')
        .lean();
    } catch (popErr) {
      console.warn('Populate after create failed, returning raw tour', popErr);
    }

    // Sync to Algolia if published
    if (body.isPublished) {
      try {
        await syncTourToAlgolia(populated ?? tour);
      } catch (algoliaErr) {
        console.warn('Failed to sync tour to Algolia:', algoliaErr);
        // Don't fail the request if Algolia sync fails
      }
    }

    return NextResponse.json({ success: true, data: populated ?? tour }, { status: 201 });
  } catch (error) {
    console.error('Error creating tour:', error);
    const message = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}