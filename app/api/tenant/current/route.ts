// app/api/tenant/current/route.ts
// Get current tenant configuration based on domain or tenantId

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Tenant from '@/lib/models/Tenant';
import { getTenantFromRequest, getTenantPublicConfig } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

/**
 * GET /api/tenant/current
 * Get current tenant configuration
 * 
 * Query params:
 * - tenantId: Optional specific tenant ID to fetch
 * 
 * Headers:
 * - x-tenant-id: Tenant ID set by middleware (fallback)
 */
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    // Get tenant ID from query params or headers
    const { searchParams } = new URL(request.url);
    const queryTenantId = searchParams.get('tenantId');
    const headerTenantId = request.headers.get('x-tenant-id');
    
    // Priority: query param > header > default
    const tenantId = queryTenantId || headerTenantId || await getTenantFromRequest();
    
    // Get public config (safe for client-side)
    const tenantConfig = await getTenantPublicConfig(tenantId);
    
    if (!tenantConfig) {
      // Try to get default tenant
      const defaultTenant = await Tenant.findOne({ isDefault: true, isActive: true }).lean();
      
      if (defaultTenant) {
        const defaultConfig = await getTenantPublicConfig(defaultTenant.tenantId);
        return NextResponse.json({
          success: true,
          tenant: defaultConfig,
          isDefault: true,
        });
      }
      
      // Return minimal default config if no tenant found
      return NextResponse.json({
        success: true,
        tenant: {
          tenantId: 'default',
          name: 'Egypt Excursions Online',
          domain: 'egyptexcursionsonline.com',
          branding: {
            logo: '/EEO-logo.png',
            logoAlt: 'Egypt Excursions Online',
            favicon: '/favicon.ico',
            primaryColor: '#E63946',
            secondaryColor: '#1D3557',
            accentColor: '#F4A261',
            backgroundColor: '#FFFFFF',
            textColor: '#1F2937',
            fontFamily: 'Inter',
            borderRadius: '8px',
          },
          seo: {
            defaultTitle: 'Egypt Excursions Online - Tours & Experiences',
            titleSuffix: 'Egypt Excursions Online',
            defaultDescription: 'Discover Egypt\'s wonders with unforgettable tours and experiences.',
            ogImage: '/hero1.jpg',
          },
          contact: {
            email: 'info@egyptexcursionsonline.com',
            phone: '+20 000 000 0000',
          },
          socialLinks: {},
          features: {
            enableBlog: true,
            enableReviews: true,
            enableWishlist: true,
            enableAISearch: true,
            enableIntercom: false,
            enableMultiCurrency: true,
            enableMultiLanguage: true,
            enableHotelPickup: true,
          },
          payments: {
            currency: 'USD',
            currencySymbol: '$',
            supportedCurrencies: ['USD', 'EUR', 'GBP', 'EGP'],
          },
          localization: {
            defaultLanguage: 'en',
            supportedLanguages: ['en', 'ar'],
          },
        },
        isDefault: true,
        isFallback: true,
      });
    }
    
    return NextResponse.json({
      success: true,
      tenant: tenantConfig,
    });
    
  } catch (error) {
    console.error('Error fetching tenant config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tenant configuration' },
      { status: 500 }
    );
  }
}

