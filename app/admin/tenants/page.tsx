'use client';

// app/admin/tenants/page.tsx
// Admin page for managing tenants (brands/websites)

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Globe, Settings, Trash2, Eye, EyeOff, Star, ExternalLink, Edit, Copy, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

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

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  
  // Fetch tenants
  const fetchTenants = useCallback(async () => {
    try {
      setIsLoading(true);
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
        toast.error('Failed to fetch tenants');
      }
    } catch (error) {
      console.error('Error fetching tenants:', error);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Brand Management</h1>
          <p className="text-gray-500 mt-1">Manage your multi-brand tourism websites</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Add New Brand</span>
        </button>
      </div>
      
      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search brands by name or domain..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'active', 'inactive'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === f
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Globe className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{tenants.length}</p>
              <p className="text-sm text-gray-500">Total Brands</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {tenants.filter(t => t.isActive).length}
              </p>
              <p className="text-sm text-gray-500">Active</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {tenants.filter(t => !t.isActive).length}
              </p>
              <p className="text-sm text-gray-500">Inactive</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
              <Star className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {tenants.find(t => t.isDefault)?.name.split(' ')[0] || 'None'}
              </p>
              <p className="text-sm text-gray-500">Default Brand</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Tenants Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl p-6 border border-gray-200 animate-pulse">
              <div className="h-12 bg-gray-200 rounded mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tenants.map((tenant) => (
            <div
              key={tenant._id}
              className={`bg-white rounded-xl border overflow-hidden transition-shadow hover:shadow-lg ${
                tenant.isDefault ? 'border-yellow-400 ring-2 ring-yellow-100' : 'border-gray-200'
              } ${!tenant.isActive ? 'opacity-60' : ''}`}
            >
              {/* Brand Header with Color */}
              <div 
                className="h-2"
                style={{ backgroundColor: tenant.branding?.primaryColor || '#E63946' }}
              />
              
              <div className="p-5">
                {/* Brand Info */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {tenant.branding?.logo ? (
                      <img 
                        src={tenant.branding.logo} 
                        alt={tenant.name}
                        className="w-12 h-12 object-contain rounded-lg border"
                      />
                    ) : (
                      <div 
                        className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                        style={{ backgroundColor: tenant.branding?.primaryColor || '#E63946' }}
                      >
                        {tenant.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        {tenant.name}
                        {tenant.isDefault && (
                          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                            Default
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-gray-500">{tenant.tenantId}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    tenant.isActive 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {tenant.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                
                {/* Domain */}
                <div className="flex items-center gap-2 mb-4 p-2 bg-gray-50 rounded-lg">
                  <Globe className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600 flex-1 truncate">{tenant.domain}</span>
                  <button
                    onClick={() => copyDomain(tenant.domain)}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                    title="Copy URL"
                  >
                    <Copy className="w-4 h-4 text-gray-400" />
                  </button>
                  <a
                    href={`https://${tenant.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                    title="Open website"
                  >
                    <ExternalLink className="w-4 h-4 text-gray-400" />
                  </a>
                </div>
                
                {/* Color Swatches */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs text-gray-500">Colors:</span>
                  <div 
                    className="w-6 h-6 rounded-full border-2 border-white shadow"
                    style={{ backgroundColor: tenant.branding?.primaryColor || '#E63946' }}
                    title="Primary"
                  />
                  <div 
                    className="w-6 h-6 rounded-full border-2 border-white shadow"
                    style={{ backgroundColor: tenant.branding?.secondaryColor || '#1D3557' }}
                    title="Secondary"
                  />
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-2 pt-4 border-t">
                  <Link
                    href={`/admin/tenants/${tenant.tenantId}`}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Edit</span>
                  </Link>
                  
                  <button
                    onClick={() => toggleTenantStatus(tenant.tenantId, tenant.isActive)}
                    className={`flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors text-sm ${
                      tenant.isActive
                        ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                    title={tenant.isActive ? 'Deactivate' : 'Activate'}
                  >
                    {tenant.isActive ? (
                      <>
                        <EyeOff className="w-4 h-4" />
                        <span>Hide</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4" />
                        <span>Show</span>
                      </>
                    )}
                  </button>
                  
                  {!tenant.isDefault && (
                    <button
                      onClick={() => setAsDefault(tenant.tenantId)}
                      className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                      title="Set as default"
                    >
                      <Star className="w-4 h-4" />
                    </button>
                  )}
                  
                  {!tenant.isDefault && (
                    <button
                      onClick={() => deleteTenant(tenant.tenantId, tenant.name)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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

// Create Tenant Modal Component
function CreateTenantModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    tenantId: '',
    name: '',
    domain: '',
    primaryColor: '#E63946',
    secondaryColor: '#1D3557',
  });
  
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Create New Brand</h2>
          <p className="text-sm text-gray-500 mt-1">Add a new website brand to your platform</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Brand ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.tenantId}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                tenantId: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') 
              }))}
              placeholder="e.g., hurghada, cairo, luxor"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
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
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Brand'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

