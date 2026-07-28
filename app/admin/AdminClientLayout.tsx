'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import Sidebar from '@/components/admin/Sidebar';
import Header from '@/components/admin/Header';
import { AuthProvider } from '@/contexts/AuthContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import Login from '@/components/admin/Login';
import MandatoryTwoFactorShell from '@/components/admin/MandatoryTwoFactorShell';
import { AdminAuthProvider, useAdminAuth } from '@/contexts/AdminAuthContext';
import { AdminTenantProvider } from '@/contexts/AdminTenantContext';
import AppToaster from '@/components/ui/AppToaster';

// Admin panel always renders LTR, English-only — no locale routing needed
const ProtectedAdminContent = ({ children }: { children: React.ReactNode }) => {
  return (
    <div dir="ltr" className="flex h-screen bg-gray-100 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4 sm:p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

function AdminApplicationBoundary({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAdminAuth();
  const pathname = usePathname();
  const router = useRouter();
  const enrollmentIncomplete =
    isAuthenticated
    && (user?.twoFactorEnabled !== true || user?.twoFactorRecoveryPending === true);

  useEffect(() => {
    if (enrollmentIncomplete && pathname !== '/admin/security') {
      router.replace('/admin/security?required=1');
    }
  }, [enrollmentIncomplete, pathname, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-slate-50">
        <div className="relative h-14 w-14">
          <div className="absolute inset-0 rounded-full border-4 border-slate-200" />
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-red-600" />
        </div>
        <p className="font-semibold text-slate-800">Opening your secure session…</p>
      </div>
    );
  }
  if (!isAuthenticated) return <Login onLoginSuccess={() => {}} />;
  if (enrollmentIncomplete) {
    if (pathname !== '/admin/security') {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 px-6 text-center">
          <ShieldCheck className="h-10 w-10 text-violet-600" />
          <p className="font-semibold text-slate-900">Opening secure account setup…</p>
        </div>
      );
    }
    return <MandatoryTwoFactorShell>{children}</MandatoryTwoFactorShell>;
  }
  return (
    <SettingsProvider>
      <AdminTenantProvider>
        <ProtectedAdminContent>{children}</ProtectedAdminContent>
      </AdminTenantProvider>
    </SettingsProvider>
  );
}

export default function AdminClientLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
      <AuthProvider>
        <AdminAuthProvider>
          <AdminApplicationBoundary>{children}</AdminApplicationBoundary>
          <AppToaster />
        </AdminAuthProvider>
      </AuthProvider>
    );
}
