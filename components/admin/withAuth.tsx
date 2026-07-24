// components/admin/withAuth.tsx
'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import Login from './Login';
import AccessDenied from './AccessDenied';
import { useAdminAuth } from '@/contexts/AdminAuthContext';

interface WithAuthOptions {
  permissions?: string[];
  requireAll?: boolean;
}

const withAuth = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: WithAuthOptions = {},
) => {
  const WithAuthComponent: React.FC<P> = (props) => {
    const {
      isAuthenticated,
      isLoading,
      user,
      hasPermission,
      hasAnyPermission,
    } = useAdminAuth();
    const pathname = usePathname();
    const router = useRouter();
    const requiresTwoFactorSetup =
      isAuthenticated
      && user?.twoFactorEnabled !== true
      && pathname !== '/admin/security';

    useEffect(() => {
      if (requiresTwoFactorSetup) {
        router.replace('/admin/security?required=1');
      }
    }, [requiresTwoFactorSetup, router]);

    const { permissions = [], requireAll = true } = options;

    const hasRequiredPermissions =
      permissions.length === 0
        ? true
        : requireAll
          ? permissions.every((permission) => hasPermission(permission))
          : hasAnyPermission(permissions);

    if (isLoading) {
      // Only reached on the first load of a fresh browser session — reloads
      // and in-session navigations hydrate instantly from the cached profile.
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-5">
          <div className="relative h-14 w-14">
            <div className="absolute inset-0 rounded-full border-4 border-slate-200" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-red-600 animate-spin" />
          </div>
          <div className="text-center">
            <p className="text-slate-800 font-semibold">Egypt Excursions Online Network</p>
            <p className="text-slate-400 text-sm mt-1">Opening your admin panel…</p>
          </div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return <Login onLoginSuccess={() => {}} />;
    }

    if (requiresTwoFactorSetup) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-center">
          <ShieldCheck className="h-10 w-10 text-violet-600" />
          <div>
            <p className="font-semibold text-slate-900">Two-step verification is required</p>
            <p className="mt-1 text-sm text-slate-500">Opening the secure setup page…</p>
          </div>
        </div>
      );
    }

    if (!hasRequiredPermissions) {
      return <AccessDenied requiredPermissions={permissions} />;
    }

    return <WrappedComponent {...props} />;
  };

  return WithAuthComponent;
};

export default withAuth;
