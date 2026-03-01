import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth/adminAuth';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth(request, { permissions: ['manageTours'] });
  if (auth instanceof NextResponse) return auth;

  try {
    await dbConnect();

    const result = await Tour.updateMany(
      { isPublished: { $ne: true } },
      { $set: { isPublished: true } }
    );

    return NextResponse.json({
      success: true,
      message: `Updated ${result.modifiedCount} tours to published status`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error publishing tours:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({
      success: false,
      error: 'Failed to publish tours',
    }, { status: 500 });
  }
}
