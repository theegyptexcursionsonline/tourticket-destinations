import { registerAdminAuditDetail, withAdminAudit } from '@/lib/admin/adminAudit';
import {
  contentPageAuditAttemptDetail,
  contentPageAuditDetail,
} from '@/lib/admin/contentPageAudit';
// app/api/categories/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { revalidateStorefrontContent } from '@/lib/storefront/revalidateTourStorefront';
import dbConnect from '@/lib/dbConnect';
import Category from '@/lib/models/Category';
import mongoose from 'mongoose';
import { canAccessTenant, requireAdminAuth, tenantForbiddenResponse } from '@/lib/auth/adminAuth';
import { buildStrictTenantQuery, getTenantFromRequest } from '@/lib/tenant';
import { sanitizeContentNavigation } from '@/lib/content/contentNavigation';
import { ParentPageValidationError, validateParentPageSelection } from '@/lib/content/validateParentPage';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid category ID'
      }, { status: 400 });
    }

    if (request.cookies.has('admin-auth-token')) {
      const adminAuth = await requireAdminAuth(request, { permissions: ['manageContent'] });
      if (adminAuth instanceof NextResponse) return adminAuth;
      const adminCategory = await Category.findById(id).lean();
      if (!adminCategory) {
        return NextResponse.json({ success: false, error: 'Category not found' }, { status: 404 });
      }
      const adminTenantId = String((adminCategory as { tenantId?: string }).tenantId || 'default');
      if (!canAccessTenant(adminAuth, adminTenantId)) return tenantForbiddenResponse();
      return NextResponse.json({ success: true, data: adminCategory });
    }

    const tenantId = await getTenantFromRequest();
    const category = await Category.findOne(
      buildStrictTenantQuery({ _id: id, isPublished: true }, tenantId),
    ).lean();

    if (!category) {
      return NextResponse.json({
        success: false,
        error: 'Category not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Error fetching category:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch category'
    }, { status: 500 });
  }
}

async function PUTHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminAuth = await requireAdminAuth(request, {
      permissions: ['manageContent'],
    });
    if (adminAuth instanceof NextResponse) return adminAuth;

    await dbConnect();

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid category ID'
      }, { status: 400 });
    }

    const body = await request.json();
    Object.assign(body, sanitizeContentNavigation(body));
    const existing = await Category.findById(id).lean();
    if (!existing) return NextResponse.json({ success: false, error: 'Category not found' }, { status: 404 });
    const tenantId = String((existing as any).tenantId || 'default');
    if (!canAccessTenant(adminAuth, tenantId)) return tenantForbiddenResponse();
    registerAdminAuditDetail(contentPageAuditAttemptDetail({
      kind: 'category page',
      operation: 'update',
      record: existing,
      resourceId: id,
    }));
    delete body.tenantId;
    if (Object.prototype.hasOwnProperty.call(body, 'parentPage')) {
      body.parentPage = await validateParentPageSelection({
        parentPage: body.parentPage,
        currentId: id,
        currentSlug: body.slug || String((existing as { slug?: string }).slug || ''),
        tenantFilter: { tenantId },
      });
    }
    
    // Check if slug is being changed and if it conflicts
    if (body.slug) {
      const existingCategory = await Category.findOne({ 
        slug: body.slug,
        _id: { $ne: id },
        tenantId,
      });
      
      if (existingCategory) {
        return NextResponse.json({
          success: false,
          error: 'Slug already exists'
        }, { status: 400 });
      }
    }

    const category = await Category.findOneAndUpdate(
      { _id: id, tenantId },
      body,
      { new: true, runValidators: true }
    );
    revalidateStorefrontContent();

    if (!category) {
      return NextResponse.json({
        success: false,
        error: 'Category not found'
      }, { status: 404 });
    }
    registerAdminAuditDetail(contentPageAuditDetail({
      kind: 'category page',
      operation: 'update',
      before: existing,
      after: category,
    }));

    return NextResponse.json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Error updating category:', error);
    if (error instanceof ParentPageValidationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    
    if (error instanceof Error && error.name === 'ValidationError') {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        details: error.message
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to update category'
    }, { status: 500 });
  }
}

async function DELETEHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminAuth = await requireAdminAuth(request, {
      permissions: ['manageContent'],
    });
    if (adminAuth instanceof NextResponse) return adminAuth;

    await dbConnect();

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid category ID'
      }, { status: 400 });
    }

    const existing = await Category.findById(id).lean();
    if (!existing) return NextResponse.json({ success: false, error: 'Category not found' }, { status: 404 });
    const tenantId = String((existing as any).tenantId || 'default');
    if (!canAccessTenant(adminAuth, tenantId)) return tenantForbiddenResponse();
    const category = await Category.findOneAndDelete({ _id: id, tenantId });
    revalidateStorefrontContent();

    if (!category) {
      return NextResponse.json({
        success: false,
        error: 'Category not found'
      }, { status: 404 });
    }
    registerAdminAuditDetail(contentPageAuditDetail({
      kind: 'category page',
      operation: 'delete',
      before: category,
    }));

    return NextResponse.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete category'
    }, { status: 500 });
  }
}

export const PUT = withAdminAudit(PUTHandler);
export const DELETE = withAdminAudit(DELETEHandler);
