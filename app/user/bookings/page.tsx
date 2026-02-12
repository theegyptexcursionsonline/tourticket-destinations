'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Calendar, Clock, Users, MapPin, AlertTriangle, ChevronRight, Star } from 'lucide-react';
import toast from 'react-hot-toast';

interface Booking {
  _id: string;
  tour: {
    _id: string;
    title: string;
    slug: string;
    image: string;
    duration: string;
    rating?: number;
    destination?: {
      name: string;
    };
  } | null;
  bookingDate: string;
  bookingTime: string;
  participants: number;
  totalPrice: number;
  status:
    | 'Confirmed'
    | 'Pending'
    | 'Completed'
    | 'Cancelled'
    | 'Refunded'
    | 'Partial Refunded'
    | string;
  createdAt: string;
  adultGuests?: number;
  childGuests?: number;
  infantGuests?: number;
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
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  // Fallback
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', options || {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const BookingCard = ({ booking }: { booking: Booking }) => {
  const router = useRouter();

  // Handle deleted tours
  if (!booking.tour) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-red-200 overflow-hidden p-6">
        <div className="flex items-center gap-3 text-red-600">
          <AlertTriangle size={24} />
          <div>
            <h3 className="font-semibold">Tour No Longer Available</h3>
            <p className="text-sm text-red-500">This tour has been removed from our catalog.</p>
            <p className="text-xs text-slate-500 mt-2">Booking ID: {booking._id}</p>
            <div className="mt-3 flex items-center gap-4">
              <span className="text-sm text-slate-600">
                Booked on: {formatDisplayDate(booking.createdAt)}
              </span>
              <span className="text-sm font-semibold text-slate-900">
                ${booking.totalPrice.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Confirmed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Completed':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Refunded':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Partial Refunded':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatGuestBreakdown = () => {
    const parts = [];
    if (booking.adultGuests) parts.push(`${booking.adultGuests} Adult${booking.adultGuests > 1 ? 's' : ''}`);
    if (booking.childGuests) parts.push(`${booking.childGuests} Child${booking.childGuests > 1 ? 'ren' : ''}`);
    if (booking.infantGuests) parts.push(`${booking.infantGuests} Infant${booking.infantGuests > 1 ? 's' : ''}`);
    
    return parts.length > 0 ? parts.join(', ') : `${booking.participants} Guest${booking.participants > 1 ? 's' : ''}`;
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row">
        {/* Tour Image */}
        <div className="relative w-full h-48 sm:w-64 sm:h-40 flex-shrink-0">
          <Image
            src={booking.tour.image || '/bg.png'}
            alt={booking.tour.title}
            fill
            className="object-cover"
          />
          <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(booking.status)}`}>
            {booking.status}
          </div>
        </div>

        {/* Booking Details */}
        <div className="flex-1 p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-slate-900 mb-1 truncate">
                {booking.tour.title}
              </h3>
              
              {booking.tour.destination && (
                <div className="flex items-center text-sm text-slate-500 mb-3">
                  <MapPin size={14} className="mr-1 flex-shrink-0" />
                  <span className="truncate">{booking.tour.destination.name}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center text-slate-600">
                  <Calendar size={16} className="mr-2 text-slate-400 flex-shrink-0" />
                  <span className="truncate">
                    {formatDisplayDate(booking.bookingDate)}
                  </span>
                </div>
                <div className="flex items-center text-slate-600">
                  <Clock size={16} className="mr-2 text-slate-400 flex-shrink-0" />
                  <span className="truncate">{booking.bookingTime}</span>
                </div>
                <div className="flex items-center text-slate-600">
                  <Users size={16} className="mr-2 text-slate-400 flex-shrink-0" />
                  <span className="truncate">{formatGuestBreakdown()}</span>
                </div>
                {booking.tour.rating && (
                  <div className="flex items-center text-slate-600">
                    <Star size={16} className="mr-1 text-yellow-400 fill-yellow-400 flex-shrink-0" />
                    <span className="truncate">{booking.tour.rating} Rating</span>
                  </div>
                )}
              </div>
            </div>

            {/* Price and Action */}
            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3 sm:gap-2 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-200">
              <div className="text-right">
                <div className="text-xs text-slate-500 mb-1">Total Price</div>
                <div className="text-2xl font-bold text-slate-900">
                  ${booking.totalPrice.toFixed(2)}
                </div>
              </div>
              <button
                onClick={() => router.push(`/user/bookings/${booking._id}`)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors text-sm font-medium whitespace-nowrap"
              >
                View Details
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function BookingsPage() {
  const { token, isAuthenticated } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/user/bookings');
      return;
    }

    const fetchBookings = async () => {
      if (!token) return;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/bookings', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            toast.error('Session expired. Please log in again.');
            router.push('/login?redirect=/user/bookings');
            return;
          }
          throw new Error('Failed to fetch bookings');
        }

        const data = await response.json();
        setBookings(data.data || []);
      } catch (err) {
        console.error('Error fetching bookings:', err);
        setError((err as Error).message);
        toast.error('Failed to load your bookings');
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [isAuthenticated, token, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="h-10 w-48 bg-gray-200 rounded animate-pulse mb-8"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-sm animate-pulse">
                <div className="flex gap-4">
                  <div className="w-64 h-40 bg-gray-200 rounded"></div>
                  <div className="flex-1 space-y-4">
                    <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertTriangle size={24} />
              <h3 className="font-semibold text-lg">Error Loading Bookings</h3>
            </div>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">My Bookings</h1>
          <p className="text-slate-600">
            {bookings.length > 0 
              ? `You have ${bookings.length} booking${bookings.length > 1 ? 's' : ''}`
              : 'No bookings yet'
            }
          </p>
        </div>

        {/* Bookings List */}
        {bookings.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Calendar className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No Bookings Yet</h3>
            <p className="text-slate-600 mb-6">
              Start exploring amazing tours and experiences!
            </p>
            <button
              onClick={() => router.push('/tours')}
              className="px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors font-medium"
            >
              Explore Tours
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <BookingCard key={booking._id} booking={booking} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}