// middleware.ts
// Multi-tenant middleware for domain-based tenant detection
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ============================================================================
// WEBSITE STATUS TYPES
// ============================================================================
type WebsiteStatus = 'active' | 'coming_soon' | 'maintenance' | 'offline';

// ============================================================================
// PREVIEW MODE CONFIGURATION
// ============================================================================
// Enable tenant preview via ?tenant=xxx query parameter
// Set ENABLE_TENANT_PREVIEW=false to explicitly disable preview URLs
// By default, preview is enabled in development, preview deployments, and netlify.app domains
const ENABLE_TENANT_PREVIEW_ENV = process.env.ENABLE_TENANT_PREVIEW;

// Helper to check if preview should be enabled (called in middleware with hostname)
function isPreviewEnabled(hostname: string): boolean {
  // Explicitly disabled
  if (ENABLE_TENANT_PREVIEW_ENV === 'false') {
    return false;
  }

  // Explicitly enabled
  if (ENABLE_TENANT_PREVIEW_ENV === 'true') {
    return true;
  }

  // Auto-enable for development
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  // Auto-enable for Vercel preview deployments
  if (process.env.VERCEL_ENV === 'preview') {
    return true;
  }

  // Auto-enable for Netlify preview deployments
  if (process.env.CONTEXT === 'deploy-preview') {
    return true;
  }

  // Auto-enable for all *.netlify.app domains (staging/preview sites)
  if (hostname.endsWith('.netlify.app')) {
    return true;
  }

  // Auto-enable for all *.vercel.app domains
  if (hostname.endsWith('.vercel.app')) {
    return true;
  }

  // Auto-enable for localhost
  if (hostname.startsWith('localhost')) {
    return true;
  }

  // Disabled by default on production custom domains
  return false;
}

// ============================================================================
// GLOBAL COMING SOON MODE (Legacy - overrides per-tenant status)
// Set to `true` to redirect ALL tenants to coming soon page
// ============================================================================
const GLOBAL_COMING_SOON_MODE = false;
// ============================================================================

// Per-tenant website status from environment variable
// Format: { "tenant-id": "status" }
// Example: {"hurghada": "coming_soon", "cairo": "active"}
function getTenantStatusMapping(): Record<string, WebsiteStatus> {
  const envStatus = process.env.TENANT_WEBSITE_STATUS;
  
  if (envStatus) {
    try {
      return JSON.parse(envStatus);
    } catch (e) {
      console.error('Failed to parse TENANT_WEBSITE_STATUS env variable:', e);
    }
  }
  
  // Default: all tenants are active
  return {};
}

// Get website status for a tenant
function getTenantWebsiteStatus(tenantId: string): WebsiteStatus {
  const statusMapping = getTenantStatusMapping();
  return statusMapping[tenantId] || 'active';
}

// Paths that should still work in Coming Soon/Maintenance mode
const COMING_SOON_ALLOWED_PATHS = [
  '/coming-soon',         // Coming Soon page
  '/maintenance',         // Maintenance page  
  '/api/subscribe',       // Email subscription API
  '/api/auth',            // Auth APIs (in case needed)
  '/_next',               // Next.js assets
  '/favicon.ico',
  '/images',
  '/static',
  '/robots.txt',
  '/sitemap.xml',
  '/monitoring',
];

// ============================================
// TENANT DOMAIN CONFIGURATION
// ============================================
// This mapping is loaded from environment variable or uses defaults
// Format: domain -> tenantId
// Note: Edge runtime doesn't support MongoDB, so we use static mapping
// ============================================

interface TenantDomainMapping {
  [domain: string]: string;
}

// Parse tenant domains from environment variable
function getTenantDomains(): TenantDomainMapping {
  const envDomains = process.env.TENANT_DOMAINS;
  
  if (envDomains) {
    try {
      return JSON.parse(envDomains);
    } catch (e) {
      console.error('Failed to parse TENANT_DOMAINS env variable:', e);
    }
  }
  
  // Default domain mapping for development and initial setup
  // Update this with your actual domains
  return {
    // ============================================
    // EXISTING TENANTS
    // ============================================
    
    // Hurghada brand (existing)
    'hurghadatours.com': 'hurghada',
    'www.hurghadatours.com': 'hurghada',
    'hurghada-excursions.com': 'hurghada',
    'www.hurghada-excursions.com': 'hurghada',
    'hurghadaspeedboat.com': 'hurghada-speedboat',
    'www.hurghadaspeedboat.com': 'hurghada-speedboat',
    
    // Cairo brand (existing)
    'cairotours.com': 'cairo',
    'www.cairotours.com': 'cairo',
    'cairo-excursions.com': 'cairo',
    'www.cairo-excursions.com': 'cairo',
    
    // Luxor brand (existing)
    'luxortours.com': 'luxor',
    'www.luxortours.com': 'luxor',
    'luxor-excursions.com': 'luxor',
    'www.luxor-excursions.com': 'luxor',
    
    // Sharm El Sheikh brand (existing)
    'sharmtours.com': 'sharm',
    'www.sharmtours.com': 'sharm',
    'sharm-excursions.com': 'sharm',
    'www.sharm-excursions.com': 'sharm',
    
    // Aswan brand (existing)
    'aswantours.com': 'aswan',
    'www.aswantours.com': 'aswan',
    'aswan-excursions.com': 'aswan',
    'www.aswan-excursions.com': 'aswan',
    
    // Alexandria brand (existing)
    'alexandriatours.com': 'alexandria',
    'www.alexandriatours.com': 'alexandria',
    
    // Marsa Alam brand (existing)
    'marsaalamtours.com': 'marsa-alam',
    'www.marsaalamtours.com': 'marsa-alam',
    
    // Dahab brand (existing)
    'dahabtours.com': 'dahab',
    'www.dahabtours.com': 'dahab',
    
    // Main brand (Egypt Excursions Online)
    'egypt-excursionsonline.com': 'default',
    'www.egypt-excursionsonline.com': 'default',
    'dashboard.egypt-excursionsonline.com': 'default',
    
    // ============================================
    // NEW TENANTS - PRIORITY (Client Request Jan 2026)
    // ============================================
    
    // 1. Hurghada Excursions Online - NEW TENANT
    'hurghadaexcursionsonline.com': 'hurghada-excursions-online',
    'www.hurghadaexcursionsonline.com': 'hurghada-excursions-online',
    
    // 2. Cairo Excursions Online - NEW TENANT
    'cairoexcursionsonline.com': 'cairo-excursions-online',
    'www.cairoexcursionsonline.com': 'cairo-excursions-online',
    
    // 3. Makadi Bay Excursions - NEW TENANT
    'makadibayexcursions.com': 'makadi-bay',
    'www.makadibayexcursions.com': 'makadi-bay',
    
    // 4. El Gouna Excursions - NEW TENANT
    'elgounaexcursions.com': 'el-gouna',
    'www.elgounaexcursions.com': 'el-gouna',
    
    // 5. Luxor Excursions - NEW TENANT
    'luxorexcursions.com': 'luxor-excursions',
    'www.luxorexcursions.com': 'luxor-excursions',
    
    // 6. Sharm Excursions Online - NEW TENANT
    'sharmexcursionsonline.com': 'sharm-excursions-online',
    'www.sharmexcursionsonline.com': 'sharm-excursions-online',
    
    // ============================================
    // FUTURE TENANTS - PREPARED (To be activated later)
    // ============================================
    
    // Aswan Excursions - FUTURE
    'aswanexcursions.com': 'aswan-excursions',
    'www.aswanexcursions.com': 'aswan-excursions',
    
    // Marsa Alam Excursions - FUTURE
    'marsaalamexcursions.com': 'marsa-alam-excursions',
    'www.marsaalamexcursions.com': 'marsa-alam-excursions',
    'marsaalamexcursions.online': 'marsa-alam-excursions',
    'www.marsaalamexcursions.online': 'marsa-alam-excursions',
    
    // Dahab Excursions - FUTURE
    'dahabexcursions.com': 'dahab-excursions',
    'www.dahabexcursions.com': 'dahab-excursions',
    
    // ============================================
    // DEVELOPMENT & LOCALHOST
    // ============================================
    'localhost:3000': 'default',
    'localhost:3001': 'hurghada',
    'localhost:3002': 'cairo',
    'localhost:3003': 'luxor',
    'localhost:3004': 'hurghada-speedboat',
    // New tenants localhost ports
    'localhost:3005': 'hurghada-excursions-online',
    'localhost:3006': 'cairo-excursions-online',
    'localhost:3007': 'makadi-bay',
    'localhost:3008': 'el-gouna',
    'localhost:3009': 'luxor-excursions',
    'localhost:3010': 'sharm-excursions-online',
    // Future tenants localhost ports
    'localhost:3011': 'aswan-excursions',
    'localhost:3012': 'marsa-alam-excursions',
    'localhost:3013': 'dahab-excursions',
    
    // ============================================
    // PREVIEW DEPLOYMENTS
    // ============================================
    // Netlify preview deployments
    'main--egyptexcursions.netlify.app': 'default',
    
    // Vercel preview deployments (if using)
    'egyptexcursions.vercel.app': 'default',
  };
}

// Get default tenant ID from env or use 'default'
const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || 'default';

/**
 * Get all valid tenant IDs from the domain mapping
 */
function getValidTenantIds(): Set<string> {
  const tenantDomains = getTenantDomains();
  const tenantIds = new Set<string>();

  // Collect all unique tenant IDs from domain mapping
  Object.values(tenantDomains).forEach(id => tenantIds.add(id));

  // Add default tenant ID
  tenantIds.add(DEFAULT_TENANT_ID);

  return tenantIds;
}

/**
 * Check if a tenant ID is valid
 */
function isValidTenantId(tenantId: string): boolean {
  return getValidTenantIds().has(tenantId);
}

/**
 * Get tenant ID from query parameter if preview mode is enabled
 * Returns null if not in preview mode or no valid tenant param
 */
function getTenantFromQueryParam(request: NextRequest, hostname: string): string | null {
  if (!isPreviewEnabled(hostname)) {
    return null;
  }

  const tenantParam = request.nextUrl.searchParams.get('tenant');

  if (tenantParam && isValidTenantId(tenantParam)) {
    return tenantParam;
  }

  return null;
}

// ============================================
// RESERVED PATHS (Not tour slugs)
// ============================================
const reservedPaths = [
  '/admin',
  '/api',
  '/auth',
  '/login',
  '/signup',
  '/destinations',
  '/categories',
  '/blog',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
  '/cart',
  '/checkout',
  '/profile',
  '/bookings',
  '/wishlist',
  '/search',
  '/help',
  '/support',
  '/careers',
  '/press',
  '/partners',
  '/user',
  '/booking',
  '/attraction',
  '/category',
  '/interests',
  '/egypt',
  '/faqs',
  '/forgot',
  '/tours',
  '/tour',
  '/redirecting',
  '/accept-invitation',
  '/sentry-example-page',
  '/_next',
  '/favicon.ico',
  '/images',
  '/uploads',
  '/static',
  '/robots.txt',
  '/sitemap.xml',
  '/manifest.json',
  '/monitoring',
  '/payment',
  '/public',
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Normalize domain by removing www. prefix and port
 */
function normalizeDomain(hostname: string): string {
  return hostname
    .toLowerCase()
    .replace(/^www\./, '')
    .split(':')[0]; // Remove port for production
}

/**
 * Get tenant ID from domain
 */
function getTenantIdFromDomain(hostname: string): string {
  const tenantDomains = getTenantDomains();
  
  // Try exact match first (including www)
  if (tenantDomains[hostname.toLowerCase()]) {
    return tenantDomains[hostname.toLowerCase()];
  }
  
  // Try normalized domain (without www)
  const normalizedDomain = normalizeDomain(hostname);
  if (tenantDomains[normalizedDomain]) {
    return tenantDomains[normalizedDomain];
  }
  
  // Try with www prefix
  if (tenantDomains[`www.${normalizedDomain}`]) {
    return tenantDomains[`www.${normalizedDomain}`];
  }
  
  // Check for subdomain patterns (e.g., hurghada.egypttours.com)
  const parts = normalizedDomain.split('.');
  if (parts.length >= 2) {
    const subdomain = parts[0];
    // Map common city subdomains
    const subdomainMapping: Record<string, string> = {
      // Existing tenants
      'hurghada': 'hurghada',
      'cairo': 'cairo',
      'luxor': 'luxor',
      'sharm': 'sharm',
      'aswan': 'aswan',
      'alexandria': 'alexandria',
      'dahab': 'dahab',
      'marsa-alam': 'marsa-alam',
      'marsaalam': 'marsa-alam',
      // New tenants (Jan 2026)
      'hurghada-excursions-online': 'hurghada-excursions-online',
      'cairo-excursions-online': 'cairo-excursions-online',
      'makadi-bay': 'makadi-bay',
      'makadibay': 'makadi-bay',
      'el-gouna': 'el-gouna',
      'elgouna': 'el-gouna',
      'luxor-excursions': 'luxor-excursions',
      'sharm-excursions-online': 'sharm-excursions-online',
      // Future tenants
      'aswan-excursions': 'aswan-excursions',
      'marsa-alam-excursions': 'marsa-alam-excursions',
      'dahab-excursions': 'dahab-excursions',
    };
    
    if (subdomainMapping[subdomain]) {
      return subdomainMapping[subdomain];
    }
  }
  
  // Return default tenant
  return DEFAULT_TENANT_ID;
}

/**
 * Check if path is reserved (not a tour slug)
 */
function _isReservedPath(pathname: string): boolean {
  return reservedPaths.some(path => 
    pathname === path || pathname.startsWith(path + '/')
  );
}

/**
 * Check if path is a static file
 */
function isStaticFile(pathname: string): boolean {
  return pathname.includes('.') && !pathname.endsWith('/');
}

/**
 * Check if the current path is part of the admin panel
 */
function isAdminPath(pathname: string): boolean {
  return (
    pathname === '/admin' ||
    pathname.startsWith('/admin/') ||
    pathname.startsWith('/api/admin')
  );
}

/**
 * Check if path is allowed during Coming Soon mode
 */
function isAllowedInComingSoonMode(pathname: string): boolean {
  return COMING_SOON_ALLOWED_PATHS.some(path => 
    pathname === path || pathname.startsWith(path + '/') || pathname.startsWith(path)
  );
}

// ============================================
// MAIN MIDDLEWARE
// ============================================

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const hostname = request.headers.get('host') || 'localhost:3000';

  // Helper to attach tenant headers/cookies
  // IMPORTANT: We need to set headers on the REQUEST (via requestHeaders) for server components to read them
  const applyTenantContext = (tenantId: string, previewMode: boolean = false) => {
    // Create new request headers with tenant info
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-tenant-id', tenantId);
    requestHeaders.set('x-tenant-domain', hostname);
    if (previewMode) {
      requestHeaders.set('x-tenant-preview', 'true');
    }

    // Create response with modified request headers
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    // Also set on response headers for debugging
    response.headers.set('x-tenant-id', tenantId);
    response.headers.set('x-tenant-domain', hostname);
    if (previewMode) {
      response.headers.set('x-tenant-preview', 'true');
    }

    // Set cookie for client-side access
    response.cookies.set('tenantId', tenantId, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: previewMode ? 60 * 60 * 24 : 60 * 60 * 24 * 365, // 1 day for preview, 1 year for normal
    });

    // Set preview mode cookie if in preview mode
    if (previewMode) {
      response.cookies.set('tenantPreview', 'true', {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24, // 24 hours
      });
    } else {
      // Clear preview cookie if not in preview mode
      response.cookies.delete('tenantPreview');
    }

    return response;
  };
  
  // Skip middleware for static files
  if (isStaticFile(pathname)) {
    return NextResponse.next();
  }

  // ============================================
  // ADMIN DASHBOARD SUBDOMAIN
  // ============================================
  // dashboard.egypt-excursionsonline.com -> rewrite all paths to /admin/*
  // URL stays clean (no /admin visible in browser)
  const cleanHost = hostname.replace(/:\d+$/, '').replace(/^www\./, '');
  if (cleanHost === 'dashboard.egypt-excursionsonline.com') {
    // Skip paths that are already /admin, /api, /_next, or static assets
    if (!pathname.startsWith('/admin') && !pathname.startsWith('/api') && !pathname.startsWith('/_next') && !isStaticFile(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = pathname === '/' ? '/admin' : `/admin${pathname}`;
      return NextResponse.rewrite(url);
    }
  }

  // ============================================
  // TENANT DETECTION (Priority Order)
  // ============================================
  // 1. Query parameter (?tenant=xxx) - for preview URLs
  // 2. Cookie (if set from previous preview) - for session persistence
  // 3. Domain-based detection - normal production flow

  // Check for preview tenant from query param
  const previewTenantId = getTenantFromQueryParam(request, hostname);

  // Check for existing tenant cookie (from previous preview)
  const cookieTenantId = request.cookies.get('tenantId')?.value;

  // Determine tenant from domain
  const domainTenantId = getTenantIdFromDomain(hostname);

  // Priority: query param > cookie (if valid and different from domain) > domain
  let tenantId: string;
  let isPreviewMode = false;

  if (previewTenantId) {
    // Query param takes highest priority
    tenantId = previewTenantId;
    isPreviewMode = true;
  } else if (
    isPreviewEnabled(hostname) &&
    cookieTenantId &&
    isValidTenantId(cookieTenantId) &&
    cookieTenantId !== domainTenantId &&
    request.nextUrl.searchParams.get('reset_tenant') !== 'true'
  ) {
    // Use cookie tenant if it's different from domain (preview session persistence)
    // User can add ?reset_tenant=true to go back to domain-based detection
    tenantId = cookieTenantId;
    isPreviewMode = true;
  } else {
    // Default to domain-based detection
    tenantId = domainTenantId;
  }

  // ============================================
  // ADMIN PANEL ACCESS RESTRICTION
  // ============================================
  // Only allow admin panel on specific tenants
  const ADMIN_ALLOWED_TENANTS = ['default'];

  if (isAdminPath(pathname) && !ADMIN_ALLOWED_TENANTS.includes(tenantId)) {
    // API routes return 403, pages redirect to homepage
    if (pathname.startsWith('/api/admin')) {
      return NextResponse.json({ error: 'Admin access not available on this domain' }, { status: 403 });
    }
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    return NextResponse.redirect(url);
  }

  // ============================================
  // WEBSITE STATUS CHECK (Per-Tenant or Global)
  // ============================================
  const websiteStatus = GLOBAL_COMING_SOON_MODE ? 'coming_soon' : getTenantWebsiteStatus(tenantId);
  
  // Handle non-active website statuses
  if (websiteStatus !== 'active') {
    // Always allow admin paths
    if (isAdminPath(pathname)) {
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-website-status', websiteStatus);
      requestHeaders.set('x-tenant-id', tenantId);
      requestHeaders.set('x-tenant-domain', hostname);
      if (isPreviewMode) {
        requestHeaders.set('x-tenant-preview', 'true');
      }

      const response = NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });

      response.headers.set('x-website-status', websiteStatus);
      response.headers.set('x-tenant-id', tenantId);
      if (isPreviewMode) {
        response.headers.set('x-tenant-preview', 'true');
      }
      response.cookies.set('tenantId', tenantId, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: isPreviewMode ? 60 * 60 * 24 : 60 * 60 * 24 * 365,
      });
      if (isPreviewMode) {
        response.cookies.set('tenantPreview', 'true', {
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24,
        });
      }
      return response;
    }

    // Allow specific paths to work
    if (isAllowedInComingSoonMode(pathname)) {
      return applyTenantContext(tenantId, isPreviewMode);
    }
    
    // Determine redirect destination based on status
    let redirectPath = '/coming-soon';
    if (websiteStatus === 'maintenance') {
      redirectPath = '/maintenance';
    } else if (websiteStatus === 'offline') {
      redirectPath = '/offline';
    }
    
    // Don't redirect if already on the status page
    if (pathname === redirectPath) {
      return applyTenantContext(tenantId, isPreviewMode);
    }
    
    // Redirect to appropriate status page
    const url = request.nextUrl.clone();
    url.pathname = redirectPath;
    // Preserve tenant query param in redirect if in preview mode
    if (isPreviewMode && previewTenantId) {
      url.searchParams.set('tenant', previewTenantId);
    }
    const redirectResponse = NextResponse.redirect(url);
    redirectResponse.cookies.set('tenantId', tenantId, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: isPreviewMode ? 60 * 60 * 24 : 60 * 60 * 24 * 365,
    });
    if (isPreviewMode) {
      redirectResponse.cookies.set('tenantPreview', 'true', {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24,
      });
    }
    return redirectResponse;
  }
  
  // ============================================
  // NORMAL MODE - Regular routing logic
  // ============================================

  // All requests get tenant context applied via request headers
  return applyTenantContext(tenantId, isPreviewMode);
}

// ============================================
// MIDDLEWARE CONFIG
// ============================================

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
