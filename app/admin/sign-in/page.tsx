import type { Metadata } from 'next';
import AdminSessionCheck from '@/components/admin/AdminSessionCheck';

export const metadata: Metadata = {
  title: {
    absolute: 'Sign in | Admin Panel',
  },
  robots: { index: false, follow: false },
};

/**
 * Rendered by the proxy in place of any admin page requested without a
 * session. It holds no data: the admin layout shows the sign-in form, and once
 * the admin signs in the originally requested page is rendered for them.
 */
export default function AdminSignInPage() {
  return <AdminSessionCheck />;
}
