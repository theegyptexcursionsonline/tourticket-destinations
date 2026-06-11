import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Blog from '@/lib/models/Blog';
import { buildStrictTenantQuery, getTenantFromRequest } from '@/lib/tenant';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const explicitTenantId = searchParams.get('tenantId') || request.headers.get('x-tenant-id');
    const tenantId =
      explicitTenantId && explicitTenantId !== 'all'
        ? explicitTenantId
        : await getTenantFromRequest();
    const featuredOnly = searchParams.get('featured') === 'true';
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 50, 1), 100);

    await dbConnect(tenantId);

    const posts = await Blog.find({
      ...buildStrictTenantQuery({ status: 'published' }, tenantId),
      ...(featuredOnly ? { featured: true } : {}),
    })
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({ success: true, data: posts, posts });
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch blog posts' },
      { status: 500 }
    );
  }
}
