// app/booking/verify/[reference]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { parseLocalDate } from '@/utils/date';
import { useTenant } from '@/contexts/TenantContext';

interface BookingDetails {
  bookingReference: string;
  tour: {
    title: string;
    image?: string;
    duration?: string;
  };
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
  date: string;
  dateString?: string; // YYYY-MM-DD format - timezone-safe
  time: string;
  guests: number;
  adultGuests?: number;
  childGuests?: number;
  infantGuests?: number;
  totalPrice: number;
  status: string;
  selectedBookingOption?: {
    title: string;
    price: number;
  };
  specialRequests?: string;
  emergencyContact?: string;
  createdAt: string;
}

export default function BookingVerificationPage() {
  const { tenant } = useTenant();
  const params = useParams();
  const reference = params?.reference as string;
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tenant-specific contact info
  const contactEmail = tenant?.contact?.email || 'booking@egypt-excursionsonline.com';

  useEffect(() => {
    async function fetchBooking() {
      try {
        setLoading(true);
        const response = await fetch(`/api/booking/verify/${reference}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Booking not found');
          }
          throw new Error('Failed to load booking details');
        }

        const data = await response.json();
        setBooking(data.booking);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    if (reference) {
      fetchBooking();
    }
  }, [reference]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Booking Not Found</h1>
          <p className="text-gray-600 mb-6">{error || 'The booking reference could not be verified.'}</p>
          <Link 
            href="/" 
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = parseLocalDate(dateString);
    if (!date || isNaN(date.getTime())) return '';

    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const getGuestBreakdown = () => {
    const parts = [];
    if (booking.adultGuests && booking.adultGuests > 0) {
      parts.push(`${booking.adultGuests} Adult${booking.adultGuests > 1 ? 's' : ''}`);
    }
    if (booking.childGuests && booking.childGuests > 0) {
      parts.push(`${booking.childGuests} Child${booking.childGuests > 1 ? 'ren' : ''}`);
    }
    if (booking.infantGuests && booking.infantGuests > 0) {
      parts.push(`${booking.infantGuests} Infant${booking.infantGuests > 1 ? 's' : ''}`);
    }
    return parts.length > 0 ? parts.join(', ') : `${booking.guests} Guest${booking.guests > 1 ? 's' : ''}`;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Booking Verified</h1>
          <p className="text-gray-600">Your booking details are confirmed</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6">
          {/* Tour Image */}
          {booking.tour.image && (
            <div className="h-48 bg-gradient-to-r from-blue-600 to-purple-600 relative overflow-hidden">
              <img 
                src={booking.tour.image} 
                alt={booking.tour.title}
                className="w-full h-full object-cover opacity-80"
              />
            </div>
          )}

          {/* Content */}
          <div className="p-8">
            {/* Tour Title */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{booking.tour.title}</h2>
              {booking.selectedBookingOption && (
                <p className="text-blue-600 font-medium">{booking.selectedBookingOption.title}</p>
              )}
            </div>

            {/* Status Badge */}
            <div className="mb-6">
              <span className={`inline-block px-4 py-2 rounded-full text-sm font-semibold border ${getStatusColor(booking.status)}`}>
                {booking.status}
              </span>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Booking Reference */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-sm text-gray-600 mb-1">Booking Reference</div>
                <div className="text-lg font-mono font-bold text-gray-900">{booking.bookingReference}</div>
              </div>

              {/* Date & Time */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-sm text-gray-600 mb-1">Date & Time</div>
                <div className="text-lg font-semibold text-gray-900">{formatDate(booking.dateString || booking.date)}</div>
                <div className="text-sm text-gray-600">{booking.time}</div>
              </div>

              {/* Guests */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-sm text-gray-600 mb-1">Guests</div>
                <div className="text-lg font-semibold text-gray-900">{getGuestBreakdown()}</div>
              </div>

              {/* Total Price */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-sm text-gray-600 mb-1">Total Price</div>
                <div className="text-2xl font-bold text-gray-900">{formatPrice(booking.totalPrice)}</div>
              </div>

              {/* Guest Details */}
              <div className="bg-gray-50 rounded-xl p-4 md:col-span-2">
                <div className="text-sm text-gray-600 mb-1">Guest Information</div>
                <div className="text-lg font-semibold text-gray-900">
                  {booking.user.firstName} {booking.user.lastName}
                </div>
                <div className="text-sm text-gray-600">{booking.user.email}</div>
              </div>
            </div>

            {/* Special Requests */}
            {booking.specialRequests && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
                <div className="text-sm font-semibold text-yellow-900 mb-2">Special Requests</div>
                <p className="text-sm text-yellow-800">{booking.specialRequests}</p>
              </div>
            )}

            {/* Emergency Contact */}
            {booking.emergencyContact && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                <div className="text-sm font-semibold text-blue-900 mb-2">Emergency Contact</div>
                <p className="text-sm text-blue-800">{booking.emergencyContact}</p>
              </div>
            )}

            {/* Important Information */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Important Information</h3>
              <div className="space-y-3">
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-blue-600 text-sm">📱</span>
                  </div>
                  <p className="text-sm text-gray-600">Please save or screenshot this page for your records</p>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-blue-600 text-sm">⏰</span>
                  </div>
                  <p className="text-sm text-gray-600">Please arrive 15 minutes before the scheduled time</p>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-blue-600 text-sm">🆔</span>
                  </div>
                  <p className="text-sm text-gray-600">Bring a valid ID and this booking reference</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Support */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-xl p-8 text-white text-center">
          <h3 className="text-xl font-bold mb-2">Need Help?</h3>
          <p className="mb-4 opacity-90">Our support team is here for you 24/7</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a 
              href={`mailto:${contactEmail}`} 
              className="inline-flex items-center px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Email Support
            </a>
            <a 
              href="https://wa.me/201142255624" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center px-6 py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </a>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-8">
          <Link 
            href="/" 
            className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

