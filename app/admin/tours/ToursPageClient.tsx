'use client';

// app/admin/tours/ToursPageClient.tsx
// Client component that fetches tours based on selected tenant

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Plus, RefreshCw, AlertCircle } from 'lucide-react';
import { ToursListClient } from './ToursListClient';
import { useAdminTenant } from '@/contexts/AdminTenantContext';
import withAuth from '@/components/admin/withAuth';

type TourType = {
  _id: string;
  title?: string;
  name?: string;
  image?: string;
  images?: string[];
  destination?: { name?: string } | null;
  category?: { name?: string } | null;
  price?: number;
  discountPrice?: number;
  duration?: string | number;
  createdAt?: string;
  published?: boolean;
  draft?: boolean;
  isFeatured?: boolean;
  tenantId?: string;
};

function ToursPageClientComponent() {
  const { selectedTenantId, getSelectedTenant, isAllTenantsSelected } = useAdminTenant();
  const [tours, setTours] = useState<TourType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedTenant = getSelectedTenant();

  // Fetch tours based on selected tenant
  const fetchTours = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (selectedTenantId && selectedTenantId !== 'all') {
        params.set('tenantId', selectedTenantId);
      }

      const response = await fetch(`/api/admin/tours?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setTours(data.data || []);
      } else {
        setError(data.error || 'Failed to fetch tours');
        setTours([]);
      }
    } catch (err) {
      console.error('Error fetching tours:', err);
      setError('Failed to load tours. Please try again.');
      setTours([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedTenantId]);

  // Fetch tours when tenant changes
  useEffect(() => {
    fetchTours();
  }, [fetchTours]);

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Manage Tours
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {isAllTenantsSelected() ? (
              <>Showing tours from <span className="font-semibold text-slate-700">all brands</span>. Select a brand to filter.</>
            ) : (
              <>Showing tours for <span className="font-semibold text-indigo-600">{selectedTenant?.name || selectedTenantId}</span></>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchTours}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
            title="Refresh tours"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <Link
            href="/admin/tours/new"
            className="inline-flex items-center gap-2 bg-gradient-to-tr from-sky-600 to-indigo-600 text-white px-4 py-2 rounded-lg shadow hover:opacity-95 transition"
          >
            <Plus className="w-4 h-4" />
            Add New Tour
          </Link>
        </div>
      </div>

      {/* Tenant Info Banner */}
      {!isAllTenantsSelected() && selectedTenant && (
        <div className="mb-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: selectedTenant.branding?.primaryColor || '#4F46E5' }}
            >
              {selectedTenant.name.charAt(0)}
            </div>
            <div>
              <p className="font-semibold text-slate-900">{selectedTenant.name}</p>
              <p className="text-sm text-slate-500">{selectedTenant.domain}</p>
            </div>
            <div className="ml-auto text-sm text-slate-600">
              <span className="font-bold text-indigo-600">{tours.length}</span> tour{tours.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-red-700">{error}</p>
            <button
              onClick={fetchTours}
              className="ml-auto px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="space-y-6">
          {/* Loading skeleton for tabs */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 w-32 bg-slate-200 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
          
          {/* Loading skeleton for controls */}
          <div className="bg-white border border-slate-200 rounded-2xl p-8">
            <div className="flex gap-4 mb-6">
              <div className="h-12 flex-1 bg-slate-200 rounded-xl animate-pulse" />
              <div className="h-12 w-56 bg-slate-200 rounded-xl animate-pulse" />
            </div>
            <div className="h-8 w-48 bg-slate-200 rounded-lg animate-pulse" />
          </div>
          
          {/* Loading skeleton for cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="h-48 bg-slate-200 animate-pulse" />
                <div className="p-6 space-y-3">
                  <div className="h-6 bg-slate-200 rounded animate-pulse" />
                  <div className="h-4 w-2/3 bg-slate-200 rounded animate-pulse" />
                  <div className="h-4 w-1/2 bg-slate-200 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : tours.length === 0 ? (
        /* Empty State */
        <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl">
          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center">
            <Plus className="w-10 h-10 text-slate-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-700 mb-3">No tours found</h3>
          <p className="text-slate-500 max-w-md mx-auto mb-6">
            {isAllTenantsSelected() 
              ? 'No tours exist yet. Create your first tour to get started.'
              : `No tours found for ${selectedTenant?.name || 'this brand'}. Create a new tour or select a different brand.`
            }
          </p>
          <Link
            href="/admin/tours/new"
            className="inline-flex items-center gap-2 bg-gradient-to-tr from-sky-600 to-indigo-600 text-white px-6 py-3 rounded-xl shadow hover:opacity-95 transition"
          >
            <Plus className="w-5 h-5" />
            Create Your First Tour
          </Link>
        </div>
      ) : (
        /* Tours List */
        <ToursListClient tours={tours} />
      )}
    </div>
  );
}

export const ToursPageClient = withAuth(ToursPageClientComponent, { permissions: ['manageTours'] });
