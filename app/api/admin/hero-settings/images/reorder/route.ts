import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import HeroSettings from '@/lib/models/HeroSettings';
import { canAccessTenant, requireAdminAuth, tenantForbiddenResponse } from '@/lib/auth/adminAuth';
import { revalidateStorefrontContent } from '@/lib/storefront/revalidateTourStorefront';

/**
 * Reorder the homepage background images.
 *
 * The order is submitted as a list of desktop URLs rather than indices: the
 * sibling delete and activate routes address images by array position, so a
 * reorder that only lived in the browser would make those routes act on the
 * wrong image. Persisting immediately keeps client and server in step, and
 * matching on URL means a stale request reorders nothing rather than
 * scrambling the gallery.
 */
export async function PUT(request: NextRequest) {
  const auth = await requireAdminAuth(request, { permissions: ['manageContent'] });
  if (auth instanceof NextResponse) return auth;

  try {
    // Hero settings are per brand here, so a reorder must name and be allowed
    // to touch exactly one tenant.
    const tenantId = new URL(request.url).searchParams.get('tenantId');
    if (!tenantId || tenantId === 'all' || !canAccessTenant(auth, tenantId)) {
      return tenantForbiddenResponse();
    }
    await dbConnect();

    const body = await request.json().catch(() => ({}));
    const order: unknown = body?.order;

    if (!Array.isArray(order) || order.some((entry) => typeof entry !== 'string')) {
      return NextResponse.json(
        { success: false, error: 'order must be an array of image URLs' },
        { status: 400 },
      );
    }

    const heroSettings = await HeroSettings.findOne({ isActive: true, tenantId });
    if (!heroSettings) {
      return NextResponse.json({ success: false, error: 'Hero settings not found' }, { status: 404 });
    }

    const images = heroSettings.backgroundImages || [];
    if (order.length !== images.length) {
      return NextResponse.json(
        { success: false, error: 'The gallery changed since this page was loaded. Reload and try again.' },
        { status: 409 },
      );
    }

    const byUrl = new Map(images.map((image) => [image.desktop, image]));
    const reordered: typeof images = [];
    for (const url of order as string[]) {
      const image = byUrl.get(url);
      if (!image) {
        return NextResponse.json(
          { success: false, error: 'The gallery changed since this page was loaded. Reload and try again.' },
          { status: 409 },
        );
      }
      byUrl.delete(url);
      reordered.push(image);
    }

    heroSettings.backgroundImages = reordered;
    await heroSettings.save();
    revalidateStorefrontContent();

    return NextResponse.json({ success: true, data: heroSettings });
  } catch (error) {
    console.error('Failed to reorder hero images:', error);
    return NextResponse.json({ success: false, error: 'Failed to reorder images' }, { status: 500 });
  }
}
