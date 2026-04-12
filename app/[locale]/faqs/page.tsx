import { Metadata } from 'next';
import FAQsClientPage from './FAQsClientPage';
import { getSeoAlternates } from '@/lib/seo';
import { getTenantFromRequest, getTenantPublicConfig } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  try {
    const tenantId = await getTenantFromRequest();
    const tenant = await getTenantPublicConfig(tenantId);

    if (tenant) {
      return {
        title: `Frequently Asked Questions | ${tenant.name}`,
        description: `Find answers to common questions about booking tours, cancellations, payments, and travel tips with ${tenant.name}.`,
        openGraph: {
          title: `FAQs | ${tenant.name}`,
          description: `Answers to common questions about booking tours and excursions.`,
          type: 'website',
          siteName: tenant.name,
        },
        alternates: getSeoAlternates('/faqs'),
      };
    }
  } catch (error) {
    console.error('Error generating FAQs metadata:', error);
  }

  return {
    title: 'Frequently Asked Questions | Egypt Excursions Online',
    description: 'Find answers to common questions about booking tours and excursions.',
    alternates: getSeoAlternates('/faqs'),
  };
}

export default function FAQsPage() {
  return <FAQsClientPage />;
}
