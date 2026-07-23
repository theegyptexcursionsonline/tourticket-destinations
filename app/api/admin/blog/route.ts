// app/api/admin/blog/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { revalidateStorefrontContent } from '@/lib/storefront/revalidateTourStorefront';
import { canAccessTenant, requireAdminAuth, tenantForbiddenResponse } from '@/lib/auth/adminAuth';
import { canViewAllBrands, listTenantClause } from '@/lib/admin/tenantListScope';
import dbConnect from '@/lib/dbConnect';
import Blog from '@/lib/models/Blog';
import { ensureImageMetadata } from '@/lib/content/imageMetadata';

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request, { permissions: ['manageContent'] });
  if (auth instanceof NextResponse) return auth;
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    if (tenantId && tenantId !== 'all' && !canAccessTenant(auth, tenantId)) return tenantForbiddenResponse();
    if ((!tenantId || tenantId === 'all') && !canViewAllBrands(auth)) return tenantForbiddenResponse();
    const filter: Record<string, unknown> = {
      // "All brands" — super_admin excludes default (eeo) posts, network admins
      // scope to their own tenant set
      tenantId: listTenantClause(auth, tenantId, { superAdminAllExcludesDefault: true }),
    };

    const posts = await Blog.find(filter).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, data: posts }, { status: 200 });
  } catch (error) {
    console.error('Error listing blog posts:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch blog posts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth(request, { permissions: ['manageContent'] });
  if (auth instanceof NextResponse) return auth;
  try {
    await dbConnect();
    const data = await request.json();
    data.imageMetadata = ensureImageMetadata(data.imageMetadata, [data.featuredImage, ...(data.images || [])]);

    // Tenant guard: if a tenantId scope is passed (from AdminTenantContext),
    // require body.tenantId to match — or set it from the scope if missing.
    // Absent param = behave as before.
    const tenantIdParam = new URL(request.url).searchParams.get('tenantId');
    const effectiveTenantId =
      tenantIdParam && tenantIdParam !== 'all' ? tenantIdParam : undefined;
    const targetTenantId = effectiveTenantId || data.tenantId;
    if (!targetTenantId || !canAccessTenant(auth, targetTenantId)) return tenantForbiddenResponse();
    data.tenantId = targetTenantId;
    if (effectiveTenantId) {
      if (data.tenantId && data.tenantId !== effectiveTenantId) {
        return NextResponse.json(
          { success: false, error: 'Cannot create blog post for a different tenant' },
          { status: 403 }
        );
      }
      data.tenantId = effectiveTenantId;
    }

    const created = await Blog.create(data);
    revalidateStorefrontContent();
    return NextResponse.json({ success: true, data: created, message: 'Blog post created' }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating blog post:', error);
    if (error.code === 11000 && error.keyValue) {
      const field = Object.keys(error.keyValue)[0];
      return NextResponse.json({ success: false, error: `${field} already exists` }, { status: 400 });
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e: any) => e.message);
      return NextResponse.json({ success: false, error: messages.join(', ') }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Failed to create blog post' }, { status: 500 });
  }
}
