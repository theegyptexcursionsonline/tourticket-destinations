'use client';

import { useState, useEffect, useCallback } from 'react';
import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { Edit, Plus, Tag, Trash2, Loader2, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import withAuth from '@/components/admin/withAuth';
import { useAdminTenant } from '@/contexts/AdminTenantContext';

interface ICategory {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  heroImage?: string;
  isPublished?: boolean;
  featured?: boolean;
  order?: number;
}

function CategoriesPage() {
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { selectedTenantId } = useAdminTenant();

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedTenantId && selectedTenantId !== 'all') {
        params.set('tenantId', selectedTenantId);
      }
      const response = await fetch(`/api/categories?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        setCategories(data.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, [selectedTenantId]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingId(id);
    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Category deleted successfully');
        setCategories(categories.filter(cat => cat._id !== id));
      } else {
        toast.error(data.error || 'Failed to delete category');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category');
    } finally {
      setDeletingId(null);
    }
  };

  // Filter categories based on search query
  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cat.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cat.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-start justify-between gap-6 mb-8">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">Categories</h2>
            <p className="mt-2 text-sm text-slate-500">
              Organize tours into categories with rich content and images.
            </p>
          </div>
          <Link
            href="/admin/categories/create"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
          >
            <Plus className="h-5 w-5" />
            Add Category
          </Link>
        </div>

        {/* Search Box */}
        <div className="mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search categories by name, slug, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full ps-10 pe-3 py-3 border border-slate-300 rounded-xl leading-5 bg-white placeholder-slate-400 focus:outline-none focus:placeholder-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
            />
            {searchQuery && (
              <div className="absolute inset-y-0 end-0 pe-3 flex items-center">
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                  title="Clear search"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>
          {searchQuery && (
            <p className="mt-2 text-sm text-slate-600">
              Showing {filteredCategories.length} of {categories.length} {categories.length === 1 ? 'category' : 'categories'}
            </p>
          )}
        </div>

        <div className="bg-white shadow-md rounded-2xl overflow-hidden border border-slate-200/60">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-start text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-start text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Slug
                  </th>
                  <th className="px-6 py-3 text-start text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-start text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Order
                  </th>
                  <th className="px-6 py-3 text-end text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredCategories.length > 0 ? (
                  filteredCategories.map(cat => (
                    <tr key={cat._id} className="hover:bg-slate-50 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {cat.heroImage ? (
                            <div className="relative h-12 w-12 rounded-lg overflow-hidden me-3">
                              <Image
                                src={cat.heroImage}
                                alt={cat.name}
                                fill
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="h-12 w-12 rounded-lg bg-slate-100 flex items-center justify-center me-3">
                              <Tag className="h-6 w-6 text-slate-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-lg text-slate-800">{cat.name}</p>
                            {cat.description && (
                              <p className="text-sm text-slate-500 line-clamp-1 max-w-md">{cat.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm text-slate-500 font-mono">/{cat.slug}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            cat.isPublished !== false
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {cat.isPublished !== false ? 'Published' : 'Draft'}
                          </span>
                          {cat.featured && (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                              Featured
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-slate-600 font-medium">
                          {cat.order || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-end">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/categories/${cat._id}/edit`}
                            className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Category"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleDelete(cat._id, cat.name)}
                            disabled={deletingId === cat._id}
                            className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Delete Category"
                          >
                            {deletingId === cat._id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      {searchQuery ? (
                        <div>
                          <p className="text-lg font-medium text-slate-600 mb-1">No categories found</p>
                          <p className="text-sm">Try adjusting your search terms or{' '}
                            <button
                              onClick={() => setSearchQuery('')}
                              className="text-indigo-600 hover:text-indigo-800 font-medium underline"
                            >
                              clear the search
                            </button>
                          </p>
                        </div>
                      ) : (
                        "No categories found. Click 'Add Category' to create one."
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default withAuth(CategoriesPage, { permissions: ['manageContent'] });