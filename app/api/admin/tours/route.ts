// app/api/admin/tours/route.ts
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import { NextRequest, NextResponse } from 'next/server';
import { syncTourToAlgolia } from '@/lib/algolia';
import { requireAdminAuth } from '@/lib/auth/adminAuth';
import { translateTourInBackground } from '@/lib/translation/translateService';

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

    // Filter by tenant if specified (and not 'all'). Match on either the
    // primary `tenantId` or the multi-brand `tenantIds` list (Issue #17) so
    // the admin tour list for a secondary brand still surfaces multi-brand
    // tours owned by another brand.
    if (tenantId && tenantId !== 'all') {
      filter.$or = [
        { tenantId: tenantId },
        { tenantIds: tenantId },
      ];
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

    // Tenant guard: if a tenantId scope is passed (from AdminTenantContext),
    // require body.tenantId to match. Prevents an admin viewing tenant A from
    // accidentally creating a tour under tenant B by tampering with body.
    // Absent param = behave as before.
    const tenantIdParam = new URL(request.url).searchParams.get('tenantId');
    const effectiveTenantId =
      tenantIdParam && tenantIdParam !== 'all' ? tenantIdParam : undefined;
    if (effectiveTenantId) {
      if (body.tenantId && body.tenantId !== effectiveTenantId) {
        return NextResponse.json(
          { success: false, error: 'Cannot create tour for a different tenant' },
          { status: 403 }
        );
      }
      // Force the tenant from the scope so the create is locked to it
      body.tenantId = effectiveTenantId;
      // For the multi-brand selector (Issue #17): a scoped admin can only
      // assign the tour to brands THEY are scoped to. Strip any extra tenant
      // IDs they tried to slip in, and ensure the scope itself is always in
      // the visibility list.
      if (Array.isArray(body.tenantIds)) {
        body.tenantIds = Array.from(
          new Set(
            [effectiveTenantId, ...body.tenantIds].filter(
              (id: unknown) => typeof id === 'string' && id === effectiveTenantId
            )
          )
        );
      } else {
        body.tenantIds = [effectiveTenantId];
      }
    }

    // Normalize tenantIds on the server as a defense-in-depth layer: the
    // pre-save hook on the model does the same thing, but doing it here gives
    // us a chance to reject obviously invalid payloads before hitting Mongoose.
    if (Array.isArray(body.tenantIds)) {
      body.tenantIds = Array.from(
        new Set(body.tenantIds.filter((id: unknown) => typeof id === 'string' && id.length > 0))
      );
      if (body.tenantId && !body.tenantIds.includes(body.tenantId)) {
        body.tenantIds.unshift(body.tenantId);
      }
    } else if (body.tenantId) {
      body.tenantIds = [body.tenantId];
    }

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
      body.category = body.category.filter((id: any) => id && id.trim());
    }
    if (body.attractions && Array.isArray(body.attractions)) {
      body.attractions = body.attractions.filter((id: any) => id && id.trim());
    }
    if (body.interests && Array.isArray(body.interests)) {
      body.interests = body.interests.filter((id: any) => id && id.trim());
    }

    const tour = await Tour.create(body);
    
    let populated: any = tour;
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

    // Auto-translate in background (non-blocking)
    if (process.env.OPENAI_API_KEY) {
      translateTourInBackground((tour as any)._id.toString()).catch(err =>
        console.warn('[Translation] Background translation failed:', err)
      );
    }

    return NextResponse.json({ success: true, data: populated ?? tour }, { status: 201 });
  } catch (error) {
    console.error('Error creating tour:', error);
    const message = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}