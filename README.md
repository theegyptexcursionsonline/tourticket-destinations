# Tour Ticket — Multi-Tenant Tour Booking Platform

Full-stack Next.js platform that serves unlimited white-label, branded tour-booking websites from a single codebase. Each tenant (brand/destination) has its own domain, branding, SEO, and filtered catalog, with a shared admin dashboard, booking flow, and payments.

## Tech stack

- Next.js 16 (App Router) + React 19 + TypeScript
- MongoDB with Mongoose (optional per-tenant database routing)
- Tailwind CSS (RTL-aware), next-intl for localization
- JWT auth (jose) + bcryptjs for admins; Firebase Auth for users
- Stripe payments and webhooks (per-tenant accounts supported)
- Algolia instant search with Fuse.js fallback, AI search (Vercel AI SDK + OpenAI)
- Cloudinary images, Mailgun (tenant-branded) email, Sentry, Intercom
- PDF receipts and QR-code tickets
- Jest + React Testing Library, Playwright for E2E

## Features

- Multi-tenant routing: domain/subdomain → tenant detection via `middleware.ts`, with preview mode
- Per-tenant branding, SEO, content filtering, and email templates
- Tour, destination, and category browsing with detailed tour pages
- Instant Algolia search plus AI-powered search and recommendations
- Cart, checkout, Stripe payments, QR tickets, and PDF receipts
- User accounts (Firebase) with bookings, wishlist, and profile
- Admin dashboard: tenants, tours, bookings, availability/stop-sales, special offers, discounts, reviews, hero settings, blog, reports, manifests, and bulk upload
- Multilingual UI (en, ar, es, fr, de, ru) with RTL support
- Cron endpoints for trip reminders and completion emails

## Getting started

### Prerequisites

- Node.js 20
- pnpm
- MongoDB (Atlas or local)
- Accounts for Stripe, Cloudinary, Mailgun, Algolia, Firebase, OpenAI

### Install

```bash
pnpm install
```

### Environment

Copy `.env.local` and provide values for the keys used in code, including:

- `MONGODB_URI`
- `JWT_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`
- `STRIPE_SECRET_KEY`, `STRIPE_RESTRICTED_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_ALGOLIA_APP_ID`, `NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY`, `NEXT_PUBLIC_ALGOLIA_INDEX_NAME`, `ALGOLIA_ADMIN_API_KEY`, `ALGOLIA_WRITE_API_KEY`
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `MAILGUN_FROM_EMAIL`, `ADMIN_NOTIFICATION_EMAIL`
- `OPENAI_API_KEY`
- Firebase: `NEXT_PUBLIC_FIREBASE_*` (client) and server-side credentials
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `NEXT_PUBLIC_BASE_URL`, `NEXT_PUBLIC_DOMAIN`
- Multi-tenant (optional): `TENANT_DOMAINS`, `DEFAULT_TENANT_ID`, `TENANT_WEBSITE_STATUS`, `ENABLE_TENANT_PREVIEW`, per-tenant `MONGODB_URI_*`

### Run

```bash
pnpm dev             # dev server with auto port detection
pnpm build           # production build (runs unit tests first)
pnpm build:skip-tests
pnpm start           # serve the production build
```

### Test & lint

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:api
pnpm test:e2e
```

### Search sync & seeding

```bash
pnpm algolia:sync        # sync published tours to Algolia
pnpm seed:excursions     # seed destination tenants
pnpm seed:speedboat      # full speedboat-tenant seed pipeline
```

## Project structure

```
app/              # App Router: routes, [locale]/, admin/, api/
components/        # React components (shared, admin, search, booking, landing, …)
contexts/          # React context providers (tenant, auth, cart, settings, …)
hooks/             # custom hooks
lib/               # backend logic: models, db, tenant resolution, auth, email, algolia, stripe, jobs
i18n/ messages/    # localization config and translation catalogs
middleware.ts      # tenant detection + locale handling
scripts/           # tenant seeding, Algolia sync, maintenance
docs/              # additional guides
e2e/ __tests__/    # Playwright and Jest tests
```

Multi-tenancy: a request's host is mapped to a tenant in `middleware.ts`, which sets a tenant header/cookie. Server code resolves the tenant via helpers in `lib/tenant.ts` and scopes queries (with an optional fallback to the `default` tenant). See `MULTI_TENANT_GUIDE.md` for details.

## Deployment

Deployed on Netlify (see `netlify.toml`); environment variables are inlined into serverless functions via the inline-functions-env plugin.
