// middleware.ts
// Multi-tenant middleware for domain-based tenant detection
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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
    // Hurghada brand
    'hurghadatours.com': 'hurghada',
    'www.hurghadatours.com': 'hurghada',
    'hurghada-excursions.com': 'hurghada',
    'www.hurghada-excursions.com': 'hurghada',
    
    // Cairo brand
    'cairotours.com': 'cairo',
    'www.cairotours.com': 'cairo',
    'cairo-excursions.com': 'cairo',
    'www.cairo-excursions.com': 'cairo',
    
    // Luxor brand
    'luxortours.com': 'luxor',
    'www.luxortours.com': 'luxor',
    'luxor-excursions.com': 'luxor',
    'www.luxor-excursions.com': 'luxor',
    
    // Sharm El Sheikh brand
    'sharmtours.com': 'sharm',
    'www.sharmtours.com': 'sharm',
    'sharm-excursions.com': 'sharm',
    'www.sharm-excursions.com': 'sharm',
    
    // Aswan brand
    'aswantours.com': 'aswan',
    'www.aswantours.com': 'aswan',
    'aswan-excursions.com': 'aswan',
    'www.aswan-excursions.com': 'aswan',
    
    // Alexandria brand
    'alexandriatours.com': 'alexandria',
    'www.alexandriatours.com': 'alexandria',
    
    // Marsa Alam brand
    'marsaalamtours.com': 'marsa-alam',
    'www.marsaalamtours.com': 'marsa-alam',
    
    // Dahab brand
    'dahabtours.com': 'dahab',
    'www.dahabtours.com': 'dahab',
    
    // Main brand (Egypt Excursions Online)
    'egypt-excursionsonline.com': 'default',
    'www.egypt-excursionsonline.com': 'default',
    
    // Development & localhost
    'localhost:3000': 'default',
    'localhost:3001': 'hurghada',
    'localhost:3002': 'cairo',
    'localhost:3003': 'luxor',
    
    // Netlify preview deployments
    'main--egyptexcursions.netlify.app': 'default',
    
    // Vercel preview deployments (if using)
    'egyptexcursions.vercel.app': 'default',
  };
}

// Get default tenant ID from env or use 'default'
const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || 'default';

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
      'hurghada': 'hurghada',
      'cairo': 'cairo',
      'luxor': 'luxor',
      'sharm': 'sharm',
      'aswan': 'aswan',
      'alexandria': 'alexandria',
      'dahab': 'dahab',
      'marsa-alam': 'marsa-alam',
      'marsaalam': 'marsa-alam',
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
function isReservedPath(pathname: string): boolean {
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
  
  // Skip middleware for reserved paths (they handle their own logic)
  if (isReservedPath(pathname)) {
    // Still set tenant headers for reserved paths
    const tenantId = getTenantIdFromDomain(hostname);
    const response = NextResponse.next();
    
    // Set tenant headers
    response.headers.set('x-tenant-id', tenantId);
    response.headers.set('x-tenant-domain', hostname);
    
    // Set tenant cookie for client-side access
    response.cookies.set('tenantId', tenantId, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });
    
    return response;
  }
  
  // Determine tenant from domain
  const tenantId = getTenantIdFromDomain(hostname);
  
  // Create response with tenant information
  const response = NextResponse.next();
  
  // Set tenant headers for server-side access
  response.headers.set('x-tenant-id', tenantId);
  response.headers.set('x-tenant-domain', hostname);
  
  // Set tenant cookie for client-side access
  response.cookies.set('tenantId', tenantId, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
  
  // For all other paths, let the [slug] route handle it
  // The route will use the tenant context to filter content
  return response;
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
