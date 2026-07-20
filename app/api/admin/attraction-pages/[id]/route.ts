import { NextRequest, NextResponse } from 'next/server';
import { revalidateStorefrontContent } from '@/lib/storefront/revalidateTourStorefront';
import { canAccessTenant, requireAdminAuth, tenantForbiddenResponse } from '@/lib/auth/adminAuth';
import dbConnect from '@/lib/dbConnect';
import AttractionPage from '@/lib/models/AttractionPage';
import Category from '@/lib/models/Category';
import mongoose from 'mongoose';
import {
  PageLinkValidationError,
  validateAndNormalizePageLinks,
} from '@/lib/attractionPages/validatePageLinks';

// Defensive helper: when an admin is scoped to a single tenant via the
// AdminTenantContext, every write must include `?tenantId=xxx`. We use that
// to require the target document to belong to that tenant. Absent param =
// behave as before (no enforcement).
function getTenantScope(request: NextRequest): string | undefined {
  const tenantIdParam = new URL(request.url).searchParams.get('tenantId');
  return tenantIdParam && tenantIdParam !== 'all' ? tenantIdParam : undefined;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminAuth(request, { permissions: ['manageContent'] });
  if (auth instanceof NextResponse) return auth;
  try {
    await dbConnect();

    const { id } = await params;
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid page ID'
      }, { status: 400 });
    }

    const unpopulatedPage = await AttractionPage.findById(id).lean();

    if (!unpopulatedPage) {
      return NextResponse.json({ success: false, error: 'Page not found' }, { status: 404 });
    }
    const pageTenantId = String((unpopulatedPage as { tenantId?: string }).tenantId || 'default');
    if (!canAccessTenant(auth, pageTenantId)) return tenantForbiddenResponse();

    const page = await AttractionPage.findOne({ _id: id, tenantId: pageTenantId })
      .populate({
        path: 'categoryId',
        model: Category,
        match: { tenantId: pageTenantId },
        select: 'name slug'
      })
      .lean();

    if (!page) {
      return NextResponse.json({
        success: false,
        error: 'Page not found'
      }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      data: page
    });
  } catch (error) {
    console.error('Error fetching attraction page:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch attraction page',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminAuth(request, { permissions: ['manageContent'] });
  if (auth instanceof NextResponse) return auth;
  try {
    await dbConnect();

    const { id } = await params;
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid page ID'
      }, { status: 400 });
    }

    const body = await request.json();
    const existingTarget = await AttractionPage.findById(id).select('tenantId').lean();
    if (!existingTarget) return NextResponse.json({ success: false, error: 'Page not found' }, { status: 404 });
    const targetTenantId = String((existingTarget as any).tenantId || 'default');
    if (!canAccessTenant(auth, targetTenantId)) return tenantForbiddenResponse();
    delete body.tenantId;
    
    
    // Check if slug is being changed and if it conflicts
    if (body.slug) {
      const existingPage = await AttractionPage.findOne({ 
        slug: body.slug,
        _id: { $ne: id },
        tenantId: targetTenantId,
      });
      
      if (existingPage) {
        return NextResponse.json({
          success: false,
          error: 'Slug already exists'
        }, { status: 400 });
      }
    }

    // Validate categoryId if pageType is category
    if (body.pageType === 'category' && body.categoryId) {
      const category = await Category.findOne({ _id: body.categoryId, tenantId: targetTenantId });
      if (!category) {
        return NextResponse.json({
          success: false,
          error: 'Category not found'
        }, { status: 400 });
      }
    }

    // PROPERLY HANDLE ARRAYS - This is the fix
    const linkedContent = await validateAndNormalizePageLinks(body, targetTenantId, id);
    const updateData = {
      ...body,
      ...linkedContent,
      // Ensure arrays are properly handled
      images: Array.isArray(body.images) ? body.images : (body.images ? [body.images] : []),
      highlights: Array.isArray(body.highlights) ? body.highlights : (body.highlights ? [body.highlights] : []),
      features: Array.isArray(body.features) ? body.features : (body.features ? [body.features] : []),
      keywords: Array.isArray(body.keywords) ? body.keywords : (body.keywords ? [body.keywords] : []),
    };


    const tenantId = getTenantScope(request);
    if (tenantId && tenantId !== targetTenantId) return tenantForbiddenResponse();
    const updateFilter: Record<string, unknown> = { _id: id, tenantId: targetTenantId };

    const page = await AttractionPage.findOneAndUpdate(
      updateFilter,
      updateData, // Use processed data instead of raw body
      { new: true, runValidators: true }
    )
    .populate({
      path: 'categoryId',
      model: Category,
      select: 'name slug'
    });

    if (!page) {
      return NextResponse.json({
        success: false,
        error: 'Page not found'
      }, { status: 404 });
    }

    revalidateStorefrontContent();

    console.log('✅ Page updated successfully');

    return NextResponse.json({
      success: true,
      data: page
    });
  } catch (error) {
    console.error('❌ Error updating attraction page:', error);
    if (error instanceof PageLinkValidationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    
    // Handle validation errors
    if (error instanceof Error && error.name === 'ValidationError') {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        details: error.message
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to update attraction page',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminAuth(request, { permissions: ['manageContent'] });
  if (auth instanceof NextResponse) return auth;
  try {
    await dbConnect();

    const { id } = await params;
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid page ID'
      }, { status: 400 });
    }

    const existingTarget = await AttractionPage.findById(id).select('tenantId').lean();
    if (!existingTarget) return NextResponse.json({ success: false, error: 'Page not found' }, { status: 404 });
    const targetTenantId = String((existingTarget as any).tenantId || 'default');
    if (!canAccessTenant(auth, targetTenantId)) return tenantForbiddenResponse();
    const tenantId = getTenantScope(request);
    if (tenantId && tenantId !== targetTenantId) return tenantForbiddenResponse();
    const deleteFilter: Record<string, unknown> = { _id: id, tenantId: targetTenantId };

    const page = await AttractionPage.findOneAndDelete(deleteFilter);

    if (!page) {
      return NextResponse.json({
        success: false,
        error: 'Page not found'
      }, { status: 404 });
    }

    revalidateStorefrontContent();

    console.log('Attraction page deleted successfully:', id);

    return NextResponse.json({
      success: true,
      message: 'Page deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting attraction page:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete attraction page',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
