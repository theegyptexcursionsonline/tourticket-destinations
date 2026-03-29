'use client';

import Sidebar from '@/components/admin/Sidebar';
import Header from '@/components/admin/Header';
import { AuthProvider } from '@/contexts/AuthContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import withAuth from '@/components/admin/withAuth';
import { AdminAuthProvider } from '@/contexts/AdminAuthContext';
import { AdminTenantProvider } from '@/contexts/AdminTenantContext';
import { Toaster } from 'react-hot-toast';

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
                        <Toaster
                          position="top-right"
                          reverseOrder={false}
                          gutter={8}
                          toastOptions={{
                            duration: 4000,
                            style: {
                              background: '#fff',
                              color: '#333',
                              border: '1px solid #e5e7eb',
                              borderRadius: '12px',
                              padding: '12px 16px',
                              fontSize: '14px',
                              maxWidth: '500px',
                            },
                            success: {
                              duration: 4000,
                              style: {
                                background: '#f0fdf4',
                                color: '#166534',
                                border: '1px solid #bbf7d0',
                              },
                            },
                            error: {
                              duration: 6000,
                              style: {
                                background: '#fef2f2',
                                color: '#b91c1c',
                                border: '1px solid #fecaca',
                              },
                            },
                          }}
                        />
                    </AdminTenantProvider>
                </AdminAuthProvider>
            </SettingsProvider>
        </AuthProvider>
    );
}
