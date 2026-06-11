// app/api/interests/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Category from '@/lib/models/Category';
import Tour from '@/lib/models/Tour';
import AttractionPage from '@/lib/models/AttractionPage';
import { buildStrictTenantQuery, getTenantFromRequest } from '@/lib/tenant';

const BROKEN_INTEREST_IMAGE_IDS = [
  'photo-1548018560-c7196e91a1e5',
  'photo-1565108941489-e2d8f69f15d8',
];

function getInterestFallbackImage(interest: { name?: unknown; slug?: unknown; title?: unknown }): string {
  const label = `${interest.slug || ''} ${interest.name || ''} ${interest.title || ''}`.toLowerCase();

  if (label.includes('golf')) {
    return 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&q=80';
  }

  if (label.includes('water') || label.includes('kite') || label.includes('surf')) {
    return 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&q=80';
  }

  if (label.includes('spa') || label.includes('wellness') || label.includes('beach')) {
    return 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80';
  }

  if (label.includes('temple') || label.includes('luxor') || label.includes('cairo') || label.includes('giza')) {
    return 'https://images.unsplash.com/photo-1568322445389-f64ac2515020?w=800&q=80';
  }

  return 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80';
}

function getSafeInterestImage(
  interest: { image?: unknown; heroImage?: unknown; name?: unknown; slug?: unknown; title?: unknown }
): string {
  const fallbackImage = getInterestFallbackImage(interest);
  const image =
    typeof interest.heroImage === 'string' && interest.heroImage.trim()
      ? interest.heroImage
      : typeof interest.image === 'string' && interest.image.trim()
        ? interest.image
        : fallbackImage;

  if (BROKEN_INTEREST_IMAGE_IDS.some((imageId) => image.includes(imageId))) {
    return fallbackImage;
  }

  return image;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const explicitTenantId = searchParams.get('tenantId') || request.headers.get('x-tenant-id');
    const tenantId =
      explicitTenantId && explicitTenantId !== 'all'
        ? explicitTenantId
        : await getTenantFromRequest();

    await dbConnect(tenantId);

    const categoryQuery = buildStrictTenantQuery({ isPublished: true }, tenantId);
    const tourQuery = buildStrictTenantQuery({ isPublished: true }, tenantId);

    const [categories, categoryCounts, attractionPages] = await Promise.all([
      Category.find(categoryQuery)
        .select('_id name slug heroImage featured order')
        .sort({ featured: -1, order: 1, name: 1 })
        .limit(30)
        .lean(),
      Tour.aggregate([
        { $match: tourQuery },
        { $unwind: '$category' },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),
      AttractionPage.find(
        buildStrictTenantQuery({ isPublished: true, pageType: 'attraction' }, tenantId)
      )
        .select('_id title slug heroImage featured categoryId')
        .sort({ featured: -1, createdAt: -1 })
        .limit(12)
        .lean(),
    ]);

    const countMap = new Map(
      categoryCounts.map((item: any) => [String(item._id), Number(item.count) || 0])
    );

    const categoriesWithCounts = categories.map((category: any) => ({
      type: 'category' as const,
      name: category.name,
      slug: category.slug,
      products: countMap.get(String(category._id)) || 0,
      _id: category._id,
      image: getSafeInterestImage(category),
      featured: category.featured,
    }));

    const attractionsWithCounts = attractionPages
      .map((page: any) => ({
        type: 'attraction' as const,
        name: page.title,
        slug: page.slug,
        products: page.categoryId ? countMap.get(String(page.categoryId)) || 0 : 0,
        _id: page._id,
        featured: page.featured,
        image: getSafeInterestImage(page),
      }))
      .filter((page) => page.products > 0);

    // Combine categories and attractions
    const allInterests = [...categoriesWithCounts, ...attractionsWithCounts];

    // Sort by featured first, then by product count, then by name
    allInterests.sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      if (b.products !== a.products) {
        return b.products - a.products;
      }
      return a.name.localeCompare(b.name);
    });

    const response = NextResponse.json({ success: true, data: allInterests });
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return response;
  } catch (error) {
    console.error('Failed to fetch interests:', error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch interests.",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
