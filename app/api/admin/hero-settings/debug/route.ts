// app/api/admin/hero-settings/debug/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth/adminAuth';
import dbConnect from '@/lib/dbConnect';
import HeroSettings from '@/lib/models/HeroSettings';

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request, { permissions: ['manageContent'] });
  if (auth instanceof NextResponse) return auth;

  try {
    await dbConnect();

    const allSettings = await HeroSettings.find({})
      .select('_id isActive title.main title.highlight createdAt updatedAt')
      .lean();
    const activeSettings = await HeroSettings.findOne({ isActive: true })
      .select('_id isActive title createdAt updatedAt')
      .lean();

    return NextResponse.json({
      success: true,
      totalRecords: allSettings.length,
      hasActiveSettings: !!activeSettings,
      records: allSettings.map(s => ({
        id: s._id,
        isActive: s.isActive,
        titleMain: s.title?.main || null,
        titleHighlight: s.title?.highlight || null,
      })),
      activeTitle: activeSettings?.title || null,
    });
  } catch (error) {
    console.error('Hero settings debug error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch hero settings debug info',
    }, { status: 500 });
  }
}
