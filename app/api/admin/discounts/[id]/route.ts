import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Discount from '@/lib/models/Discount';
import { requireAdminAuth } from '@/lib/auth/adminAuth';

// Defensive helper: when an admin is scoped to a single tenant via the
// AdminTenantContext, every write must include `?tenantId=xxx`. We use that
// to require the target document to belong to that tenant. If the param is
// absent ("All Brands" or non-scoped automation), we behave as before.
function getTenantScope(request: NextRequest): string | undefined {
  const tenantIdParam = new URL(request.url).searchParams.get('tenantId');
  return tenantIdParam && tenantIdParam !== 'all' ? tenantIdParam : undefined;
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminAuth(request, { permissions: ['manageDiscounts'] });
  if (auth instanceof NextResponse) return auth;

  await dbConnect();

  try {
    const { id } = await params;
    const body = await request.json();

    const filter: Record<string, unknown> = { _id: id };
    const tenantId = getTenantScope(request);
    if (tenantId) filter.tenantId = tenantId;

    const updatedDiscount = await Discount.findOneAndUpdate(filter, body, {
      new: true,
      runValidators: true,
    });

    if (!updatedDiscount) {
      return NextResponse.json({ success: false, error: 'Discount not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedDiscount });
  } catch (error) {
    console.error('Failed to update discount:', error);
    return NextResponse.json({ success: false, error: 'Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminAuth(request, { permissions: ['manageDiscounts'] });
  if (auth instanceof NextResponse) return auth;

  await dbConnect();

  try {
    const { id } = await params;

    const filter: Record<string, unknown> = { _id: id };
    const tenantId = getTenantScope(request);
    if (tenantId) filter.tenantId = tenantId;

    const deletedDiscount = await Discount.findOneAndDelete(filter);

    if (!deletedDiscount) {
      return NextResponse.json({ success: false, error: 'Discount not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: {} });
  } catch (error) {
    console.error('Failed to delete discount:', error);
    return NextResponse.json({ success: false, error: 'Server Error' }, { status: 500 });
  }
}
