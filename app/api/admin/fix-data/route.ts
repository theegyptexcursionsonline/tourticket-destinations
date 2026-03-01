// app/api/admin/fix-data/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth/adminAuth';

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if (auth instanceof NextResponse) return auth;

  return NextResponse.json({
    success: false,
    error: 'This endpoint has been deprecated. Use the admin panel to manage data.',
  }, { status: 410 });
}
