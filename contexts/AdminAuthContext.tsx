'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

interface AdminUser {
  id: string;
  _id?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  role: string;
  permissions: string[];
  isActive?: boolean;
}

interface AdminAuthContextValue {
  user: AdminUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
}

const STORAGE_TOKEN_KEY = 'admin-auth-token';
const COOKIE_SESSION_SENTINEL = 'cookie-session';

const AdminAuthContext = createContext<AdminAuthContextValue | undefined>(undefined);

export const AdminAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Remove credentials written by versions that predated HTTP-only cookies.
    localStorage.removeItem(STORAGE_TOKEN_KEY);
    localStorage.removeItem('admin-user');
    refreshUserWithToken().finally(() => setIsLoading(false));
  }, []);

  const persistSession = useCallback((newUser: AdminUser) => {
    // This is deliberately not a credential. Existing admin components use
    // `token` only as an authenticated-state sentinel while fetch sends the
    // HTTP-only cookie automatically.
    setToken(COOKIE_SESSION_SENTINEL);
    setUser(newUser);
  }, []);

  const clearSession = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(STORAGE_TOKEN_KEY);
    localStorage.removeItem('admin-user');
  }, []);

  const refreshUserWithToken = useCallback(
    async () => {
      try {
        const response = await fetch('/api/admin/auth/me', { credentials: 'same-origin' });

        if (!response.ok) {
          clearSession();
          return;
        }

        const data = await response.json();
        if (data?.user) {
          const normalizedUser: AdminUser = {
            ...data.user,
            id: data.user.id || data.user._id,
            permissions: data.user.permissions || [],
          };
          persistSession(normalizedUser);
        }
      } catch (error) {
        console.error('Failed to refresh admin session', error);
      }
    },
    [clearSession, persistSession],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/admin/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, username: email, password }),
        });

        let data: any = null;
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          const text = await response.text();
          data = { error: text || 'Server returned non-JSON response' };
        }

        if (!response.ok) {
          throw new Error(data?.error || `Login failed (${response.status})`);
        }

        const normalizedUser: AdminUser = {
          ...data.user,
          id: data.user.id || data.user._id,
          permissions: data.user.permissions || [],
        };

        persistSession(normalizedUser);
        toast.success('Welcome back!');
      } catch (error: any) {
        toast.error(error.message || 'Failed to log in');
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [persistSession],
  );

  const logout = useCallback(() => {
    clearSession();
    // Clear the HTTP-only auth cookie on the server
    fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => {});
    toast.success('You have been logged out.');
  }, [clearSession]);

  const hasPermission = useCallback(
    (permission: string) => {
      if (!permission) return true;
      if (!user || !user.permissions) return false;
      if (user.role === 'super_admin' || user.role === 'admin') return true;
      return user.permissions.includes(permission);
    },
    [user],
  );

  const hasAnyPermission = useCallback(
    (permissions: string[]) => {
      if (!permissions || permissions.length === 0) {
        return true;
      }
      return permissions.some((permission) => hasPermission(permission));
    },
    [hasPermission],
  );

  const contextValue = useMemo<AdminAuthContextValue>(
    () => ({
      user,
      token,
      isLoading,
      isAuthenticated: Boolean(user && token),
      login,
      logout,
      refreshUser: refreshUserWithToken,
      hasPermission,
      hasAnyPermission,
    }),
    [user, token, isLoading, login, logout, refreshUserWithToken, hasPermission, hasAnyPermission],
  );

  return <AdminAuthContext.Provider value={contextValue}>{children}</AdminAuthContext.Provider>;
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};
