import { Metadata } from 'next';
import ForgotPasswordClient from './ForgotPasswordClient';
import { getTenantFromRequest, getTenantPublicConfig } from '@/lib/tenant';

// Generate dynamic metadata based on tenant
export async function generateMetadata(): Promise<Metadata> {
  try {
    const tenantId = await getTenantFromRequest();
    const tenant = await getTenantPublicConfig(tenantId);
    
    if (tenant) {
      return {
        title: `Forgot Password | ${tenant.name}`,
        description: `Reset your ${tenant.name} password to regain access to your account.`,
        robots: {
          index: true,
          follow: true,
        },
      };
    }
  } catch (error) {
    console.error('Error generating forgot password page metadata:', error);
  }
  
  return {
    title: 'Forgot Password',
    description: 'Reset your password to regain access to your account.',
  };
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordClient />;
}
