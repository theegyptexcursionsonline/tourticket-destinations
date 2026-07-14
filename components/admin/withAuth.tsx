// components/admin/withAuth.tsx
'use client';

import React from 'react';
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
      refreshUser: _refreshUser,
      hasPermission,
      hasAnyPermission,
    } = useAdminAuth();

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

    if (!hasRequiredPermissions) {
      return <AccessDenied requiredPermissions={permissions} />;
    }

    return <WrappedComponent {...props} />;
  };

  return WithAuthComponent;
};

export default withAuth;