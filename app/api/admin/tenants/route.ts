// app/api/admin/tenants/route.ts
// Admin API for tenant management - List and Create tenants

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
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
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const activeFilter = searchParams.get('active');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const skip = parseInt(searchParams.get('skip') || '0', 10);
    
    // Build query
    const query: Record<string, unknown> = {};
    
    if (activeFilter !== null) {
      query.isActive = activeFilter === 'true';
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { domain: { $regex: search, $options: 'i' } },
        { tenantId: { $regex: search, $options: 'i' } },
      ];
    }
    
    // Get total count
    const total = await Tenant.countDocuments(query);
    
    // Get tenants
    const tenants = await Tenant.find(query)
      .sort({ isDefault: -1, name: 1 })
      .skip(skip)
      .limit(limit)
      .select('-integrations.stripeAccountId -integrations.sentryDsn') // Exclude sensitive fields
      .lean();
    
    return NextResponse.json({
      success: true,
      data: tenants,
      pagination: {
        total,
        limit,
        skip,
        hasMore: skip + tenants.length < total,
      },
    });
    
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

