import { Metadata } from 'next';
import SignupClient from './SignupClient';
import { getTenantFromRequest, getTenantPublicConfig } from '@/lib/tenant';

// Generate dynamic metadata based on tenant
export async function generateMetadata(): Promise<Metadata> {
  try {
    const tenantId = await getTenantFromRequest();
    const tenant = await getTenantPublicConfig(tenantId);
    
    if (tenant) {
      return {
        title: `Sign Up | ${tenant.name}`,
        description: `Create your ${tenant.name} account to start booking amazing tours and experiences. Get exclusive deals and manage your bookings.`,
        robots: {
          index: true,
          follow: true,
        },
      };
    }
  } catch (error) {
    console.error('Error generating signup page metadata:', error);
  }
  
  return {
    title: 'Sign Up',
    description: 'Create your account to start booking amazing tours and experiences.',
  };
}

export default function SignupPage() {
  return <SignupClient />;
}