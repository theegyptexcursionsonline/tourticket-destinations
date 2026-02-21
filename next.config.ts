// next.config.js
const { withSentryConfig } = require('@sentry/nextjs');
const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Ignore ESLint errors during build
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Ignore TypeScript errors during build
  typescript: {
    ignoreBuildErrors: true,
  },

  // Server external packages configuration - externalize heavy packages to reduce bundle size
  serverExternalPackages: [
    'mongoose',
    'bcryptjs',
    'handlebars',
    'nodemailer',
    'mailgun.js',
    'cloudinary',
    'stripe',
    '@sentry/nextjs',
  ],

  // Image optimization configuration - Fixed for Netlify
  images: {
    unoptimized: true, // Enable for Netlify deployment
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
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
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
      {
        // Next.js static files - long-term caching
        source: '/_next/static/(.*)',
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

// Export with next-intl and Sentry configuration
module.exports = withSentryConfig(withNextIntl(nextConfig), {
  org: 'egyptexcursionsonline',
  project: 'javascript-nextjs',
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: '/monitoring',
  disableLogger: true,
  automaticVercelMonitors: true,
  hideSourceMaps: true,
  disableServerWebpackPlugin: process.env.NODE_ENV === 'development',
  disableClientWebpackPlugin: process.env.NODE_ENV === 'development',
});