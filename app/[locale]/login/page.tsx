// app/login/page.tsx
import { Metadata } from 'next';
import LoginClient from './LoginClient';
import { getTenantFromRequest, getTenantPublicConfig } from '@/lib/tenant';

// Generate dynamic metadata based on tenant
export async function generateMetadata(): Promise<Metadata> {
  try {
    const tenantId = await getTenantFromRequest();
    const tenant = await getTenantPublicConfig(tenantId);
    
    if (tenant) {
      return {
        title: `Login | ${tenant.name}`,
        description: `Log in to your ${tenant.name} account to access your bookings, favorites, and exclusive travel deals.`,
        robots: {
          index: true,
          follow: true,
        },
      };
    }
  } catch (error) {
    console.error('Error generating login page metadata:', error);
  }
  
  return {
    title: 'Login',
    description: 'Log in to your account to access your bookings, favorites, and exclusive travel deals.',
  };
}

export default function LoginPage() {
  return <LoginClient />;
}