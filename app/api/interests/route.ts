// app/api/interests/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Category from '@/lib/models/Category';
import Tour from '@/lib/models/Tour';
import AttractionPage from '@/lib/models/AttractionPage';
import { buildStrictTenantQuery, getTenantFromRequest } from '@/lib/tenant';

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
      image: category.heroImage,
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
        image: page.heroImage,
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
