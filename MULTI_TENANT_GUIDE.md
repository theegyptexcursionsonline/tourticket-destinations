# Multi-Tenant Architecture Guide

This guide explains how to display tenant-specific logos, content, and tours across your application.

## Architecture Overview

The multi-tenant system works through these layers:

```
┌─────────────────────────────────────────────────────────────────┐
│                         Request Flow                             │
├─────────────────────────────────────────────────────────────────┤
│  1. Domain Request (e.g., hurghadaspeedboat.com)                │
│           ↓                                                      │
│  2. Middleware (middleware.ts)                                   │
│     - Detects tenant from domain                                 │
│     - Sets x-tenant-id header & tenantId cookie                 │
│           ↓                                                      │
│  3. Server Components                                            │
│     - Use getTenantFromRequest() to get tenant ID               │
│     - Use getTenantConfig() to fetch full config from DB        │
│           ↓                                                      │
│  4. Client Components                                            │
│     - Use TenantProvider wrapper                                 │
│     - Use useTenant() hook to access tenant data                │
└─────────────────────────────────────────────────────────────────┘
```

## Domain Mapping

Domains are mapped to tenant IDs in `middleware.ts`:

```typescript
// middleware.ts (lines 52-113)
const tenantDomains = {
  'hurghadaspeedboat.com': 'hurghada-speedboat',
  'www.hurghadaspeedboat.com': 'hurghada-speedboat',
  'hurghadatours.com': 'hurghada',
  'cairotours.com': 'cairo',
  'luxortours.com': 'luxor',
  // ... more domains
  'localhost:3000': 'default',
  'localhost:3001': 'hurghada',
};
```

## Tenant Configuration (Database)

Each tenant has a configuration document in MongoDB. See `lib/models/Tenant.ts` for the full schema:

```typescript
interface ITenant {
  tenantId: string;          // e.g., 'hurghada-speedboat'
  name: string;              // e.g., 'Hurghada Speedboat Adventures'
  domain: string;            // e.g., 'hurghadaspeedboat.com'
  
  branding: {
    logo: string;            // Logo URL
    logoDark?: string;       // Dark mode logo
    primaryColor: string;    // Brand color (e.g., '#00E0FF')
    secondaryColor: string;
    accentColor: string;
    fontFamily: string;
  };
  
  seo: {
    defaultTitle: string;
    titleSuffix: string;
    defaultDescription: string;
    ogImage: string;
  };
  
  contact: {
    email: string;
    phone: string;
    whatsapp?: string;
  };
  
  socialLinks: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
  };
  
  features: {
    enableBlog: boolean;
    enableReviews: boolean;
    enableWishlist: boolean;
    // ... more feature flags
  };
  
  homepage: {
    heroType: 'slider' | 'video' | 'static';
    showDestinations: boolean;
    showCategories: boolean;
    showFeaturedTours: boolean;
    // ... more homepage config
  };
  
  // Relationships for filtering content
  primaryDestination?: ObjectId;
  allowedDestinations?: ObjectId[];
  allowedCategories?: ObjectId[];
}
```

---

## Implementation Examples

### 1. Making Header Tenant-Aware

Currently, the Header uses hardcoded values. Here's how to make it tenant-aware:

#### Option A: Server Component Approach (Recommended)

```tsx
// components/Header.tsx (convert to async server component)
import { getTenantFromRequest, getTenantConfig } from '@/lib/tenant';

export default async function Header({ startSolid = false }) {
  // Get tenant config server-side
  const tenantId = await getTenantFromRequest();
  const tenant = await getTenantConfig(tenantId);
  
  return (
    <header>
      <Link href="/">
        <img 
          src={tenant?.branding?.logo || '/EEO-logo.png'} 
          alt={tenant?.name || 'Egypt Excursions'} 
        />
      </Link>
      {/* Pass tenant to client sub-components */}
      <HeaderClient tenant={tenant} startSolid={startSolid} />
    </header>
  );
}
```

#### Option B: Client Context Approach

```tsx
// components/Header.tsx (using context)
'use client';
import { useTenant } from '@/contexts/TenantContext';

export default function Header() {
  const { tenant, getLogo, getSiteName, getPrimaryColor } = useTenant();
  
  return (
    <header style={{ '--primary': getPrimaryColor() }}>
      <Link href="/">
        <img src={getLogo()} alt={getSiteName()} />
      </Link>
      {/* ... rest of header */}
    </header>
  );
}
```

### 2. Making Footer Tenant-Aware

```tsx
// components/Footer.tsx
'use client';
import { useTenant } from '@/contexts/TenantContext';

export default function Footer() {
  const { tenant } = useTenant();
  
  const socialLinks = [
    tenant?.socialLinks?.facebook && { icon: Facebook, href: tenant.socialLinks.facebook },
    tenant?.socialLinks?.instagram && { icon: Instagram, href: tenant.socialLinks.instagram },
    tenant?.socialLinks?.twitter && { icon: Twitter, href: tenant.socialLinks.twitter },
    tenant?.socialLinks?.youtube && { icon: Youtube, href: tenant.socialLinks.youtube },
  ].filter(Boolean);

  return (
    <footer>
      <img src={tenant?.branding?.logo || '/EEO-logo.png'} alt={tenant?.name} />
      
      <div className="contact-info">
        <a href={`tel:${tenant?.contact?.phone}`}>{tenant?.contact?.phone}</a>
        <a href={`mailto:${tenant?.contact?.email}`}>{tenant?.contact?.email}</a>
      </div>
      
      <div className="social-links">
        {socialLinks.map(({ icon: Icon, href }) => (
          <a key={href} href={href}><Icon /></a>
        ))}
      </div>
      
      <p>© {new Date().getFullYear()} {tenant?.name}. All rights reserved.</p>
    </footer>
  );
}
```

### 3. Filtering Tours by Tenant

Tours should be filtered by `tenantId` in all API calls:

```typescript
// app/api/tours/route.ts
import { getTenantFromRequest } from '@/lib/tenant';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';

export async function GET(request: Request) {
  await dbConnect();
  
  const tenantId = await getTenantFromRequest();
  
  // Filter tours by tenant
  const tours = await Tour.find({
    tenantId: tenantId,  // Only tours for this tenant
    published: true,
  }).sort({ createdAt: -1 });
  
  return Response.json({ success: true, data: tours });
}
```

For the Tour model, add a `tenantId` field:

```typescript
// lib/models/Tour.ts
const TourSchema = new Schema({
  tenantId: {
    type: String,
    required: true,
    index: true,
  },
  // ... other fields
});
```

### 4. Tenant-Specific Homepage

```tsx
// app/HomePageServer.tsx
import { getTenantFromRequest, getTenantConfig } from '@/lib/tenant';
import Tour from '@/lib/models/Tour';
import dbConnect from '@/lib/dbConnect';

export default async function HomePageServer() {
  await dbConnect();
  
  const tenantId = await getTenantFromRequest();
  const tenant = await getTenantConfig(tenantId);
  
  // Get tours for this tenant only
  const featuredTours = await Tour.find({
    tenantId,
    published: true,
    featured: true,
  }).limit(8);
  
  return (
    <main>
      {/* Hero - use tenant's hero settings */}
      {tenant?.homepage?.heroType === 'video' ? (
        <VideoHero tenant={tenant} />
      ) : (
        <SliderHero tenant={tenant} />
      )}
      
      {/* Conditionally show sections based on tenant config */}
      {tenant?.homepage?.showFeaturedTours && (
        <FeaturedTours tours={featuredTours} tenant={tenant} />
      )}
      
      {tenant?.homepage?.showDestinations && (
        <Destinations tenant={tenant} />
      )}
      
      {tenant?.homepage?.showCategories && (
        <Categories tenant={tenant} />
      )}
    </main>
  );
}
```

---

## Setting Up TenantProvider

Wrap your app with TenantProvider in the layout:

```tsx
// app/layout.tsx
import { TenantProvider } from '@/contexts/TenantContext';
import { getTenantFromRequest, getTenantPublicConfig } from '@/lib/tenant';

export default async function RootLayout({ children }) {
  const tenantId = await getTenantFromRequest();
  const tenant = await getTenantPublicConfig(tenantId);
  
  return (
    <html>
      <body>
        <TenantProvider initialTenant={tenant} initialTenantId={tenantId}>
          <Header />
          {children}
          <Footer />
        </TenantProvider>
      </body>
    </html>
  );
}
```

---

## CSS Variables for Theming

The TenantContext automatically sets CSS variables. Use them in your components:

```css
/* globals.css or component styles */
:root {
  --primary-color: #E63946;  /* Default - overridden by tenant */
  --secondary-color: #1D3557;
  --accent-color: #F4A261;
}

.button-primary {
  background: var(--primary-color);
}

.hero-section {
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
}
```

---

## Creating a New Tenant

1. **Add to Domain Mapping** (middleware.ts):
```typescript
'newtenantdomain.com': 'new-tenant-id',
'www.newtenantdomain.com': 'new-tenant-id',
```

2. **Create Tenant Document** in MongoDB:
```javascript
// Using MongoDB shell or a script
db.tenants.insertOne({
  tenantId: 'new-tenant-id',
  name: 'New Tenant Name',
  slug: 'new-tenant-id',
  domain: 'newtenantdomain.com',
  branding: {
    logo: '/branding/new-tenant-logo.png',
    logoAlt: 'New Tenant',
    favicon: '/branding/new-tenant-favicon.ico',
    primaryColor: '#FF5733',
    secondaryColor: '#333333',
    accentColor: '#FFC300',
    fontFamily: 'Inter',
  },
  // ... full config
  isActive: true,
});
```

3. **Add Logo** to `public/branding/new-tenant-logo.png`

4. **Add Theme to ComingSoonPage** (optional - for custom coming soon styling):
```typescript
// components/ComingSoonPage.tsx
const TENANT_THEMES = {
  // ...existing themes
  'new-tenant-id': {
    brandName: 'New Tenant',
    logo: '/branding/new-tenant-logo.png',
    background: 'linear-gradient(...)',
    // ... custom theme
  },
};
```

---

## Quick Reference

| Task | Server Component | Client Component |
|------|-----------------|------------------|
| Get tenant ID | `await getTenantFromRequest()` | `useTenant().tenantId` |
| Get full config | `await getTenantConfig(id)` | `useTenant().tenant` |
| Get logo | `tenant.branding.logo` | `useTenant().getLogo()` |
| Get site name | `tenant.name` | `useTenant().getSiteName()` |
| Check feature | `tenant.features.enableX` | `useTenant().isFeatureEnabled('enableX')` |

---

## Files to Modify for Full Tenant Support

1. **Header** (`components/Header.tsx`) - Use tenant logo and branding
2. **Footer** (`components/Footer.tsx`) - Use tenant contact, social links, and branding
3. **Layout** (`app/layout.tsx`) - Wrap with TenantProvider
4. **API Routes** - Filter by `tenantId`
5. **Tour Model** - Add `tenantId` field
6. **Homepage** - Use tenant's homepage configuration

---

## Testing Locally

Test different tenants using different ports:

```typescript
// middleware.ts domain mapping
'localhost:3000': 'default',
'localhost:3001': 'hurghada-speedboat',
'localhost:3002': 'cairo',
```

Then run:
```bash
# Terminal 1 - Default tenant
PORT=3000 pnpm dev

# Terminal 2 - Speedboat tenant
PORT=3001 pnpm dev
```

Or use the built-in port detection:
```bash
pnpm dev  # Auto-detects available port
```
