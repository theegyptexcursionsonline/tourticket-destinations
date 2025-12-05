'use client'; // Required for components that use hooks or client-side logic

import Sidebar from '@/components/admin/Sidebar';
import Header from '@/components/admin/Header';
import { AuthProvider } from '@/contexts/AuthContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import withAuth from '@/components/admin/withAuth'; // 1. Import withAuth HOC
import { AdminAuthProvider } from '@/contexts/AdminAuthContext';
import { AdminTenantProvider } from '@/contexts/AdminTenantContext';

// 2. Create a component for the protected content
const ProtectedAdminContent = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4 sm:p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

// 3. Wrap the content component with the withAuth HOC
const AuthenticatedAdminLayout = withAuth(ProtectedAdminContent);

// 4. The main layout now provides the contexts and renders the protected layout
export default function AdminLayout({
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
                    </AdminTenantProvider>
                </AdminAuthProvider>
            </SettingsProvider>
        </AuthProvider>
    );
}