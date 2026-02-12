// app/api/admin/hero-settings/images/[imageIndex]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth/adminAuth';
import dbConnect from '@/lib/dbConnect';
import HeroSettings from '@/lib/models/HeroSettings';

export async function DELETE(
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

    // Don't allow deletion if it's the only image
    if (heroSettings.backgroundImages.length === 1) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete the last background image' },
        { status: 400 }
      );
    }

    const deletedImage = heroSettings.backgroundImages[imageIndex];
    heroSettings.backgroundImages.splice(imageIndex, 1);

    // If the deleted image was active, set the first remaining image as active
    if (deletedImage.isActive && heroSettings.backgroundImages.length > 0) {
      heroSettings.backgroundImages[0].isActive = true;
      heroSettings.currentActiveImage = heroSettings.backgroundImages[0].desktop;
    }

    await heroSettings.save();

    return NextResponse.json({
      success: true,
      data: heroSettings,
      message: 'Background image deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting background image:', error);
    const message = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}