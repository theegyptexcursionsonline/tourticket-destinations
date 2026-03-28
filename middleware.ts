// middleware.ts
// Multi-tenant + multi-locale middleware
// Composes domain-based tenant detection with next-intl locale routing
import { NextResponse, NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

// ============================================================================
// NEXT-INTL LOCALE MIDDLEWARE
// ============================================================================
const intlMiddleware = createIntlMiddleware(routing);

// ============================================================================
// WEBSITE STATUS TYPES
// ============================================================================
type WebsiteStatus = 'active' | 'coming_soon' | 'maintenance' | 'offline';

// ============================================================================
// PREVIEW MODE CONFIGURATION
// ============================================================================
const ENABLE_TENANT_PREVIEW_ENV = process.env.ENABLE_TENANT_PREVIEW;

function isPreviewEnabled(hostname: string): boolean {
  if (ENABLE_TENANT_PREVIEW_ENV === 'false') return false;
  if (ENABLE_TENANT_PREVIEW_ENV === 'true') return true;
  if (process.env.NODE_ENV === 'development') return true;
  if (process.env.VERCEL_ENV === 'preview') return true;
  if (process.env.CONTEXT === 'deploy-preview') return true;
  if (hostname.endsWith('.netlify.app')) return true;
  if (hostname.endsWith('.vercel.app')) return true;
  if (hostname.startsWith('localhost')) return true;
  return false;
}

// ============================================================================
// GLOBAL COMING SOON MODE
// ============================================================================
const GLOBAL_COMING_SOON_MODE = false;

function getTenantStatusMapping(): Record<string, WebsiteStatus> {
  const envStatus = process.env.TENANT_WEBSITE_STATUS;
  if (envStatus) {
    try {
      return JSON.parse(envStatus);
    } catch (e) {
      console.error('Failed to parse TENANT_WEBSITE_STATUS env variable:', e);
    }
  }
  return {};
}

function getTenantWebsiteStatus(tenantId: string): WebsiteStatus {
  const statusMapping = getTenantStatusMapping();
  return statusMapping[tenantId] || 'active';
}

const COMING_SOON_ALLOWED_PATHS = [
  '/coming-soon',
  '/maintenance',
  '/api/subscribe',
  '/api/auth',
  '/_next',
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

interface TenantDomainMapping {
  [domain: string]: string;
}

function getTenantDomains(): TenantDomainMapping {
  const envDomains = process.env.TENANT_DOMAINS;
  if (envDomains) {
    try {
      return JSON.parse(envDomains);
    } catch (e) {
      console.error('Failed to parse TENANT_DOMAINS env variable:', e);
    }
  }

  return {
    // ============================================
    // EXISTING TENANTS
    // ============================================
    'hurghadatours.com': 'hurghada',
    'www.hurghadatours.com': 'hurghada',
    'hurghada-excursions.com': 'hurghada',
    'www.hurghada-excursions.com': 'hurghada',
    'hurghadaspeedboat.com': 'hurghada-speedboat',
    'www.hurghadaspeedboat.com': 'hurghada-speedboat',
    'cairotours.com': 'cairo',
    'www.cairotours.com': 'cairo',
    'cairo-excursions.com': 'cairo',
    'www.cairo-excursions.com': 'cairo',
    'luxortours.com': 'luxor',
    'www.luxortours.com': 'luxor',
    'luxor-excursions.com': 'luxor',
    'www.luxor-excursions.com': 'luxor',
    'sharmtours.com': 'sharm',
    'www.sharmtours.com': 'sharm',
    'sharm-excursions.com': 'sharm',
    'www.sharm-excursions.com': 'sharm',
    'aswantours.com': 'aswan',
    'www.aswantours.com': 'aswan',
    'aswan-excursions.com': 'aswan',
    'www.aswan-excursions.com': 'aswan',
    'alexandriatours.com': 'alexandria',
    'www.alexandriatours.com': 'alexandria',
    'marsaalamtours.com': 'marsa-alam',
    'www.marsaalamtours.com': 'marsa-alam',
    'dahabtours.com': 'dahab',
    'www.dahabtours.com': 'dahab',
    'egypt-excursionsonline.com': 'default',
    'www.egypt-excursionsonline.com': 'default',
    'dashboard.egypt-excursionsonline.com': 'default',
    'dashboard2.egypt-excursionsonline.com': 'default',
    'admin.egypt-excursionsonline.com': 'default',

    // ============================================
    // NEW TENANTS - PRIORITY (Jan 2026)
    // ============================================
    'hurghadaexcursionsonline.com': 'hurghada-excursions-online',
    'www.hurghadaexcursionsonline.com': 'hurghada-excursions-online',
    'cairoexcursionsonline.com': 'cairo-excursions-online',
    'www.cairoexcursionsonline.com': 'cairo-excursions-online',
    'makadibayexcursions.com': 'makadi-bay',
    'www.makadibayexcursions.com': 'makadi-bay',
    'elgounaexcursions.com': 'el-gouna',
    'www.elgounaexcursions.com': 'el-gouna',
    'luxorexcursions.com': 'luxor-excursions',
    'www.luxorexcursions.com': 'luxor-excursions',
    'sharmexcursionsonline.com': 'sharm-excursions-online',
    'www.sharmexcursionsonline.com': 'sharm-excursions-online',

    // ============================================
    // FUTURE TENANTS
    // ============================================
    'aswanexcursions.com': 'aswan-excursions',
    'www.aswanexcursions.com': 'aswan-excursions',
    'marsaalamexcursions.com': 'marsa-alam-excursions',
    'www.marsaalamexcursions.com': 'marsa-alam-excursions',
    'marsaalamexcursions.online': 'marsa-alam-excursions',
    'www.marsaalamexcursions.online': 'marsa-alam-excursions',
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
    'localhost:3005': 'hurghada-excursions-online',
    'localhost:3006': 'cairo-excursions-online',
    'localhost:3007': 'makadi-bay',
    'localhost:3008': 'el-gouna',
    'localhost:3009': 'luxor-excursions',
    'localhost:3010': 'sharm-excursions-online',
    'localhost:3011': 'aswan-excursions',
    'localhost:3012': 'marsa-alam-excursions',
    'localhost:3013': 'dahab-excursions',

    // ============================================
    // PREVIEW DEPLOYMENTS
    // ============================================
    'main--egyptexcursions.netlify.app': 'default',
    'egyptexcursions.vercel.app': 'default',
  };
}

const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || 'default';

function getValidTenantIds(): Set<string> {
  const tenantDomains = getTenantDomains();
  const tenantIds = new Set<string>();
  Object.values(tenantDomains).forEach(id => tenantIds.add(id));
  tenantIds.add(DEFAULT_TENANT_ID);
  return tenantIds;
}

function isValidTenantId(tenantId: string): boolean {
  return getValidTenantIds().has(tenantId);
}

function getTenantFromQueryParam(request: NextRequest, hostname: string): string | null {
  if (!isPreviewEnabled(hostname)) return null;
  const tenantParam = request.nextUrl.searchParams.get('tenant');
  if (tenantParam && isValidTenantId(tenantParam)) return tenantParam;
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
  // Locale prefixes (prevent them from being treated as tour slugs)
  '/ar',
  '/es',
  '/fr',
  '/de',
  '/ru',
];

// ============================================
// HELPER FUNCTIONS
// ============================================

function normalizeDomain(hostname: string): string {
  return hostname
    .toLowerCase()
    .replace(/^www\./, '')
    .split(':')[0];
}

function getTenantIdFromDomain(hostname: string): string {
  const tenantDomains = getTenantDomains();

  if (tenantDomains[hostname.toLowerCase()]) {
    return tenantDomains[hostname.toLowerCase()];
  }

  const normalizedDomain = normalizeDomain(hostname);
  if (tenantDomains[normalizedDomain]) {
    return tenantDomains[normalizedDomain];
  }

  if (tenantDomains[`www.${normalizedDomain}`]) {
    return tenantDomains[`www.${normalizedDomain}`];
  }

  const parts = normalizedDomain.split('.');
  if (parts.length >= 2) {
    const subdomain = parts[0];
    const subdomainMapping: Record<string, string> = {
      'hurghada': 'hurghada',
      'cairo': 'cairo',
      'luxor': 'luxor',
      'sharm': 'sharm',
      'aswan': 'aswan',
      'alexandria': 'alexandria',
      'dahab': 'dahab',
      'marsa-alam': 'marsa-alam',
      'marsaalam': 'marsa-alam',
      'hurghada-excursions-online': 'hurghada-excursions-online',
      'cairo-excursions-online': 'cairo-excursions-online',
      'makadi-bay': 'makadi-bay',
      'makadibay': 'makadi-bay',
      'el-gouna': 'el-gouna',
      'elgouna': 'el-gouna',
      'luxor-excursions': 'luxor-excursions',
      'sharm-excursions-online': 'sharm-excursions-online',
      'aswan-excursions': 'aswan-excursions',
      'marsa-alam-excursions': 'marsa-alam-excursions',
      'dahab-excursions': 'dahab-excursions',
    };

    if (subdomainMapping[subdomain]) {
      return subdomainMapping[subdomain];
    }
  }

  return DEFAULT_TENANT_ID;
}

function isStaticFile(pathname: string): boolean {
  return pathname.includes('.') && !pathname.endsWith('/');
}

function isAdminPath(pathname: string): boolean {
  return (
    pathname === '/admin' ||
    pathname.startsWith('/admin/') ||
    pathname.startsWith('/api/admin')
  );
}

function isAllowedInComingSoonMode(pathname: string): boolean {
  return COMING_SOON_ALLOWED_PATHS.some(path =>
    pathname === path || pathname.startsWith(path + '/') || pathname.startsWith(path)
  );
}

// ============================================
// TENANT DETECTION (pure function - returns tenant info)
// ============================================
function detectTenant(request: NextRequest, hostname: string): {
  tenantId: string;
  isPreviewMode: boolean;
  previewTenantId: string | null;
} {
  const previewTenantId = getTenantFromQueryParam(request, hostname);
  const cookieTenantId = request.cookies.get('tenantId')?.value;
  const domainTenantId = getTenantIdFromDomain(hostname);

  let tenantId: string;
  let isPreviewMode = false;

  if (previewTenantId) {
    tenantId = previewTenantId;
    isPreviewMode = true;
  } else if (
    isPreviewEnabled(hostname) &&
    cookieTenantId &&
    isValidTenantId(cookieTenantId) &&
    cookieTenantId !== domainTenantId &&
    request.nextUrl.searchParams.get('reset_tenant') !== 'true'
  ) {
    tenantId = cookieTenantId;
    isPreviewMode = true;
  } else {
    tenantId = domainTenantId;
  }

  return { tenantId, isPreviewMode, previewTenantId };
}

// ============================================
// APPLY TENANT CONTEXT TO A RESPONSE
// ============================================
function applyTenantToResponse(
  response: NextResponse,
  tenantId: string,
  hostname: string,
  isPreviewMode: boolean
): NextResponse {
  // Set response headers
  response.headers.set('x-tenant-id', tenantId);
  response.headers.set('x-tenant-domain', hostname);
  if (isPreviewMode) {
    response.headers.set('x-tenant-preview', 'true');
  }

  // Set cookies
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
  } else {
    response.cookies.delete('tenantPreview');
  }

  return response;
}

// ============================================
// CREATE TENANT-AWARE NEXT RESPONSE
// ============================================
function createTenantResponse(
  request: NextRequest,
  tenantId: string,
  hostname: string,
  isPreviewMode: boolean
): NextResponse {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-tenant-id', tenantId);
  requestHeaders.set('x-tenant-domain', hostname);
  if (isPreviewMode) {
    requestHeaders.set('x-tenant-preview', 'true');
  }

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  return applyTenantToResponse(response, tenantId, hostname, isPreviewMode);
}

// ============================================
// MAIN MIDDLEWARE
// ============================================

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const hostname = request.headers.get('host') || 'localhost:3000';

  // Skip middleware for static files
  if (isStaticFile(pathname)) {
    return NextResponse.next();
  }

  // Detect tenant
  const { tenantId, isPreviewMode, previewTenantId } = detectTenant(request, hostname);

  // ============================================
  // API ROUTES — tenant only, no locale handling
  // ============================================
  if (pathname.startsWith('/api')) {
    // Admin panel access restriction for API routes
    if (pathname.startsWith('/api/admin')) {
      const ADMIN_ALLOWED_TENANTS = ['default'];
      if (!ADMIN_ALLOWED_TENANTS.includes(tenantId)) {
        return NextResponse.json({ error: 'Admin access not available on this domain' }, { status: 403 });
      }
    }
    return createTenantResponse(request, tenantId, hostname, isPreviewMode);
  }

  // ============================================
  // ADMIN DASHBOARD SUBDOMAIN
  // ============================================
  const cleanHost = hostname.replace(/:\d+$/, '').replace(/^www\./, '');
  const isDashboardSubdomain =
    cleanHost.startsWith('dashboard.') ||
    cleanHost.startsWith('dashboard2.') ||
    cleanHost.startsWith('admin.');

  if (isDashboardSubdomain) {
    if (!pathname.startsWith('/admin') && !pathname.startsWith('/api') && !pathname.startsWith('/_next') && !isStaticFile(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = pathname === '/' ? '/en/admin' : `/en/admin${pathname}`;
      const response = NextResponse.rewrite(url);
      return applyTenantToResponse(response, tenantId, hostname, isPreviewMode);
    }
  }

  // ============================================
  // REDIRECT MAIN DOMAIN /admin TO DASHBOARD SUBDOMAIN
  // ============================================
  if (!isDashboardSubdomain && isAdminPath(pathname)) {
    const ADMIN_ALLOWED_TENANTS = ['default'];
    if (ADMIN_ALLOWED_TENANTS.includes(tenantId)) {
      const adminPath = pathname.replace(/^\/admin/, '') || '/';
      const dashboardUrl = new URL(`https://dashboard.egypt-excursionsonline.com${adminPath}`);
      dashboardUrl.search = request.nextUrl.search;
      return NextResponse.redirect(dashboardUrl);
    }
  }

  // ============================================
  // ADMIN PANEL ACCESS RESTRICTION (page routes)
  // ============================================
  if (isAdminPath(pathname)) {
    const ADMIN_ALLOWED_TENANTS = ['default'];
    if (!ADMIN_ALLOWED_TENANTS.includes(tenantId)) {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      url.search = '';
      return NextResponse.redirect(url);
    }
  }

  // ============================================
  // WEBSITE STATUS CHECK
  // ============================================
  const websiteStatus = GLOBAL_COMING_SOON_MODE ? 'coming_soon' : getTenantWebsiteStatus(tenantId);

  if (websiteStatus !== 'active') {
    // Always allow admin paths
    if (isAdminPath(pathname)) {
      const response = createTenantResponse(request, tenantId, hostname, isPreviewMode);
      response.headers.set('x-website-status', websiteStatus);
      return response;
    }

    // Allow specific paths
    if (isAllowedInComingSoonMode(pathname)) {
      return createTenantResponse(request, tenantId, hostname, isPreviewMode);
    }

    // Determine redirect destination
    let redirectPath = '/coming-soon';
    if (websiteStatus === 'maintenance') redirectPath = '/maintenance';
    else if (websiteStatus === 'offline') redirectPath = '/offline';

    // Don't redirect if already on the status page
    if (pathname === redirectPath) {
      return createTenantResponse(request, tenantId, hostname, isPreviewMode);
    }

    // Redirect to status page
    const url = request.nextUrl.clone();
    url.pathname = redirectPath;
    if (isPreviewMode && previewTenantId) {
      url.searchParams.set('tenant', previewTenantId);
    }
    const redirectResponse = NextResponse.redirect(url);
    return applyTenantToResponse(redirectResponse, tenantId, hostname, isPreviewMode);
  }

  // ============================================
  // PAGE ROUTES — compose tenant + locale
  // ============================================

  // 1. Run next-intl middleware (handles locale detection and URL rewriting)
  const intlResponse = intlMiddleware(request);

  // 2. If intlMiddleware issued a redirect, preserve the ?tenant= param so the
  //    next request can detect the preview tenant from the query string
  const isRedirect = intlResponse.status >= 300 && intlResponse.status < 400;
  if (isRedirect && previewTenantId) {
    const location = intlResponse.headers.get('location');
    if (location) {
      try {
        const redirectUrl = new URL(location, request.url);
        if (!redirectUrl.searchParams.has('tenant')) {
          redirectUrl.searchParams.set('tenant', previewTenantId);
          intlResponse.headers.set('location', redirectUrl.toString());
        }
      } catch { /* ignore malformed URLs */ }
    }
  }

  // 3. For non-redirect responses (rewrites / next), forward tenant info as
  //    REQUEST headers so server components can read them via headers().
  //    Next.js uses x-middleware-override-headers + x-middleware-request-* to
  //    pass custom request headers from middleware to server components.
  if (!isRedirect) {
    const existingOverrides = intlResponse.headers.get('x-middleware-override-headers') || '';
    const overrides = existingOverrides
      .split(',')
      .map(h => h.trim())
      .filter(Boolean);

    const tenantHeaders: [string, string][] = [
      ['x-tenant-id', tenantId],
      ['x-tenant-domain', hostname],
    ];
    if (isPreviewMode) {
      tenantHeaders.push(['x-tenant-preview', 'true']);
    }

    for (const [name, value] of tenantHeaders) {
      if (!overrides.includes(name)) {
        overrides.push(name);
      }
      intlResponse.headers.set(`x-middleware-request-${name}`, value);
    }

    intlResponse.headers.set('x-middleware-override-headers', overrides.join(','));
  }

  // 4. Apply tenant cookies and response headers
  return applyTenantToResponse(intlResponse, tenantId, hostname, isPreviewMode);
}

// ============================================
// MIDDLEWARE CONFIG
// ============================================

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
