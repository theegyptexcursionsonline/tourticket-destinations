import { withAdminAudit } from '@/lib/admin/adminAudit';
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Discount from '@/lib/models/Discount';
import { DiscountInputError, discountMutationError, parseDiscountInput } from '@/lib/discounts/adminInput';
import { canAccessTenant, requireAdminAuth, tenantForbiddenResponse } from '@/lib/auth/adminAuth';

// Defensive helper: when an admin is scoped to a single tenant via the
// AdminTenantContext, every write must include `?tenantId=xxx`. We use that
// to require the target document to belong to that tenant. If the param is
// absent ("All Brands" or non-scoped automation), we behave as before.
function getTenantScope(request: NextRequest): string | undefined {
  const tenantIdParam = new URL(request.url).searchParams.get('tenantId');
  return tenantIdParam && tenantIdParam !== 'all' ? tenantIdParam : undefined;
}

async function PUTHandler(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminAuth(request, { permissions: ['manageDiscounts'] });
  if (auth instanceof NextResponse) return auth;

  await dbConnect();

  try {
    const { id } = await params;
    if (!/^[a-f0-9]{24}$/i.test(id)) throw new DiscountInputError('Choose a valid discount.');
    const body = await request.json();
    const values = parseDiscountInput(body, true);
    const existing = await Discount.findById(id).select('tenantId discountType value').lean<any>();
    if (!existing) return NextResponse.json({ success: false, error: 'Discount not found' }, { status: 404 });
    if (!canAccessTenant(auth, String(existing.tenantId))) return tenantForbiddenResponse();
    if (body.tenantId !== undefined && body.tenantId !== existing.tenantId) return tenantForbiddenResponse();
    if ((values.discountType ?? existing.discountType) === 'percentage' && (values.value ?? existing.value) > 100) throw new DiscountInputError('A percentage discount cannot exceed 100%.');

    const filter: Record<string, unknown> = { _id: id, tenantId: existing.tenantId };
    const tenantId = getTenantScope(request);
    if (tenantId && tenantId !== existing.tenantId) return tenantForbiddenResponse();

    const updatedDiscount = await Discount.findOneAndUpdate(filter, { $set: values }, {
      new: true,
      runValidators: true,
    });

    if (!updatedDiscount) {
      return NextResponse.json({ success: false, error: 'Discount not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedDiscount });
  } catch (error) {
    return discountMutationError(error);
  }
}

async function DELETEHandler(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminAuth(request, { permissions: ['manageDiscounts'] });
  if (auth instanceof NextResponse) return auth;

  await dbConnect();

  try {
    const { id } = await params;
    if (!/^[a-f0-9]{24}$/i.test(id)) throw new DiscountInputError('Choose a valid discount.');
    const existing = await Discount.findById(id).select('tenantId').lean<any>();
    if (!existing) return NextResponse.json({ success: false, error: 'Discount not found' }, { status: 404 });
    if (!canAccessTenant(auth, String(existing.tenantId))) return tenantForbiddenResponse();

    const filter: Record<string, unknown> = { _id: id, tenantId: existing.tenantId };
    const tenantId = getTenantScope(request);
    if (tenantId && tenantId !== existing.tenantId) return tenantForbiddenResponse();

    const deletedDiscount = await Discount.findOneAndDelete(filter);

    if (!deletedDiscount) {
      return NextResponse.json({ success: false, error: 'Discount not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: {} });
  } catch (error) {
    return discountMutationError(error);
  }
}

export const PUT = withAdminAudit(PUTHandler);
export const DELETE = withAdminAudit(DELETEHandler);
