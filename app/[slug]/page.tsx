// MINIMAL DEBUG VERSION - NO EXTERNAL IMPORTS
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Skip metadata for now
export async function generateStaticParams() {
  return [];
}

export default async function TourDetailPage({ params }: PageProps) {
  try {
    const { slug } = await params;
    
    // Get tenant from headers directly
    const headersList = await headers();
    const tenantId = headersList.get('x-tenant-id') || 'default';
    
    // Just return static content to test if page works AT ALL
    return (
      <div style={{ padding: '40px', fontFamily: 'system-ui' }}>
        <h1>Debug Tour Page</h1>
        <p><strong>Slug:</strong> {slug}</p>
        <p><strong>Tenant:</strong> {tenantId}</p>
        <p>If you see this, the route is working!</p>
        <a href="/" style={{ color: 'blue' }}>Back to Home</a>
      </div>
    );
  } catch (error: unknown) {
    const err = error as Error;
    return (
      <div style={{ padding: '40px', color: 'red' }}>
        <h1>Error in Tour Page</h1>
        <p>{err.message}</p>
        <pre>{err.stack}</pre>
      </div>
    );
  }
}

export const revalidate = 60;
export const dynamicParams = true;
