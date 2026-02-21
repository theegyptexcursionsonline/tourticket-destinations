'use client';

// app/admin/tenants/page.tsx
// Admin page for managing tenants (brands/websites)

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Plus,
  Search,
  Globe,
  Settings,
  Trash2,
  Eye,
  EyeOff,
  Star,
  ExternalLink,
  Edit,
  Copy,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  X,
} from 'lucide-react';
import { Link } from '@/i18n/navigation';
import toast from 'react-hot-toast';
import withAuth from '@/components/admin/withAuth';

interface Tenant {
  _id: string;
  tenantId: string;
  name: string;
  domain: string;
  domains: string[];
  isActive: boolean;
  isDefault: boolean;
  branding: {
    logo: string;
    primaryColor: string;
    secondaryColor: string;
  };
  createdAt: string;
  updatedAt: string;
}

function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Keep an immediate input value for responsiveness + debounce before fetching
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isSearching = searchInput.trim() !== searchQuery.trim();

  const activeCount = tenants.filter((t) => t.isActive).length;
  const inactiveCount = tenants.filter((t) => !t.isActive).length;
  const defaultTenant = tenants.find((t) => t.isDefault);
  const defaultTenantName = defaultTenant?.name || 'Not set';
  const totalDomains = tenants.reduce((acc, tenant) => {
    const extraDomains = tenant.domains?.length ? tenant.domains.length : tenant.domain ? 1 : 0;
    return acc + extraDomains;
  }, 0);
  const statCards = useMemo(() => [
    {
      label: 'Total Brands',
      value: tenants.length.toString(),
      sublabel: 'Across all regions',
      accent: 'from-sky-500 to-indigo-500',
      icon: Globe,
    },
    {
      label: 'Active Brands',
      value: activeCount.toString(),
      sublabel: 'Live & visible',
      accent: 'from-emerald-500 to-green-600',
      icon: CheckCircle,
    },
    {
      label: 'Inactive',
      value: inactiveCount.toString(),
      sublabel: 'Hidden from web',
      accent: 'from-rose-500 to-red-500',
      icon: XCircle,
    },
    {
      label: 'Default Brand',
      value: defaultTenantName,
      sublabel: defaultTenant?.domain || 'No domain assigned',
      accent: 'from-amber-400 to-orange-500',
      icon: Star,
    },
  ], [tenants.length, activeCount, inactiveCount, defaultTenantName, defaultTenant?.domain]);

  // Debounce search input to avoid refetching on every keystroke
  useEffect(() => {
    const handle = window.setTimeout(() => {
      setSearchQuery(searchInput.trim());
    }, 250);
    return () => window.clearTimeout(handle);
  }, [searchInput]);
  
  // Fetch tenants
  const fetchTenants = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const params = new URLSearchParams();
      
      if (filter !== 'all') {
        params.set('active', filter === 'active' ? 'true' : 'false');
      }
      if (searchQuery) {
        params.set('search', searchQuery);
      }
      
      const response = await fetch(`/api/admin/tenants?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        setTenants(data.data);
      } else {
        setErrorMessage(data.error || 'Failed to fetch tenants');
        toast.error('Failed to fetch tenants');
      }
    } catch (error) {
      console.error('Error fetching tenants:', error);
      setErrorMessage('Failed to fetch tenants');
      toast.error('Failed to fetch tenants');
    } finally {
      setIsLoading(false);
    }
  }, [filter, searchQuery]);
  
  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);
  
  // Toggle tenant active status
  const toggleTenantStatus = async (tenantId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/tenants/${tenantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: currentStatus ? 'deactivate' : 'activate',
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(`Tenant ${currentStatus ? 'deactivated' : 'activated'}`);
        fetchTenants();
      } else {
        toast.error(data.error || 'Failed to update tenant');
      }
    } catch (error) {
      console.error('Error toggling tenant status:', error);
      toast.error('Failed to update tenant');
    }
  };
  
  // Set as default tenant
  const setAsDefault = async (tenantId: string) => {
    try {
      const response = await fetch(`/api/admin/tenants/${tenantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setDefault' }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Default tenant updated');
        fetchTenants();
      } else {
        toast.error(data.error || 'Failed to set default tenant');
      }
    } catch (error) {
      console.error('Error setting default tenant:', error);
      toast.error('Failed to set default tenant');
    }
  };
  
  // Copy domain to clipboard
  const copyDomain = (domain: string) => {
    navigator.clipboard.writeText(`https://${domain}`);
    toast.success('Domain copied to clipboard');
  };
  
  // Delete tenant
  const deleteTenant = async (tenantId: string, tenantName: string) => {
    if (!confirm(`Are you sure you want to deactivate "${tenantName}"? This will hide the website.`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/admin/tenants/${tenantId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Tenant deactivated');
        fetchTenants();
      } else {
        toast.error(data.error || 'Failed to deactivate tenant');
      }
    } catch (error) {
      console.error('Error deactivating tenant:', error);
      toast.error('Failed to deactivate tenant');
    }
  };
  
  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="rounded-3xl bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.25),_transparent_45%),_linear-gradient(135deg,_#0f172a,_#1e293b_50%,_#4338ca)] text-white shadow-xl overflow-hidden border border-white/10">
        <div className="flex flex-col gap-6 p-6 md:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-4 max-w-2xl">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-200/80">Brand Control Center</p>
            <div>
              <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Manage every tenant, everywhere.</h1>
              <p className="mt-3 text-base text-slate-100/80">
                Launch, pause, or refresh branded storefronts in seconds. Keep domains, colors, and visibility perfectly in sync across your network.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-400"></span>
                {activeCount} live brands
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm">
                <Globe className="w-4 h-4" />
                {totalDomains} domains connected
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm">
                <Star className="w-4 h-4 text-yellow-300" />
                Default: {defaultTenantName}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white text-slate-900 px-6 py-3 font-semibold shadow-lg shadow-black/10 hover:shadow-2xl hover:-translate-y-0.5 transition-all"
            >
              <Plus className="w-5 h-5" />
              Launch New Brand
            </button>
            <Link
              href="/admin/tenants"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/40 px-6 py-3 font-semibold text-white hover:bg-white/10 transition-colors"
            >
              <Settings className="w-5 h-5" />
              Brand Guidelines
            </Link>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white/80 backdrop-blur border border-slate-200/80 rounded-2xl shadow-sm p-4 md:p-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="w-full lg:max-w-xl relative">
          <Search className="absolute start-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by brand name, tenant ID, or domain"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 ps-12 pe-12 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20"
          />
          <div className="absolute end-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {isSearching && (
              <Loader2 className="w-4 h-4 text-slate-400 animate-spin" aria-label="Searching" />
            )}
            {!!searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                aria-label="Clear search"
                title="Clear"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['all', 'active', 'inactive'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                filter === f
                  ? 'bg-slate-900 text-white shadow'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f === 'all' ? 'All brands' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map(({ label, value, sublabel, accent, icon: IconCard }) => (
          <div
            key={label}
            className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
          >
            <div className={`absolute inset-x-4 top-4 h-14 rounded-xl bg-gradient-to-r ${accent} opacity-10 blur-2xl group-hover:opacity-20`}></div>
            <div className="relative flex items-center gap-4">
              <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${accent} text-white shadow`}>
                <IconCard className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">{label}</p>
                <p className="text-2xl font-semibold text-slate-900">{value}</p>
                <p className="text-xs text-slate-400">{sublabel}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Tenants Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm animate-pulse">
              <div className="h-12 w-32 rounded-2xl bg-slate-200 mb-4"></div>
              <div className="h-4 w-full rounded bg-slate-200 mb-2"></div>
              <div className="h-4 w-2/3 rounded bg-slate-200 mb-2"></div>
              <div className="h-4 w-1/2 rounded bg-slate-200"></div>
            </div>
          ))}
        </div>
      ) : errorMessage ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50/60 p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">Couldn’t load brands</h3>
                <p className="mt-1 text-sm text-slate-600">{errorMessage}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={fetchTenants}
              className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-slate-800 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      ) : tenants.length === 0 ? (
        <div className="bg-white rounded-xl p-12 border border-gray-200 text-center">
          <Globe className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No brands found</h3>
          <p className="text-gray-500 mb-4">Get started by creating your first brand</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Add New Brand</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {tenants.map((tenant) => (
            <div
              key={tenant._id}
              className={`group relative rounded-3xl border bg-white/70 backdrop-blur p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-2xl ${
                tenant.isDefault ? 'border-amber-300 ring-2 ring-amber-100' : 'border-slate-100'
              } ${!tenant.isActive ? 'opacity-60' : ''}`}
            >
              <div className="absolute inset-x-6 top-0 h-1 rounded-full" style={{ backgroundColor: tenant.branding?.primaryColor || '#3b82f6' }} />

              <div className="mt-2 space-y-5">
                {/* Brand Info */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    {tenant.branding?.logo ? (
                      <div className="h-14 w-14 rounded-2xl bg-white shadow ring-1 ring-slate-100 flex items-center justify-center overflow-hidden">
                        <img
                          src={tenant.branding.logo}
                          alt={tenant.name}
                          className="h-12 w-12 object-contain"
                        />
                      </div>
                    ) : (
                      <div
                        className="h-14 w-14 rounded-2xl flex items-center justify-center text-white text-xl font-semibold shadow"
                        style={{ backgroundColor: tenant.branding?.primaryColor || '#3b82f6' }}
                      >
                        {tenant.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-semibold text-slate-900">{tenant.name}</h3>
                        {tenant.isDefault && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                            <Star className="w-3.5 h-3.5" />
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500">{tenant.tenantId}</p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                      tenant.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${tenant.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                    {tenant.isActive ? 'Live' : 'Hidden'}
                  </span>
                </div>

                {/* Domain */}
                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Globe className="w-4 h-4 text-slate-400" />
                    <span className="flex-1 truncate font-medium text-slate-700">{tenant.domain}</span>
                    <button
                      onClick={() => copyDomain(tenant.domain)}
                      className="rounded-full p-2 text-slate-400 hover:bg-white hover:text-slate-700 transition-colors"
                      title="Copy URL"
                      aria-label={`Copy ${tenant.domain}`}
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <a
                      href={`https://${tenant.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full p-2 text-slate-400 hover:bg-white hover:text-blue-600 transition-colors"
                      title="Open website"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                  {!!tenant.domains?.length && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {tenant.domains.slice(0, 3).map((domain) => (
                        <span key={domain} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-500 shadow-sm">
                          {domain}
                        </span>
                      ))}
                      {tenant.domains.length > 3 && (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">
                          +{tenant.domains.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Colors */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl border border-slate-100 bg-white p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Primary</p>
                    <div className="mt-2 flex items-center gap-3">
                      <span
                        className="h-8 w-8 rounded-full border border-white shadow-inner"
                        style={{ backgroundColor: tenant.branding?.primaryColor || '#3b82f6' }}
                      ></span>
                      <span className="font-medium text-slate-700">{tenant.branding?.primaryColor || '#3B82F6'}</span>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-white p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Secondary</p>
                    <div className="mt-2 flex items-center gap-3">
                      <span
                        className="h-8 w-8 rounded-full border border-white shadow-inner"
                        style={{ backgroundColor: tenant.branding?.secondaryColor || '#1D3557' }}
                      ></span>
                      <span className="font-medium text-slate-700">{tenant.branding?.secondaryColor || '#1D3557'}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                  <Link
                    href={`/admin/tenants/${tenant.tenantId}`}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:-translate-y-0.5 hover:bg-slate-800 transition-all"
                  >
                    <Edit className="w-4 h-4" />
                    Edit brand
                  </Link>

                  <button
                    onClick={() => toggleTenantStatus(tenant.tenantId, tenant.isActive)}
                    className={`inline-flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition-all ${
                      tenant.isActive
                        ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                    title={tenant.isActive ? 'Deactivate' : 'Activate'}
                  >
                    {tenant.isActive ? (
                      <>
                        <EyeOff className="w-4 h-4" />
                        Hide
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4" />
                        Show
                      </>
                    )}
                  </button>

                  {!tenant.isDefault && (
                    <button
                      onClick={() => setAsDefault(tenant.tenantId)}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-200 text-amber-600 hover:bg-amber-50 transition-colors"
                      title="Set as default"
                    >
                      <Star className="w-4 h-4" />
                    </button>
                  )}

                  {!tenant.isDefault && (
                    <button
                      onClick={() => deleteTenant(tenant.tenantId, tenant.name)}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Create Modal */}
      {showCreateModal && (
        <CreateTenantModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchTenants();
          }}
        />
      )}
    </div>
  );
}

export default withAuth(TenantsPage, { permissions: ['manageUsers'] });

// Create Tenant Modal Component
function CreateTenantModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);
  const [formData, setFormData] = useState({
    tenantId: '',
    name: '',
    domain: '',
    primaryColor: '#E63946',
    secondaryColor: '#1D3557',
  });

  useEffect(() => {
    firstFieldRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.tenantId || !formData.name || !formData.domain) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const response = await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: formData.tenantId.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
          name: formData.name,
          domain: formData.domain.toLowerCase(),
          branding: {
            logo: '/EEO-logo.png',
            logoAlt: formData.name,
            favicon: '/favicon.ico',
            primaryColor: formData.primaryColor,
            secondaryColor: formData.secondaryColor,
            accentColor: '#F4A261',
            fontFamily: 'Inter',
            borderRadius: '8px',
          },
          seo: {
            defaultTitle: `${formData.name} - Tours & Excursions`,
            titleSuffix: formData.name,
            defaultDescription: `Discover amazing tours and experiences with ${formData.name}.`,
            defaultKeywords: ['tours', 'excursions', formData.tenantId],
            ogImage: '/hero1.jpg',
          },
          contact: {
            email: `info@${formData.domain}`,
            phone: '+20 100 000 0000',
          },
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Brand created successfully!');
        onSuccess();
      } else {
        toast.error(data.error || 'Failed to create brand');
      }
    } catch (error) {
      console.error('Error creating tenant:', error);
      toast.error('Failed to create brand');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-label="Create new brand"
      onMouseDown={(e) => {
        // close on clicking backdrop (but not when clicking inside the modal)
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-white/20">
        <div className="p-6 border-b bg-gradient-to-r from-slate-50 to-indigo-50">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Create New Brand</h2>
              <p className="text-sm text-gray-600 mt-1">Add a new website brand to your platform</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl p-2 text-slate-500 hover:bg-white/70 hover:text-slate-900 transition-colors"
              aria-label="Close"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Brand ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              ref={firstFieldRef}
              value={formData.tenantId}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                tenantId: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') 
              }))}
              placeholder="e.g., hurghada, cairo, luxor"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Lowercase letters, numbers, and hyphens only</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Brand Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Hurghada Tours & Excursions"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Domain <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.domain}
              onChange={(e) => setFormData(prev => ({ ...prev, domain: e.target.value.toLowerCase() }))}
              placeholder="e.g., hurghadatours.com"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Primary Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.primaryColor}
                  onChange={(e) => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
                  className="w-10 h-10 rounded cursor-pointer border-0"
                />
                <input
                  type="text"
                  value={formData.primaryColor}
                  onChange={(e) => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Secondary Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.secondaryColor}
                  onChange={(e) => setFormData(prev => ({ ...prev, secondaryColor: e.target.value }))}
                  className="w-10 h-10 rounded cursor-pointer border-0"
                />
                <input
                  type="text"
                  value={formData.secondaryColor}
                  onChange={(e) => setFormData(prev => ({ ...prev, secondaryColor: e.target.value }))}
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15"
                />
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Brand'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

