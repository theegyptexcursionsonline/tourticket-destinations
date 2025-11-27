// app/admin/bookings/page.tsx
'use client';

import { useState, useEffect } from 'react';
import withAuth from '@/components/admin/withAuth';
import { useRouter } from 'next/navigation';
import { Search, Calendar, Users, DollarSign, Filter, RefreshCw, Eye, Download, AlertTriangle, Loader2, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';

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
  tour: BookingTour | null;
  user: BookingUser | null;
  date: string;
  time: string;
  guests: number;
  totalPrice: number;
  status: 'Confirmed' | 'Pending' | 'Cancelled';
  adultGuests?: number;
  childGuests?: number;
  infantGuests?: number;
  paymentMethod?: string;
  specialRequests?: string;
  createdAt: string;
  updatedAt: string;
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
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  // Bulk selection state
  const [selectedBookings, setSelectedBookings] = useState<Set<string>>(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const router = useRouter();

  const fetchBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/bookings');
      if (!response.ok) {
        throw new Error('Failed to fetch bookings');
      }
      const data = await response.json();
      setBookings(data);
      setFilteredBookings(data);
    } catch (err) {
      setError((err as Error).message);
      console.error('Error fetching bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    let filtered = bookings;

    if (searchTerm) {
      filtered = filtered.filter(booking => 
        booking.tour?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking._id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(booking => booking.status === statusFilter);
    }

    if (dateFilter !== 'all') {
      const now = new Date();
      
      switch (dateFilter) {
        case 'today':
          filtered = filtered.filter(booking => {
            const createdDate = new Date(booking.createdAt);
            return createdDate.toDateString() === now.toDateString();
          });
          break;
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          filtered = filtered.filter(booking => 
            new Date(booking.createdAt) >= weekAgo
          );
          break;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          filtered = filtered.filter(booking => 
            new Date(booking.createdAt) >= monthAgo
          );
          break;
      }
    }

    setFilteredBookings(filtered);
  }, [bookings, searchTerm, statusFilter, dateFilter]);

  const handleRowClick = (id: string) => {
    router.push(`/admin/bookings/${id}`);
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 text-xs font-semibold rounded-full";
    switch (status) {
      case 'Confirmed':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'Pending':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'Cancelled':
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
            booking.status === 'Confirmed' 
              ? 'bg-green-100 text-green-800' 
              : booking.status === 'Pending'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          <option value="Confirmed">Confirmed</option>
          <option value="Pending">Pending</option>
          <option value="Cancelled">Cancelled</option>
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
      const response = await fetch(`/api/admin/bookings/${bookingId}`, {
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
            ? { ...booking, status: newStatus as 'Confirmed' | 'Pending' | 'Cancelled' }
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
    if (selectedBookings.size === filteredBookings.length) {
      setSelectedBookings(new Set());
    } else {
      setSelectedBookings(new Set(filteredBookings.map(b => b._id)));
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
      const response = await fetch('/api/admin/bookings/bulk-delete', {
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

  const isAllSelected = filteredBookings.length > 0 && selectedBookings.size === filteredBookings.length;
  const isSomeSelected = selectedBookings.size > 0 && selectedBookings.size < filteredBookings.length;

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
            onClick={fetchBookings}
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
            {filteredBookings.length} of {bookings.length} bookings
            {selectedBookings.size > 0 && (
              <span className="ml-2 text-blue-600 font-medium">
                ({selectedBookings.size} selected)
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3 mt-4 sm:mt-0">
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
            onClick={fetchBookings}
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search bookings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
            >
              <option value="all">All Status</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Pending">Pending</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>

          {(searchTerm || statusFilter !== 'all' || dateFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setDateFilter('all');
              }}
              className="px-4 py-2 text-slate-600 border border-slate-300 rounded-full hover:bg-slate-50 transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {filteredBookings.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No bookings found</h3>
            <p className="text-slate-500">
              {searchTerm || statusFilter !== 'all' || dateFilter !== 'all'
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
                {filteredBookings.map((booking) => {
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

      {bookings.length > 0 && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Bookings</p>
                <p className="text-2xl font-bold text-slate-900">{bookings.length}</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Confirmed</p>
                <p className="text-2xl font-bold text-green-600">
                  {bookings.filter(b => b.status === 'Confirmed').length}
                </p>
              </div>
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Revenue</p>
                <p className="text-2xl font-bold text-slate-900">
                  ${bookings.reduce((sum, b) => sum + b.totalPrice, 0).toFixed(2)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Guests</p>
                <p className="text-2xl font-bold text-slate-900">
                  {bookings.reduce((sum, b) => sum + b.guests, 0)}
                </p>
              </div>
              <Users className="w-8 h-8 text-purple-500" />
            </div>
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