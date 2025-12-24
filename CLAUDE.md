# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tour Ticket is a **multi-tenant** full-stack tour booking platform built with Next.js 15, TypeScript, MongoDB, and various third-party integrations. The application supports unlimited white-label branded websites, user authentication, AI-powered search, booking management, payment processing, and a comprehensive admin dashboard.

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

# Utility Scripts (via tsx)
npx tsx scripts/sync-algolia.ts                    # Manual Algolia sync
npx tsx scripts/check-algolia-status.ts            # Check Algolia connection
npx tsx scripts/populate-categories-and-reviews.ts # Seed data
npx tsx scripts/cleanup-demo-users.ts              # Clean demo data
npx tsx scripts/test-email.ts                      # Test email templates
```

## Architecture

### Tech Stack Core
- **Framework**: Next.js 15 with App Router (Server Components by default)
- **Language**: TypeScript 5
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
│   │   └── team/        # Team/staff management
│   ├── auth/            # Authentication endpoints
│   ├── bookings/        # Booking management
│   ├── checkout/        # Payment processing
│   ├── tenant/          # Tenant configuration API
│   └── search/          # Search endpoints
├── admin/               # Admin dashboard pages (protected)
├── user/                # User dashboard pages (protected)
├── [slug]/              # Dynamic tour detail pages (catch-all route)
└── (other routes)/      # Static pages (about, contact, etc.)

lib/                     # Backend logic and models
├── models/             # Mongoose schemas
│   ├── Tenant.ts       # Multi-tenant configuration model
│   ├── Tour.ts         # Tour entity with tenantId
│   ├── Booking.ts      # Booking with tenant association
│   └── ...             # Other models
├── tenant.ts           # Tenant utility helpers (server-side)
├── auth/               # Auth utilities
├── email/              # Email templates and Mailgun integration
│   ├── emailService.ts # Centralized email service (tenant-aware)
│   ├── templates/      # HTML email templates
│   └── type.ts         # Email type definitions
├── utils/              # Helper functions
├── dbConnect.ts        # Database connection (multi-tenant support)
├── algolia.ts          # Algolia sync functions
├── jwt.ts              # JWT sign/verify with jose
└── stripe.ts           # Stripe initialization

components/             # React components (mix of Server/Client)
contexts/              # React Context providers (Client components)
├── TenantContext.tsx  # Tenant branding/config context
├── AdminTenantContext.tsx # Admin panel tenant selection
├── AuthContext.tsx    # User authentication
├── CartContext.tsx    # Shopping cart
└── WishlistContext.tsx # User wishlist
hooks/                 # Custom React hooks
utils/                 # Frontend utilities
types/                 # TypeScript type definitions
scripts/               # Utility scripts for maintenance
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

Domain-to-tenant mapping is configured in `middleware.ts`:

```typescript
const tenantDomains = {
  'hurghadaspeedboat.com': 'hurghada-speedboat',
  'www.hurghadaspeedboat.com': 'hurghada-speedboat',
  'egypt-excursionsonline.com': 'default',
  'localhost:3000': 'default',
  'localhost:3001': 'hurghada-speedboat',
  // ...more domains
};
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
import { buildTenantQuery } from '@/lib/tenant';

// Filter tours by tenant
const query = buildTenantQuery({ isPublished: true }, tenantId);
const tours = await Tour.find(query);
```

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
All API routes follow Next.js 15 Route Handler conventions:
- Use named exports: `GET`, `POST`, `PUT`, `DELETE`
- Return `NextResponse` objects
- Call `dbConnect()` before any database operations
- For admin routes, verify authentication first
- Include `tenantId` in queries for multi-tenant filtering

### 3. Authentication Flow
- JWT tokens stored in HTTP-only cookies named `authToken`
- Token verification via `lib/jwt.ts` using jose library
- Passwords hashed with bcryptjs
- Middleware in `middleware.ts` handles route protection
- Admin routes require `role: 'admin'` in JWT payload

### 4. Server vs Client Components
- Default to Server Components (faster, better SEO)
- Use `'use client'` directive only when needed:
  - Interactive UI (forms, buttons with state)
  - React Context consumers (useTenant, useAuth, etc.)
  - Browser APIs (localStorage, window, etc.)
  - Event handlers

### 5. Dynamic Routing
- Primary tour pages use `app/[slug]/page.tsx` (catch-all dynamic route)
- Middleware in `middleware.ts` excludes reserved paths
- Old routes (`/tour/:slug`, `/tours/:slug`) redirect to `/:slug` via next.config.ts

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

### Available Email Types
- `booking-confirmation` - With QR code and PDF receipt
- `payment-confirmation` - Payment success
- `bank-transfer-instructions` - Bank transfer details
- `trip-reminder` - 24 hours before tour
- `trip-completion` - Post-trip thank you + review request
- `booking-cancellation` - Cancellation confirmation
- `booking-update` - Status change notification
- `welcome` - New user welcome
- `admin-booking-alert` - Admin notification for new bookings
- `admin-invite` - Team member invitation
- `admin-access-update` - Access change notification

### Email Templates
Located in `lib/email/templates/*.html` with dynamic variable replacement:
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

# Services
NEXT_PUBLIC_ALGOLIA_APP_ID=     # Algolia App ID
NEXT_PUBLIC_ALGOLIA_SEARCH_KEY= # Algolia search-only key
ALGOLIA_ADMIN_KEY=              # Algolia admin key
MAILGUN_API_KEY=                # Mailgun API key
MAILGUN_DOMAIN=                 # Mailgun domain
CLOUDINARY_CLOUD_NAME=          # Cloudinary cloud name
CLOUDINARY_API_KEY=             # Cloudinary API key
CLOUDINARY_API_SECRET=          # Cloudinary secret
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
- Homepage: No caching (`max-age=0`) for real-time admin updates
- API routes: No caching
- Static assets: Long-term caching (1 year immutable)
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
| **HeroSettings** | Homepage hero configuration | ✓ |
| **Discount** | Promotional codes | ✓ |
| **Comment** | Blog post comments | ✓ |
| **Job** | Career/job listings | ✓ |
| **Otp** | One-time passwords for verification | - |

---

## Admin Dashboard

Admin routes (`/admin/*`) require authentication with `role: 'admin'`. Layout uses separate auth context (`AdminAuthContext`).

### Key Admin Features
- **Tenant Selector** - Switch between brands to manage content
- **Tour CRUD** - Rich form with booking options, pricing, itinerary
- **Booking Management** - Status updates, cancellations
- **User Management** - Users and team members
- **Analytics Dashboard** - Charts with Chart.js/Recharts
- **Bulk Operations** - Uploads, data import, image cleanup
- **Hero Settings** - Homepage configuration per tenant
- **Discount Management** - Promo codes

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

---

## Performance Considerations

- Server Components for data fetching (no client-side hydration cost)
- Algolia provides instant search; fallback to DB search adds latency
- Images served via Cloudinary CDN
- Database connection pooling (maxPoolSize: 50 for builds)
- Turbopack enabled for faster dev builds
- Static assets cached at CDN level
- Tenant config cached in memory (5 minute TTL)

---

## AI Features

The application includes AI-powered search widgets:
- `AISearchWidget.tsx` - Main search interface
- `AIAgentWidget.tsx` - AI assistant for tour recommendations
- Uses Vercel AI SDK with streaming responses

When modifying these, be aware of client-side state management and streaming requirements.

---

## Adding a New Tenant

1. **Add domain mapping** in `middleware.ts`:
   ```typescript
   'newtenant.com': 'new-tenant-id',
   'www.newtenant.com': 'new-tenant-id',
   ```

2. **Create tenant document** in MongoDB (via admin panel or script):
   ```javascript
   db.tenants.insertOne({
     tenantId: 'new-tenant-id',
     name: 'New Tenant Name',
     domain: 'newtenant.com',
     branding: { logo: '...', primaryColor: '#FF5733', ... },
     seo: { defaultTitle: '...', ... },
     // ... full config
     isActive: true,
   });
   ```

3. **Add logo** to `public/tenants/` or Cloudinary

4. **(Optional) Configure tenant database**:
   ```bash
   MONGODB_URI_NEW_TENANT=mongodb://...
   ```

5. **Deploy** - DNS must point to your hosting
