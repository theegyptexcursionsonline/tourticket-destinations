'use client';

// contexts/AdminTenantContext.tsx
// Admin panel context for managing selected tenant (brand) filtering

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAdminAuth } from '@/contexts/AdminAuthContext';

// ============================================
// TYPES
// ============================================

export interface AdminTenant {
  _id: string;
  tenantId: string;
  name: string;
  domain: string;
  isActive: boolean;
  isDefault: boolean;
  branding?: {
    logo?: string;
    primaryColor?: string;
  };
}

interface AdminTenantContextType {
  // Selected tenant for filtering
  selectedTenantId: string;
  setSelectedTenantId: (id: string) => void;
  
  // All available tenants
  tenants: AdminTenant[];
  isLoading: boolean;
  error: string | null;
  
  // Helper methods
  refreshTenants: () => Promise<void>;
  getSelectedTenant: () => AdminTenant | null;
  isAllTenantsSelected: () => boolean;
  
  // For API calls - returns filter object
  getTenantFilter: () => { tenantId?: string };
  getTenantQueryParam: () => string;
}

// ============================================
// CONSTANTS
// ============================================

const STORAGE_KEY = 'adminSelectedTenant';
const TENANTS_CACHE_KEY = 'admin-tenants-selector-cache:v1';
const ALL_TENANTS_VALUE = 'all';

// ============================================
// CONTEXT
// ============================================

const AdminTenantContext = createContext<AdminTenantContextType | undefined>(undefined);

// ============================================
// HOOK
// ============================================

export function useAdminTenant(): AdminTenantContextType {
  const context = useContext(AdminTenantContext);
  if (context === undefined) {
    throw new Error('useAdminTenant must be used within an AdminTenantProvider');
  }
  return context;
}

// ============================================
// PROVIDER
// ============================================

interface AdminTenantProviderProps {
  children: ReactNode;
}

export function AdminTenantProvider({ children }: AdminTenantProviderProps) {
  const { isAuthenticated, isLoading: isAuthLoading } = useAdminAuth();
  const [selectedTenantId, setSelectedTenantIdState] = useState<string>(ALL_TENANTS_VALUE);
  const [tenants, setTenants] = useState<AdminTenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load saved tenant from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setSelectedTenantIdState(saved);
      }
      setIsInitialized(true);
    }
  }, []);

  // Save to localStorage when changed
  const setSelectedTenantId = useCallback((id: string) => {
    setSelectedTenantIdState(id);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, id);
    }
  }, []);

  // Fetch all tenants
  const fetchTenants = useCallback(async () => {
    let hasCached = false;
    try {
      try {
        const cached = sessionStorage.getItem(TENANTS_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached) as { tenants?: AdminTenant[] };
          if (Array.isArray(parsed.tenants)) {
            setTenants(parsed.tenants);
            hasCached = true;
          }
        }
      } catch { /* ignore corrupt/unavailable storage */ }

      setIsLoading(!hasCached);
      setError(null);
      
      // The shared English/German network currently has more tenants than the
      // API's default page size. Load the complete admin scope so no brand is
      // missing from the global selector or reset to All Brands by mistake.
      const response = await fetch('/api/admin/tenants?active=true&limit=50');
      const data = await response.json();
      
      if (data.success) {
        const nextTenants = data.data || [];
        setTenants(nextTenants);
        try {
          sessionStorage.setItem(TENANTS_CACHE_KEY, JSON.stringify({ tenants: nextTenants }));
        } catch { /* ignore storage quota */ }
        
        // If currently selected tenant no longer exists, reset to all
        setSelectedTenantIdState((current) => {
          if (current === ALL_TENANTS_VALUE || nextTenants.some((t: AdminTenant) => t.tenantId === current)) return current;
          localStorage.setItem(STORAGE_KEY, ALL_TENANTS_VALUE);
          return ALL_TENANTS_VALUE;
        });
      } else {
        setError(data.error || 'Failed to fetch tenants');
      }
    } catch (err) {
      console.error('Error fetching tenants:', err);
      setError('Failed to load tenants');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch tenants only after the admin cookie session is authenticated. The
  // provider also wraps the login screen, so fetching on mount would receive
  // 401 and leave the selector empty until a manual page reload.
  useEffect(() => {
    if (!isInitialized || isAuthLoading) return;

    if (!isAuthenticated) {
      setTenants([]);
      setIsLoading(false);
      return;
    }

    fetchTenants();
  }, [isAuthenticated, isAuthLoading, isInitialized, fetchTenants]);

  // Helper: Get currently selected tenant object
  const getSelectedTenant = useCallback((): AdminTenant | null => {
    if (selectedTenantId === ALL_TENANTS_VALUE) return null;
    return tenants.find(t => t.tenantId === selectedTenantId) || null;
  }, [selectedTenantId, tenants]);

  // Helper: Check if "All Tenants" is selected
  const isAllTenantsSelected = useCallback((): boolean => {
    return selectedTenantId === ALL_TENANTS_VALUE;
  }, [selectedTenantId]);

  // Helper: Get filter object for MongoDB queries
  const getTenantFilter = useCallback((): { tenantId?: string } => {
    if (selectedTenantId === ALL_TENANTS_VALUE) {
      return {};
    }
    return { tenantId: selectedTenantId };
  }, [selectedTenantId]);

  // Helper: Get query param string for API calls
  const getTenantQueryParam = useCallback((): string => {
    if (selectedTenantId === ALL_TENANTS_VALUE) {
      return '';
    }
    return `tenantId=${encodeURIComponent(selectedTenantId)}`;
  }, [selectedTenantId]);

  // Context value
  const value: AdminTenantContextType = {
    selectedTenantId,
    setSelectedTenantId,
    tenants,
    isLoading,
    error,
    refreshTenants: fetchTenants,
    getSelectedTenant,
    isAllTenantsSelected,
    getTenantFilter,
    getTenantQueryParam,
  };

  return (
    <AdminTenantContext.Provider value={value}>
      {children}
    </AdminTenantContext.Provider>
  );
}

// ============================================
// EXPORTS
// ============================================

export { ALL_TENANTS_VALUE };
export type { AdminTenantContextType };
