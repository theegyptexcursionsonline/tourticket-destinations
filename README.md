# Egypt Excursions Online - Tour Booking Platform

[![Next.js](https://img.shields.io/badge/Next.js-15.5-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-8.18-green)](https://www.mongodb.com/)
[![Firebase](https://img.shields.io/badge/Firebase-11.10-orange)](https://firebase.google.com/)
[![Stripe](https://img.shields.io/badge/Stripe-18.5-purple)](https://stripe.com/)

A comprehensive, full-stack tour booking platform for Egypt travel experiences. Built with Next.js 15, TypeScript, MongoDB, and Firebase Authentication. Features include real-time tour search, smart booking with hotel pickup, secure payments, and a powerful admin dashboard.

**Live Site:** [egypt-excursionsonline.com](https://egypt-excursionsonline.com)

> **For Developers**: See [CLAUDE.md](CLAUDE.md) for detailed architecture, development patterns, and coding conventions.

## Features

### Customer Features
- **Firebase Authentication** - Email/password signup and Google OAuth sign-in
- **Instant Search** - Algolia-powered search with typo tolerance and filters
- **AI-Powered Recommendations** - Intelligent tour suggestions using Vercel AI SDK
- **Smart Booking System** - Date/time selection, guest management, and tour add-ons
- **Hotel Pickup** - Interactive Google Maps for selecting pickup locations
- **Shopping Cart** - Multi-tour cart with cross-device sync for logged-in users
- **Wishlist** - Save favorite tours with cross-device sync
- **Secure Payments** - Stripe integration with multiple payment methods
- **User Dashboard** - View bookings, download PDF tickets with QR codes
- **Reviews & Ratings** - Leave reviews and ratings for completed tours
- **Email Notifications** - Booking confirmations via Mailgun

### Admin Features
- **Analytics Dashboard** - Revenue tracking, booking statistics with Chart.js/Recharts
- **Tour Management** - Full CRUD with rich editor, multiple images, itineraries
- **Booking Management** - View, update status, manage hotel pickup details
- **User Management** - View customer accounts and booking history
- **Team Management** - Invite team members with role-based permissions
- **Discount Codes** - Create percentage or fixed-amount promotional codes
- **Content Management** - Blog posts, attraction pages, hero banners
- **Bulk Operations** - Import tours via JSON, bulk image uploads

### Performance Features
- **ISR (Incremental Static Regeneration)** - Tour pages cached and revalidated every 60 seconds
- **Server-Side Rendering** - Fast initial page loads with Next.js App Router
- **Pre-fetched Booking Options** - Tour options loaded server-side, no client API calls
- **Image Optimization** - Cloudinary CDN for fast image delivery
- **Smart Port Detection** - Dev server auto-detects available ports

## Tech Stack

### Frontend
- **Framework:** Next.js 15.5 with App Router & Turbopack
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 3.4
- **UI:** Lucide React icons, Framer Motion animations
- **Charts:** Chart.js 4.5, Recharts 3.2
- **Forms:** React Day Picker, React Hot Toast

### Backend
- **Database:** MongoDB with Mongoose 8.18
- **Search:** Algolia for instant search
- **Authentication:** Firebase Auth (users) + JWT with Jose (admins)
- **Payments:** Stripe 18.5
- **Email:** Mailgun
- **Storage:** Cloudinary
- **Maps:** Google Maps JavaScript API, Places API, Geocoding API

### Monitoring & Support
- **Error Tracking:** Sentry
- **Customer Chat:** Intercom
- **PDF Generation:** jsPDF, PDFKit
- **QR Codes:** qrcode library

## Quick Start

### Prerequisites
- Node.js 20.x or later
- pnpm 8.x or later
- MongoDB (local or Atlas)
- Firebase project
- Stripe account

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/tourticket.git
cd tourticket

# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env

# Edit .env with your credentials
# See Environment Variables section below

# Run development server
pnpm dev

# Open browser at http://localhost:3000
```

## Environment Variables

Create a `.env` file with the following variables:

```env
# Database (Required)
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname

# JWT Secret for Admin Auth (Required - min 32 characters)
JWT_SECRET=your-super-secure-jwt-secret-minimum-32-chars

# Firebase Client (Required for User Auth)
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id

# Firebase Admin SDK (Required for Server-side Token Verification)
# Option 1: Base64-encoded service account (recommended for Netlify/Vercel)
FIREBASE_SERVICE_ACCOUNT_BASE64=your-base64-encoded-service-account-json

# Option 2: Individual credentials
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# Stripe (Required for Payments)
STRIPE_SECRET_KEY=sk_live_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx

# Cloudinary (Required for Image Uploads)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Mailgun (Required for Emails)
MAILGUN_API_KEY=your-mailgun-api-key
MAILGUN_DOMAIN=your-mailgun-domain

# Google Maps (Required for Hotel Pickup Feature)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# Algolia Search (Recommended)
NEXT_PUBLIC_ALGOLIA_APP_ID=your-algolia-app-id
NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY=your-algolia-search-api-key
ALGOLIA_ADMIN_API_KEY=your-algolia-admin-api-key
NEXT_PUBLIC_ALGOLIA_INDEX_NAME=tours

# Sentry Error Tracking (Optional)
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn

# Intercom Customer Support (Optional)
NEXT_PUBLIC_INTERCOM_APP_ID=your-intercom-app-id

# Application URLs
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_BASE_URL=https://your-domain.com

# Admin Bootstrap (for initial setup)
ADMIN_USERNAME=admin@yourcompany.com
ADMIN_PASSWORD=your-secure-password
```

## Available Scripts

```bash
# Development
pnpm dev                 # Start dev server (auto port detection)
pnpm dev:original        # Start on port 3000 with Turbopack
pnpm build               # Build for production
pnpm start               # Start production server
pnpm lint                # Run ESLint

# Testing
pnpm test                # Run Jest tests
pnpm test:watch          # Watch mode
pnpm test:coverage       # Coverage report

# Algolia Search Sync
pnpm algolia:sync        # Sync published tours
pnpm algolia:clear-sync  # Clear and resync all
pnpm algolia:sync-all    # Sync all tours (including unpublished)
```

## Project Structure

```
tourticket/
├── app/                    # Next.js App Router
│   ├── [slug]/            # Dynamic tour pages (ISR enabled)
│   ├── admin/             # Admin dashboard (protected)
│   ├── user/              # User dashboard (protected)
│   ├── api/               # API routes
│   │   ├── auth/          # Authentication endpoints
│   │   ├── admin/         # Admin-only APIs
│   │   ├── bookings/      # Booking management
│   │   ├── checkout/      # Stripe payment flow
│   │   └── user/          # User cart/wishlist sync
│   └── checkout/          # Checkout page
├── components/            # React components
│   ├── auth/              # Login/Signup modals
│   ├── admin/             # Admin dashboard components
│   └── ...                # Shared components
├── contexts/              # React Context (Auth, Cart, Wishlist)
├── hooks/                 # Custom React hooks
├── lib/                   # Backend logic
│   ├── models/            # Mongoose schemas
│   ├── email/             # Email templates
│   ├── firebase/          # Firebase config & helpers
│   └── ...                # Utilities
├── scripts/               # Maintenance scripts
├── types/                 # TypeScript definitions
└── middleware.ts          # Route protection
```

## Authentication

### User Authentication (Firebase)
- Email/password registration and login
- Google OAuth one-click sign-in
- Server-side token verification with Firebase Admin SDK
- Automatic user profile sync to MongoDB
- Cart and wishlist sync across devices

### Admin Authentication (JWT)
- Separate admin login at `/admin/login`
- JWT tokens stored in HTTP-only cookies
- Role-based permissions (super_admin, admin, manager, support)
- Team member invitations with email

## Key Features Explained

### Hotel Pickup with Google Maps
Tours can include hotel pickup. The booking flow includes:
1. User chooses "Enter pickup location" or "I'll provide later"
2. Google Maps with Places autocomplete for hotel search
3. Click-on-map to select exact location
4. Popular area quick-select buttons (Giza, Downtown Cairo, etc.)
5. Location saved to booking and shown in admin panel

### ISR for Tour Pages
Tour detail pages use Incremental Static Regeneration:
- Pages pre-generated at build time for top 50 tours
- Cached and served instantly to users
- Background revalidation every 60 seconds
- Booking options pre-fetched server-side (no slow API calls)

### Cross-Device Cart & Wishlist
For logged-in users:
- Cart items stored in MongoDB, synced via `/api/user/cart`
- Wishlist stored in MongoDB, synced via `/api/user/wishlist`
- Local storage fallback for guest users
- Merge strategy on login (local + server items)

## Deployment

### Netlify (Current)

The site is deployed on Netlify with these settings:

**Build Command:** `pnpm build`
**Publish Directory:** `.next`

**Required Environment Variables in Netlify Dashboard:**
- All variables from `.env` file
- Ensure `NEXT_PUBLIC_*` variables are added for client-side access

### Vercel

```bash
npm i -g vercel
vercel
```

### Other Platforms
Works on any platform supporting Next.js:
- AWS Amplify
- Railway
- Render
- DigitalOcean App Platform

## Google Maps Setup

Required for hotel pickup feature:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project and enable billing ($200/month free credit)
3. Enable these APIs:
   - Maps JavaScript API
   - Places API
   - Geocoding API
4. Create API key with HTTP referrer restrictions
5. Add domains: `localhost:*`, `your-domain.com/*`
6. Add key to `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

## Firebase Setup

1. Create project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication → Email/Password and Google providers
3. Get web app config (Project Settings → Your apps)
4. Generate Admin SDK key (Project Settings → Service Accounts)
5. For Netlify/Vercel, base64-encode the service account JSON:
   ```bash
   cat service-account.json | base64
   ```
6. Add to `FIREBASE_SERVICE_ACCOUNT_BASE64`

## API Endpoints

### Public
- `GET /api/tours` - List tours with filters
- `GET /api/tours/[slug]` - Tour details
- `GET /api/search` - Search tours

### Authenticated (User)
- `GET/POST/DELETE /api/user/cart` - Cart management
- `GET/POST/DELETE /api/user/wishlist` - Wishlist management
- `GET /api/user/bookings` - User's bookings

### Admin Only
- `POST/PUT/DELETE /api/admin/tours` - Tour CRUD
- `GET/PUT /api/admin/bookings` - Booking management
- `GET /api/admin/users` - User list
- `POST /api/admin/team/invite` - Team invitations

## Contributing

1. Fork the repository
2. Read [CLAUDE.md](CLAUDE.md) for architecture details
3. Create feature branch (`git checkout -b feature/NewFeature`)
4. Commit changes (`git commit -m 'Add NewFeature'`)
5. Push to branch (`git push origin feature/NewFeature`)
6. Open Pull Request

### Guidelines
- Always call `dbConnect()` before database operations
- Use Server Components by default, `'use client'` only when needed
- Sync tours to Algolia after database updates
- Keep API keys in environment variables only
- Test on mobile viewports

## License

MIT License - see [LICENSE](LICENSE) file.



## Support

- Technical questions: See [CLAUDE.md](CLAUDE.md)
- Bug reports: [GitHub Issues](https://

---

Built with Next.js, deployed on Netlify
