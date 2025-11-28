// app/sitemap.ts
// Dynamic sitemap generation per tenant

import { MetadataRoute } from 'next';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import Destination from '@/lib/models/Destination';
import Category from '@/lib/models/Category';
import Blog from '@/lib/models/Blog';
import AttractionPage from '@/lib/models/AttractionPage';
import { getTenantFromRequest, getTenantConfig } from '@/lib/tenant';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    await dbConnect();
    
    // Get tenant from request
    const tenantId = await getTenantFromRequest();
    const tenantConfig = await getTenantConfig(tenantId);
    
    // Determine base URL
    const baseUrl = tenantConfig 
      ? `https://${tenantConfig.domain}`
      : process.env.NEXT_PUBLIC_APP_URL || 'https://egyptexcursionsonline.com';
    
    // Build tenant filter
    const tenantFilter = tenantId ? { tenantId } : {};
    
    // Static pages
    const staticPages: MetadataRoute.Sitemap = [
      {
        url: baseUrl,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 1,
      },
      {
        url: `${baseUrl}/about`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.8,
      },
      {
        url: `${baseUrl}/contact`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.8,
      },
      {
        url: `${baseUrl}/destinations`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.9,
      },
      {
        url: `${baseUrl}/search`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.7,
      },
      {
        url: `${baseUrl}/blog`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.8,
      },
      {
        url: `${baseUrl}/faqs`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.6,
      },
      {
        url: `${baseUrl}/terms`,
        lastModified: new Date(),
        changeFrequency: 'yearly',
        priority: 0.3,
      },
      {
        url: `${baseUrl}/privacy`,
        lastModified: new Date(),
        changeFrequency: 'yearly',
        priority: 0.3,
      },
    ];
    
    // Fetch dynamic content
    const [tours, destinations, categories, blogs, attractionPages] = await Promise.all([
      Tour.find({ ...tenantFilter, isPublished: true })
        .select('slug updatedAt')
        .lean()
        .catch(() => []),
      Destination.find({ ...tenantFilter, isPublished: true })
        .select('slug updatedAt')
        .lean()
        .catch(() => []),
      Category.find({ ...tenantFilter, isPublished: true })
        .select('slug updatedAt')
        .lean()
        .catch(() => []),
      Blog.find({ ...tenantFilter, status: 'published' })
        .select('slug updatedAt')
        .lean()
        .catch(() => []),
      AttractionPage.find({ ...tenantFilter, isPublished: true })
        .select('slug updatedAt pageType')
        .lean()
        .catch(() => []),
    ]);
    
    // Tour pages (highest priority for booking sites)
    const tourPages: MetadataRoute.Sitemap = tours.map((tour: any) => ({
      url: `${baseUrl}/${tour.slug}`,
      lastModified: tour.updatedAt || new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    }));
    
    // Destination pages
    const destinationPages: MetadataRoute.Sitemap = destinations.map((dest: any) => ({
      url: `${baseUrl}/destinations/${dest.slug}`,
      lastModified: dest.updatedAt || new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));
    
    // Category pages
    const categoryPages: MetadataRoute.Sitemap = categories.map((cat: any) => ({
      url: `${baseUrl}/categories/${cat.slug}`,
      lastModified: cat.updatedAt || new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));
    
    // Blog posts
    const blogPages: MetadataRoute.Sitemap = blogs.map((blog: any) => ({
      url: `${baseUrl}/blog/${blog.slug}`,
      lastModified: blog.updatedAt || new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));
    
    // Attraction pages
    const attractionPagesMap: MetadataRoute.Sitemap = attractionPages
      .filter((page: any) => page.pageType === 'attraction')
      .map((page: any) => ({
        url: `${baseUrl}/attraction/${page.slug}`,
        lastModified: page.updatedAt || new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }));
    
    // Interest pages
    const interestPages: MetadataRoute.Sitemap = attractionPages
      .filter((page: any) => page.pageType === 'interest')
      .map((page: any) => ({
        url: `${baseUrl}/interests/${page.slug}`,
        lastModified: page.updatedAt || new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }));
    
    // Combine all pages
    return [
      ...staticPages,
      ...tourPages,
      ...destinationPages,
      ...categoryPages,
      ...blogPages,
      ...attractionPagesMap,
      ...interestPages,
    ];
    
  } catch (error) {
    console.error('Error generating sitemap:', error);
    
    // Return minimal sitemap on error
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://egyptexcursionsonline.com';
    return [
      {
        url: baseUrl,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 1,
      },
    ];
  }
}

