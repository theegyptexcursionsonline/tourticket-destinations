// app/admin/special-offers/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import withAuth from '@/components/admin/withAuth';
import { 
  Sparkles, Plus, Pencil, Trash2, X, Calendar, Tag, Users, 
  Percent, DollarSign, Clock, Star, Search, Filter, Loader2,
  CheckCircle, XCircle, Copy
} from 'lucide-react';
import { useAdminTenant } from '@/contexts/AdminTenantContext';
import toast from 'react-hot-toast';

interface SpecialOffer {
  _id: string;
  name: string;
  description?: string;
  type: 'percentage' | 'fixed' | 'bundle' | 'early_bird' | 'last_minute' | 'group';
  discountValue: number;
  code?: string;
  minBookingValue?: number;
  maxDiscount?: number;
  minGroupSize?: number;
  startDate: string;
  endDate: string;
  usageLimit?: number;
  usedCount: number;
  isActive: boolean;
  isFeatured: boolean;
  featuredBadgeText?: string;
  priority: number;
  tenantId: string;
  applicableTours: { _id: string; title: string }[];
  terms?: string[];
}

interface Tour {
  _id: string;
  title: string;
}

const offerTypeLabels: Record<string, string> = {
  percentage: 'Percentage Off',
  fixed: 'Fixed Amount',
  bundle: 'Bundle Deal',
  early_bird: 'Early Bird',
  last_minute: 'Last Minute',
  group: 'Group Discount',
};

const offerTypeIcons: Record<string, React.ReactNode> = {
  percentage: <Percent className="w-4 h-4" />,
  fixed: <DollarSign className="w-4 h-4" />,
  bundle: <Tag className="w-4 h-4" />,
  early_bird: <Clock className="w-4 h-4" />,
  last_minute: <Calendar className="w-4 h-4" />,
  group: <Users className="w-4 h-4" />,
};

const SpecialOffersPage = () => {
  const [offers, setOffers] = useState<SpecialOffer[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingOffer, setEditingOffer] = useState<SpecialOffer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const { selectedTenantId, getSelectedTenant, isAllTenantsSelected } = useAdminTenant();
  const selectedTenant = getSelectedTenant();

  // Fetch offers
  const fetchOffers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedTenantId && selectedTenantId !== 'all') {
        params.set('tenantId', selectedTenantId);
      }
      const response = await fetch(`/api/admin/special-offers?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        setOffers(data.data || []);
      }
    } catch (error) {
      toast.error('Failed to fetch offers');
    } finally {
      setIsLoading(false);
    }
  }, [selectedTenantId]);

  // Fetch tours for selection
  const fetchTours = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedTenantId && selectedTenantId !== 'all') {
        params.set('tenantId', selectedTenantId);
      }
      const response = await fetch(`/api/admin/tours?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        setTours(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch tours');
    }
  }, [selectedTenantId]);

  useEffect(() => {
    fetchOffers();
    fetchTours();
  }, [fetchOffers, fetchTours]);

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this offer?')) return;
    
    try {
      const response = await fetch(`/api/admin/special-offers?id=${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Offer deleted');
        fetchOffers();
      } else {
        toast.error(data.error || 'Failed to delete');
      }
    } catch (error) {
      toast.error('Failed to delete offer');
    }
  };

  // Toggle status
  const toggleStatus = async (offer: SpecialOffer) => {
    try {
      const response = await fetch('/api/admin/special-offers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _id: offer._id, isActive: !offer.isActive }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`Offer ${offer.isActive ? 'deactivated' : 'activated'}`);
        fetchOffers();
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  // Copy code to clipboard
  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied!');
  };

  // Filtered offers
  const filteredOffers = offers.filter(offer => {
    if (searchQuery && !offer.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !offer.code?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (filterType !== 'all' && offer.type !== filterType) return false;
    if (filterStatus === 'active' && !offer.isActive) return false;
    if (filterStatus === 'inactive' && offer.isActive) return false;
    return true;
  });

  // Check if offer is currently valid
  const isOfferValid = (offer: SpecialOffer) => {
    const now = new Date();
    const start = new Date(offer.startDate);
    const end = new Date(offer.endDate);
    return offer.isActive && now >= start && now <= end;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Special Offers</h1>
            <p className="text-sm text-slate-500">
              {isAllTenantsSelected() ? (
                'Manage promotional offers across all brands'
              ) : (
                <>Offers for <span className="font-medium text-amber-600">{selectedTenant?.name}</span></>
              )}
            </p>
          </div>
        </div>
        
        <button
          onClick={() => {
            setEditingOffer(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Offer
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search offers or codes..."
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>
        
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500"
        >
          <option value="all">All Types</option>
          <option value="percentage">Percentage Off</option>
          <option value="fixed">Fixed Amount</option>
          <option value="early_bird">Early Bird</option>
          <option value="last_minute">Last Minute</option>
          <option value="group">Group Discount</option>
          <option value="bundle">Bundle Deal</option>
        </select>
        
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Offers Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-slate-200 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredOffers.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 rounded-2xl border border-slate-200">
          <Sparkles className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-600">No offers found</h3>
          <p className="text-slate-500 mt-2">Create your first special offer to attract more bookings</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOffers.map((offer) => (
            <div
              key={offer._id}
              className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all hover:shadow-md ${
                isOfferValid(offer) ? 'border-emerald-200' : 'border-slate-200'
              }`}
            >
              {/* Header */}
              <div className={`px-4 py-3 ${
                isOfferValid(offer) 
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600' 
                  : offer.isActive 
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600'
                  : 'bg-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white">
                    {offerTypeIcons[offer.type]}
                    <span className="text-sm font-medium">
                      {offerTypeLabels[offer.type]}
                    </span>
                  </div>
                  {offer.isFeatured && (
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-white/20 rounded-full text-white text-xs">
                      <Star className="w-3 h-3" />
                      Featured
                    </div>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="text-lg font-bold text-slate-800 mb-1">{offer.name}</h3>
                {offer.description && (
                  <p className="text-sm text-slate-500 mb-3 line-clamp-2">{offer.description}</p>
                )}

                {/* Discount value */}
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-3xl font-bold text-amber-600">
                    {offer.type === 'fixed' ? '$' : ''}{offer.discountValue}
                    {offer.type === 'percentage' ? '%' : ''}
                  </span>
                  <span className="text-sm text-slate-500">
                    {offer.type === 'fixed' ? 'off' : 'discount'}
                  </span>
                </div>

                {/* Code */}
                {offer.code && (
                  <div 
                    className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg mb-3 cursor-pointer hover:bg-slate-200 transition-colors"
                    onClick={() => copyCode(offer.code!)}
                  >
                    <code className="font-mono font-bold text-slate-800">{offer.code}</code>
                    <Copy className="w-4 h-4 text-slate-400 ml-auto" />
                  </div>
                )}

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(offer.startDate).toLocaleDateString()} - {new Date(offer.endDate).toLocaleDateString()}
                  </span>
                </div>

                {offer.usageLimit && (
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-500">Usage</span>
                      <span className="font-medium text-slate-700">{offer.usedCount} / {offer.usageLimit}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-amber-500 rounded-full"
                        style={{ width: `${Math.min((offer.usedCount / offer.usageLimit) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => toggleStatus(offer)}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                      offer.isActive 
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700'
                    }`}
                  >
                    {offer.isActive ? (
                      <><XCircle className="w-4 h-4" /> Deactivate</>
                    ) : (
                      <><CheckCircle className="w-4 h-4" /> Activate</>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setEditingOffer(offer);
                      setShowModal(true);
                    }}
                    className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(offer._id)}
                    className="p-2 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <OfferModal
          offer={editingOffer}
          tours={tours}
          tenantId={selectedTenantId || 'default'}
          onClose={() => {
            setShowModal(false);
            setEditingOffer(null);
          }}
          onSave={() => {
            fetchOffers();
            setShowModal(false);
            setEditingOffer(null);
          }}
        />
      )}
    </div>
  );
};

// Offer Modal Component
function OfferModal({
  offer,
  tours,
  tenantId,
  onClose,
  onSave,
}: {
  offer: SpecialOffer | null;
  tours: Tour[];
  tenantId: string;
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState({
    name: offer?.name || '',
    description: offer?.description || '',
    type: offer?.type || 'percentage',
    discountValue: offer?.discountValue || 10,
    code: offer?.code || '',
    minBookingValue: offer?.minBookingValue || '',
    maxDiscount: offer?.maxDiscount || '',
    minGroupSize: offer?.minGroupSize || 2,
    startDate: offer?.startDate ? new Date(offer.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    endDate: offer?.endDate ? new Date(offer.endDate).toISOString().split('T')[0] : '',
    usageLimit: offer?.usageLimit || '',
    isActive: offer?.isActive !== false,
    isFeatured: offer?.isFeatured || false,
    featuredBadgeText: offer?.featuredBadgeText || 'Special Offer',
    priority: offer?.priority || 0,
    applicableTours: offer?.applicableTours?.map(t => t._id) || [],
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const payload = {
        ...formData,
        tenantId,
        minBookingValue: formData.minBookingValue ? Number(formData.minBookingValue) : undefined,
        maxDiscount: formData.maxDiscount ? Number(formData.maxDiscount) : undefined,
        usageLimit: formData.usageLimit ? Number(formData.usageLimit) : undefined,
        _id: offer?._id,
      };

      const response = await fetch('/api/admin/special-offers', {
        method: offer ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(offer ? 'Offer updated' : 'Offer created');
        onSave();
      } else {
        toast.error(data.error || 'Failed to save');
      }
    } catch (error) {
      toast.error('Failed to save offer');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">
            {offer ? 'Edit Offer' : 'Create Special Offer'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Offer Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                placeholder="e.g., Summer Sale 20% Off"
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                placeholder="Brief description of the offer..."
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Offer Type *</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as SpecialOffer['type'] })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              >
                <option value="percentage">Percentage Off</option>
                <option value="fixed">Fixed Amount</option>
                <option value="early_bird">Early Bird</option>
                <option value="last_minute">Last Minute</option>
                <option value="group">Group Discount</option>
                <option value="bundle">Bundle Deal</option>
              </select>
            </div>

            {/* Discount Value */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Discount {formData.type === 'fixed' ? 'Amount ($)' : 'Percentage (%)'} *
              </label>
              <input
                type="number"
                value={formData.discountValue}
                onChange={(e) => setFormData({ ...formData, discountValue: Number(e.target.value) })}
                required
                min="0"
                max={formData.type === 'percentage' ? 100 : undefined}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Code */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Promo Code</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 font-mono"
                placeholder="e.g., SUMMER20"
              />
            </div>

            {/* Min Booking Value */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Min. Booking Value ($)</label>
              <input
                type="number"
                value={formData.minBookingValue}
                onChange={(e) => setFormData({ ...formData, minBookingValue: e.target.value })}
                min="0"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                placeholder="No minimum"
              />
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start Date *</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">End Date *</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Usage Limit */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Usage Limit</label>
              <input
                type="number"
                value={formData.usageLimit}
                onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                min="0"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                placeholder="Unlimited"
              />
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
              <input
                type="number"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              />
              <p className="text-xs text-slate-500 mt-1">Higher priority offers are shown first</p>
            </div>

            {/* Applicable Tours */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Applicable Tours</label>
              <select
                multiple
                value={formData.applicableTours}
                onChange={(e) => setFormData({
                  ...formData,
                  applicableTours: Array.from(e.target.selectedOptions, option => option.value)
                })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 min-h-[100px]"
              >
                {tours.map(tour => (
                  <option key={tour._id} value={tour._id}>{tour.title}</option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">Leave empty to apply to all tours. Hold Ctrl/Cmd to select multiple.</p>
            </div>

            {/* Toggles */}
            <div className="md:col-span-2 flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                />
                <span className="text-sm font-medium text-slate-700">Active</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isFeatured}
                  onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                />
                <span className="text-sm font-medium text-slate-700">Featured</span>
              </label>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-colors disabled:opacity-50"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            {offer ? 'Update' : 'Create'} Offer
          </button>
        </div>
      </div>
    </div>
  );
}

export default withAuth(SpecialOffersPage, { permissions: ['manageDiscounts'] });

