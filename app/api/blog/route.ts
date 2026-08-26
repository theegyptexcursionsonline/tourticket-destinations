import { NextRequest, NextResponse } from 'next/server';
import { getTenantFromRequest } from '@/lib/tenant';
import {
  listPublicBlogPosts,
  parsePublicBlogListSearchParams,
  PublicBlogListValidationError,
} from '@/lib/content/publicBlogListing';

export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantFromRequest();
    const options = parsePublicBlogListSearchParams(request.nextUrl.searchParams);
    const result = await listPublicBlogPosts({ tenantId, ...options });
    return NextResponse.json({
      success: true,
      data: result.posts,
      posts: result.posts,
      pagination: result.pagination,
    });
  } catch (error) {
    if (error instanceof PublicBlogListValidationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 },
      );
    }
    console.error('Error fetching blog posts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch blog posts' },
      { status: 500 }
    );
  }
}
