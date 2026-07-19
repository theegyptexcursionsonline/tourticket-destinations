// next.config.js
const createNextIntlPlugin = require('next-intl/plugin');
const { withSentryConfig } = require('@sentry/nextjs');
const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

// Next.js currently needs inline bootstrap scripts. Keep that compatibility
// while restricting executable third-party origins and blocking plugins,
// framing, unexpected form targets, and injected base URLs.
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self' https://checkout.stripe.com",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://maps.googleapis.com https://apis.google.com https://www.googletagmanager.com https://www.google-analytics.com https://connect.facebook.net https://static.elfsight.com https://elfsightcdn.com https://*.elfsightcdn.com https://*.intercom.io https://*.intercomcdn.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com https://*.intercomcdn.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "connect-src 'self' https: wss:",
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://www.google.com https://www.youtube.com https://egypt-excursionsonline.firebaseapp.com https://static.elfsight.com https://*.intercom.io",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  ...(process.env.NODE_ENV === 'production' ? ['upgrade-insecure-requests'] : []),
].join('; ');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Server external packages configuration - externalize heavy packages to reduce bundle size
  serverExternalPackages: [
    'mongoose',
    'bcryptjs',
    'handlebars',
    'nodemailer',
    'mailgun.js',
    'cloudinary',
    'stripe',
  ],

  // Image optimization configuration - Fixed for Netlify.
  // Custom Cloudinary loader instead of `unoptimized: true` — Netlify doesn't
  // run Next's optimizer, so resizing/compression is offloaded to the
  // Cloudinary CDN (lib/cloudinaryLoader.ts). Prevents full-res multi-MB
  // originals shipping to phones (the iOS Safari memory crash).
  images: {
    loaderFile: './lib/cloudinaryLoader.ts',
    remotePatterns: [
      // Cloudinary
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/dm3sxllch/**',
      },
      // Wikimedia
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
        pathname: '/wikipedia/en/thumb/4/41/Flag_of_India.svg/**',
      },
      // Unsplash static CDN
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      // Unsplash dynamic source endpoint
      {
        protocol: 'https',
        hostname: 'source.unsplash.com',
        pathname: '/**',
      },
      // Local development
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/**',
      },
      // AWS S3 style wildcard
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
        pathname: '/**',
      },
      // Add your CDN host(s) here
      {
        protocol: 'https',
        hostname: 'your-cdn.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.your-cdn.com',
        pathname: '/**',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Rewrites for backward compatibility and SEO
  async rewrites() {
    return [
      {
        source: '/tours/:slug',
        destination: '/:slug',
      },
      {
        source: '/experiences/:slug',
        destination: '/:slug',
      },
      {
        source: '/activities/:slug',
        destination: '/:slug',
      },
    ];
  },

  // Redirects for SEO and user experience
  async redirects() {
    return [
      {
        source: '/tours/:slug',
        destination: '/:slug',
        permanent: true,
      },
      {
        source: '/tour/:slug',
        destination: '/:slug',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'www.yourdomain.com',
          },
        ],
        destination: 'https://yourdomain.com/:path*',
        permanent: true,
      },
    ];
  },

  // Headers for security and performance
  async headers() {
    return [
      {
        // Security headers for all routes
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: contentSecurityPolicy },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), payment=(self "https://js.stripe.com")' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        ],
      },
      {
        // Homepage - NO CACHING for real-time admin updates
        source: '/',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, max-age=0' },
        ],
      },
      {
        // Admin dashboard & reports — short server cache with stale-while-revalidate
        source: '/api/admin/(dashboard|reports)(.*)',
        headers: [
          { key: 'Cache-Control', value: 'private, s-maxage=60, stale-while-revalidate=120' },
        ],
      },
      {
        // All other API routes - no caching
        source: '/api/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
        ],
      },
      {
        // Static assets - long-term caching
        source: '/images/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },

  // Handle trailing slashes consistently
  trailingSlash: false,

  // Environment variables that should be available on the client
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // Webpack configuration for additional optimization
  webpack: (config: any, { buildId, dev, isServer, defaultLoaders, webpack }: any) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      // Add any specific aliases you need
    };

    if (!dev && !isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    return config;
  },

  compress: true,
  poweredByHeader: false,
  generateEtags: true,
  pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx'],
  // Removed output: 'standalone' for Netlify compatibility
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};

module.exports = withSentryConfig(withNextIntl(nextConfig), {
  org: 'egyptexcursionsonline',
  project: 'egypt-excursionsonline-destinations-web',
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },
});
