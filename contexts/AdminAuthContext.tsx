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
// Display profile only (name/role/permissions) — never a credential. The
// session credential stays in the httpOnly cookie; this just lets reloads
// render the admin shell instantly while the cookie is re-validated in the
// background. sessionStorage: per tab, gone when the browser closes.
const SESSION_PROFILE_KEY = 'admin-session-profile';

function readSessionProfile(): AdminUser | null {
  try {
    const raw = sessionStorage.getItem(SESSION_PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AdminUser;
    return parsed && parsed.id && parsed.role ? parsed : null;
  } catch {
    return null;
  }
}

const AdminAuthContext = createContext<AdminAuthContextValue | undefined>(undefined);

export const AdminAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const persistSession = useCallback((newUser: AdminUser) => {
    // This is deliberately not a credential. Existing admin components use
    // `token` only as an authenticated-state sentinel while fetch sends the
    // HTTP-only cookie automatically.
    setToken(COOKIE_SESSION_SENTINEL);
    setUser(newUser);
    try {
      sessionStorage.setItem(SESSION_PROFILE_KEY, JSON.stringify(newUser));
    } catch { /* storage unavailable */ }
  }, []);

  const clearSession = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(STORAGE_TOKEN_KEY);
    localStorage.removeItem('admin-user');
    try {
      sessionStorage.removeItem(SESSION_PROFILE_KEY);
      // Cached admin lists/metrics must not outlive the session.
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const key = sessionStorage.key(i);
        if (key && (key.startsWith('admin-bookings-cache:') || key.startsWith('admin-reviews-cache:'))) {
          sessionStorage.removeItem(key);
        }
      }
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith('admin-dashboard-cache:')) localStorage.removeItem(key);
      }
    } catch { /* storage unavailable */ }
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

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      // Remove credentials written by versions that predated HTTP-only cookies.
      localStorage.removeItem(STORAGE_TOKEN_KEY);
      localStorage.removeItem('admin-user');

      // Optimistic hydration: paint the shell from the per-tab profile right
      // away; the cookie is still re-validated below and an invalid session
      // clears state and lands on the login screen.
      const cachedProfile = readSessionProfile();
      if (cachedProfile) {
        setToken(COOKIE_SESSION_SENTINEL);
        setUser(cachedProfile);
        setIsLoading(false);
      }

      void refreshUserWithToken().finally(() => setIsLoading(false));
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [refreshUserWithToken]);

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
