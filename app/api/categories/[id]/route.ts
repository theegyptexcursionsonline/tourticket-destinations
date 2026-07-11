// app/api/categories/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Category from '@/lib/models/Category';
import mongoose from 'mongoose';
import { canAccessTenant, requireAdminAuth, tenantForbiddenResponse } from '@/lib/auth/adminAuth';
import { buildStrictTenantQuery, getTenantFromRequest } from '@/lib/tenant';

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

export async function PUT(
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
    const existing = await Category.findById(id).select('tenantId').lean();
    if (!existing) return NextResponse.json({ success: false, error: 'Category not found' }, { status: 404 });
    const tenantId = String((existing as any).tenantId || 'default');
    if (!canAccessTenant(adminAuth, tenantId)) return tenantForbiddenResponse();
    delete body.tenantId;
    
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
    console.error('Error updating category:', error);
    
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

export async function DELETE(
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

    const existing = await Category.findById(id).select('tenantId').lean();
    if (!existing) return NextResponse.json({ success: false, error: 'Category not found' }, { status: 404 });
    const tenantId = String((existing as any).tenantId || 'default');
    if (!canAccessTenant(adminAuth, tenantId)) return tenantForbiddenResponse();
    const category = await Category.findOneAndDelete({ _id: id, tenantId });

    if (!category) {
      return NextResponse.json({
        success: false,
        error: 'Category not found'
      }, { status: 404 });
    }

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
