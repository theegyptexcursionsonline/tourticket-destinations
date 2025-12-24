// app/page.tsx
// ============================================================================
// COMING SOON MODE: Set to `true` to show coming soon page, `false` for normal site
// ============================================================================
const COMING_SOON_MODE = false;
// ============================================================================

import { Metadata } from 'next';
import ComingSoonWrapper from '@/components/ComingSoonWrapper';
import HomePageServer from './HomePageServer';
import { getTenantFromRequest, getTenantPublicConfig } from '@/lib/tenant';

// Dynamic metadata based on tenant
export async function generateMetadata(): Promise<Metadata> {
  try {
    const tenantId = await getTenantFromRequest();
    const tenant = await getTenantPublicConfig(tenantId);
    
    if (tenant) {
      return {
        title: tenant.seo.defaultTitle,
        description: tenant.seo.defaultDescription,
        openGraph: {
          title: tenant.seo.defaultTitle,
          description: tenant.seo.defaultDescription,
          siteName: tenant.name,
          images: [tenant.seo.ogImage],
        },
      };
    }
  } catch (error) {
    console.error('Error generating homepage metadata:', error);
  }
  
  return {
    title: 'Tours & Activities',
    description: 'Discover amazing tours and experiences. Book your next adventure today.',
  };
}

// ISR: 5 minute cache for fast initial loads with background revalidation
export const dynamic = 'force-dynamic';

export default function HomePage() {
  if (COMING_SOON_MODE) {
    return <ComingSoonWrapper />;
  }
  return <HomePageServer />;
}
