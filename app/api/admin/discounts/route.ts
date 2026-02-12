import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Discount from '@/lib/models/Discount';
import { requireAdminAuth } from '@/lib/auth/adminAuth';

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request, { permissions: ['manageDiscounts'] });
  if (auth instanceof NextResponse) return auth;

  await dbConnect();

  try {
    // Support optional tenant filtering for multi-tenant admin
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    
    // Build query with optional tenant filter
    const query: Record<string, unknown> = {};
    if (tenantId && tenantId !== 'all') {
      query.tenantId = tenantId;
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
    
    const newDiscount = await Discount.create(body);
    return NextResponse.json({ success: true, data: newDiscount }, { status: 201 });
  } catch (error) {
    console.error('Failed to create discount:', error);
    return NextResponse.json({ success: false, error: 'Server Error' }, { status: 500 });
  }
}