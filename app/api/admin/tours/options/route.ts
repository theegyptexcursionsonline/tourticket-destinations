// app/api/admin/tours/options/route.ts
// Lightweight endpoint for dropdowns/autocomplete (id + title only)

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';

export async function GET(request: NextRequest) {
  await dbConnect();

  try {
    const { searchParams } = new URL(request.url);
    const tenantId = (searchParams.get('tenantId') || '').trim();
    const q = (searchParams.get('q') || '').trim();
    const limitParam = searchParams.get('limit');

    const limit = Math.min(200, Math.max(1, Number.parseInt(limitParam || '200', 10) || 200));

    const filter: Record<string, unknown> = {};
    if (tenantId && tenantId !== 'all') filter.tenantId = tenantId;

    if (q) {
      // Simple case-insensitive title match (fast enough for dropdown)
      filter.title = { $regex: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') };
    }

    const tours = await Tour.find(filter)
      .select('_id title tenantId')
      .sort({ title: 1 })
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      data: tours.map((t: any) => ({ id: t._id?.toString?.() || t._id, title: t.title, tenantId: t.tenantId })),
      meta: { total: tours.length },
    });
  } catch (error) {
    console.error('Error fetching tour options:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch tour options' }, { status: 500 });
  }
}


