import { Metadata } from 'next';
import TermsClientPage from './TermsClientPage';
import WebSiteSchema from '@/components/schema/WebSiteSchema';
import { getSeoAlternates } from '@/lib/seo';
import { getTenantFromRequest, getTenantPublicConfig } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  try {
    const tenantId = await getTenantFromRequest();
    const tenant = await getTenantPublicConfig(tenantId);

    if (tenant) {
      return {
        title: `Terms & Conditions | ${tenant.name}`,
        description: `Read the terms and conditions for ${tenant.name}. Book with confidence knowing your rights and responsibilities.`,
        openGraph: {
          title: `Terms & Conditions | ${tenant.name}`,
          description: `Terms and conditions for booking tours and excursions.`,
          type: 'website',
          siteName: tenant.name,
        },
        alternates: getSeoAlternates('/terms'),
      };
    }
  } catch (error) {
    console.error('Error generating terms metadata:', error);
  }

  return {
    title: 'Terms & Conditions | Egypt Excursions Online',
    description: 'Terms and conditions for booking tours and excursions.',
    alternates: getSeoAlternates('/terms'),
  };
}

export default function TermsPage() {
  return (
    <>
      <WebSiteSchema pageName="Terms & Conditions" />
      <TermsClientPage />
    </>
  );
}
