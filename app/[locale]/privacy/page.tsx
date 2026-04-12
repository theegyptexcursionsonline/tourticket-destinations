import { Metadata } from 'next';
import PrivacyClientPage from './PrivacyClientPage';
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
        title: `Privacy Policy | ${tenant.name}`,
        description: `Read the privacy policy for ${tenant.name}. We are committed to protecting your personal data and ensuring a safe booking experience.`,
        openGraph: {
          title: `Privacy Policy | ${tenant.name}`,
          description: `Our commitment to protecting your personal data.`,
          type: 'website',
          siteName: tenant.name,
        },
        alternates: getSeoAlternates('/privacy'),
      };
    }
  } catch (error) {
    console.error('Error generating privacy metadata:', error);
  }

  return {
    title: 'Privacy Policy | Egypt Excursions Online',
    description: 'Read our privacy policy. We are committed to protecting your personal data.',
    alternates: getSeoAlternates('/privacy'),
  };
}

export default function PrivacyPage() {
  return (
    <>
      <WebSiteSchema pageName="Privacy Policy" />
      <PrivacyClientPage />
    </>
  );
}
