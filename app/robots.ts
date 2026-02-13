// app/robots.ts
// Dynamic robots.txt generation per tenant

import { MetadataRoute } from 'next';
import { getTenantFromRequest, getTenantConfig } from '@/lib/tenant';

export default async function robots(): Promise<MetadataRoute.Robots> {
  try {
    // Get tenant from request
    const tenantId = await getTenantFromRequest();
    const tenantConfig = await getTenantConfig(tenantId);
    
    // Determine base URL
    const baseUrl = tenantConfig 
      ? `https://${tenantConfig.domain}`
      : process.env.NEXT_PUBLIC_APP_URL || 'https://egypt-excursionsonline.com';
    
    return {
      rules: [
        {
          userAgent: '*',
          allow: '/',
          disallow: [
            '/admin',
            '/admin/*',
            '/api',
            '/api/*',
            '/user',
            '/user/*',
            '/checkout',
            '/checkout/*',
            '/login',
            '/signup',
            '/forgot',
            '/forgot/*',
            '/accept-invitation',
            '/accept-invitation/*',
            '/booking/verify',
            '/booking/verify/*',
            '/_next',
            '/_next/*',
            '/sentry-example-page',
          ],
        },
        {
          userAgent: 'Googlebot',
          allow: '/',
          disallow: [
            '/admin',
            '/api',
            '/user',
            '/checkout',
            '/login',
            '/signup',
            '/forgot',
            '/accept-invitation',
            '/booking/verify',
            '/_next',
          ],
        },
        {
          userAgent: 'Googlebot-Image',
          allow: ['/images/', '/uploads/'],
          disallow: '/admin/',
        },
      ],
      sitemap: `${baseUrl}/sitemap.xml`,
      host: baseUrl,
    };
    
  } catch (error) {
    console.error('Error generating robots.txt:', error);
    
    // Return basic robots.txt on error
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://egypt-excursionsonline.com';
    
    return {
      rules: {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api', '/user', '/checkout'],
      },
      sitemap: `${baseUrl}/sitemap.xml`,
    };
  }
}

