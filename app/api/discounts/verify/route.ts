import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Discount from '@/lib/models/Discount';
import { getTenantFromRequest } from '@/lib/tenant';

export async function POST(request: Request) {
  await dbConnect();

  try {
    const body = await request.json();
    const { code, tenantId: requestTenantId } = body;

    if (!code) {
      return NextResponse.json({ success: false, error: 'Coupon code is required' }, { status: 400 });
    }

    // Get tenantId from request body or headers
    const tenantId = requestTenantId || await getTenantFromRequest();

    // Find the discount code (case-insensitive, tenant-specific)
    const discount = await Discount.findOne({ 
      code: code.toUpperCase(),
      tenantId: tenantId
    });

    // Check if the discount exists
    if (!discount) {
      return NextResponse.json({ success: false, error: 'Invalid coupon code' }, { status: 404 });
    }

    // Check if the discount is currently active
    if (!discount.isActive) {
      return NextResponse.json({ success: false, error: 'This coupon is no longer active' }, { status: 400 });
    }

    // Check if the discount has expired
    if (discount.expiresAt && new Date(discount.expiresAt) < new Date()) {
      return NextResponse.json({ success: false, error: 'This coupon has expired' }, { status: 400 });
    }

    // Check for usage limits
    if (discount.usageLimit && discount.timesUsed >= discount.usageLimit) {
      return NextResponse.json({ success: false, error: 'This coupon has reached its usage limit' }, { status: 400 });
    }

    // If all checks pass, return the discount data
    return NextResponse.json({ success: true, data: discount });

  } catch (error) {
    console.error('Error verifying discount:', error);
    // Return a generic server error to the client
    return NextResponse.json({ success: false, error: 'An internal server error occurred' }, { status: 500 });
  }
}