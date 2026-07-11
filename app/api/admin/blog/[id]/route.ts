import { NextRequest, NextResponse } from 'next/server';
import { canAccessTenant, requireAdminAuth, tenantForbiddenResponse } from '@/lib/auth/adminAuth';
import dbConnect from '@/lib/dbConnect';
import Blog from '@/lib/models/Blog';
import mongoose from 'mongoose';

// Defensive helper: when an admin is scoped to a single tenant via the
// AdminTenantContext, every write must include `?tenantId=xxx`. We use that
// to require the target document to belong to that tenant. Absent param =
// behave as before (no enforcement).
function getTenantScope(request: NextRequest): string | undefined {
  const tenantIdParam = new URL(request.url).searchParams.get('tenantId');
  return tenantIdParam && tenantIdParam !== 'all' ? tenantIdParam : undefined;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminAuth(request, { permissions: ['manageContent'] });
  if (auth instanceof NextResponse) return auth;
  try {
    await dbConnect();
    
    const data = await request.json();
    const { id } = await params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid blog post ID' 
      }, { status: 400 });
    }
    const existing = await Blog.findById(id).select('tenantId').lean();
    if (!existing) return NextResponse.json({ success: false, error: 'Blog post not found' }, { status: 404 });
    const targetTenantId = String((existing as any).tenantId || 'default');
    if (!canAccessTenant(auth, targetTenantId)) return tenantForbiddenResponse();
    delete data.tenantId;
    
    const tenantId = getTenantScope(request);
    if (tenantId && tenantId !== targetTenantId) return tenantForbiddenResponse();
    const updateFilter: Record<string, unknown> = { _id: id, tenantId: targetTenantId };

    const blog = await Blog.findOneAndUpdate(
      updateFilter,
      data,
      {
        new: true,
        runValidators: true
      }
    );
    
    if (!blog) {
      return NextResponse.json({ 
        success: false, 
        error: 'Blog post not found' 
      }, { status: 404 });
    }
    
    return NextResponse.json({ 
      success: true, 
      data: blog,
      message: 'Blog post updated successfully' 
    });
  } catch (error: any) {
    console.error('Error updating blog post:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return NextResponse.json({ 
        success: false, 
        error: `${field} already exists` 
      }, { status: 400 });
    }
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e: any) => e.message);
      return NextResponse.json({ 
        success: false, 
        error: messages.join(', ') 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update blog post' 
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
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid blog post ID' 
      }, { status: 400 });
    }
    
    const existing = await Blog.findById(id).select('tenantId').lean();
    if (!existing) return NextResponse.json({ success: false, error: 'Blog post not found' }, { status: 404 });
    const targetTenantId = String((existing as any).tenantId || 'default');
    if (!canAccessTenant(auth, targetTenantId)) return tenantForbiddenResponse();
    const tenantId = getTenantScope(request);
    if (tenantId && tenantId !== targetTenantId) return tenantForbiddenResponse();
    const deleteFilter: Record<string, unknown> = { _id: id, tenantId: targetTenantId };

    const blog = await Blog.findOneAndDelete(deleteFilter);

    if (!blog) {
      return NextResponse.json({
        success: false,
        error: 'Blog post not found'
      }, { status: 404 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Blog post deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting blog post:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to delete blog post' 
    }, { status: 500 });
  }
}
