'use client';

import Sidebar from '@/components/admin/Sidebar';
import Header from '@/components/admin/Header';
import { AuthProvider } from '@/contexts/AuthContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import withAuth from '@/components/admin/withAuth';
import { AdminAuthProvider } from '@/contexts/AdminAuthContext';
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

const AuthenticatedAdminLayout = withAuth(ProtectedAdminContent);

export default function AdminClientLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <AuthProvider>
            <SettingsProvider>
                <AdminAuthProvider>
                    <AdminTenantProvider>
                        <AuthenticatedAdminLayout>
                            {children}
                        </AuthenticatedAdminLayout>
                        <AppToaster />
                    </AdminTenantProvider>
                </AdminAuthProvider>
            </SettingsProvider>
        </AuthProvider>
    );
}
