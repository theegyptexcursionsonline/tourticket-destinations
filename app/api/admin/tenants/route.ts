// app/api/admin/tenants/route.ts
// Admin API for tenant management - List and Create tenants

import { NextRequest, NextResponse } from 'next/server';
import { revalidateStorefrontContent } from '@/lib/storefront/revalidateTourStorefront';
import dbConnect from '@/lib/dbConnect';
import { requireAdminAuth } from '@/lib/auth/adminAuth';
import Tenant from '@/lib/models/Tenant';
import { getDefaultTenantConfig, clearTenantCache } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/tenants
 * Get all tenants (admin only)
 * 
 * Query params:
 * - active: Filter by active status (true/false)
 * - search: Search by name or domain
 * - limit: Number of results (default: 50)
 * - skip: Number of results to skip (for pagination)
 */
export async function GET(request: NextRequest) {
  // Tenant listing requires basic admin auth (no specific permission)
  // so all admin roles can see the brand selector dropdown
  const auth = await requireAdminAuth(request);
  if (auth instanceof NextResponse) return auth;
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const activeFilter = searchParams.get('active');
    const search = searchParams.get('search');
    const requestedLimit = Number.parseInt(searchParams.get('limit') || '50', 10);
    const requestedSkip = Number.parseInt(searchParams.get('skip') || '0', 10);
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 50;
    const skip = Number.isFinite(requestedSkip) ? Math.max(requestedSkip, 0) : 0;
    
    // Build query
    const query: Record<string, unknown> = {
      tenantId: { $in: auth.tenantIds },
    };
    
    if (activeFilter !== null) {
      query.isActive = activeFilter === 'true';
    }
    
    if (search) {
      const safeSearch = search.slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { name: { $regex: safeSearch, $options: 'i' } },
        { domain: { $regex: safeSearch, $options: 'i' } },
        { tenantId: { $regex: safeSearch, $options: 'i' } },
      ];
    }

    // Count and fetch in parallel. The selector/brand grid only needs these
    // fields; returning the entire tenant configuration made every admin
    // refresh transfer large navigation, SEO, email and integration objects.
    const [total, tenants] = await Promise.all([
      Tenant.countDocuments(query),
      Tenant.find(query)
        .sort({ isDefault: -1, name: 1 })
        .skip(skip)
        .limit(limit)
        .select('_id tenantId name domain domains isActive isDefault branding.logo branding.primaryColor branding.secondaryColor createdAt updatedAt')
        .lean(),
    ]);

    const response = NextResponse.json({
      success: true,
      data: tenants,
      pagination: {
        total,
        limit,
        skip,
        hasMore: skip + tenants.length < total,
      },
    });
    response.headers.set('Cache-Control', 'private, no-store, max-age=0');
    return response;
    
  } catch (error) {
    console.error('Error fetching tenants:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tenants' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/tenants
 * Create a new tenant
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth(request, { permissions: ['manageTenants'] });
  if (auth instanceof NextResponse) return auth;
  try {
    await dbConnect();
    
    const body = await request.json();
    
    // Validate required fields
    const { tenantId, name, domain } = body;
    
    if (!tenantId || !name || !domain) {
      return NextResponse.json(
        { success: false, error: 'tenantId, name, and domain are required' },
        { status: 400 }
      );
    }
    
    // Validate tenantId format
    if (!/^[a-z0-9-]+$/.test(tenantId)) {
      return NextResponse.json(
        { success: false, error: 'tenantId can only contain lowercase letters, numbers, and hyphens' },
        { status: 400 }
      );
    }
    
    // Check if tenantId already exists
    const existingTenant = await Tenant.findOne({ tenantId });
    if (existingTenant) {
      return NextResponse.json(
        { success: false, error: 'A tenant with this ID already exists' },
        { status: 400 }
      );
    }
    
    // Check if domain already exists
    const existingDomain = await Tenant.findOne({
      $or: [
        { domain: domain.toLowerCase() },
        { domains: domain.toLowerCase() },
      ],
    });
    if (existingDomain) {
      return NextResponse.json(
        { success: false, error: 'A tenant with this domain already exists' },
        { status: 400 }
      );
    }
    
    // Merge with default config
    const defaultConfig = getDefaultTenantConfig(tenantId, name);
    const tenantData = {
      ...defaultConfig,
      ...body,
      tenantId: tenantId.toLowerCase(),
      domain: domain.toLowerCase(),
      slug: tenantId.toLowerCase(),
    };
    
    // Create tenant
    const tenant = await Tenant.create(tenantData);
    
    // Clear cache
    clearTenantCache();
    revalidateStorefrontContent();
    
    return NextResponse.json({
      success: true,
      data: tenant,
    }, { status: 201 });
    
  } catch (error: unknown) {
    console.error('Error creating tenant:', error);
    
    // Handle duplicate key errors
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      return NextResponse.json(
        { success: false, error: 'A tenant with this ID or domain already exists' },
        { status: 400 }
      );
    }
    
    // Handle validation errors
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ValidationError' && 'errors' in error) {
      const validationError = error as { errors: Record<string, { message: string }> };
      const messages = Object.values(validationError.errors).map(e => e.message);
      return NextResponse.json(
        { success: false, error: messages.join(', ') },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to create tenant' },
      { status: 500 }
    );
  }
}
