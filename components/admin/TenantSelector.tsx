'use client';

// components/admin/TenantSelector.tsx
// Dropdown component for selecting which tenant (brand) to manage in admin panel

import React from 'react';
import { Globe, ChevronDown, Building2 } from 'lucide-react';
import { useAdminTenant, ALL_TENANTS_VALUE } from '@/contexts/AdminTenantContext';

interface TenantSelectorProps {
  variant?: 'header' | 'sidebar' | 'compact';
  className?: string;
}

export default function TenantSelector({ variant = 'header', className = '' }: TenantSelectorProps) {
  const { 
    selectedTenantId, 
    setSelectedTenantId, 
    tenants, 
    isLoading,
    getSelectedTenant 
  } = useAdminTenant();

  const selectedTenant = getSelectedTenant();

  if (variant === 'compact') {
    return (
      <div className={`relative ${className}`}>
        <select
          value={selectedTenantId}
          onChange={(e) => setSelectedTenantId(e.target.value)}
          disabled={isLoading}
          className="appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm font-medium text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value={ALL_TENANTS_VALUE}>All Brands</option>
          {tenants.map((tenant) => (
            <option key={tenant.tenantId} value={tenant.tenantId}>
              {tenant.name}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
    );
  }

  if (variant === 'sidebar') {
    return (
      <div className={`p-4 border-b border-gray-200 ${className}`}>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Managing Brand
        </label>
        <div className="relative">
          <select
            value={selectedTenantId}
            onChange={(e) => setSelectedTenantId(e.target.value)}
            disabled={isLoading}
            className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 pr-10 text-sm font-medium text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer disabled:opacity-50"
          >
            <option value={ALL_TENANTS_VALUE}>🌐 All Brands</option>
            {tenants.map((tenant) => (
              <option key={tenant.tenantId} value={tenant.tenantId}>
                {tenant.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
        </div>
        {selectedTenant && (
          <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: selectedTenant.branding?.primaryColor || '#E63946' }}
            />
            <span className="truncate">{selectedTenant.domain}</span>
          </div>
        )}
      </div>
    );
  }

  // Default: header variant
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-2xl border border-slate-200">
        <Building2 className="w-4 h-4 text-slate-500" />
        <span className="text-xs font-semibold text-slate-600">Brand</span>
      </div>

      <div className="relative">
        <select
          value={selectedTenantId}
          onChange={(e) => setSelectedTenantId(e.target.value)}
          disabled={isLoading}
          className="appearance-none bg-white border border-slate-200 rounded-2xl px-4 py-2.5 pr-10 text-sm font-semibold text-slate-800 hover:border-slate-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/15 focus:border-indigo-500 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed min-w-[200px]"
        >
          <option value={ALL_TENANTS_VALUE}>All Brands</option>
          {tenants.map((tenant) => (
            <option key={tenant.tenantId} value={tenant.tenantId}>
              {tenant.name}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
      </div>

      {selectedTenant && (
        <div className="hidden lg:flex items-center gap-2 px-3 py-2 bg-white rounded-2xl border border-slate-200">
          {selectedTenant.branding?.logo ? (
            <img
              src={selectedTenant.branding.logo}
              alt={selectedTenant.name}
              className="w-6 h-6 object-contain"
            />
          ) : (
            <div
              className="w-6 h-6 rounded-xl flex items-center justify-center text-white text-xs font-bold"
              style={{ backgroundColor: selectedTenant.branding?.primaryColor || '#6366F1' }}
            >
              {selectedTenant.name.charAt(0)}
            </div>
          )}
          <span className="text-xs font-semibold text-slate-700 max-w-[180px] truncate">{selectedTenant.domain}</span>
        </div>
      )}

      {isLoading && <div className="w-4 h-4 border-2 border-slate-300 border-t-indigo-500 rounded-full animate-spin" />}
    </div>
  );
}

// Compact inline selector for use in forms
export function TenantSelectorInline({ 
  value, 
  onChange, 
  required = false,
  disabled = false,
  className = '' 
}: {
  value: string;
  onChange: (tenantId: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const { tenants, isLoading } = useAdminTenant();

  return (
    <div className={`relative ${className}`}>
      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled || isLoading}
        className="w-full appearance-none bg-white border border-gray-300 rounded-lg pl-10 pr-10 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer disabled:bg-gray-100 disabled:cursor-not-allowed"
      >
        <option value="">Select a brand...</option>
        {tenants.map((tenant) => (
          <option key={tenant.tenantId} value={tenant.tenantId}>
            {tenant.name}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
    </div>
  );
}
