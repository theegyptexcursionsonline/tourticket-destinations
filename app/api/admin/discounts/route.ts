import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Discount from '@/lib/models/Discount';
import { canAccessTenant, requireAdminAuth, tenantForbiddenResponse } from '@/lib/auth/adminAuth';
import { canViewAllBrands, listTenantClause } from '@/lib/admin/tenantListScope';

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request, { permissions: ['manageDiscounts'] });
  if (auth instanceof NextResponse) return auth;

  await dbConnect();

  try {
    // Support optional tenant filtering for multi-tenant admin
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    if (tenantId && tenantId !== 'all' && !canAccessTenant(auth, tenantId)) return tenantForbiddenResponse();
    if ((!tenantId || tenantId === 'all') && !canViewAllBrands(auth)) return tenantForbiddenResponse();

    // Build query with optional tenant filter
    const query: Record<string, unknown> = {};
    const tenantClause = listTenantClause(auth, tenantId);
    if (tenantClause !== null) {
      query.tenantId = tenantClause;
    }

    const discounts = await Discount.find(query).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: discounts });
  } catch (error) {
    console.error('Failed to fetch discounts:', error);
    return NextResponse.json({ success: false, error: 'Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth(request, { permissions: ['manageDiscounts'] });
  if (auth instanceof NextResponse) return auth;

  await dbConnect();

  try {
    const body = await request.json();
    
    // Ensure tenantId is provided for new discounts
    if (!body.tenantId) {
      return NextResponse.json(
        { success: false, error: 'tenantId is required for creating discounts' },
        { status: 400 }
      );
    }
    if (!canAccessTenant(auth, body.tenantId)) return tenantForbiddenResponse();
    
    const newDiscount = await Discount.create(body);
    return NextResponse.json({ success: true, data: newDiscount }, { status: 201 });
  } catch (error) {
    console.error('Failed to create discount:', error);
    return NextResponse.json({ success: false, error: 'Server Error' }, { status: 500 });
  }
}
