'use client';

// Unified "Pages" admin — attraction pages, category landings, and categories
// managed from one place. Server-side search/filter/cursor pagination via
// /api/admin/pages so the list stays correct at any size.

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Plus, Edit, Trash2, Eye, Search, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useAdminTenant } from '@/contexts/AdminTenantContext';
import { storefrontPreviewUrl } from '@/lib/admin/storefrontPreviewUrl';
import { fetchJsonWithRetry } from '@/lib/admin/fetchJsonWithRetry';

type PageKind = 'attraction' | 'category-landing' | 'category';

interface UnifiedRow {
  id: string;
  tenantId: string;
  kind: PageKind;
  title: string;
  slug: string;
  description?: string;
  image?: string;
  urlType: string;
  publicPath: string;
  editHref: string;
  isPublished: boolean;
  featured: boolean;
  createdAt: string;
}

interface Counts {
  attraction: number;
  'category-landing': number;
  category: number;
  total: number;
}

interface PagesResponse {
  success: boolean;
  data?: UnifiedRow[];
  nextCursor?: string | null;
  counts?: Counts;
  error?: string;
}

const KIND_LABELS: Record<PageKind, string> = {
  attraction: 'Attraction',
  'category-landing': 'Category',
  category: 'Catalogue',
};

const KIND_BADGES: Record<PageKind, string> = {
  attraction: 'bg-blue-100 text-blue-800',
  'category-landing': 'bg-purple-100 text-purple-800',
  category: 'bg-green-100 text-green-800',
};

export default function UnifiedPagesAdmin() {
  const { selectedTenantId, getSelectedTenant, tenants } = useAdminTenant();
  const [rows, setRows] = useState<UnifiedRow[]>([]);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKind, setFilterKind] = useState<'all' | PageKind>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'draft'>('all');
  const requestSeq = useRef(0);
  const activeRequest = useRef<AbortController | null>(null);

  const getAuthHeaders = useCallback((): HeadersInit => ({
    'Content-Type': 'application/json',
  }), []);

  const buildQuery = useCallback((cursor?: string | null) => {
    const params = new URLSearchParams({ limit: '20' });
    params.set('tenantId', selectedTenantId || 'all');
    if (searchTerm.trim()) params.set('q', searchTerm.trim());
    if (filterKind !== 'all') params.set('kind', filterKind);
    if (filterStatus !== 'all') params.set('status', filterStatus);
    if (cursor) params.set('cursor', cursor);
    return params.toString();
  }, [searchTerm, filterKind, filterStatus, selectedTenantId]);

  const fetchPage = useCallback(async (cursor: string | null, append: boolean) => {
    const seq = ++requestSeq.current;
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    if (!append) setLoading(true);
    else setLoadingMore(true);
    try {
      const { response, data } = await fetchJsonWithRetry<PagesResponse>(`/api/admin/pages?${buildQuery(cursor)}`, {
        headers: getAuthHeaders(),
        signal: controller.signal,
      });
      if (seq !== requestSeq.current) return; // stale response
      if (!response.ok || !data.success) {
        setError(data.error || `Failed to fetch pages (${response.status})`);
        return;
      }
      setError(null);
      const nextRows = data.data || [];
      setRows((prev) => (append ? [...prev, ...nextRows] : nextRows));
      setNextCursor(data.nextCursor || null);
      setCounts(data.counts || null);
    } catch (err) {
      if (controller.signal.aborted) return;
      if (seq === requestSeq.current) setError('Network error');
      console.error('Error fetching pages:', err);
    } finally {
      if (seq === requestSeq.current) {
        setLoading(false);
        setLoadingMore(false);
      }
      if (activeRequest.current === controller) activeRequest.current = null;
    }
  }, [buildQuery, getAuthHeaders]);

  // Debounced reload on search/filter change
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchPage(null, false);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [fetchPage]);

  const deleteRow = async (row: UnifiedRow) => {
    const label = KIND_LABELS[row.kind];
    if (!window.confirm(`Are you sure you want to delete the ${label.toLowerCase()} "${row.title}"?`)) {
      return;
    }

    const endpoint = row.kind === 'category'
      ? `/api/categories/${row.id}?tenantId=${encodeURIComponent(row.tenantId)}`
      : `/api/admin/attraction-pages/${row.id}?tenantId=${encodeURIComponent(row.tenantId)}`;

    try {
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        alert(data.error || data.message || `Failed to delete (${response.status})`);
        return;
      }
      setRows((prev) => prev.filter((entry) => entry.id !== row.id));
      setCounts((prev) => prev
        ? { ...prev, [row.kind]: Math.max(0, prev[row.kind] - 1), total: Math.max(0, prev.total - 1) }
        : prev);
    } catch (err) {
      alert('Network error');
      console.error('Error deleting page:', err);
    }
  };

  if (loading && rows.length === 0 && !error) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pages</h1>
            <p className="text-sm text-gray-500 mt-1">
              Attraction pages, category landings, and categories — all in one place
            </p>
            <p className="text-xs font-medium text-indigo-600 mt-1">
              {getSelectedTenant()?.name || 'All Brands'}
            </p>
          </div>
          <Link
            href="/admin/pages/create"
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create New Page
          </Link>
        </div>

        {/* Filters (server-side, span the whole dataset) */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search pages..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            value={filterKind}
            onChange={(e) => setFilterKind(e.target.value as typeof filterKind)}
          >
            <option value="all">All Types</option>
            <option value="attraction">Attraction</option>
            <option value="category-landing">Category</option>
            <option value="category">Catalogue</option>
          </select>

          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
          >
            <option value="all">All Status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Pages Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Page</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">URL</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    {searchTerm || filterKind !== 'all' || filterStatus !== 'all'
                      ? 'No pages match your filters'
                      : 'No pages found'}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={`${row.tenantId}-${row.kind}-${row.id}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {row.image ? (
                          <Image
                            className="h-12 w-12 rounded-lg object-cover"
                            src={row.image}
                            alt={row.title}
                            width={48}
                            height={48}
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-lg bg-gray-100" />
                        )}
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{row.title}</div>
                          <div className="text-sm text-gray-500 truncate max-w-md">{row.description}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${KIND_BADGES[row.kind]}`}>
                        {KIND_LABELS[row.kind]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-xs font-mono text-gray-500">{row.publicPath}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        row.isPublished ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {row.isPublished ? 'Published' : 'Draft'}
                      </span>
                      {row.featured && (
                        <span className="ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                          Featured
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {row.createdAt ? new Date(row.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={storefrontPreviewUrl(row.publicPath, {
                            tenantDomain: tenants.find((tenant) => tenant.tenantId === row.tenantId)?.domain,
                            configuredBaseUrl: process.env.NEXT_PUBLIC_BASE_URL,
                            adminOrigin: typeof window !== 'undefined' ? window.location.origin : null,
                          })}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-600 hover:text-gray-900 p-1 rounded"
                          title="View Page"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          href={row.editHref}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded"
                          title="Edit Page"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => deleteRow(row)}
                          className="text-red-600 hover:text-red-900 p-1 rounded"
                          title="Delete Page"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {nextCursor && (
          <div className="px-6 py-4 border-t border-gray-200 text-center">
            <button
              onClick={() => void fetchPage(nextCursor, true)}
              disabled={loadingMore}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
              Load more
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
      {counts && (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <div className="text-2xl font-bold text-gray-900">{counts.total}</div>
            <div className="text-sm text-gray-500">Total Pages</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <div className="text-2xl font-bold text-blue-600">{counts.attraction}</div>
            <div className="text-sm text-gray-500">Attractions</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <div className="text-2xl font-bold text-purple-600">{counts['category-landing']}</div>
            <div className="text-sm text-gray-500">Categories</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <div className="text-2xl font-bold text-green-600">{counts.category}</div>
            <div className="text-sm text-gray-500">Catalogues</div>
          </div>
        </div>
      )}
    </div>
  );
}
