import React from 'react';
import UserSidebar from '@/components/user/UserSidebar';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProtectedRoute from '@/components/ProtectedRoute';
import AccountsUnavailableNotice from '@/components/auth/AccountsUnavailableNotice';
import { customerAccountsEnabled } from '@/lib/auth/customerAccounts';

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Customer accounts are paused on this network (lib/auth/customerAccounts):
  // links from booking e-mails land here, so explain it instead of a dead end.
  if (!customerAccountsEnabled()) return <AccountsUnavailableNotice />;

  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-screen bg-slate-50">
        <Header startSolid />
        <main className="flex-grow pt-20 pb-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col lg:flex-row lg:gap-8">
              <UserSidebar />
              <div className="flex-1 mt-8 lg:mt-0">
                {children}
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </ProtectedRoute>
  );
}
