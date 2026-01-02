// app/admin/bookings/page.tsx
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import withAuth from '@/components/admin/withAuth';
import { useRouter } from 'next/navigation';
import { Search, Calendar, Users, DollarSign, Filter, RefreshCw, Eye, Download, AlertTriangle, Loader2, Trash2, X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAdminTenant } from '@/contexts/AdminTenantContext';
import { BOOKING_STATUS, toBookingStatusCode } from '@/lib/constants/bookingStatus';

interface BookingUser {
  _id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email: string;
}

interface BookingTour {
  _id: string;
  title: string;
  image?: string;
  duration?: string;
  destination?: {
    _id?: string;
    name?: string;
    slug?: string;
  } | null;
}

interface Booking {
  _id: string;
  bookingReference?: string;
  source?: 'online' | 'manual';
  paymentStatus?: 'paid' | 'pending' | 'pay_on_arrival';
  tour: BookingTour | null;
  user: BookingUser | null;
  date: string;
  dateString?: string;
  time: string;
  guests: number;
  totalPrice: number;
  status: 'Confirmed' | 'Pending' | 'Completed' | 'Cancelled' | 'Refunded' | 'Partial Refunded' | string;
  adultGuests?: number;
  childGuests?: number;
  infantGuests?: number;
  paymentMethod?: string;
  specialRequests?: string;
  createdAt: string;
  updatedAt: string;
}

interface BookingsResponse {
  success: boolean;
  data: Booking[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface TourOption {
  id: string;
  title: string;
  tenantId?: string;
}

// Helper to format dates consistently and avoid timezone issues
const formatDisplayDate = (dateString: string | undefined, options?: Intl.DateTimeFormatOptions): string => {
  if (!dateString) return '';

  // Extract just the date part (YYYY-MM-DD) to avoid timezone issues
  const match = String(dateString).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, year, month, day] = match;
    const localDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return localDate.toLocaleDateString('en-US', options || {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }

  // Fallback
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', options || {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

const BookingsPage = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [totalBookings, setTotalBookings] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tourId, setTourId] = useState<string>('all');
  const [purchaseFrom, setPurchaseFrom] = useState<string>(''); // createdAt
  const [purchaseTo, setPurchaseTo] = useState<string>('');
  const [activityFrom, setActivityFrom] = useState<string>(''); // booking date
  const [activityTo, setActivityTo] = useState<string>('');
  const [sort, setSort] = useState<string>('createdAt_desc');

  // Pagination
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState<number>(10);

  // Product options (lightweight list)
  const [tourOptions, setTourOptions] = useState<TourOption[]>([]);
  const [tourOptionsLoading, setTourOptionsLoading] = useState(false);

  // Bulk selection state
  const [selectedBookings, setSelectedBookings] = useState<Set<string>>(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const router = useRouter();
  
  // Get tenant filter from context
  const { selectedTenantId, getSelectedTenant, isAllTenantsSelected } = useAdminTenant();
  const selectedTenant = getSelectedTenant();
  const tenantQuery = selectedTenantId && selectedTenantId !== 'all' ? `?tenantId=${encodeURIComponent(selectedTenantId)}` : '';

  const fetchTourOptions = useCallback(async () => {
    setTourOptionsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedTenantId && selectedTenantId !== 'all') params.set('tenantId', selectedTenantId);
      params.set('limit', '200');
      const url = `/api/admin/tours/options?${params.toString()}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data?.success) {
        setTourOptions(data.data || []);
      }
    } catch (e) {
      // Non-blocking
      console.warn('Failed to load tour options:', e);
    } finally {
      setTourOptionsLoading(false);
    }
  }, [selectedTenantId]);

  const buildBookingsUrl = useCallback((effectiveSearch: string) => {
    const params = new URLSearchParams();
    if (selectedTenantId && selectedTenantId !== 'all') params.set('tenantId', selectedTenantId);
    params.set('page', String(page));
    params.set('limit', String(perPage));
    if (effectiveSearch) params.set('search', effectiveSearch);
    if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
    if (tourId && tourId !== 'all') params.set('tourId', tourId);
    if (purchaseFrom) params.set('purchaseFrom', purchaseFrom);
    if (purchaseTo) params.set('purchaseTo', purchaseTo);
    if (activityFrom) params.set('activityFrom', activityFrom);
    if (activityTo) params.set('activityTo', activityTo);
    if (sort) params.set('sort', sort);
    return `/api/admin/bookings?${params.toString()}`;
  }, [activityFrom, activityTo, page, perPage, purchaseFrom, purchaseTo, selectedTenantId, sort, statusFilter, tourId]);

  const fetchBookings = useCallback(async (effectiveSearch: string) => {
    setLoading(true);
    setError(null);
    try {
      const url = buildBookingsUrl(effectiveSearch);
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch bookings');
      const data: BookingsResponse = await response.json();
      if (!data?.success) throw new Error('Failed to fetch bookings');

      setBookings(data.data || []);
      setTotalBookings(data.meta?.total || 0);
      setTotalPages(data.meta?.totalPages || 1);
    } catch (err) {
      setError((err as Error).message);
      console.error('Error fetching bookings:', err);
    } finally {
      setLoading(false);
    }
  }, [buildBookingsUrl]);

  // Load tour options when tenant changes
  useEffect(() => {
    fetchTourOptions();
  }, [fetchTourOptions]);

  // Debounced fetch when filters change
  useEffect(() => {
    const t = setTimeout(() => {
      fetchBookings(searchTerm.trim());
    }, 250);
    return () => clearTimeout(t);
  }, [fetchBookings, searchTerm, statusFilter, tourId, purchaseFrom, purchaseTo, activityFrom, activityTo, sort, page, perPage]);

  // Reset page + selection when filters (not page) change
  const filtersKey = useMemo(
    () => [selectedTenantId, statusFilter, tourId, purchaseFrom, purchaseTo, activityFrom, activityTo, sort, searchTerm.trim()].join('|'),
    [activityFrom, activityTo, purchaseFrom, purchaseTo, searchTerm, selectedTenantId, sort, statusFilter, tourId]
  );

  useEffect(() => {
    setPage(1);
    setSelectedBookings(new Set());
  }, [filtersKey]);

  // Clear bulk selection when changing pages
  useEffect(() => {
    setSelectedBookings(new Set());
  }, [page]);

  const handleRowClick = (id: string) => {
    router.push(`/admin/bookings/${id}`);
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 text-xs font-semibold rounded-full";
    const code = toBookingStatusCode(status) || BOOKING_STATUS.CONFIRMED;
    switch (code) {
      case BOOKING_STATUS.CONFIRMED:
        return `${baseClasses} bg-green-100 text-green-800`;
      case BOOKING_STATUS.PENDING:
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case BOOKING_STATUS.COMPLETED:
        return `${baseClasses} bg-emerald-100 text-emerald-800`;
      case BOOKING_STATUS.REFUNDED:
        return `${baseClasses} bg-orange-100 text-orange-800`;
      case BOOKING_STATUS.PARTIAL_REFUNDED:
        return `${baseClasses} bg-orange-50 text-orange-700`;
      case BOOKING_STATUS.CANCELLED:
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const formatUserName = (user: BookingUser | null | undefined) => {
    if (!user) return 'Deleted User';
    if (user?.name) return user.name;
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user?.firstName || user?.email || 'Unknown User';
  };

  const formatGuestBreakdown = (booking: Booking) => {
    const parts = [];
    if (booking.adultGuests) parts.push(`${booking.adultGuests}A`);
    if (booking.childGuests) parts.push(`${booking.childGuests}C`);
    if (booking.infantGuests) parts.push(`${booking.infantGuests}I`);
    
    if (parts.length > 0) {
      return `${booking.guests} (${parts.join(', ')})`;
    }
    return booking.guests.toString();
  };

  const getTourTitle = (booking: Booking): string => {
    if (!booking || !booking.tour) return 'Deleted Tour';
    return booking.tour?.title || 'Deleted Tour';
  };

  const getDestinationName = (booking: Booking): string | null => {
    if (!booking || !booking.tour) return null;
    if (!booking.tour.destination) return null;
    return booking.tour.destination?.name || null;
  };

  const StatusDropdown = ({ booking, onStatusChange }: { 
    booking: Booking; 
    onStatusChange: (bookingId: string, newStatus: string) => void; 
  }) => {
    const [isUpdating, setIsUpdating] = useState(false);
    
    const handleChange = async (newStatus: string) => {
      setIsUpdating(true);
      await onStatusChange(booking._id, newStatus);
      setIsUpdating(false);
    };

    return (
      <div className="relative">
        <select
          value={booking.status}
          onChange={(e) => handleChange(e.target.value)}
          disabled={isUpdating}
          className={`appearance-none text-xs font-semibold px-3 py-2 pr-8 rounded-full border-0 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
            (() => {
              const code = toBookingStatusCode(booking.status) || BOOKING_STATUS.CONFIRMED;
              if (code === BOOKING_STATUS.CONFIRMED) return 'bg-green-100 text-green-800';
              if (code === BOOKING_STATUS.PENDING) return 'bg-yellow-100 text-yellow-800';
              if (code === BOOKING_STATUS.COMPLETED) return 'bg-emerald-100 text-emerald-800';
              if (code === BOOKING_STATUS.REFUNDED) return 'bg-orange-100 text-orange-800';
              if (code === BOOKING_STATUS.PARTIAL_REFUNDED) return 'bg-orange-50 text-orange-700';
              if (code === BOOKING_STATUS.CANCELLED) return 'bg-red-100 text-red-800';
              return 'bg-gray-100 text-gray-800';
            })()
          }`}
        >
          <option value="Pending">Pending</option>
          <option value="Confirmed">Confirmed</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
          <option value="Refunded">Refunded</option>
          <option value="Partial Refunded">Partial Refunded</option>
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
          {isUpdating ? (
            <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
          ) : (
            <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>
      </div>
    );
  };

  const handleStatusChange = async (bookingId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}${tenantQuery}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update booking status');
      }

      setBookings(prevBookings =>
        prevBookings.map(booking =>
          booking._id === bookingId
            ? { ...booking, status: newStatus }
            : booking
        )
      );

      toast.success(`Booking status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating booking status:', error);
      toast.error('Failed to update booking status');
    }
  };

  // Selection handlers
  const handleSelectAll = () => {
    if (selectedBookings.size === bookings.length) {
      setSelectedBookings(new Set());
    } else {
      setSelectedBookings(new Set(bookings.map(b => b._id)));
    }
  };

  const handleSelectBooking = (bookingId: string) => {
    const newSelected = new Set(selectedBookings);
    if (newSelected.has(bookingId)) {
      newSelected.delete(bookingId);
    } else {
      newSelected.add(bookingId);
    }
    setSelectedBookings(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedBookings.size === 0) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/bookings/bulk-delete${tenantQuery}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bookingIds: Array.from(selectedBookings) }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete bookings');
      }

      const data = await response.json();

      // Remove deleted bookings from state
      setBookings(prevBookings =>
        prevBookings.filter(booking => !selectedBookings.has(booking._id))
      );
      setSelectedBookings(new Set());
      setShowDeleteModal(false);

      toast.success(`Successfully deleted ${data.deletedCount} booking(s)`);
    } catch (error) {
      console.error('Error deleting bookings:', error);
      toast.error((error as Error).message || 'Failed to delete bookings');
    } finally {
      setIsDeleting(false);
    }
  };

  const isAllSelected = bookings.length > 0 && selectedBookings.size === bookings.length;
  const isSomeSelected = selectedBookings.size > 0 && selectedBookings.size < bookings.length;

  const showingFrom = totalBookings === 0 ? 0 : (page - 1) * perPage + 1;
  const showingTo = Math.min(totalBookings, (page - 1) * perPage + bookings.length);

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-9 w-1/4 bg-gray-200 rounded animate-pulse mb-6"></div>
        <div className="bg-white p-6 rounded-full shadow-sm">
          <div className="space-y-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-full p-4">
          <h3 className="text-red-800 font-semibold">Error loading bookings</h3>
          <p className="text-red-600 mt-1">{error}</p>
          <button 
            onClick={() => fetchBookings(searchTerm.trim())}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Bookings Management</h1>
          <p className="text-slate-600 mt-1">
            {isAllTenantsSelected() ? (
              <>Showing bookings from <span className="font-semibold text-slate-700">all brands</span>. </>
            ) : (
              <>Showing bookings for <span className="font-semibold text-indigo-600">{selectedTenant?.name || selectedTenantId}</span>. </>
            )}
            Showing <span className="font-semibold text-slate-700">{showingFrom}-{showingTo}</span> of{' '}
            <span className="font-semibold text-slate-700">{totalBookings}</span> bookings
            {selectedBookings.size > 0 && (
              <span className="ml-2 text-blue-600 font-medium">
                ({selectedBookings.size} selected)
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3 mt-4 sm:mt-0">
          <button
            onClick={() => router.push('/admin/bookings/create')}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors"
          >
            <Plus size={16} />
            Create Booking
          </button>
          {selectedBookings.size > 0 && (
            <>
              <button
                onClick={() => setSelectedBookings(new Set())}
                className="flex items-center gap-2 px-4 py-2 text-slate-600 border border-slate-300 rounded-full hover:bg-slate-50 transition-colors"
              >
                <X size={16} />
                Clear Selection
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
              >
                <Trash2 size={16} />
                Delete Selected ({selectedBookings.size})
              </button>
            </>
          )}
          <button
            onClick={() => fetchBookings(searchTerm.trim())}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-full hover:bg-slate-50 transition-colors">
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* Search */}
          <div className="relative sm:col-span-2 lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search name, email, or reference…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 pl-10 pr-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-10 pl-10 pr-10 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
            >
              <option value="all">All</option>
              <option value={BOOKING_STATUS.PENDING}>Pending</option>
              <option value={BOOKING_STATUS.CONFIRMED}>Confirmed</option>
              <option value={BOOKING_STATUS.COMPLETED}>Completed</option>
              <option value={BOOKING_STATUS.CANCELLED}>Cancelled</option>
              <option value={BOOKING_STATUS.REFUNDED}>Refunded</option>
              <option value={BOOKING_STATUS.PARTIAL_REFUNDED}>Partial Refunded</option>
            </select>
          </div>

          {/* Tour */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select
              value={tourId}
              onChange={(e) => setTourId(e.target.value)}
              className="w-full h-10 pl-10 pr-10 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
            >
              <option value="all">All tours</option>
              {tourOptionsLoading && <option value="loading" disabled>Loading…</option>}
              {tourOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>

          {/* Purchase date range */}
          <div className="lg:col-span-2">
            <div className="text-xs font-medium text-slate-600 mb-1">Purchase date</div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={purchaseFrom}
                onChange={(e) => setPurchaseFrom(e.target.value)}
                className="w-full h-10 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="date"
                value={purchaseTo}
                onChange={(e) => setPurchaseTo(e.target.value)}
                className="w-full h-10 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Activity date range */}
          <div className="lg:col-span-2">
            <div className="text-xs font-medium text-slate-600 mb-1">Activity date</div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={activityFrom}
                onChange={(e) => setActivityFrom(e.target.value)}
                className="w-full h-10 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="date"
                value={activityTo}
                onChange={(e) => setActivityTo(e.target.value)}
                className="w-full h-10 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Sort / Per page / Clear */}
          <div className="sm:col-span-2 lg:col-span-6 flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-slate-600">Sort</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="h-10 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                <option value="createdAt_desc">Purchase date (newest)</option>
                <option value="createdAt_asc">Purchase date (oldest)</option>
                <option value="activityDate_desc">Activity date (newest)</option>
                <option value="activityDate_asc">Activity date (oldest)</option>
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-slate-600">Per page</span>
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  setPage(1);
                  setSelectedBookings(new Set());
                }}
                className="h-10 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="sm:ml-auto">
              {(searchTerm || statusFilter !== 'all' || tourId !== 'all' || purchaseFrom || purchaseTo || activityFrom || activityTo) && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setTourId('all');
                    setPurchaseFrom('');
                    setPurchaseTo('');
                    setActivityFrom('');
                    setActivityTo('');
                  }}
                  className="h-10 px-4 text-slate-700 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {bookings.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No bookings found</h3>
            <p className="text-slate-500">
              {searchTerm || statusFilter !== 'all' || tourId !== 'all' || purchaseFrom || purchaseTo || activityFrom || activityTo
                ? 'Try adjusting your filters'
                : 'No bookings have been made yet'
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isSomeSelected;
                      }}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Tour & Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Guests
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {bookings.map((booking) => {
                  const tourTitle = getTourTitle(booking);
                  const userName = formatUserName(booking.user);
                  const destinationName = getDestinationName(booking);
                  const isDeleted = !booking.tour;

                  return (
                    <tr
                      key={booking._id}
                      className={`hover:bg-slate-50 transition-colors ${
                        selectedBookings.has(booking._id) ? 'bg-blue-50' : ''
                      }`}
                    >
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedBookings.has(booking._id)}
                          onChange={() => handleSelectBooking(booking._id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className={`text-sm font-medium truncate max-w-xs flex items-center gap-2 ${
                            isDeleted ? 'text-orange-600' : 'text-slate-900'
                          }`}>
                            {isDeleted && <AlertTriangle size={14} />}
                            {tourTitle}
                            {booking.source === 'manual' && (
                              <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 rounded-full">
                                Manual
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-slate-500">
                            {userName}
                          </div>
                          {destinationName && (
                            <div className="text-xs text-slate-400">
                              {destinationName}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-900">
                          {formatDisplayDate(booking.dateString || booking.date)}
                        </div>
                        <div className="text-sm text-slate-500">{booking.time}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center text-sm text-slate-900">
                          <Users size={14} className="mr-1 text-slate-400" />
                          {formatGuestBreakdown(booking)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusDropdown booking={booking} onStatusChange={handleStatusChange} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center text-sm font-semibold text-slate-900">
                          <DollarSign size={14} className="mr-1 text-green-600" />
                          {booking.totalPrice.toFixed(2)}
                        </div>
                        {booking.paymentMethod && (
                          <div className="text-xs text-slate-500 capitalize">
                            {booking.paymentMethod}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleRowClick(booking._id)}
                          className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-full hover:bg-blue-100 transition-colors"
                        >
                          <Eye size={12} />
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalBookings > 0 && (
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-slate-600">
            Showing <span className="font-semibold text-slate-700">{showingFrom}-{showingTo}</span> of{' '}
            <span className="font-semibold text-slate-700">{totalBookings}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(1)}
              disabled={page <= 1}
              className="h-10 w-10 rounded-full border border-slate-300 flex items-center justify-center hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="First page"
            >
              <ChevronsLeft size={16} />
            </button>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="h-10 w-10 rounded-full border border-slate-300 flex items-center justify-center hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="px-3 text-sm text-slate-700">
              Page <span className="font-semibold">{page}</span> of <span className="font-semibold">{totalPages}</span>
          </div>
          
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="h-10 w-10 rounded-full border border-slate-300 flex items-center justify-center hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={page >= totalPages}
              className="h-10 w-10 rounded-full border border-slate-300 flex items-center justify-center hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Last page"
            >
              <ChevronsRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/50 transition-opacity"
              onClick={() => !isDeleting && setShowDeleteModal(false)}
            />
            <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-center text-slate-900 mb-2">
                Delete {selectedBookings.size} Booking{selectedBookings.size !== 1 ? 's' : ''}?
              </h3>
              <p className="text-sm text-slate-600 text-center mb-6">
                This action cannot be undone. The selected booking{selectedBookings.size !== 1 ? 's' : ''} will be permanently removed from the system.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-full hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default withAuth(BookingsPage, { permissions: ['manageBookings'] });