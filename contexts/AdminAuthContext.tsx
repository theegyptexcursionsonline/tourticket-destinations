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
const STORAGE_USER_KEY = 'admin-user';

const AdminAuthContext = createContext<AdminAuthContextValue | undefined>(undefined);

export const AdminAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const existingToken = localStorage.getItem(STORAGE_TOKEN_KEY);
    const existingUser = localStorage.getItem(STORAGE_USER_KEY);

    if (existingToken && existingUser) {
      setToken(existingToken);
      setUser(JSON.parse(existingUser));
      // Sync cookie for existing sessions (cookie may be missing if login happened before cookie support)
      document.cookie = `admin-auth-token=${existingToken}; path=/; max-age=${8 * 60 * 60}; samesite=lax${window.location.protocol === 'https:' ? '; secure' : ''}`;
    }

    if (existingToken) {
      refreshUserWithToken(existingToken).finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const persistSession = useCallback((newToken: string, newUser: AdminUser) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem(STORAGE_TOKEN_KEY, newToken);
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(newUser));
  }, []);

  const clearSession = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(STORAGE_TOKEN_KEY);
    localStorage.removeItem(STORAGE_USER_KEY);
    // Clear the auth cookie
    document.cookie = 'admin-auth-token=; path=/; max-age=0; samesite=lax';
  }, []);

  const refreshUserWithToken = useCallback(
    async (activeToken?: string) => {
      const authToken = activeToken || token;
      if (!authToken) {
        return;
      }

      try {
        const response = await fetch('/api/admin/auth/me', {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

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
          persistSession(authToken, normalizedUser);
        }
      } catch (error) {
        console.error('Failed to refresh admin session', error);
      }
    },
    [token, clearSession, persistSession],
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

        persistSession(data.token, normalizedUser);
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
    fetch('/api/admin/logout', { method: 'POST' }).catch(() => {});
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

