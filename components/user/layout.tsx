// app/user/layout.tsx

import React from 'react';
import UserSidebar from '@/components/user/UserSidebar';

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="container mx-auto px-4 py-8 flex">
      <UserSidebar />
      <main className="w-3/4 ps-8">
        {children}
      </main>
    </div>
  );
}