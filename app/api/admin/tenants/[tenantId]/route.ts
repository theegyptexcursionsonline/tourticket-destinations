// app/api/admin/tenants/[tenantId]/route.ts
// Admin API for single tenant operations - Get, Update, Delete

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { requireAdminAuth } from '@/lib/auth/adminAuth';
import Tenant from '@/lib/models/Tenant';
import { clearTenantCache } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{
    tenantId: string;
  }>;
}

/**
 * GET /api/admin/tenants/[tenantId]
 * Get a single tenant by tenantId
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const auth = await requireAdminAuth(request, { permissions: ['manageUsers'] });
  if (auth instanceof NextResponse) return auth;
  try {
    await dbConnect();
    
    const { tenantId } = await params;
    
    const tenant = await Tenant.findOne({ tenantId })
      .populate('heroSettings')
      .populate('primaryDestination')
      .populate('allowedDestinations')
      .populate('allowedCategories')
      .lean();
    
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: tenant,
    });
    
  } catch (error) {
    console.error('Error fetching tenant:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tenant' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/tenants/[tenantId]
 * Update a tenant
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  const auth = await requireAdminAuth(request, { permissions: ['manageUsers'] });
  if (auth instanceof NextResponse) return auth;
  try {
    await dbConnect();
    
    const { tenantId } = await params;
    const body = await request.json();
    
    // Find existing tenant
    const existingTenant = await Tenant.findOne({ tenantId });
    
    if (!existingTenant) {
      return NextResponse.json(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      );
    }
    
    // Prevent changing tenantId
    if (body.tenantId && body.tenantId !== tenantId) {
      return NextResponse.json(
        { success: false, error: 'Cannot change tenantId' },
        { status: 400 }
      );
    }
    
    // Check if new domain conflicts with existing tenants
    if (body.domain && body.domain !== existingTenant.domain) {
      const domainConflict = await Tenant.findOne({
        _id: { $ne: existingTenant._id },
        $or: [
          { domain: body.domain.toLowerCase() },
          { domains: body.domain.toLowerCase() },
        ],
      });
      
      if (domainConflict) {
        return NextResponse.json(
          { success: false, error: 'A tenant with this domain already exists' },
          { status: 400 }
        );
      }
    }
    
    // Update tenant
    const updatedTenant = await Tenant.findOneAndUpdate(
      { tenantId },
      { 
        $set: {
          ...body,
          tenantId, // Ensure tenantId doesn't change
        },
      },
      { 
        new: true,
        runValidators: true,
      }
    ).populate('heroSettings').lean();
    
    // Clear cache
    clearTenantCache(tenantId);
    
    return NextResponse.json({
      success: true,
      data: updatedTenant,
    });
    
  } catch (error: unknown) {
    console.error('Error updating tenant:', error);
    
    // Handle validation errors
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ValidationError' && 'errors' in error) {
      const validationError = error as { errors: Record<string, { message: string }> };
      const messages = Object.values(validationError.errors).map(e => e.message);
      return NextResponse.json(
        { success: false, error: messages.join(', ') },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to update tenant' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/tenants/[tenantId]
 * Delete a tenant (soft delete by setting isActive to false)
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  const auth = await requireAdminAuth(request, { permissions: ['manageUsers'] });
  if (auth instanceof NextResponse) return auth;
  try {
    await dbConnect();
    
    const { tenantId } = await params;
    
    // Get query param to determine hard or soft delete
    const { searchParams } = new URL(request.url);
    const hardDelete = searchParams.get('hard') === 'true';
    
    const tenant = await Tenant.findOne({ tenantId });
    
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      );
    }
    
    // Prevent deleting default tenant
    if (tenant.isDefault) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete the default tenant' },
        { status: 400 }
      );
    }
    
    if (hardDelete) {
      // Hard delete - permanently remove tenant
      // Note: This should also clean up all related data (tours, bookings, etc.)
      // For now, we just delete the tenant document
      await Tenant.deleteOne({ tenantId });
      
      // Clear cache
      clearTenantCache(tenantId);
      
      return NextResponse.json({
        success: true,
        message: 'Tenant permanently deleted',
        hardDelete: true,
      });
    } else {
      // Soft delete - just mark as inactive
      await Tenant.updateOne(
        { tenantId },
        { $set: { isActive: false } }
      );
      
      // Clear cache
      clearTenantCache(tenantId);
      
      return NextResponse.json({
        success: true,
        message: 'Tenant deactivated',
        hardDelete: false,
      });
    }
    
  } catch (error) {
    console.error('Error deleting tenant:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete tenant' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/tenants/[tenantId]
 * Partial update of tenant (e.g., toggle active status)
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  const auth = await requireAdminAuth(request, { permissions: ['manageUsers'] });
  if (auth instanceof NextResponse) return auth;
  try {
    await dbConnect();
    
    const { tenantId } = await params;
    const body = await request.json();
    
    const tenant = await Tenant.findOne({ tenantId });
    
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      );
    }
    
    // Handle specific actions
    const { action } = body;
    
    switch (action) {
      case 'activate':
        await Tenant.updateOne({ tenantId }, { $set: { isActive: true } });
        break;
        
      case 'deactivate':
        if (tenant.isDefault) {
          return NextResponse.json(
            { success: false, error: 'Cannot deactivate the default tenant' },
            { status: 400 }
          );
        }
        await Tenant.updateOne({ tenantId }, { $set: { isActive: false } });
        break;
        
      case 'setDefault':
        // Remove default from other tenants
        await Tenant.updateMany({ isDefault: true }, { $set: { isDefault: false } });
        // Set this tenant as default
        await Tenant.updateOne({ tenantId }, { $set: { isDefault: true, isActive: true } });
        break;
        
      default:
        // Regular partial update
        const updateData: Record<string, unknown> = {};
        
        // Only allow certain fields to be patched
        const allowedFields = [
          'name',
          'isActive',
          'features',
          'promoBar',
        ];
        
        for (const field of allowedFields) {
          if (body[field] !== undefined) {
            updateData[field] = body[field];
          }
        }
        
        if (Object.keys(updateData).length > 0) {
          await Tenant.updateOne({ tenantId }, { $set: updateData });
        }
    }
    
    // Clear cache
    clearTenantCache(tenantId);
    clearTenantCache(); // Clear all cache if setting default
    
    // Get updated tenant
    const updatedTenant = await Tenant.findOne({ tenantId }).lean();
    
    return NextResponse.json({
      success: true,
      data: updatedTenant,
    });
    
  } catch (error) {
    console.error('Error patching tenant:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update tenant' },
      { status: 500 }
    );
  }
}

