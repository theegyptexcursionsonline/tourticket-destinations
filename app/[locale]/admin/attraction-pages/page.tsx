'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from '@/i18n/navigation';
import { Plus, Edit, Trash2, Eye, Search } from 'lucide-react';
import { AttractionPage } from '@/types';
import withAuth from '@/components/admin/withAuth';
import { useAdminTenant } from '@/contexts/AdminTenantContext';

function AttractionPagesAdmin() {
  const [pages, setPages] = useState<AttractionPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'attraction' | 'category'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'draft'>('all');
  const { selectedTenantId } = useAdminTenant();

  const fetchPages = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedTenantId && selectedTenantId !== 'all') {
        params.set('tenantId', selectedTenantId);
      }
      const response = await fetch(`/api/admin/attraction-pages?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        setPages(data.data);
      } else {
        setError(data.error || 'Failed to fetch pages');
      }
    } catch (err) {
      setError('Network error');
      console.error('Error fetching pages:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedTenantId]);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  const deletePage = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/attraction-pages/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        setPages(pages.filter(page => page._id !== id));
        alert('Page deleted successfully');
      } else {
        alert(data.error || 'Failed to delete page');
      }
    } catch (err) {
      alert('Network error');
      console.error('Error deleting page:', err);
    }
  };

  const filteredPages = pages.filter(page => {
    const matchesSearch = page.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         page.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || page.pageType === filterType;
    
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'published' && page.isPublished) ||
                         (filterStatus === 'draft' && !page.isPublished);
    
    return matchesSearch && matchesType && matchesStatus;
  });

  if (loading) {
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
          <h1 className="text-2xl font-bold text-gray-900">Attraction Pages</h1>
          <Link
            href="/admin/attraction-pages/create"
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create New Page
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute start-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search pages..."
              className="w-full ps-10 pe-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
          >
            <option value="all">All Types</option>
            <option value="attraction">Attraction</option>
            <option value="category">Category</option>
          </select>
          
          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
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
                <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Page
                </th>
                <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-end text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPages.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    {searchTerm || filterType !== 'all' || filterStatus !== 'all' 
                      ? 'No pages match your filters' 
                      : 'No pages found'}
                  </td>
                </tr>
              ) : (
                filteredPages.map((page) => (
                  <tr key={page._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <img
                          className="h-12 w-12 rounded-lg object-cover"
                          src={page.heroImage}
                          alt={page.title}
                        />
                        <div className="ms-4">
                          <div className="text-sm font-medium text-gray-900">
                            {page.title}
                          </div>
                          <div className="text-sm text-gray-500 truncate max-w-md">
                            {page.description}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        page.pageType === 'attraction' 
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {page.pageType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        page.isPublished 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {page.isPublished ? 'Published' : 'Draft'}
                      </span>
                      {page.featured && (
                        <span className="ms-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                          Featured
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {page.createdAt ? new Date(page.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-end text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/${page.pageType === 'attraction' ? 'attraction' : 'category'}/${page.slug}`}
                          target="_blank"
                          className="text-gray-600 hover:text-gray-900 p-1 rounded"
                          title="View Page"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/admin/attraction-pages/${page._id}/edit`}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded"
                          title="Edit Page"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => deletePage(page._id, page.title)}
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
      </div>

      {/* Stats */}
      {pages.length > 0 && (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <div className="text-2xl font-bold text-gray-900">{pages.length}</div>
            <div className="text-sm text-gray-500">Total Pages</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <div className="text-2xl font-bold text-green-600">
              {pages.filter(p => p.isPublished).length}
            </div>
            <div className="text-sm text-gray-500">Published</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <div className="text-2xl font-bold text-blue-600">
              {pages.filter(p => p.pageType === 'attraction').length}
            </div>
            <div className="text-sm text-gray-500">Attractions</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <div className="text-2xl font-bold text-purple-600">
              {pages.filter(p => p.pageType === 'category').length}
            </div>
            <div className="text-sm text-gray-500">Categories</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default withAuth(AttractionPagesAdmin, { permissions: ['manageContent'] });