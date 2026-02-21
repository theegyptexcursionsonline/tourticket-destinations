'use client';

// components/admin/TenantSwitcher.tsx
// Component for switching between tenants in the admin dashboard

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown, Globe, Check, Search, Plus, ExternalLink } from 'lucide-react';
import { Link } from '@/i18n/navigation';

interface Tenant {
  tenantId: string;
  name: string;
  domain: string;
  isActive: boolean;
  isDefault: boolean;
  branding: {
    logo?: string;
    primaryColor?: string;
  };
}

interface TenantSwitcherProps {
  currentTenantId?: string;
  onTenantChange?: (tenantId: string) => void;
  showAllOption?: boolean;
  className?: string;
}

export default function TenantSwitcher({
  currentTenantId,
  onTenantChange,
  showAllOption = true,
  className = '',
}: TenantSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>(currentTenantId || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Fetch tenants
  useEffect(() => {
    const fetchTenants = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/admin/tenants?active=true');
        const data = await response.json();
        
        if (data.success) {
          setTenants(data.data);
          
          // Set initial selection
          if (!currentTenantId && data.data.length > 0) {
            const defaultTenant = data.data.find((t: Tenant) => t.isDefault);
            if (defaultTenant) {
              setSelectedTenantId(defaultTenant.tenantId);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching tenants:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTenants();
  }, [currentTenantId]);
  
  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Handle tenant selection
  const handleSelect = useCallback((tenantId: string) => {
    setSelectedTenantId(tenantId);
    setIsOpen(false);
    setSearchQuery('');
    
    // Store in localStorage for persistence
    if (typeof window !== 'undefined') {
      localStorage.setItem('admin_tenant_id', tenantId);
    }
    
    // Notify parent
    if (onTenantChange) {
      onTenantChange(tenantId);
    }
  }, [onTenantChange]);
  
  // Filter tenants by search query
  const filteredTenants = tenants.filter(tenant =>
    tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tenant.tenantId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tenant.domain.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Get selected tenant info
  const selectedTenant = selectedTenantId === 'all' 
    ? null 
    : tenants.find(t => t.tenantId === selectedTenantId);
  
  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-2.5 bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-sm transition-all min-w-[200px]"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {/* Icon/Logo */}
        {selectedTenant?.branding?.logo ? (
          <img 
            src={selectedTenant.branding.logo} 
            alt="" 
            className="w-6 h-6 rounded object-contain"
          />
        ) : selectedTenant ? (
          <div 
            className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: selectedTenant.branding?.primaryColor || '#6366F1' }}
          >
            {selectedTenant.name.charAt(0)}
          </div>
        ) : (
          <div className="w-6 h-6 rounded bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Globe className="w-4 h-4 text-white" />
          </div>
        )}
        
        {/* Label */}
        <span className="flex-1 text-start text-sm font-medium text-gray-700 truncate">
          {selectedTenantId === 'all' ? 'All Brands' : selectedTenant?.name || 'Select Brand'}
        </span>
        
        {/* Chevron */}
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full start-0 end-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Search */}
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search brands..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full ps-9 pe-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                autoFocus
              />
            </div>
          </div>
          
          {/* Options List */}
          <div className="max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500 text-sm">Loading brands...</div>
            ) : (
              <>
                {/* All Brands Option */}
                {showAllOption && (
                  <button
                    onClick={() => handleSelect('all')}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                      selectedTenantId === 'all' ? 'bg-indigo-50' : ''
                    }`}
                    role="option"
                    aria-selected={selectedTenantId === 'all'}
                  >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                      <Globe className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 text-start">
                      <div className="text-sm font-medium text-gray-900">All Brands</div>
                      <div className="text-xs text-gray-500">View data from all brands</div>
                    </div>
                    {selectedTenantId === 'all' && (
                      <Check className="w-4 h-4 text-indigo-600" />
                    )}
                  </button>
                )}
                
                {/* Divider */}
                {showAllOption && filteredTenants.length > 0 && (
                  <div className="border-t border-gray-100 my-1" />
                )}
                
                {/* Tenant Options */}
                {filteredTenants.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    {searchQuery ? 'No brands found' : 'No brands available'}
                  </div>
                ) : (
                  filteredTenants.map((tenant) => (
                    <button
                      key={tenant.tenantId}
                      onClick={() => handleSelect(tenant.tenantId)}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                        selectedTenantId === tenant.tenantId ? 'bg-indigo-50' : ''
                      } ${!tenant.isActive ? 'opacity-50' : ''}`}
                      role="option"
                      aria-selected={selectedTenantId === tenant.tenantId}
                    >
                      {/* Logo/Avatar */}
                      {tenant.branding?.logo ? (
                        <img 
                          src={tenant.branding.logo} 
                          alt="" 
                          className="w-8 h-8 rounded-lg object-contain border border-gray-100"
                        />
                      ) : (
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                          style={{ backgroundColor: tenant.branding?.primaryColor || '#6366F1' }}
                        >
                          {tenant.name.charAt(0)}
                        </div>
                      )}
                      
                      {/* Info */}
                      <div className="flex-1 text-start min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {tenant.name}
                          </span>
                          {tenant.isDefault && (
                            <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] rounded font-medium">
                              DEFAULT
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 truncate">{tenant.domain}</div>
                      </div>
                      
                      {/* Check Mark */}
                      {selectedTenantId === tenant.tenantId && (
                        <Check className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                      )}
                    </button>
                  ))
                )}
              </>
            )}
          </div>
          
          {/* Footer */}
          <div className="border-t border-gray-100 p-3 flex items-center justify-between bg-gray-50">
            <Link
              href="/admin/tenants"
              className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Manage Brands</span>
            </Link>
            
            {selectedTenant && (
              <a
                href={`https://${selectedTenant.domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700"
              >
                <span>Visit</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Hook to use selected tenant in admin context
export function useAdminTenant() {
  const [tenantId, setTenantId] = useState<string>('all');
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('admin_tenant_id');
      if (stored) {
        setTenantId(stored);
      }
    }
  }, []);
  
  const changeTenant = useCallback((newTenantId: string) => {
    setTenantId(newTenantId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('admin_tenant_id', newTenantId);
    }
  }, []);
  
  return { tenantId, changeTenant };
}

