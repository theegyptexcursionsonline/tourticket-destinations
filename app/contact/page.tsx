import React from 'react';
import { Metadata } from 'next';
import ContactClientPage from './ContactClientPage';
import { getTenantFromRequest, getTenantPublicConfig } from '@/lib/tenant';

// Enable ISR with 60 second revalidation for instant page loads
export const revalidate = 60;

// Generate dynamic metadata based on tenant
export async function generateMetadata(): Promise<Metadata> {
  try {
    const tenantId = await getTenantFromRequest();
    const tenant = await getTenantPublicConfig(tenantId);
    
    if (tenant) {
      return {
        title: `Contact Us - Get in Touch | ${tenant.name}`,
        description: `Have a question? Contact ${tenant.name}. We are here to help you plan your perfect adventure. 24/7 support available.`,
        openGraph: {
          title: `Contact Us | ${tenant.name}`,
          description: 'Have a question? Contact us for 24/7 support and expert travel advice.',
          type: 'website',
          siteName: tenant.name,
          images: [tenant.seo.ogImage || '/about.png'],
        },
      };
    }
  } catch (error) {
    console.error('Error generating contact page metadata:', error);
  }
  
  return {
    title: 'Contact Us - Get in Touch',
    description: 'Have a question? Contact us for 24/7 support and expert travel advice.',
  };
}

export default function ContactPage() {
  return <ContactClientPage />;
}
