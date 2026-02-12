'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Phone,
  Users,
  MapPin,
  MessageSquare,
  AlertTriangle,
  RefreshCw,
  XCircle,
  CheckCircle,
  Package,
  Receipt,
  QrCode,
  CreditCard,
  Ticket,
  Info
} from 'lucide-react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import QRCode from 'qrcode';

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
  images?: string[];
  duration?: string;
  destination?: {
    _id: string;
    name: string;
    slug?: string;
  };
  rating?: number;
  slug?: string;
  meetingPoint?: string;
}

interface BookingDetails {
  _id: string;
  bookingReference?: string;
  tour: BookingTour;
  user: BookingUser;
  date: string;
  time: string;
  guests: number;
  totalPrice: number;
  status:
    | 'Confirmed'
    | 'Pending'
    | 'Completed'
    | 'Cancelled'
    | 'Refunded'
    | 'Partial Refunded'
    | string;
  adultGuests?: number;
  childGuests?: number;
  infantGuests?: number;
  paymentId?: string;
  paymentMethod?: string;
  specialRequests?: string;
  emergencyContact?: string;
  selectedAddOns?: { [key: string]: number };
  selectedBookingOption?: {
    _id: string;
    title: string;
    price: number;
    originalPrice?: number;
    duration?: string;
    badge?: string;
  };
  selectedAddOnDetails?: {
    [key: string]: {
      title: string;
      price: number;
      perGuest?: boolean;
    };
  };
  createdAt: string;
  updatedAt: string;
}

// Helper to parse dates as local dates to avoid timezone issues
// When MongoDB returns an ISO date string like "2025-11-26T00:00:00.000Z",
// new Date() interprets it as UTC, which can show as previous day in some timezones
const formatDisplayDate = (dateString: string | Date | undefined): string => {
  if (!dateString) return '';

  const dateStr = dateString instanceof Date
    ? dateString.toISOString()
    : String(dateString);

  // Extract just the date part (YYYY-MM-DD) to avoid timezone issues
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, year, month, day] = match;
    // Create date using local timezone components
    const localDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return localDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  // Fallback: try to parse and format
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';

  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const UserBookingDetailPage = () => {
  const { tenant } = useTenant();
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  
  // Tenant-specific contact info
  const contactPhone = tenant?.contact?.phone || '+20 11 42255624';
  const [cancelReason, setCancelReason] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  
  const params = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const id = params.id as string;

  // Generate QR Code
  useEffect(() => {
    if (booking?.bookingReference || booking?._id) {
      const bookingId = booking.bookingReference || booking._id;
      const verificationUrl = `${window.location.origin}/booking/verify/${bookingId}`;
      
      QRCode.toDataURL(verificationUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      })
        .then(setQrCodeUrl)
        .catch((err) => console.error('Error generating QR code:', err));
    }
  }, [booking]);

  const fetchBooking = async () => {
    if (!token) {
      router.push('/login?redirect=/user/bookings');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/bookings/${id}`, {
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
        if (response.status === 404) {
          throw new Error('Booking not found');
        }
        throw new Error('Failed to fetch booking details');
      }

      const data = await response.json();
      setBooking(data.data || data);
    } catch (err) {
      setError((err as Error).message);
      console.error('Error fetching booking:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchBooking();
    }
  }, [id, token]);

  const handleCancelBooking = async () => {
    if (!booking || !token) return;
    
    setCancelling(true);
    try {
      const response = await fetch(`/api/bookings/${id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: cancelReason }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel booking');
      }

      const result = await response.json();
      
      toast.success(
        result.refundAmount > 0 
          ? `Booking cancelled. You'll receive a refund of $${result.refundAmount.toFixed(2)}`
          : 'Booking cancelled successfully'
      );
      
      setShowCancelModal(false);
      fetchBooking();
    } catch (err) {
      console.error('Error cancelling booking:', err);
      toast.error((err as Error).message);
    } finally {
      setCancelling(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-4 py-2 text-sm font-semibold rounded-full inline-flex items-center gap-2";
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

  const formatGuestBreakdown = (booking: BookingDetails) => {
    const parts = [];
    if (booking.adultGuests) parts.push(`${booking.adultGuests} Adult${booking.adultGuests > 1 ? 's' : ''}`);
    if (booking.childGuests) parts.push(`${booking.childGuests} Child${booking.childGuests > 1 ? 'ren' : ''}`);
    if (booking.infantGuests) parts.push(`${booking.infantGuests} Infant${booking.infantGuests > 1 ? 's' : ''}`);
    
    return parts.length > 0 ? parts.join(', ') : `${booking.guests} Guest${booking.guests > 1 ? 's' : ''}`;
  };

  const canCancelBooking = () => {
    if (!booking) return false;
    if (['Cancelled', 'Refunded', 'Partial Refunded', 'Completed'].includes(String(booking.status))) return false;

    // Use dateString for timezone-safe date parsing
    const dateSource = booking.dateString || booking.date;
    const dateStr = typeof dateSource === 'string' ? dateSource : new Date(dateSource).toISOString();
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);

    let bookingDate: Date;
    if (match) {
      const [, year, month, day] = match;
      bookingDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    } else {
      bookingDate = new Date(booking.date);
    }

    const now = new Date();
    const hoursUntilBooking = (bookingDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    return hoursUntilBooking > 24;
  };

  // Calculate pricing breakdown
  const calculatePricing = () => {
    if (!booking) return null;

    const basePrice = booking.selectedBookingOption?.price || 0;
    const adultPrice = basePrice * (booking.adultGuests || 1);
    const childPrice = (basePrice / 2) * (booking.childGuests || 0);
    const tourSubtotal = adultPrice + childPrice;

    let addOnsTotal = 0;
    if (booking.selectedAddOns && booking.selectedAddOnDetails) {
      Object.entries(booking.selectedAddOns).forEach(([addOnId, quantity]) => {
        const addOnDetail = booking.selectedAddOnDetails?.[addOnId];
        if (addOnDetail && quantity > 0) {
          const totalGuests = (booking.adultGuests || 0) + (booking.childGuests || 0);
          const addOnQuantity = addOnDetail.perGuest ? totalGuests : 1;
          addOnsTotal += addOnDetail.price * addOnQuantity;
        }
      });
    }

    // Subtotal includes tour price + add-ons
    const subtotal = tourSubtotal + addOnsTotal;

    // Service fee and tax are calculated on the full subtotal (including add-ons)
    const serviceFee = subtotal * 0.03;
    const tax = subtotal * 0.05;

    // Calculate the correct total
    const calculatedTotal = subtotal + serviceFee + tax;

    // Use the stored totalPrice if it seems reasonable, otherwise use calculated total
    const total = booking.totalPrice > subtotal ? booking.totalPrice : calculatedTotal;

    return {
      adultPrice,
      childPrice,
      tourSubtotal,
      subtotal,
      addOnsTotal,
      serviceFee,
      tax,
      total
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="h-8 w-1/4 bg-gray-200 rounded animate-pulse mb-6"></div>
          <div className="bg-white p-8 rounded-2xl shadow-sm animate-pulse">
            <div className="h-6 w-1/2 bg-gray-300 rounded mb-4"></div>
            <div className="h-4 w-1/3 bg-gray-200 rounded mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <div className="h-64 w-full bg-gray-200 rounded-lg mb-4"></div>
                <div className="h-5 w-3/4 bg-gray-300 rounded"></div>
              </div>
              <div>
                <div className="space-y-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-4 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600 mr-3" />
              <h3 className="text-red-800 font-semibold text-lg">Error loading booking</h3>
            </div>
            <p className="text-red-600 mb-4">{error}</p>
            <div className="flex gap-3">
              <button 
                onClick={fetchBooking}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
              >
                <RefreshCw size={16} />
                Try Again
              </button>
              <button 
                onClick={() => router.back()}
                className="px-4 py-2 border border-red-300 text-red-700 rounded-full hover:bg-red-50 transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold text-slate-700 mb-2">Booking not found</h3>
            <p className="text-slate-500 mb-4">This booking may have been deleted or you don't have access to it.</p>
            <button 
              onClick={() => router.back()}
              className="px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const pricing = calculatePricing();

  const DetailItem = ({ 
    icon: Icon, 
    label, 
    value, 
    className = "" 
  }: { 
    icon: React.ElementType; 
    label: string; 
    value: string | number | React.ReactNode; 
    className?: string;
  }) => (
    <div className={`flex items-start text-slate-700 ${className}`}>
      <Icon className="h-5 w-5 mr-3 text-slate-400 mt-0.5 flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <span className="font-semibold text-slate-600">{label}:</span>
        <div className="mt-1">{value}</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <button 
              onClick={() => router.back()} 
              className="p-2 rounded-full hover:bg-white/50 mr-4 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Booking Details</h1>
              <p className="text-slate-600 text-sm">
                {booking.bookingReference ? (
                  <>Booking Reference: <span className="font-mono font-semibold">{booking.bookingReference}</span></>
                ) : (
                  <>Booking ID: {booking._id}</>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={fetchBooking}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Tour & QR */}
          <div className="lg:col-span-1 space-y-6">
            {/* Tour Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="aspect-video rounded-t-2xl overflow-hidden bg-slate-100">
                <Image
                  src={booking.tour.image || booking.tour.images?.[0] || '/bg.png'}
                  alt={booking.tour.title}
                  width={500}
                  height={300}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4">
                <h2 className="text-lg font-bold text-slate-900 mb-2">{booking.tour.title}</h2>
                {booking.tour.destination && (
                  <div className="flex items-center text-sm text-slate-600 mb-4">
                    <MapPin size={14} className="mr-1" />
                    {booking.tour.destination.name}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="text-xl font-bold text-slate-900">${booking.totalPrice.toFixed(2)}</div>
                    <div className="text-xs text-slate-500">Total Paid</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="text-xl font-bold text-slate-900">{booking.guests}</div>
                    <div className="text-xs text-slate-500">Guests</div>
                  </div>
                </div>
              </div>
            </div>

            {/* QR Code Card */}
            {qrCodeUrl && booking.status === 'Confirmed' && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <QrCode className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-slate-900">Your Ticket</h3>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 mb-4">
                  <Image 
                    src={qrCodeUrl} 
                    alt="Booking QR Code" 
                    width={300} 
                    height={300}
                    className="w-full h-auto"
                  />
                </div>
                <p className="text-xs text-slate-600 text-center">
                  Show this QR code at the tour meeting point
                </p>
              </div>
            )}

            {/* Status Badge */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
              <span className={`${getStatusBadge(booking.status)} w-full justify-center`}>
                {booking.status === 'Confirmed' && <CheckCircle size={16} />}
                {booking.status === 'Cancelled' && <XCircle size={16} />}
                {booking.status}
              </span>
              
              {canCancelBooking() && (
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2.5 text-sm border-2 border-red-300 text-red-600 rounded-full hover:bg-red-50 transition-colors font-semibold"
                >
                  <XCircle size={16} />
                  Cancel Booking
                </button>
              )}
            </div>
          </div>

          {/* Right Column - Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Booking Information */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4 pb-2 border-b border-slate-200 flex items-center">
                <Ticket className="w-5 h-5 mr-2 text-blue-600" />
                Booking Information
              </h3>
              <div className="space-y-4">
                <DetailItem
                  icon={Calendar}
                  label="Tour Date"
                  value={formatDisplayDate(booking.dateString || booking.date)}
                />
                <DetailItem 
                  icon={Clock} 
                  label="Time" 
                  value={booking.time}
                />
                <DetailItem
                  icon={Users}
                  label="Participants"
                  value={formatGuestBreakdown(booking)}
                />
                {booking.selectedBookingOption && (
                  <DetailItem
                    icon={Package}
                    label="Booking Option"
                    value={
                      <div>
                        <span className="text-blue-600 font-medium block">
                          {booking.selectedBookingOption.title}
                        </span>
                        {booking.selectedBookingOption.duration && (
                          <span className="text-sm text-slate-500">
                            Duration: {booking.selectedBookingOption.duration}
                          </span>
                        )}
                      </div>
                    }
                  />
                )}
                {booking.tour.duration && !booking.selectedBookingOption?.duration && (
                  <DetailItem
                    icon={Clock}
                    label="Duration"
                    value={booking.tour.duration}
                  />
                )}
                {booking.tour.meetingPoint && (
                  <DetailItem
                    icon={MapPin}
                    label="Meeting Point"
                    value={booking.tour.meetingPoint}
                  />
                )}
                <DetailItem
                  icon={Calendar}
                  label="Booked On"
                  value={formatDisplayDate(booking.createdAt)}
                />
              </div>
            </div>

            {/* Pricing Breakdown */}
            {pricing && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4 pb-2 border-b border-slate-200 flex items-center">
                  <Receipt className="w-5 h-5 mr-2 text-green-600" />
                  Pricing Breakdown
                </h3>
                <div className="space-y-3">
                  {booking.adultGuests && booking.adultGuests > 0 && (
                    <div className="flex justify-between text-slate-700">
                      <span>{booking.adultGuests} x Adult{booking.adultGuests > 1 ? 's' : ''} (${(booking.selectedBookingOption?.price || 0).toFixed(2)})</span>
                      <span className="font-semibold">${pricing.adultPrice.toFixed(2)}</span>
                    </div>
                  )}
                  {booking.childGuests && booking.childGuests > 0 && (
                    <div className="flex justify-between text-slate-700">
                      <span>{booking.childGuests} x Child{booking.childGuests > 1 ? 'ren' : ''} (${((booking.selectedBookingOption?.price || 0) / 2).toFixed(2)})</span>
                      <span className="font-semibold">${pricing.childPrice.toFixed(2)}</span>
                    </div>
                  )}
                  {booking.infantGuests && booking.infantGuests > 0 && (
                    <div className="flex justify-between text-slate-700">
                      <span>{booking.infantGuests} x Infant{booking.infantGuests > 1 ? 's' : ''}</span>
                      <span className="font-semibold text-green-600">FREE</span>
                    </div>
                  )}
                  
                  {pricing.addOnsTotal > 0 && (
                    <>
                      <div className="border-t pt-3 mt-3"></div>
                      <div className="flex justify-between text-slate-700">
                        <span>Add-ons</span>
                        <span className="font-semibold">${pricing.addOnsTotal.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  
                  <div className="border-t pt-3 mt-3"></div>
                  <div className="flex justify-between text-slate-700">
                    <span>Subtotal</span>
                    <span className="font-semibold">${pricing.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 text-sm">
                    <span>Service Fee (3%)</span>
                    <span>${pricing.serviceFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 text-sm">
                    <span>Tax (5%)</span>
                    <span>${pricing.tax.toFixed(2)}</span>
                  </div>
                  
                  <div className="border-t-2 border-slate-300 pt-3 mt-3 flex justify-between">
                    <span className="text-lg font-bold text-slate-900">Total Paid</span>
                    <span className="text-lg font-bold text-green-600">${pricing.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Information */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4 pb-2 border-b border-slate-200 flex items-center">
                <CreditCard className="w-5 h-5 mr-2 text-green-600" />
                Payment Information
              </h3>
              <div className="space-y-4">
                {booking.paymentMethod && (
                  <DetailItem 
                    icon={CreditCard} 
                    label="Payment Method" 
                    value={
                      <span className="capitalize bg-slate-100 px-3 py-1 rounded-full text-sm font-medium">
                        {booking.paymentMethod}
                      </span>
                    }
                  />
                )}
                {booking.paymentId && (
                  <DetailItem 
                    icon={Receipt} 
                    label="Payment ID" 
                    value={
                      <code className="bg-slate-100 px-2 py-1 rounded text-sm font-mono">
                        {booking.paymentId}
                      </code>
                    }
                  />
                )}
              </div>
            </div>

            {/* Selected Add-ons */}
            {booking.selectedAddOns && Object.keys(booking.selectedAddOns).length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4 pb-2 border-b border-slate-200 flex items-center">
                  <Package className="w-5 h-5 mr-2 text-blue-600" />
                  Selected Add-ons
                </h3>
                <div className="space-y-3">
                  {Object.entries(booking.selectedAddOns).map(([addOnId, quantity]) => {
                    const addOnDetail = booking.selectedAddOnDetails?.[addOnId];
                    if (!addOnDetail || quantity === 0) return null;
                    
                    const totalGuests = (booking.adultGuests || 0) + (booking.childGuests || 0);
                    const addOnQuantity = addOnDetail.perGuest ? totalGuests : 1;
                    const addOnTotal = addOnDetail.price * addOnQuantity;
                    
                    return (
                      <div
                        key={addOnId}
                        className="flex items-center justify-between bg-slate-50 rounded-lg p-4 border border-slate-200"
                      >
                        <div className="flex items-center">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                          <div>
                            <div className="font-medium text-slate-800">
                              {addOnDetail.title}
                            </div>
                            <div className="text-sm text-slate-500">
                              {addOnDetail.perGuest ? `Per guest (${totalGuests} guests)` : 'Per booking'}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-slate-700">
                            ${addOnTotal.toFixed(2)}
                          </div>
                          <div className="text-xs text-slate-500">
                            ${addOnDetail.price.toFixed(2)} {addOnDetail.perGuest ? 'per guest' : 'total'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Special Requests */}
            {booking.specialRequests && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
                <h3 className="font-bold text-amber-900 mb-3 flex items-center">
                  <MessageSquare className="w-5 h-5 mr-2" />
                  Special Requests
                </h3>
                <p className="text-amber-800">{booking.specialRequests}</p>
              </div>
            )}

            {/* Emergency Contact */}
            {booking.emergencyContact && (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6">
                <h3 className="font-bold text-rose-900 mb-3 flex items-center">
                  <Phone className="w-5 h-5 mr-2" />
                  Emergency Contact
                </h3>
                <p className="text-rose-800">{booking.emergencyContact}</p>
              </div>
            )}

            {/* Important Information */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
              <h3 className="font-bold text-blue-900 mb-3 flex items-center">
                <Info className="w-5 h-5 mr-2" />
                Important Information
              </h3>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Please arrive at the meeting point 15 minutes before departure</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Bring a printed or digital copy of this booking confirmation</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Contact us at {contactPhone} if you have any questions</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Free cancellation up to 24 hours before the tour starts</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* View Tour Button */}
        {booking.tour.slug && (
          <div className="mt-6">
            <button
              onClick={() => router.push(`/tour/${booking.tour.slug}`)}
              className="w-full px-6 py-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-colors font-semibold text-lg shadow-sm"
            >
              View Tour Details
            </button>
          </div>
        )}
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Cancel Booking</h3>
            <p className="text-slate-600 mb-4">
              Are you sure you want to cancel this booking? This action cannot be undone.
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Reason for cancellation (optional)
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Let us know why you're cancelling..."
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={cancelling}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-full hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Keep Booking
              </button>
              <button
                onClick={handleCancelBooking}
                disabled={cancelling}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {cancelling ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  'Cancel Booking'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserBookingDetailPage;
