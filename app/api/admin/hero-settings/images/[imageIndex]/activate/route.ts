// app/api/admin/hero-settings/images/[imageIndex]/activate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth/adminAuth';
import dbConnect from '@/lib/dbConnect';
import HeroSettings from '@/lib/models/HeroSettings';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ imageIndex: string }> }
) {
  const auth = await requireAdminAuth(request, { permissions: ['manageContent'] });
  if (auth instanceof NextResponse) return auth;
  try {
    await dbConnect();
    
    const { imageIndex: imageIndexStr } = await params;
    const heroSettings = await HeroSettings.findOne({ isActive: true });
    
    if (!heroSettings) {
      return NextResponse.json(
        { success: false, error: 'Hero settings not found' },
        { status: 404 }
      );
    }

    const imageIndex = parseInt(imageIndexStr);
    
    if (imageIndex < 0 || imageIndex >= heroSettings.backgroundImages.length) {
      return NextResponse.json(
        { success: false, error: 'Image not found' },
        { status: 404 }
      );
    }

    // Deactivate all images and activate the selected one
    heroSettings.backgroundImages.forEach((img, index) => {
      img.isActive = index === imageIndex;
    });

    heroSettings.currentActiveImage = heroSettings.backgroundImages[imageIndex].desktop;
    await heroSettings.save();

    return NextResponse.json({
      success: true,
      data: heroSettings,
      message: 'Active image updated successfully'
    });
  } catch (error) {
    console.error('Error setting active image:', error);
    const message = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}