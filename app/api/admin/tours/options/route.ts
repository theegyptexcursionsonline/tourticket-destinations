// app/api/admin/tours/options/route.ts
// Lightweight endpoint for dropdowns/autocomplete and option-aware offer forms.

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import { canAccessTenant, requireAdminAuth, tenantForbiddenResponse } from '@/lib/auth/adminAuth';

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request, {
    permissions: ['manageTours', 'manageBookings'],
    requireAll: false,
  });
  if (auth instanceof NextResponse) return auth;
  const { searchParams } = new URL(request.url);
  const tenantId = (searchParams.get('tenantId') || '').trim();
  const effectiveTenantId = tenantId && tenantId !== 'all' ? tenantId : undefined;
  if (effectiveTenantId && !canAccessTenant(auth, effectiveTenantId)) return tenantForbiddenResponse();
  if (!effectiveTenantId && auth.tenantIds.length === 0) return tenantForbiddenResponse();
  await dbConnect(effectiveTenantId || undefined);

  try {
    const q = (searchParams.get('q') || '').trim();
    const limitParam = searchParams.get('limit');

    const limit = Math.min(1000, Math.max(1, Number.parseInt(limitParam || '200', 10) || 200));

    const filter: Record<string, unknown> = {};
    if (effectiveTenantId) filter.$or = [{ tenantId: effectiveTenantId }, { tenantIds: effectiveTenantId }];
    else filter.$or = [
      { tenantId: { $in: auth.tenantIds } },
      { tenantIds: { $in: auth.tenantIds } },
    ];

    if (q) {
      // Simple case-insensitive title match (fast enough for dropdown)
      filter.title = { $regex: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') };
    }

    const tours = await Tour.find(filter)
      .select('_id title slug price originalPrice discountPrice bookingOptions tenantId')
      .sort({ title: 1 })
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      data: tours.map((t: any) => ({
        _id: t._id?.toString?.() || t._id,
        id: t._id?.toString?.() || t._id,
        title: t.title,
        slug: t.slug,
        price: t.price,
        originalPrice: t.originalPrice,
        discountPrice: t.discountPrice,
        bookingOptions: t.bookingOptions || [],
        tenantId: t.tenantId,
      })),
      meta: { total: tours.length },
    });
  } catch (error) {
    console.error('Error fetching tour options:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch tour options' }, { status: 500 });
  }
}
