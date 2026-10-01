import { Metadata } from 'next';
import ForgotPasswordClient from './ForgotPasswordClient';
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
        title: `Forgot Password | ${tenant.name}`,
        description: `Reset your ${tenant.name} password to regain access to your account.`,
        robots: {
          // Not indexed while customer accounts are paused.
          index: customerAccountsEnabled(),
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
  // Customer accounts are paused on this network (lib/auth/customerAccounts):
  // explain it instead of showing a form that cannot work.
  if (!customerAccountsEnabled()) return <AccountsUnavailableNotice />;
  return <ForgotPasswordClient />;
}
