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
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-20 w-20 border-b-2 border-red-600" />
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