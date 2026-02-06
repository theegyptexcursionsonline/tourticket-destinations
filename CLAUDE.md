# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tour Ticket is a **multi-tenant** full-stack tour booking platform built with Next.js 16, React 19, TypeScript, MongoDB, and various third-party integrations. The application supports unlimited white-label branded websites, user authentication, AI-powered search, booking management, payment processing, and a comprehensive admin dashboard.

**Current Version:** `v2.1.0` (Multi-Tenant Admin) — see `lib/constants/version.ts` for changelog.
**Live Site:** [egypt-excursionsonline.com](https://egypt-excursionsonline.com)
**Deployment:** Netlify

## Development Commands

```bash
# Development
pnpm dev                    # Start dev server with auto port detection (starts at 3000, increments if busy)
pnpm dev:original           # Start dev server on port 3000 with Turbopack

# Production
pnpm build                  # Build for production (ignores ESLint/TypeScript errors)
pnpm start                  # Start production server

# Quality
pnpm lint                   # Run ESLint

# Testing
pnpm test                   # Run Jest tests
pnpm test:watch             # Run tests in watch mode
pnpm test:coverage          # Run tests with coverage

# Algolia Search Sync
pnpm algolia:sync           # Sync all published tours to Algolia
pnpm algolia:clear-sync     # Clear Algolia index and resync all tours
pnpm algolia:sync-all       # Sync all tours (including unpublished)

# Tenant/Seed Utilities
pnpm tenant:seed-speedboat       # Seed speedboat tenant data
pnpm tenant:assign-speedboat-tours # Assign tours to speedboat tenant
pnpm tenant:setup-speedboat-db   # Setup speedboat tenant database
pnpm seed:speedboat              # Full speedboat seed pipeline
pnpm seed:excursions             # Seed excursions tenants

# Utility Scripts (via tsx)
npx tsx scripts/sync-algolia.ts                    # Manual Algolia sync
npx tsx scripts/check-algolia-status.ts            # Check Algolia connection
npx tsx scripts/populate-categories-and-reviews.ts # Seed data
npx tsx scripts/cleanup-demo-users.ts              # Clean demo data
npx tsx scripts/test-email.ts                      # Test email templates
```

## Architecture

### Tech Stack Core
- **Framework**: Next.js 16 with App Router (Server Components by default)
- **Language**: TypeScript 5
- **UI**: React 19
- **Database**: MongoDB with Mongoose ODM (multi-database support per tenant)
- **Authentication**: JWT tokens (jose library) stored in HTTP-only cookies
- **Search**: Algolia for instant search with fallback to MongoDB/Fuse.js
- **Payments**: Stripe (with per-tenant account support)
- **Email**: Mailgun (with tenant-branded templates)
- **Storage**: Cloudinary for images
- **Monitoring**: Sentry
- **Support**: Intercom

### Directory Structure

```
app/                      # Next.js App Router - all routes
├── api/                  # API routes (Route Handlers)
│   ├── admin/           # Admin-only APIs (protected)
│   │   ├── tenants/     # Tenant management APIs
│   │   ├── tours/       # Tour CRUD with tenant support
│   │   ├── bookings/    # Booking management
│   │   ├── team/        # Team/staff management
│   │   ├── availability/# Availability management
│   │   ├── special-offers/ # Promotional offers CRUD
│   │   ├── stop-sale-logs/ # Stop sale audit logs
│   │   ├── bulk-upload/ # Bulk tour/data upload
│   │   ├── dashboard/   # Admin dashboard data
│   │   ├── data-viewer/ # Database data viewer
│   │   ├── manifests/   # Booking manifests/reports
│   │   ├── hero-settings/# Homepage hero config
│   │   ├── destinations/# Destination management
│   │   ├── discounts/   # Discount/promo code management
│   │   ├── reviews/     # Review management
│   │   ├── reports/     # Analytics reports
│   │   ├── blog/        # Blog management
│   │   ├── attraction-pages/ # Attraction page CRUD
│   │   ├── users/       # User management
│   │   ├── auth/        # Admin auth endpoints
│   │   ├── login/       # Admin login
│   │   ├── accept-invitation/ # Team invitation acceptance
│   │   ├── fix-data/    # Data repair utilities
│   │   └── seed/        # Database seeding endpoints
│   ├── auth/            # Authentication endpoints
│   ├── bookings/        # Booking management
│   ├── checkout/        # Payment processing
│   ├── tenant/          # Tenant configuration API
│   ├── search/          # Search endpoints
│   ├── availability/    # Public availability API
│   ├── offers/          # Public offers API
│   ├── cron/            # Cron job endpoints
│   ├── webhooks/        # Stripe/external webhooks
│   ├── contact/         # Contact form API
│   ├── subscribe/       # Newsletter subscription
│   ├── upload/          # File upload API
│   ├── tours/           # Public tour listing API
│   ├── categories/      # Categories API
│   ├── destinations/    # Destinations API
│   ├── reviews/         # Public reviews API
│   ├── blog/            # Public blog API
│   ├── interests/       # Interests API
│   ├── attractions/     # Attractions API
│   ├── algolia/         # Algolia sync endpoints
│   └── hero-settings/   # Public hero settings API
├── admin/               # Admin dashboard pages (protected)
│   ├── tours/           # Tour management
│   ├── bookings/        # Booking management
│   ├── special-offers/  # Offers management
│   ├── availability/    # Calendar-based availability
│   ├── bulk-upload/     # Bulk operations
│   ├── data-import/     # Data import tools
│   ├── data-viewer/     # Database viewer
│   ├── manifests/       # Booking manifests
│   ├── seed/            # Seeding tools
│   ├── tools/           # Admin utilities
│   └── ...              # Other admin sections
├── user/                # User dashboard pages (protected)
├── [slug]/              # Dynamic tour detail pages (catch-all route)
└── (other routes)/      # Static pages (about, contact, etc.)

lib/                     # Backend logic and models
├── models/             # Mongoose schemas (18 models)
│   ├── Tenant.ts       # Multi-tenant configuration model
│   ├── Tour.ts         # Tour entity with tenantId
│   ├── Booking.ts      # Booking with tenant association
│   ├── Availability.ts # Date-based availability with time slots
│   ├── SpecialOffer.ts # Promotional offers system
│   ├── StopSale.ts     # Date range blocking for tours
│   ├── StopSaleLog.ts  # Audit log for stop sale actions
│   ├── user.ts         # User accounts and roles
│   ├── Review.ts       # Tour reviews
│   ├── Blog.ts         # Blog posts
│   ├── Category.ts     # Tour categories
│   ├── Destination.ts  # Destinations
│   ├── Discount.ts     # Promotional discount codes
│   ├── Comment.ts      # Blog comments
│   ├── HeroSettings.ts # Homepage hero configuration
│   ├── Job.ts          # Job/career listings
│   ├── Otp.ts          # One-time passwords
│   └── AttractionPage.ts # Attraction landing pages
├── tenant.ts           # Tenant utility helpers (server-side)
├── auth/               # Auth utilities
│   └── adminAuth.ts    # Admin authentication helpers
├── cache.ts            # Server-side caching utilities
├── categories.ts       # Static category data and helpers
├── constants/          # Constants
│   ├── adminPermissions.ts # Role & permission definitions
│   ├── bookingStatus.ts    # Booking status codes & helpers
│   └── version.ts          # App version (v2.1.0) & changelog
├── data/               # Static data (destinations, tours fallback)
│   ├── destinations.ts # Static destination data
│   └── tours.ts        # Tour fallback data
├── email/              # Email templates and Mailgun integration
│   ├── emailService.ts # Centralized email service (tenant-aware)
│   ├── templateEngine.ts # Handlebars template engine
│   ├── templates/      # HTML email templates (10 templates)
│   └── type.ts         # Email type definitions
├── firebase/           # Firebase integration
│   ├── config.ts       # Client-side Firebase init
│   ├── admin.ts        # Server-side Firebase Admin SDK
│   └── authHelpers.ts  # Firebase auth helpers
├── jobs/               # Background jobs
│   └── emailJobs.ts    # Trip reminders and completion emails
├── utils/              # Helper functions
│   ├── generateReceiptPdf.ts # PDF receipt generation
│   ├── mapImage.ts     # Google Maps static image generation
│   ├── offerCalculations.ts # Special offer calculations
│   ├── qrcode.ts       # QR code generation
│   └── search.ts       # Search utilities
├── dbConnect.ts        # Database connection (multi-tenant support)
├── algolia.ts          # Algolia sync functions
├── jwt.ts              # JWT sign/verify with jose
├── mailgun.ts          # Direct Mailgun integration
├── cloudflare-image-loader.ts # Cloudflare CDN image loader
└── stripe.ts           # Stripe initialization

components/             # React components (mix of Server/Client)
├── admin/             # Admin-specific components
│   ├── Header.tsx     # Admin header
│   ├── Sidebar.tsx    # Admin sidebar navigation
│   ├── Login.tsx      # Admin login form
│   ├── TenantSelector.tsx  # Tenant dropdown selector
│   ├── TenantSwitcher.tsx  # Tenant switcher UI
│   ├── AccessDenied.tsx    # Permission denied page
│   ├── withAuth.tsx        # Admin auth HOC
│   ├── StopSaleHistoryTable.tsx # Stop sale audit table
│   ├── AttractionPageForm.tsx   # Attraction page editor
│   ├── CategoryForm.tsx    # Category editor
│   └── ImageCleaner.tsx    # Unused image cleanup
├── auth/              # Auth components
│   ├── LoginModal.tsx # Login modal
│   └── SignupModal.tsx # Signup modal
├── booking/           # Booking-related components
│   └── addOnData.tsx  # Tour add-on options
├── landing/           # Landing page templates
│   ├── MasonryLandingPage.tsx  # Masonry grid layout
│   └── UniversalLandingPage.tsx # Universal landing template
├── reviews/           # Review components
│   ├── ReviewForm.tsx # Review submission form
│   └── ReviewList.tsx # Review display list
├── search/            # Search components
│   ├── AlgoliaSearch.tsx      # Algolia InstantSearch
│   ├── AlgoliaSearchModal.tsx # Search modal overlay
│   ├── AlgoliaChat.tsx        # AI-powered search chat
│   └── FallbackSearch.tsx     # Fuse.js fallback search
├── shared/            # Shared/reusable components
│   ├── TourCard.tsx   # Tour card display
│   ├── OfferDisplay.tsx # Special offer badges
│   ├── TourOfferSection.tsx # Tour offers section
│   └── CurrencyLanguageSwitcher.tsx # Currency/language toggle
├── user/              # User dashboard components
│   ├── TourCard.tsx   # User tour card
│   ├── UserSidebar.tsx # User dashboard sidebar
│   └── layout.tsx     # User layout wrapper
└── (root)             # Top-level components (Header, Footer, HeroSection, etc.)

contexts/              # React Context providers (Client components)
├── TenantContext.tsx  # Tenant branding/config context
├── AdminTenantContext.tsx # Admin panel tenant selection
├── AdminAuthContext.tsx # Admin authentication context
├── AuthContext.tsx    # User authentication
├── CartContext.tsx    # Shopping cart
├── WishlistContext.tsx # User wishlist
└── SettingsContext.tsx # Currency, language, localization
hooks/                 # Custom React hooks
├── useCart.ts         # Cart context wrapper
├── useDestinations.ts # Fetches destinations with tour counts
├── useOnClickOutside.ts # Click outside detection
├── useRequireAuth.ts  # Auth guard hook
├── useSearch.ts       # Recent/popular searches
├── useSettings.ts     # Settings context with formatters
└── useTourOffers.ts   # Tour offers fetching
utils/                 # Frontend utilities
├── cloudinary.ts      # Cloudinary image helpers
├── date.ts            # Date formatting utilities
└── localization.ts    # Localization helpers
types/                 # TypeScript type definitions
scripts/               # Utility scripts for maintenance
docs/                  # Additional documentation
└── SPECIAL_OFFERS_GUIDE.md # Special offers reference
```

---

## Multi-Tenant Architecture

The platform supports **unlimited branded websites** from a single codebase. Each tenant (brand) has:

- Custom domain (e.g., `hurghadaspeedboat.com`, `cairotours.com`)
- Custom branding (logo, colors, fonts)
- Custom SEO settings (meta titles, descriptions, OG images)
- Filtered content (tours, destinations specific to tenant)
- Branded email communications
- Optional separate database

### How Multi-Tenancy Works

```
┌─────────────────────────────────────────────────────────────────┐
│                         Request Flow                             │
├─────────────────────────────────────────────────────────────────┤
│  1. Domain Request (e.g., hurghadaspeedboat.com)                │
│           ↓                                                      │
│  2. Middleware (middleware.ts)                                   │
│     - Detects tenant from domain mapping                        │
│     - Sets x-tenant-id header & tenantId cookie                 │
│           ↓                                                      │
│  3. Server Components                                            │
│     - Use getTenantFromRequest() to get tenant ID               │
│     - Use getTenantPublicConfig() to fetch config from DB       │
│           ↓                                                      │
│  4. Client Components                                            │
│     - Use TenantProvider wrapper                                 │
│     - Use useTenant() hook to access tenant data                │
└─────────────────────────────────────────────────────────────────┘
```

### Tenant Detection (middleware.ts)

Domain-to-tenant mapping is loaded from `TENANT_DOMAINS` (JSON env var) or falls back to the default mapping inside `middleware.ts`. The middleware also supports:
- **Subdomain detection** (e.g., `hurghada.egypttours.com` → `hurghada`)
- **Preview mode** via `?tenant=xxx` query parameter
- **www prefix normalization**

```typescript
const tenantDomains = {
  // ============================================
  // EXISTING TENANTS (Original brands)
  // ============================================
  'egypt-excursionsonline.com': 'default',
  'hurghadatours.com': 'hurghada',
  'hurghada-excursions.com': 'hurghada',
  'cairotours.com': 'cairo',
  'cairo-excursions.com': 'cairo',
  'luxortours.com': 'luxor',
  'luxor-excursions.com': 'luxor',
  'sharmtours.com': 'sharm',
  'sharm-excursions.com': 'sharm',
  'aswantours.com': 'aswan',
  'aswan-excursions.com': 'aswan',
  'alexandriatours.com': 'alexandria',
  'marsaalamtours.com': 'marsa-alam',
  'dahabtours.com': 'dahab',
  'hurghadaspeedboat.com': 'hurghada-speedboat',
  
  // ============================================
  // NEW TENANTS - Excursions Online Network (Jan 2026)
  // ============================================
  'hurghadaexcursionsonline.com': 'hurghada-excursions-online',
  'cairoexcursionsonline.com': 'cairo-excursions-online',
  'makadibayexcursions.com': 'makadi-bay',
  'elgounaexcursions.com': 'el-gouna',
  'luxorexcursions.com': 'luxor-excursions',
  'sharmexcursionsonline.com': 'sharm-excursions-online',
  
  // ============================================
  // FUTURE TENANTS (Prepared)
  // ============================================
  'aswanexcursions.com': 'aswan-excursions',
  'marsaalamexcursions.com': 'marsa-alam-excursions',
  'dahabexcursions.com': 'dahab-excursions',

  // ============================================
  // DEVELOPMENT (localhost ports)
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
  
  // All domains also support www. prefix
};
```

### Active Tenants

**Original Brands:**

| Tenant ID | Domain | Dev Port |
|-----------|--------|----------|
| `default` | egypt-excursionsonline.com | 3000 |
| `hurghada` | hurghadatours.com, hurghada-excursions.com | 3001 |
| `cairo` | cairotours.com, cairo-excursions.com | 3002 |
| `luxor` | luxortours.com, luxor-excursions.com | 3003 |
| `hurghada-speedboat` | hurghadaspeedboat.com | 3004 |
| `sharm` | sharmtours.com, sharm-excursions.com | — |
| `aswan` | aswantours.com, aswan-excursions.com | — |
| `alexandria` | alexandriatours.com | — |
| `marsa-alam` | marsaalamtours.com | — |
| `dahab` | dahabtours.com | — |

**Excursions Online Network (Jan 2026):**

| Tenant ID | Domain | Dev Port |
|-----------|--------|----------|
| `hurghada-excursions-online` | hurghadaexcursionsonline.com | 3005 |
| `cairo-excursions-online` | cairoexcursionsonline.com | 3006 |
| `makadi-bay` | makadibayexcursions.com | 3007 |
| `el-gouna` | elgounaexcursions.com | 3008 |
| `luxor-excursions` | luxorexcursions.com | 3009 |
| `sharm-excursions-online` | sharmexcursionsonline.com | 3010 |

**Future Tenants (Prepared):**

| Tenant ID | Domain | Dev Port |
|-----------|--------|----------|
| `aswan-excursions` | aswanexcursions.com | 3011 |
| `marsa-alam-excursions` | marsaalamexcursions.com | 3012 |
| `dahab-excursions` | dahabexcursions.com | 3013 |

### Website Status Modes

Per-tenant status is controlled by `TENANT_WEBSITE_STATUS` (JSON), with a global override (`GLOBAL_COMING_SOON_MODE`) in `middleware.ts`:
- Statuses: `active`, `coming_soon`, `maintenance`, `offline`
- Admin paths (`/admin/*`, `/api/admin/*`) are **always accessible** regardless of status
- Allowed paths during non-active status include `/coming-soon`, `/maintenance`, `/offline`, `/api/subscribe`, `/api/auth`, `/monitoring`, and static assets

### Tenant Preview Mode

The middleware supports previewing any tenant from any domain, useful for staging and testing:

**Activation Methods:**
1. **Query parameter**: `?tenant=hurghada-excursions-online` — highest priority
2. **Cookie persistence**: Once set, preview persists across page loads
3. **Reset**: `?reset_tenant=true` reverts to domain-based detection

**Auto-enabled in:**
- `NODE_ENV=development`
- Vercel/Netlify preview deployments
- `*.netlify.app` and `*.vercel.app` domains
- Localhost

**Disabled by default** on production custom domains. Override with:
```bash
ENABLE_TENANT_PREVIEW=true   # Force enable
ENABLE_TENANT_PREVIEW=false  # Force disable
```

### Server-Side Tenant Access

```typescript
import { getTenantFromRequest, getTenantPublicConfig } from '@/lib/tenant';

export async function generateMetadata(): Promise<Metadata> {
  const tenantId = await getTenantFromRequest();
  const tenant = await getTenantPublicConfig(tenantId);
  
  return {
    title: `Page Title | ${tenant?.name || 'Default'}`,
    description: tenant?.seo.defaultDescription,
    openGraph: {
      siteName: tenant?.name,
      images: [tenant?.seo.ogImage],
    },
  };
}
```

### Client-Side Tenant Access

```typescript
'use client';
import { useTenant } from '@/contexts/TenantContext';

export function Component() {
  const { tenant, getLogo, getSiteName, getPrimaryColor } = useTenant();
  
  return (
    <header style={{ '--primary': getPrimaryColor() }}>
      <img src={getLogo()} alt={getSiteName()} />
    </header>
  );
}
```

### Tenant-Aware Database Queries

```typescript
import { buildTenantQuery, buildStrictTenantQuery } from '@/lib/tenant';

// Filter tours by tenant (includes 'default' tenant as fallback)
const query = buildTenantQuery({ isPublished: true }, tenantId);
const tours = await Tour.find(query);
// Returns tours from both 'tenantId' AND 'default'

// Strict filtering (no fallback to default)
const strictQuery = buildStrictTenantQuery({ isPublished: true }, tenantId);
const tenantOnlyTours = await Tour.find(strictQuery);
// Returns only tours specifically assigned to 'tenantId'

// With options
const queryWithOptions = buildTenantQuery(
  { isPublished: true },
  tenantId,
  { includeDefault: true, includeShared: true }
);
```

**Query Options:**
- `includeDefault: true` (default) - Include content from 'default' tenant
- `includeShared: true` - Include content marked as shared (`tenantId: null` or `'shared'`)

### Multi-Database Support

Each tenant can optionally use a separate MongoDB database:

```bash
# Environment variables
MONGODB_URI=mongodb://...          # Default database
MONGODB_URI_SPEEDBOAT=mongodb://... # Tenant-specific database
```

```typescript
// lib/dbConnect.ts automatically routes to correct database
await dbConnect(tenantId);  // Uses tenant-specific DB if configured
```

---

## Key Architectural Patterns

### 1. Database Connection
All database operations must use `dbConnect()` from `lib/dbConnect.ts`. This function:
- Maintains cached connections per database URI
- Automatically loads all Mongoose models on connection
- Supports multi-tenant database routing

```typescript
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';

export async function GET() {
  const tenantId = await getTenantFromRequest();
  await dbConnect(tenantId);  // Connect to tenant's database
  const tours = await Tour.find({ tenantId, published: true });
  // ...
}
```

### 2. API Route Pattern
All API routes follow Next.js 16 Route Handler conventions:
- Use named exports: `GET`, `POST`, `PUT`, `DELETE`
- Return `NextResponse` objects
- Call `dbConnect()` before any database operations
- For admin routes, verify authentication first
- Include `tenantId` in queries for multi-tenant filtering

### 3. Authentication Flow
- **Users**: Firebase Authentication (email/password + Google OAuth)
- **Admins**: JWT tokens stored in HTTP-only cookies named `authToken`
- JWT token verification via `lib/jwt.ts` using jose library
- Passwords hashed with bcryptjs
- API routes check for **both** Firebase tokens and JWT tokens (dual auth support)
- Middleware in `middleware.ts` handles tenant detection (not route protection)
- Admin routes require `role: 'admin'` in JWT payload
- Admin auth helpers in `lib/auth/adminAuth.ts`

### 4. Server vs Client Components
- Default to Server Components (faster, better SEO)
- Use `'use client'` directive only when needed:
  - Interactive UI (forms, buttons with state)
  - React Context consumers (useTenant, useAuth, etc.)
  - Browser APIs (localStorage, window, etc.)
  - Event handlers

### 5. Dynamic Routing
- Primary tour pages use `app/[slug]/page.tsx` (catch-all dynamic route)
- Middleware in `middleware.ts` excludes reserved paths from slug matching
- Rewrites route legacy paths to `/:slug` (`/tours/:slug`, `/experiences/:slug`, `/activities/:slug`)
- Redirects `/tour/:slug` to `/:slug` via `next.config.ts`
- **Reserved Paths** (defined in `middleware.ts`):
  `/admin`, `/api`, `/auth`, `/login`, `/signup`, `/destinations`, `/categories`, `/blog`, `/about`, `/contact`, `/privacy`, `/terms`, `/cart`, `/checkout`, `/profile`, `/bookings`, `/wishlist`, `/search`, `/help`, `/support`, `/careers`, `/press`, `/partners`, `/user`, `/booking`, `/attraction`, `/category`, `/interests`, `/egypt`, `/faqs`, `/forgot`, `/tours`, `/tour`, `/redirecting`, `/accept-invitation`, `/sentry-example-page`, `/_next`, `/favicon.ico`, `/images`, `/uploads`, `/static`, `/robots.txt`, `/sitemap.xml`, `/manifest.json`, `/monitoring`, `/payment`, `/public`
- **Important**: New top-level routes MUST be added to `reservedPaths` to avoid conflict with tour slugs

### 6. Algolia Integration
When modifying Tour data:
1. Save to MongoDB first
2. Then sync to Algolia using `syncTourToAlgolia()` from `lib/algolia.ts`
3. Handle sync failures gracefully (Algolia is supplementary)

---

## Email System

The platform uses a centralized email service with tenant-branded templates.

### Email Service (`lib/email/emailService.ts`)

```typescript
import { EmailService } from '@/lib/email/emailService';

// Send tenant-branded booking confirmation
await EmailService.sendBookingConfirmation({
  customerEmail: 'user@example.com',
  customerName: 'John Doe',
  bookingId: 'BK-12345',
  tourTitle: 'Pyramids Day Tour',
  tenantBranding: {
    companyName: 'Hurghada Speedboat',
    logo: 'https://...',
    primaryColor: '#00E0FF',
    contactEmail: 'info@hurghadaspeedboat.com',
  },
});
```

### Available Email Types (10 templates in `lib/email/templates/`)
- `booking-confirmation` - With QR code and PDF receipt
- `payment-confirmation` - Payment success
- `trip-reminder` - 24 hours before tour
- `trip-completion` - Post-trip thank you + review request
- `booking-cancellation` - Cancellation confirmation
- `booking-update` - Status change notification
- `welcome` - New user welcome
- `admin-booking-alert` - Admin notification for new bookings
- `admin-invite` - Team member invitation
- `admin-access-update` - Access change notification

### Email Templates
Located in `lib/email/templates/*.html`, processed via `lib/email/templateEngine.ts` (Handlebars) with dynamic variable replacement:
- `{{companyName}}` - Tenant name
- `{{companyLogo}}` - Tenant logo URL
- `{{primaryColor}}` - Brand color
- `{{customerName}}`, `{{bookingId}}`, etc.

---

## Important Conventions

### Tenant-Aware Metadata Pattern
All pages should use dynamic metadata with tenant info:

```typescript
export async function generateMetadata(): Promise<Metadata> {
  try {
    const tenantId = await getTenantFromRequest();
    const tenant = await getTenantPublicConfig(tenantId);
    
    if (tenant) {
      return {
        title: `Page Title | ${tenant.name}`,
        description: `Description with ${tenant.name}`,
        openGraph: {
          siteName: tenant.name,
          images: [tenant.seo.ogImage],
        },
      };
    }
  } catch (error) {
    console.error('Error generating metadata:', error);
  }
  
  // Fallback
  return { title: 'Page Title' };
}
```

### Port Management
Development server auto-detects available ports starting from 3000 via `scripts/dev-with-port.ts`. This prevents port conflicts in multi-project environments.

### Environment Variables
Key environment variables:
```bash
# Required
MONGODB_URI=                    # Default MongoDB connection
JWT_SECRET=                     # 32+ characters for JWT signing
STRIPE_SECRET_KEY=              # Stripe API key

# Multi-Tenant (optional)
MONGODB_URI_SPEEDBOAT=          # Tenant-specific database
TENANT_DOMAINS=                 # JSON mapping of domains to tenant IDs
DEFAULT_TENANT_ID=              # Fallback tenant (default: 'default')
TENANT_WEBSITE_STATUS=          # JSON mapping of tenantId -> status
ENABLE_TENANT_PREVIEW=          # true/false - force enable/disable tenant preview mode

# Services
NEXT_PUBLIC_ALGOLIA_APP_ID=     # Algolia App ID
NEXT_PUBLIC_ALGOLIA_SEARCH_KEY= # Algolia search-only key
ALGOLIA_ADMIN_KEY=              # Algolia admin key
MAILGUN_API_KEY=                # Mailgun API key
MAILGUN_DOMAIN=                 # Mailgun domain
MAILGUN_FROM_EMAIL=             # Default sender email
ADMIN_NOTIFICATION_EMAIL=       # Admin notifications recipient
CLOUDINARY_CLOUD_NAME=          # Cloudinary cloud name
CLOUDINARY_API_KEY=             # Cloudinary API key
CLOUDINARY_API_SECRET=          # Cloudinary secret

# Firebase (multiple credential strategies supported)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
FIREBASE_PROJECT_ID=            # Server-side
FIREBASE_CLIENT_EMAIL=          # Server-side
FIREBASE_PRIVATE_KEY=           # Server-side (with newlines)
FIREBASE_SERVICE_ACCOUNT_KEY=   # Alternative: JSON string
FIREBASE_SERVICE_ACCOUNT_BASE64= # Alternative: Base64-encoded JSON
FIREBASE_CLOUDINARY_PUBLIC_ID=  # Alternative: Cloudinary storage

# Google Maps
GOOGLE_MAPS_STATIC_KEY=         # Static Maps API key
GOOGLE_MAPS_API_KEY=            # Maps API key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY= # Client-side Maps

# Cron Jobs
CRON_SECRET=                    # Secret for cron endpoint protection

# Cloudflare (optional)
NEXT_PUBLIC_DOMAIN=             # For Cloudflare image loader

# Other
NEXT_PUBLIC_BASE_URL=           # Base URL for the application
CUSTOM_KEY=                     # Custom client env passthrough
```

### Path Aliases
TypeScript path alias `@/*` maps to root directory:
```typescript
import Tour from '@/lib/models/Tour';
import { Header } from '@/components/Header';
import { getTenantFromRequest } from '@/lib/tenant';
```

### Error Handling
- Build ignores ESLint and TypeScript errors (see next.config.ts)
- Runtime errors monitored via Sentry
- API routes should return proper HTTP status codes
- User-facing errors shown via react-hot-toast

### Image Handling
- Images served via Cloudinary CDN
- Next.js Image optimization disabled (`unoptimized: true`) for Netlify compatibility
- Remote patterns configured for Cloudinary, Unsplash, AWS S3

### Caching Strategy
- Homepage: No caching (`no-store`) for real-time admin updates
- API routes: No caching
- Static assets: Long-term caching (1 year immutable)
- Next.js static files: Long-term caching (1 year immutable)
- Tour pages: Can use ISR/SSR as needed

---

## Model Relationships

Key Mongoose models and their relationships:

| Model | Description | Tenant-Aware |
|-------|-------------|--------------|
| **Tenant** | Tenant/brand configuration (branding, SEO, features) | N/A |
| **User** | User accounts, roles (user/admin), team memberships | ✓ |
| **Tour** | Tours with booking options, pricing, itinerary | ✓ |
| **Destination** | Locations; tours reference via `destinationId` | ✓ |
| **Category** | Tour categories; tours have `categories` array | ✓ |
| **Booking** | Reservations linking User and Tour(s) | ✓ |
| **Review** | User reviews for tours | ✓ |
| **Blog** | Blog posts for content marketing | ✓ |
| **AttractionPage** | Landing pages for attractions | ✓ |
| **HeroSettings** | Homepage hero configuration (falls back to tenant.homepage config) | ✓ |
| **Discount** | Promotional codes | ✓ |
| **Comment** | Blog post comments | ✓ |
| **Job** | Career/job listings | ✓ |
| **Otp** | One-time passwords for verification | - |
| **Availability** | Date-based availability with time slots and capacity | ✓ |
| **SpecialOffer** | Promotional offers (percentage, fixed, early bird, etc.) | ✓ |
| **StopSale** | Date range blocking for tours | ✓ |
| **StopSaleLog** | Audit log for stop sale actions | ✓ |

---

## Firebase Integration

The platform supports Firebase Authentication alongside JWT-based auth.

### Client-Side Firebase (`lib/firebase/config.ts`)
```typescript
import { auth, googleProvider } from '@/lib/firebase/config';
import { signInWithPopup } from 'firebase/auth';

// Google Sign-In
const result = await signInWithPopup(auth, googleProvider);
const idToken = await result.user.getIdToken();
```

### Server-Side Firebase Admin (`lib/firebase/admin.ts`)
Supports multiple credential loading strategies:
1. Environment variables (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`)
2. JSON string (`FIREBASE_SERVICE_ACCOUNT_KEY`)
3. Base64-encoded (`FIREBASE_SERVICE_ACCOUNT_BASE64`)
4. Cloudinary storage (`FIREBASE_CLOUDINARY_PUBLIC_ID`)
5. Remote URL (`FIREBASE_SERVICE_ACCOUNT_URL`)

### Firebase Auth Helpers (`lib/firebase/authHelpers.ts`)
```typescript
import { authenticateFirebaseUser, syncFirebaseUserToMongo } from '@/lib/firebase/authHelpers';

// In API route - verify Firebase token and sync user
const firebaseUser = await authenticateFirebaseUser(request);
const mongoUser = await syncFirebaseUserToMongo(firebaseUser);
```

---

## Special Offers System

The platform includes a comprehensive promotional offers system.

### Offer Types
- `percentage` - Percentage discount (e.g., 20% off)
- `fixed` - Fixed amount discount (e.g., $50 off)
- `early_bird` - Discount for early bookings (X days before tour)
- `last_minute` - Discount for last-minute bookings
- `group` - Discount for group sizes (min participants)
- `bundle` - Multi-tour bundle discounts
- `promo_code` - Code-based discounts

### Offer Targeting
- Specific tours or categories
- Excluded tours
- Option-level targeting
- Travel date restrictions
- Usage limits (total and per-user)
- Priority system for offer selection

### Usage
```typescript
import { calculateDiscountedPrice, getBestOffer, isOfferValid } from '@/lib/utils/offerCalculations';

// Get best applicable offer for a tour
const bestOffer = await getBestOffer(tour, options);

// Calculate discounted price
const finalPrice = calculateDiscountedPrice(originalPrice, offer);
```

---

## Availability & Stop Sales

### Availability Model
- Date-based availability with time slots
- Capacity management (total capacity, booked, blocked)
- Per-date stop sale flags
- Virtual fields: `totalCapacity`, `totalBooked`, `availableCapacity`

```typescript
// Check availability for a tour
const availability = await Availability.findByTourAndDate(tourId, date);
const status = Availability.getAvailabilityStatus(availability);
```

### Stop Sales
- Block bookings for specific date ranges
- Tour-level or option-level blocking
- Reason tracking for audit purposes
- Automatic logging via `StopSaleLog`

```typescript
// API: Apply stop sale
PUT /api/availability/stop-sale
{ tourId, startDate, endDate, optionId?, reason }

// API: Remove stop sale
DELETE /api/availability/stop-sale
{ stopSaleId }
```

---

## Cron Jobs & Background Tasks

### Email Jobs (`lib/jobs/emailJobs.ts`)
```typescript
import { sendTripReminders, sendTripCompletionEmails } from '@/lib/jobs/emailJobs';

// Send reminders for trips happening in 24 hours
await sendTripReminders();

// Send completion emails for trips that ended today
await sendTripCompletionEmails();
```

### Cron Endpoints (protected by `CRON_SECRET`)
```bash
# Trip reminders - run daily
GET /api/cron/trip-reminders?secret=CRON_SECRET

# Trip completion emails - run daily
GET /api/cron/trip-completion?secret=CRON_SECRET
```

---

## Settings Context

The `SettingsContext` provides currency, language, and localization support.

### Usage
```typescript
'use client';
import { useSettings, usePriceFormatter, useTranslation } from '@/hooks/useSettings';

function PriceDisplay({ amount }: { amount: number }) {
  const formatPrice = usePriceFormatter();
  const { t } = useTranslation();
  
  return (
    <div>
      <span>{t('price')}: {formatPrice(amount)}</span>
    </div>
  );
}
```

### Features
- Currency selection (USD, EUR, GBP, EGP)
- Exchange rate fetching and caching
- Language selection (en, es, fr, de)
- Price formatting with currency symbols
- Date and number formatting
- Translation function `t()`

---

## Custom Hooks

| Hook | Description |
|------|-------------|
| `useCart` | Cart context wrapper with add/remove/clear |
| `useDestinations` | Fetches destinations with tour counts |
| `useOnClickOutside` | Detects clicks outside element (modals/dropdowns) |
| `useRequireAuth` | Auth guard - redirects to login if not authenticated |
| `useSearch` | Recent and popular searches management |
| `useSettings` | Settings context with formatters |
| `useTourOffers` | Fetches offers for tour(s) |
| `usePriceFormatter` | Returns price formatting function |
| `useTranslation` | Returns translation function `t()` |

---

## Notable API Routes

### Availability & Stop Sales
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/availability/[tourId]` | GET | Get availability for a tour |
| `/api/admin/availability` | POST/PUT | Create/update availability |
| `/api/availability/stop-sale` | PUT/DELETE | Apply/remove stop sale |
| `/api/admin/stop-sale-logs` | GET | Get stop sale audit logs |

### Special Offers
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/special-offers` | GET/POST/PUT/DELETE | CRUD for offers |
| `/api/offers/tour/[tourId]` | GET | Get offers for a tour |
| `/api/offers/batch` | POST | Batch fetch offers |

### Bookings
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/bookings` | GET/POST | List/create bookings |
| `/api/bookings/[id]` | GET | Get single booking |
| `/api/bookings/manual` | POST | Create manual booking (admin) |
| `/api/booking/verify/[reference]` | GET | Verify booking by reference |

### Admin Management
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/dashboard` | GET | Dashboard analytics |
| `/api/admin/bulk-upload` | POST | Bulk tour upload |
| `/api/admin/data-viewer` | GET | Database data viewer |
| `/api/admin/manifests` | GET | Booking manifests |
| `/api/admin/fix-data` | POST | Data repair utilities |
| `/api/admin/stop-sale-logs` | GET | Stop sale audit logs |
| `/api/admin/seed` | POST | Database seeding endpoints |

### Other
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/hero-settings` | GET | Hero settings API |
| `/api/attraction-pages/[slug]` | GET | Attraction page data |
| `/api/interests` | GET | Interests listing |
| `/api/contact` | POST | Contact form submission |
| `/api/subscribe` | POST | Newsletter subscription |
| `/api/tenant/current` | GET | Current tenant config |
| `/api/tours` | GET | Public tour listing |
| `/api/categories` | GET | Categories listing |
| `/api/destinations` | GET | Destinations listing |
| `/api/reviews` | GET/POST | Public reviews |
| `/api/blog` | GET | Blog posts listing |
| `/api/upload` | POST | File upload |
| `/api/webhooks` | POST | Stripe webhook handler |
| `/api/algolia` | POST | Algolia sync endpoint |

---

## Admin Dashboard

Admin routes (`/admin/*`) require authentication with `role: 'admin'`. Layout uses separate auth context (`AdminAuthContext`).

### Admin Roles & Permissions
Defined in `lib/constants/adminPermissions.ts`:

**Roles:**

| Role | Description | Permissions |
|------|-------------|-------------|
| `customer` | Regular user (no admin access) | None |
| `admin` | Full admin access | All 8 permissions |
| `super_admin` | Super admin with all permissions | All 8 permissions |
| `operations` | Operations team | manageDashboard, manageBookings, manageReports |
| `content` | Content team | manageDashboard, manageTours, managePricing, manageContent |
| `support` | Customer support | manageDashboard, manageBookings |

**Available Permissions:**
`manageDashboard`, `manageBookings`, `manageTours`, `managePricing`, `manageContent`, `manageDiscounts`, `manageUsers`, `manageReports`

### Key Admin Features
- **Tenant Selector** - Switch between brands to manage content
- **Tour CRUD** - Rich form with booking options, pricing, itinerary
- **Booking Management** - Status updates, cancellations, manual bookings
- **User Management** - Users and team members
- **Analytics Dashboard** - Charts with Chart.js/Recharts
- **Bulk Operations** - Bulk upload, data import, image cleanup
- **Hero Settings** - Homepage configuration per tenant
- **Discount Management** - Promo codes
- **Special Offers** - Full promotional offers management
- **Availability Management** - Calendar-based availability editing
- **Stop Sales** - Block bookings for date ranges
- **Reports & Manifests** - Generate reports and booking manifests
- **Data Viewer** - Browse and inspect database records
- **Data Import** - Import tours/data from JSON
- **Seeding Tools** - Seed database with sample data
- **Admin Tools** - Miscellaneous admin utilities

### Admin Tenant Context
```typescript
import { useAdminTenant } from '@/contexts/AdminTenantContext';

function AdminComponent() {
  const { selectedTenantId, getTenantFilter } = useAdminTenant();
  
  // Filter data by selected tenant
  const filter = getTenantFilter(); // Returns { tenantId: 'xxx' } or {}
}
```

---

## Testing

Jest configured with React Testing Library. Tests in `__tests__` directories.

---

## Utility Scripts

Located in `scripts/` folder, run with `npx tsx scripts/<name>.ts`:

### Data Management
| Script | Description |
|--------|-------------|
| `sync-algolia.ts` | Sync published tours to Algolia |
| `sync-all-algolia.ts` | Sync all tours (including unpublished) |
| `sync-new-algolia.ts` | Sync new/updated tours to Algolia |
| `sync-all-new.ts` | Sync all new tours |
| `populate-categories-and-reviews.ts` | Seed categories and reviews |
| `seed-sample-offers.ts` | Seed sample special offers |
| `seed-homepage-content.ts` | Seed homepage content data |
| `auto-assign-categories.ts` | Auto-assign categories to tours |
| `migrate-categories-to-array.ts` | Migration: categories to array format |
| `migrate-to-multi-tenant.ts` | Migration: add tenantId to existing data |
| `update-tour-ratings.ts` | Recalculate tour ratings from reviews |
| `update-hero-images.ts` | Update hero background images |
| `setup-indexes.js` | Setup MongoDB indexes |

### Tenant Management
| Script | Description |
|--------|-------------|
| `seed-speedboat-tenant.ts` | Seed speedboat tenant |
| `seed-speedboat-complete.ts` | Full speedboat setup pipeline |
| `seed-excursions-tenants.ts` | Seed all Excursions Online tenants (6 active + 3 future) with HeroSettings |
| `assign-speedboat-tours.ts` | Assign tours to speedboat tenant |
| `assign-tours-to-excursions-tenants.ts` | Assign tours to Excursions Online tenants |
| `setup-speedboat-database.ts` | Setup tenant-specific database |
| `setup-tenant-theme.ts` | Configure tenant theme |

**Quick tenant seeding:**
```bash
pnpm seed:excursions  # Seeds: hurghada-excursions-online, cairo-excursions-online, 
                      # makadi-bay, el-gouna, luxor-excursions, sharm-excursions-online
```






### Reviews
| Script | Description |
|--------|-------------|
| `add-sample-reviews.ts` | Add sample reviews to tours |
| `add-star-reviews-all-tours.ts` | Add star ratings to all tours |
| `add-star-only-reviews.ts` | Add star-only ratings (no text) |
| `add-varied-reviews-specific-tours.ts` | Add varied reviews to specific tours |
| `add-reviews-to-specific-tour.ts` | Add reviews to a single tour |

### Verification & Cleanup
| Script | Description |
|--------|-------------|
| `check-algolia-status.ts` | Check Algolia connection |
| `check-category-tour-counts.ts` | Verify category tour counts |
| `check-offers.ts` | Verify special offers |
| `check-env.ts` | Verify environment variables |
| `check-bad-bookings.js` | Find corrupt booking records |
| `cleanup-demo-users.ts` | Remove demo/test users |
| `cleanup-team-members.ts` | Clean up team member data |
| `fix-demo-users.ts` | Fix demo user data issues |
| `find-tour-slugs.ts` | List all tour slugs |
| `list-team-members.ts` | List all team members |
| `debug-categories.ts` | Debug category assignments |
| `verify-all-fixes.ts` | Run all verification checks |
| `verify-stripe.ts` | Verify Stripe configuration |
| `upload-firebase-to-cloudinary.sh` | Upload Firebase credentials to Cloudinary |

### Testing
| Script | Description |
|--------|-------------|
| `test-email.ts` | Test email templates |
| `test-admin-email.ts` | Test admin notification emails |
| `test-algolia.ts` | Test Algolia integration |
| `test-mailgun-direct.ts` | Test direct Mailgun sending |
| `test-template-engine.ts` | Test email template engine |
| `test-interests-api.ts` | Test interests API |
| `test-regex.ts` | Test regex patterns |

---

## Server-Side Caching

The platform uses Next.js `unstable_cache` for server-side caching (`lib/cache.ts`).

### Cache Tags
```typescript
import { CACHE_TAGS, CACHE_DURATIONS } from '@/lib/cache';

// Available cache tags for revalidation
CACHE_TAGS.TOUR, CACHE_TAGS.DESTINATION, CACHE_TAGS.CATEGORY, CACHE_TAGS.REVIEW, etc.
```

### Cached Queries
```typescript
import { getCachedTour, getCachedDestinations, getCachedFeaturedTours } from '@/lib/cache';

// These functions automatically cache results
const tour = await getCachedTour(slug, tenantId);
const destinations = await getCachedDestinations(tenantId);
```

---

## Booking Status Constants

Defined in `lib/constants/bookingStatus.ts`:

| Status | Description |
|--------|-------------|
| `pending` | Awaiting payment/confirmation |
| `confirmed` | Payment received, booking confirmed |
| `completed` | Trip completed |
| `cancelled` | Booking cancelled |
| `refunded` | Full refund issued |
| `partial_refunded` | Partial refund issued |

---

## QR Code & PDF Generation

### QR Code Generation (`lib/utils/qrcode.ts`)
```typescript
import { generateQRCode, generateBookingVerificationURL } from '@/lib/utils/qrcode';

// Generate QR code as data URL
const qrDataUrl = await generateQRCode(bookingReference);

// Generate verification URL for QR
const verifyUrl = generateBookingVerificationURL(bookingReference);
```

### PDF Receipt Generation (`lib/utils/generateReceiptPdf.ts`)
```typescript
import { generateReceiptPdf } from '@/lib/utils/generateReceiptPdf';

// Generate PDF buffer for email attachment
const pdfBuffer = await generateReceiptPdf(booking, tenant);
```

---

## Common Gotchas

1. **Mongoose Models**: Always import models after `dbConnect()` is called, or models may not be registered
2. **Client Components**: Contexts like `AuthContext`, `TenantContext` require `'use client'` and providers in layout
3. **Tenant Metadata**: All pages must use `generateMetadata()` with tenant info (not static `export const metadata`)
4. **Algolia Sync**: Failed syncs don't break the app; check logs and use sync scripts
5. **Port Detection**: Don't hardcode `localhost:3000`; use `NEXT_PUBLIC_APP_URL` env var
6. **Build Errors**: Build ignores TypeScript/ESLint errors; fix them for code quality, but won't block deployment
7. **Image Paths**: Always use absolute URLs or Cloudinary for production images
8. **Dynamic Routes**: New top-level routes must be added to `reservedPaths` in `middleware.ts` to avoid conflict with tour slugs
9. **Tenant in Emails**: Always pass `tenantBranding` to email service for branded emails
10. **Multi-DB**: If using tenant-specific databases, ensure `dbConnect(tenantId)` is called with correct tenant
11. **Firebase Auth**: API routes must check for both Firebase tokens and JWT tokens for dual auth support
12. **Cron Endpoints**: Always verify `CRON_SECRET` before executing cron jobs
13. **Stop Sales**: Check stop sale status before allowing bookings for a date
14. **Offer Priority**: When multiple offers apply, `getBestOffer()` selects by priority then discount amount
15. **HeroSettings Fallback**: If no HeroSettings document exists for a tenant, `HomePageServer.tsx` uses the tenant's `homepage` config (heroTitle, heroImages, etc.)
16. **Tenant Content Fallback**: New tenants inherit tours/content from 'default' tenant via `buildTenantQuery()` until tenant-specific content is assigned
17. **Contact Info**: Always use `useTenant()` for contact phone/email - never hardcode contact details in components

---

## Performance Considerations

- Server Components for data fetching (no client-side hydration cost)
- Algolia provides instant search; fallback to DB search adds latency
- Images served via Cloudinary CDN (with optional Cloudflare loader)
- Database connection pooling (maxPoolSize: 50 for builds)
- Turbopack enabled for faster dev builds
- Static assets cached at CDN level (1 year immutable)
- Tenant config cached in memory (5 minute TTL)
- Server-side query caching via `unstable_cache` with cache tags
- Exchange rates cached for currency conversion
- Offers batch-fetched for tour listings to reduce API calls

---

## AI Features

The application includes AI-powered search widgets:
- `AISearchWidget.tsx` - Main search interface
- `AIAgentWidget.tsx` - AI assistant for tour recommendations
- Uses Vercel AI SDK with streaming responses

When modifying these, be aware of client-side state management and streaming requirements.

---

## Adding a New Tenant

### Option 1: Using Seed Script (Recommended)

1. **Add tenant config** to `scripts/seed-excursions-tenants.ts`:
   ```typescript
   const newTenant = {
     tenantId: 'new-tenant-id',
     name: 'New Tenant Name',
     slug: 'new-tenant-id',
     domain: 'newtenant.com',
     domains: ['newtenant.com', 'www.newtenant.com'],
     branding: {
       logo: 'placeholder-or-cloudinary-url',
       primaryColor: '#FF5733',
       secondaryColor: '#1D3557',
       accentColor: '#F4A261',
       fontFamily: 'Inter',
       // ... full branding config
     },
     seo: { defaultTitle: '...', defaultDescription: '...' },
     contact: { email: '...', phone: '...' },
     homepage: {
       heroType: 'slider',
       heroTitle: 'Your Hero Title',
       heroSubtitle: 'Your subtitle',
       heroImages: ['image1.jpg', 'image2.jpg'],
       // ... homepage settings
     },
     // ... full config
   };
   ```

2. **Add HeroSettings** in the same script:
   ```typescript
   const heroSettingsConfigs = [
     // ... existing configs
     {
       tenantId: 'new-tenant-id',
       title: { main: 'Discover', highlight: 'New Destination' },
       backgroundImages: [
         { desktop: 'https://...', alt: 'Description', isActive: true },
       ],
       searchSuggestions: ['Popular Tour', 'Activity'],
       floatingTags: { isEnabled: true, tags: ['Tag1', 'Tag2'] },
     },
   ];
   ```

3. **Add domain mapping** in `middleware.ts`:
   ```typescript
   'newtenant.com': 'new-tenant-id',
   'www.newtenant.com': 'new-tenant-id',
   'localhost:3014': 'new-tenant-id',  // Dev port
   ```

4. **Run seed script**:
   ```bash
   pnpm seed:excursions
   ```

5. **Test locally**:
   ```bash
   PORT=3014 pnpm dev:original
   ```

### Option 2: Admin Panel + Manual Setup

1. **Add domain mapping** in `middleware.ts` (same as above)

2. **Create tenant via Admin Panel** → Tenants → Create New

3. **Create HeroSettings** via Admin Panel → Hero Settings

4. **(Optional) Configure tenant database**:
   ```bash
   MONGODB_URI_NEW_TENANT=mongodb://...
   ```

### Content Fallback System

New tenants automatically inherit content from the `default` tenant:
- **Tours**: Shows `default` tenant tours until tenant-specific tours are assigned
- **Destinations**: Shared across all tenants by default
- **HeroSettings**: Uses tenant's `homepage` config as fallback if no HeroSettings document exists

```typescript
// lib/tenant.ts - buildTenantQuery includes 'default' fallback
const query = buildTenantQuery({ isPublished: true }, tenantId);
// Returns tours from both 'new-tenant' AND 'default'
```

### Tenant-Specific Contact Info

All pages use `useTenant()` for contact information. Ensure tenant config includes:
```typescript
contact: {
  email: 'info@newtenant.com',
  phone: '+1 234 567 8900',
  whatsapp: '+12345678900',
  address: 'Your Address',
}
```

Pages that use tenant contact info:
- Tour detail pages (`app/[slug]/TourDetailClientPage.tsx`)
- Checkout page (`app/checkout/page.tsx`)
- Contact page (`app/contact/ContactClientPage.tsx`)
- Booking verification (`app/booking/verify/[reference]/page.tsx`)
- User bookings (`app/user/bookings/[id]/page.tsx`)
- Footer component (`components/Footer.tsx`)
