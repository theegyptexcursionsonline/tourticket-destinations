import { Metadata } from 'next';
import CheckoutClientPage from './CheckoutClientPage';
import { getSeoAlternates } from '@/lib/seo';
import { getTenantFromRequest, getTenantPublicConfig } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  try {
    const tenantId = await getTenantFromRequest();
    const tenant = await getTenantPublicConfig(tenantId);

    if (tenant) {
      return {
        title: `Checkout | ${tenant.name}`,
        description: `Complete your booking with ${tenant.name}. Secure checkout for tours and excursions.`,
        openGraph: {
          title: `Checkout | ${tenant.name}`,
          description: `Secure checkout for tours and excursions.`,
          type: 'website',
          siteName: tenant.name,
        },
        robots: { index: false, follow: false },
        alternates: getSeoAlternates('/checkout'),
      };
    }
  } catch (error) {
    console.error('Error generating checkout metadata:', error);
  }

  return {
    title: 'Checkout | Egypt Excursions Online',
    description: 'Complete your booking securely.',
    robots: { index: false, follow: false },
        alternates: getSeoAlternates('/checkout'),
  };
}

export default function CheckoutPage() {
  return <CheckoutClientPage />;
}
