'use client';

import { useState, useEffect, FormEvent, useCallback } from 'react';
import withAuth from '@/components/admin/withAuth';
import { useAdminTenant } from '@/contexts/AdminTenantContext';
import { 
  Tag, 
  Plus, 
  ToggleLeft, 
  ToggleRight, 
  Trash2, 
  Percent, 
  DollarSign,
  Loader2,
  Activity,
  Eye,
  EyeOff,
  Sparkles,
  AlertCircle,
  Check,
  Users,
  Calendar,
  TrendingUp,
  Zap
} from 'lucide-react';

// --- Type Definitions ---
interface IDiscount {
  _id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  value: number;
  isActive: boolean;
  expiresAt?: string;
  usageLimit?: number;
  timesUsed: number;
  tenantId?: string;
}

const DiscountsPage = () => {
  const [discounts, setDiscounts] = useState<IDiscount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // --- Form State ---
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [value, setValue] = useState<number | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // --- Tenant filtering ---
  const { selectedTenantId, getSelectedTenant, isAllTenantsSelected } = useAdminTenant();
  const selectedTenant = getSelectedTenant();

  // --- Fetch Discounts ---
  const fetchDiscounts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Build query params with tenant filter
      const params = new URLSearchParams();
      if (selectedTenantId && selectedTenantId !== 'all') {
        params.set('tenantId', selectedTenantId);
      }
      const queryString = params.toString();
      const url = `/api/admin/discounts${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch discounts');
      if (data.success) {
        setDiscounts(data.data);
      } else {
        throw new Error(data.error || 'API returned an error');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [selectedTenantId]);

  // Fetch discounts when tenant changes
  useEffect(() => {
    fetchDiscounts();
  }, [fetchDiscounts]);

  // --- Form Submission ---
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!code || value === '') {
        setFormError('Please fill out all fields.');
        return;
    }
    
    // Require a specific brand to be selected for creating discounts
    if (isAllTenantsSelected()) {
      setFormError('Please select a specific brand to create a discount code.');
      return;
    }
    
    setIsSubmitting(true);
    setFormError(null);

    try {
      const response = await fetch('/api/admin/discounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.toUpperCase(),
          discountType,
          value,
          isActive: true,
          tenantId: selectedTenantId, // Include tenant ID
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create discount');

      if (data.success) {
        setDiscounts([data.data, ...discounts]);
        setCode('');
        setDiscountType('percentage');
        setValue('');
      } else {
         throw new Error(data.error || 'API returned an error');
      }
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Toggle Active Status ---
  const handleToggle = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/discounts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update status');
      
      if (data.success) {
        setDiscounts(discounts.map(d => d._id === id ? data.data : d));
      } else {
        throw new Error(data.error || 'API returned an error');
      }
    } catch (err) {
      alert(`Error: ${(err as Error).message}`);
    }
  };

  // --- Delete Discount ---
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this discount code? This action cannot be undone.')) return;
    try {
      const response = await fetch(`/api/admin/discounts/${id}`, {
        method: 'DELETE',
      });
       const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete discount');
      
      if(data.success) {
        setDiscounts(discounts.filter(d => d._id !== id));
      } else {
        throw new Error(data.error || 'API returned an error');
      }
    } catch (err) {
      alert(`Error: ${(err as Error).message}`);
    }
  };

  // Calculate stats
  const activeDiscounts = discounts.filter(d => d.isActive).length;
  const totalUsage = discounts.reduce((sum, d) => sum + d.timesUsed, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Enhanced Header */}
        <div className="bg-gradient-to-br from-white to-slate-50 backdrop-blur-sm border border-slate-200/60 rounded-2xl shadow-xl shadow-slate-200/40 p-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                <Tag className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  Discount Codes
                </h1>
                <p className="text-slate-500 mt-1">
                  {isAllTenantsSelected() ? (
                    <>Showing discount codes from <span className="font-semibold text-slate-700">all brands</span>. Select a brand to filter.</>
                  ) : (
                    <>Showing discount codes for <span className="font-semibold text-indigo-600">{selectedTenant?.name || selectedTenantId}</span></>
                  )}
                </p>
              </div>
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-2 bg-slate-100 rounded-xl p-1">
              <button
                onClick={() => setViewMode('cards')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  viewMode === 'cards' 
                    ? 'bg-white text-indigo-600 shadow-sm border border-indigo-200/60' 
                    : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200/60'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                Cards
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  viewMode === 'table' 
                    ? 'bg-white text-indigo-600 shadow-sm border border-indigo-200/60' 
                    : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200/60'
                }`}
              >
                <Activity className="w-4 h-4" />
                Table
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-8 pt-8 border-t border-slate-200/60">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-xl">
                  <Check className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">{activeDiscounts}</div>
                  <div className="text-sm text-slate-500">Active Codes</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-xl">
                  <Tag className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">{discounts.length}</div>
                  <div className="text-sm text-slate-500">Total Codes</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-xl">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">{totalUsage}</div>
                  <div className="text-sm text-slate-500">Total Uses</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Create Form */}
        <div className="bg-gradient-to-br from-white to-slate-50 backdrop-blur-sm border border-slate-200/60 rounded-2xl shadow-xl shadow-slate-200/40 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
              <Plus className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                Create New Discount
              </h2>
              <p className="text-slate-500 text-sm">Add a new promotional discount code</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Code Input */}
              <div className="lg:col-span-2 space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Tag className="h-4 w-4 text-indigo-500" />
                  Discount Code
                </label>
                <input 
                  type="text" 
                  placeholder="SUMMER20, SAVE15, etc." 
                  value={code} 
                  onChange={e => setCode(e.target.value.toUpperCase())} 
                  required 
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 font-medium text-slate-700 uppercase"
                />
              </div>

              {/* Value Input */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  {discountType === 'percentage' ? <Percent className="h-4 w-4 text-indigo-500" /> : <DollarSign className="h-4 w-4 text-indigo-500" />}
                  Value
                </label>
                <div className="relative">
                  <input 
                    type="number" 
                    placeholder={discountType === 'percentage' ? '20' : '5.00'} 
                    value={value} 
                    onChange={e => setValue(e.target.value === '' ? '' : Number(e.target.value))} 
                    required 
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 font-medium text-slate-700"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">
                    {discountType === 'percentage' ? '%' : '$'}
                  </div>
                </div>
              </div>

              {/* Type Select */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Zap className="h-4 w-4 text-indigo-500" />
                  Type
                </label>
                <div className="relative">
                  <select 
                    value={discountType} 
                    onChange={e => setDiscountType(e.target.value as 'percentage' | 'fixed')} 
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 appearance-none cursor-pointer font-medium text-slate-700 bg-white"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount ($)</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                    <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-200/60">
              {formError && (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{formError}</span>
                </div>
              )}
              
              <button 
                type="submit" 
                disabled={isSubmitting || !code || value === ''} 
                className="ml-auto inline-flex items-center gap-3 px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-5 w-5" />
                    <span>Create Discount</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Content Area */}
        <div className="bg-gradient-to-br from-white to-slate-50 backdrop-blur-sm border border-slate-200/60 rounded-2xl shadow-xl shadow-slate-200/40 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center space-y-4">
                <Loader2 className="h-8 w-8 text-indigo-500 animate-spin mx-auto" />
                <p className="text-slate-600 font-medium">Loading discount codes...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                  <AlertCircle className="h-8 w-8 text-red-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">Error Loading Discounts</h3>
                  <p className="text-red-600">{error}</p>
                </div>
              </div>
            </div>
          ) : discounts.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center">
                <Tag className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-700 mb-3">No discount codes yet</h3>
              <p className="text-slate-500 max-w-md mx-auto">
                Create your first discount code to start offering promotional deals to your customers.
              </p>
            </div>
          ) : viewMode === 'cards' ? (
            // Cards View
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {discounts.map((discount, index) => (
                  <div 
                    key={discount._id}
                    className="group bg-white border border-slate-200/60 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
                  >
                    {/* Card Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`flex items-center justify-center w-10 h-10 rounded-xl shadow-sm ${
                          discount.discountType === 'percentage' 
                            ? 'bg-gradient-to-br from-blue-500 to-indigo-600' 
                            : 'bg-gradient-to-br from-green-500 to-emerald-600'
                        }`}>
                          {discount.discountType === 'percentage' ? (
                            <Percent className="h-5 w-5 text-white" />
                          ) : (
                            <DollarSign className="h-5 w-5 text-white" />
                          )}
                        </div>
                        <div>
                          <div className="text-lg font-bold text-slate-900 font-mono">
                            {discount.code}
                          </div>
                          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                            discount.isActive 
                              ? 'bg-green-100 text-green-700 border border-green-200' 
                              : 'bg-gray-100 text-gray-700 border border-gray-200'
                          }`}>
                            {discount.isActive ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                            {discount.isActive ? 'Active' : 'Inactive'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Discount Value */}
                    <div className="text-center py-4 bg-gradient-to-r from-slate-50 to-indigo-50 rounded-xl mb-4">
                      <div className="text-3xl font-bold text-slate-900">
                        {discount.discountType === 'percentage' ? `${discount.value}%` : `$${discount.value}`}
                      </div>
                      <div className="text-sm text-slate-500 mt-1">
                        {discount.discountType === 'percentage' ? 'Percentage Off' : 'Fixed Discount'}
                      </div>
                    </div>

                    {/* Usage Stats */}
                    <div className="flex items-center justify-between text-sm text-slate-600 mb-6">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>Used {discount.timesUsed} times</span>
                      </div>
                      {discount.usageLimit && (
                        <div className="text-slate-500">
                          / {discount.usageLimit} max
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <button 
                        onClick={() => handleToggle(discount._id, discount.isActive)} 
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                          discount.isActive 
                            ? 'text-green-700 bg-green-50 hover:bg-green-100' 
                            : 'text-slate-600 bg-slate-50 hover:bg-slate-100'
                        }`}
                      >
                        {discount.isActive ? (
                          <ToggleRight className="h-5 w-5" />
                        ) : (
                          <ToggleLeft className="h-5 w-5" />
                        )}
                        <span className="text-sm">{discount.isActive ? 'Active' : 'Activate'}</span>
                      </button>
                      
                      <button 
                        onClick={() => handleDelete(discount._id)} 
                        className="flex items-center justify-center w-10 h-10 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all duration-200"
                        title="Delete discount"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // Table View
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-slate-100 to-slate-50 border-b border-slate-200/60">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Code</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Value</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">Usage</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {discounts.map((discount, index) => (
                    <tr 
                      key={discount._id}
                      className={`group hover:bg-gradient-to-r hover:from-indigo-50/30 hover:to-purple-50/30 transition-all duration-200 ${
                        index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 font-mono text-lg">
                          {discount.code}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${
                            discount.discountType === 'percentage' 
                              ? 'bg-blue-100 text-blue-600' 
                              : 'bg-green-100 text-green-600'
                          }`}>
                            {discount.discountType === 'percentage' ? (
                              <Percent className="h-4 w-4" />
                            ) : (
                              <DollarSign className="h-4 w-4" />
                            )}
                          </div>
                          <span className="text-lg font-bold text-slate-900">
                            {discount.value}{discount.discountType === 'percentage' ? '%' : ''}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
                          discount.isActive 
                            ? 'bg-green-100 text-green-700 border border-green-200' 
                            : 'bg-gray-100 text-gray-700 border border-gray-200'
                        }`}>
                          {discount.isActive ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                          {discount.isActive ? 'Active' : 'Inactive'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="text-sm font-semibold text-slate-900">
                          {discount.timesUsed} {discount.usageLimit ? `/ ${discount.usageLimit}` : '/ ∞'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleToggle(discount._id, discount.isActive)} 
                            className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 ${
                              discount.isActive 
                                ? 'text-green-600 hover:bg-green-50' 
                                : 'text-slate-500 hover:bg-slate-100'
                            }`}
                            title={discount.isActive ? 'Deactivate' : 'Activate'}
                          >
                            {discount.isActive ? (
                              <ToggleRight className="h-6 w-6" />
                            ) : (
                              <ToggleLeft className="h-6 w-6" />
                            )}
                          </button>
                          <button 
                            onClick={() => handleDelete(discount._id)} 
                            className="flex items-center justify-center w-10 h-10 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all duration-200"
                            title="Delete"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default withAuth(DiscountsPage, { permissions: ['manageDiscounts'] });