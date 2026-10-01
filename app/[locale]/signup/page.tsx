import { Metadata } from 'next';
import SignupClient from './SignupClient';
import AccountsUnavailableNotice from '@/components/auth/AccountsUnavailableNotice';
import { customerAccountsEnabled } from '@/lib/auth/customerAccounts';
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
          // Not indexed while customer accounts are paused.
          index: customerAccountsEnabled(),
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
  // Customer accounts are paused on this network (lib/auth/customerAccounts):
  // explain it instead of showing a form that cannot work.
  if (!customerAccountsEnabled()) return <AccountsUnavailableNotice />;
  return <SignupClient />;
}