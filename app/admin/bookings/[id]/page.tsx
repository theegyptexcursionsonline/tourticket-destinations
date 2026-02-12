// app/admin/bookings/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import withAuth from '@/components/admin/withAuth';
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Mail,
  Phone,
  Users,
  Hash,
  DollarSign,
  Tag,
  MapPin,
  Edit,
  MessageSquare,
  CreditCard,
  Download,
  RefreshCw,
  AlertTriangle,
  Loader2,
  X,
  Package,
  Receipt,
  QrCode,
  Info
} from 'lucide-react';
import Image from 'next/image';
import QRCode from 'qrcode';
import toast from 'react-hot-toast';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { useAdminTenant } from '@/contexts/AdminTenantContext';

// Enhanced interfaces matching your booking model
interface BookingUser {
  _id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email: string;
  phone?: string;
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
  discountPrice?: number;
  meetingPoint?: string;
}

interface BookingDetails {
  dateString?: string;
  _id: string;
  bookingReference?: string;
  source?: 'online' | 'manual';
  paymentStatus?: 'paid' | 'pending' | 'pay_on_arrival';
  amountPaid?: number;
  customerPhone?: string;
  customerCountry?: string;
  internalNotes?: string;
  pickupLocation?: string;
  pickupAddress?: string;
  appliedOffer?: {
    id: string;
    name: string;
    offerType: string;
    discountAmount: number;
    discountValue: number;
    endDate?: string;
  };
  tour: BookingTour;
  user: BookingUser;
  date: string;
  time: string;
  guests: number;
  totalPrice: number;
  status: 'Confirmed' | 'Pending' | 'Completed' | 'Cancelled' | 'Refunded' | 'Partial Refunded' | string;
  // Enhanced fields
  adultGuests?: number;
  childGuests?: number;
  infantGuests?: number;
  paymentId?: string;
  paymentMethod?: string;
  specialRequests?: string;
  emergencyContact?: string;
  hotelPickupDetails?: string;
  hotelPickupLocation?: {
    address: string;
    lat: number;
    lng: number;
    placeId?: string;
  };
  selectedAddOns?: { [key: string]: number };
  selectedBookingOption?: {
    id: string;
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

// Helper to format dates consistently and avoid timezone issues
const formatDisplayDate = (dateString: string | Date | undefined): string => {
  if (!dateString) return '';

  const dateStr = dateString instanceof Date
    ? dateString.toISOString()
    : String(dateString);

  // Extract just the date part (YYYY-MM-DD) to avoid timezone issues
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, year, month, day] = match;
    const localDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return localDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  // Fallback
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const BookingDetailPage = () => {
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const { token } = useAdminAuth();
  const { selectedTenantId } = useAdminTenant();
  const tenantQuery = selectedTenantId && selectedTenantId !== 'all' ? `?tenantId=${encodeURIComponent(selectedTenantId)}` : '';
  const [showManualEdit, setShowManualEdit] = useState(false);
  const [manualEdit, setManualEdit] = useState({
    date: '',
    time: '',
    adults: 1,
    children: 0,
    infants: 0,
    bookingOptionType: '',
    paymentStatus: 'paid' as 'paid' | 'pending' | 'pay_on_arrival',
    paymentMethod: 'cash' as 'cash' | 'card' | 'bank' | 'pay_later' | 'other',
    amountPaid: '' as string,
    pickupLocation: '',
    pickupAddress: '',
    hotelPickupDetails: '',
    specialRequests: '',
    internalNotes: '',
  });
  const [savingManualEdit, setSavingManualEdit] = useState(false);
  
  const params = useParams();
  const router = useRouter();
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
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/bookings/${id}${tenantQuery}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Booking not found');
        }
        throw new Error('Failed to fetch booking details');
      }
      const data = await response.json();
      setBooking(data);
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
  }, [id]);

  // Initialize manual edit form when booking loads
  useEffect(() => {
    if (!booking) return;
    if (booking.source !== 'manual') return;
    const dateStr =
      (booking.dateString && String(booking.dateString).slice(0, 10)) ||
      (booking.date ? String(booking.date).slice(0, 10) : '');
    setManualEdit({
      date: dateStr || new Date().toISOString().slice(0, 10),
      time: booking.time || '',
      adults: booking.adultGuests ?? 1,
      children: booking.childGuests ?? 0,
      infants: booking.infantGuests ?? 0,
      bookingOptionType: booking.selectedBookingOption?.id || '',
      paymentStatus: booking.paymentStatus || 'paid',
      paymentMethod: (booking.paymentMethod as any) || 'cash',
      amountPaid: booking.amountPaid !== undefined ? String(booking.amountPaid) : '',
      pickupLocation: booking.pickupLocation || '',
      pickupAddress: booking.pickupAddress || '',
      hotelPickupDetails: booking.hotelPickupDetails || '',
      specialRequests: booking.specialRequests || '',
      internalNotes: booking.internalNotes || '',
    });
  }, [booking]);

  const saveManualEdits = async () => {
    if (!booking) return;
    if (booking.source !== 'manual') return;
    if (!token) {
      toast.error('Admin session missing. Please log in again.');
      return;
    }
    setSavingManualEdit(true);
    try {
      const res = await fetch(`/api/bookings/manual/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          date: manualEdit.date,
          time: manualEdit.time,
          adults: manualEdit.adults,
          children: manualEdit.children,
          infants: manualEdit.infants,
          bookingOptionType: manualEdit.bookingOptionType,
          paymentStatus: manualEdit.paymentStatus,
          paymentMethod: manualEdit.paymentMethod,
          amountPaid: manualEdit.amountPaid,
          pickupLocation: manualEdit.pickupLocation,
          pickupAddress: manualEdit.pickupAddress,
          hotelPickupDetails: manualEdit.hotelPickupDetails,
          specialRequests: manualEdit.specialRequests,
          internalNotes: manualEdit.internalNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to update manual booking');
      }
      toast.success('Manual booking updated');
      setShowManualEdit(false);
      await fetchBooking();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update booking');
    } finally {
      setSavingManualEdit(false);
    }
  };

  const updateBookingStatus = async (newStatus: string) => {
    if (!booking) return;
    
    setUpdating(true);
    try {
      const response = await fetch(`/api/admin/bookings/${id}${tenantQuery}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update booking status');
      }

      const updatedBooking = await response.json();
      setBooking(updatedBooking);
    } catch (err) {
      console.error('Error updating booking:', err);
      alert('Failed to update booking status');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-3 py-1 text-sm font-semibold rounded-full";
    switch (status) {
      case 'Confirmed':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'Pending':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'Completed':
        return `${baseClasses} bg-emerald-100 text-emerald-800`;
      case 'Cancelled':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'Refunded':
        return `${baseClasses} bg-orange-100 text-orange-800`;
      case 'Partial Refunded':
        return `${baseClasses} bg-orange-50 text-orange-700`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const formatUserName = (user: BookingUser) => {
    if (user.name) return user.name;
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.firstName || user.email;
  };

  const formatGuestBreakdown = (booking: BookingDetails) => {
    const parts = [];
    if (booking.adultGuests) parts.push(`${booking.adultGuests} Adult${booking.adultGuests > 1 ? 's' : ''}`);
    if (booking.childGuests) parts.push(`${booking.childGuests} Child${booking.childGuests > 1 ? 'ren' : ''}`);
    if (booking.infantGuests) parts.push(`${booking.infantGuests} Infant${booking.infantGuests > 1 ? 's' : ''}`);
    
    return parts.length > 0 ? parts.join(', ') : `${booking.guests} Guest${booking.guests > 1 ? 's' : ''}`;
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
    // This handles cases where the booking was created with incorrect totalPrice
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
      <div className="p-6 max-w-7xl mx-auto">
        <div className="h-8 w-1/4 bg-gray-200 rounded animate-pulse mb-6"></div>
        <div className="bg-white p-8 rounded-lg shadow-sm animate-pulse">
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
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <AlertTriangle className="h-6 w-6 text-red-600 mr-3" />
            <h3 className="text-red-800 font-semibold text-lg">Error loading booking</h3>
          </div>
          <p className="text-red-600 mb-4">{error}</p>
          <div className="flex gap-3">
            <button 
              onClick={fetchBooking}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              <RefreshCw size={16} />
              Try Again
            </button>
            <button 
              onClick={() => router.back()}
              className="px-4 py-2 border border-red-300 text-red-700 rounded hover:bg-red-50 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold text-slate-700 mb-2">Booking not found</h3>
          <p className="text-slate-500 mb-4">This booking may have been deleted or the ID is incorrect.</p>
          <button 
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const pricing = calculatePricing();

  // Helper component for displaying details
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
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button 
            onClick={() => router.back()} 
            className="p-2 rounded-full hover:bg-gray-100 mr-4 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Booking Details</h1>
            <p className="text-slate-500 text-sm flex items-center gap-2 flex-wrap">
              {booking.bookingReference ? (
                <>Reference: <span className="font-mono font-semibold">{booking.bookingReference}</span></>
              ) : (
                <>ID: {booking._id}</>
              )}
              {booking.source === 'manual' && (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 rounded-full">
                  Manual
                </span>
              )}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
            <Download size={16} />
            Export
          </button>
          {booking.source === 'manual' && (
            <button
              onClick={() => setShowManualEdit(true)}
              className="flex items-center gap-2 px-4 py-2 border border-emerald-300 text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors"
            >
              <Edit size={16} />
              Edit Manual
            </button>
          )}
          <button 
            onClick={fetchBooking}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <div className="aspect-video rounded-t-lg overflow-hidden bg-slate-100">
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
                  <div className="text-xs text-slate-500">Total Price</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-xl font-bold text-slate-900">{booking.guests}</div>
                  <div className="text-xs text-slate-500">Guests</div>
                </div>
              </div>
            </div>
          </div>

          {/* QR Code Card */}
          {qrCodeUrl && (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <QrCode className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900">QR Code</h3>
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
                Verification code for tour operator
              </p>
            </div>
          )}

          {/* Status Management */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-900 mb-3">Status Management</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Current Status:</span>
                <span className={getStatusBadge(booking.status)}>
                  {booking.status}
                </span>
              </div>
              
              <select
                value={booking.status}
                onChange={(e) => updateBookingStatus(e.target.value)}
                disabled={updating}
                className="w-full appearance-none bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              >
                <option value="Pending">Pending</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Refunded">Refunded</option>
                <option value="Partial Refunded">Partial Refunded</option>
              </select>
            </div>
          </div>
        </div>

        {/* Right Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Information */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200 flex items-center">
              <User className="w-5 h-5 mr-2 text-blue-500" />
              Customer Information
            </h3>
            <div className="space-y-4">
              <DetailItem 
                icon={User} 
                label="Name" 
                value={formatUserName(booking.user)} 
              />
              <DetailItem 
                icon={Mail} 
                label="Email" 
                value={
                  <a 
                    href={`mailto:${booking.user.email}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {booking.user.email}
                  </a>
                }
              />
              {booking.user.phone && (
                <DetailItem 
                  icon={Phone} 
                  label="Phone" 
                  value={
                    <a 
                      href={`tel:${booking.user.phone}`}
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {booking.user.phone}
                    </a>
                  } 
                />
              )}
              {booking.emergencyContact && (
                <DetailItem 
                  icon={Phone} 
                  label="Emergency Contact" 
                  value={booking.emergencyContact} 
                />
              )}
            </div>
          </div>

          {/* Booking Details */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200 flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-green-500" />
              Booking Details
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
                      {booking.selectedBookingOption.badge && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full ml-2">
                          {booking.selectedBookingOption.badge}
                        </span>
                      )}
                    </div>
                  }
                />
              )}
              {booking.tour.duration && !booking.selectedBookingOption?.duration && (
                <DetailItem
                  icon={Tag}
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
              {(booking.hotelPickupDetails || booking.hotelPickupLocation) && (
                <DetailItem
                  icon={MapPin}
                  label="Hotel Pickup Details"
                  value={
                    <div className="space-y-2">
                      <span className="text-red-600 font-semibold block">
                        {booking.hotelPickupLocation?.address || booking.hotelPickupDetails}
                      </span>
                      {booking.hotelPickupLocation && (
                        <>
                          <div className="text-xs text-slate-500">
                            📍 Lat: {booking.hotelPickupLocation.lat.toFixed(6)}, Lng: {booking.hotelPickupLocation.lng.toFixed(6)}
                          </div>
                          <div className="mt-3">
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${booking.hotelPickupLocation.lat},${booking.hotelPickupLocation.lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                              <MapPin size={14} />
                              View on Google Maps
                            </a>
                          </div>
                          <div className="mt-2 rounded-lg overflow-hidden border border-slate-200">
                            <iframe
                              width="100%"
                              height="200"
                              style={{ border: 0 }}
                              loading="lazy"
                              allowFullScreen
                              referrerPolicy="no-referrer-when-downgrade"
                              src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${booking.hotelPickupLocation.lat},${booking.hotelPickupLocation.lng}&zoom=15`}
                            ></iframe>
                          </div>
                        </>
                      )}
                    </div>
                  }
                />
              )}
              <DetailItem 
                icon={Calendar} 
                label="Booked On" 
                value={new Date(booking.createdAt).toLocaleString()}
              />
              <DetailItem 
                icon={Calendar} 
                label="Last Updated" 
                value={new Date(booking.updatedAt).toLocaleString()}
              />
            </div>
          </div>

          {/* Pricing Breakdown */}
          {pricing && (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200 flex items-center">
                <Receipt className="w-5 h-5 mr-2 text-green-500" />
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
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200 flex items-center">
              <DollarSign className="w-5 h-5 mr-2 text-green-500" />
              Payment Information
            </h3>
            <div className="space-y-4">
              {booking.paymentMethod && (
                <DetailItem 
                  icon={CreditCard} 
                  label="Payment Method" 
                  value={
                    <span className="capitalize bg-slate-100 px-2 py-1 rounded text-sm">
                      {booking.paymentMethod}
                    </span>
                  }
                />
              )}
              {booking.paymentId && (
                <DetailItem 
                  icon={Hash} 
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
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200 flex items-center">
                <Package className="w-5 h-5 mr-2 text-blue-500" />
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
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
              <h3 className="font-bold text-amber-900 mb-3 flex items-center">
                <MessageSquare className="w-5 h-5 mr-2" />
                Special Requests
              </h3>
              <p className="text-amber-800">{booking.specialRequests}</p>
            </div>
          )}

          {/* Admin Notes */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-bold text-blue-900 mb-3 flex items-center">
              <Info className="w-5 h-5 mr-2" />
              Important Notes
            </h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Customer should arrive 15 minutes before departure</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Verify booking reference or QR code before tour starts</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Contact customer: {booking.user.email}</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Support hotline: +20 11 42255624</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Manual Edit Modal */}
      {showManualEdit && booking?.source === 'manual' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-emerald-50">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Edit Manual Booking</h3>
                <p className="text-xs text-slate-600">Server will re-calculate totals and best offer.</p>
              </div>
              <button onClick={() => setShowManualEdit(false)} className="p-2 hover:bg-white/60 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={manualEdit.date}
                    onChange={(e) => setManualEdit({ ...manualEdit, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Time</label>
                  <input
                    type="time"
                    value={manualEdit.time}
                    onChange={(e) => setManualEdit({ ...manualEdit, time: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Adults</label>
                  <input
                    type="number"
                    min={0}
                    value={manualEdit.adults}
                    onChange={(e) => setManualEdit({ ...manualEdit, adults: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Children</label>
                  <input
                    type="number"
                    min={0}
                    value={manualEdit.children}
                    onChange={(e) => setManualEdit({ ...manualEdit, children: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Infants</label>
                  <input
                    type="number"
                    min={0}
                    value={manualEdit.infants}
                    onChange={(e) => setManualEdit({ ...manualEdit, infants: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Booking Option Type</label>
                  <input
                    value={manualEdit.bookingOptionType}
                    onChange={(e) => setManualEdit({ ...manualEdit, bookingOptionType: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                    placeholder="Must match tour booking option type"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Payment Status</label>
                  <select
                    value={manualEdit.paymentStatus}
                    onChange={(e) => setManualEdit({ ...manualEdit, paymentStatus: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="paid">Paid</option>
                    <option value="pending">Pending</option>
                    <option value="pay_on_arrival">Pay on Arrival</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={manualEdit.paymentMethod}
                    onChange={(e) => setManualEdit({ ...manualEdit, paymentMethod: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="pay_later">Pay Later</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Amount Paid</label>
                  <input
                    type="number"
                    min={0}
                    value={manualEdit.amountPaid}
                    onChange={(e) => setManualEdit({ ...manualEdit, amountPaid: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Pickup Location</label>
                  <input
                    value={manualEdit.pickupLocation}
                    onChange={(e) => setManualEdit({ ...manualEdit, pickupLocation: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Hotel / Address</label>
                  <input
                    value={manualEdit.pickupAddress}
                    onChange={(e) => setManualEdit({ ...manualEdit, pickupAddress: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Hotel Pickup Details</label>
                  <input
                    value={manualEdit.hotelPickupDetails}
                    onChange={(e) => setManualEdit({ ...manualEdit, hotelPickupDetails: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Special Requests</label>
                  <textarea
                    rows={3}
                    value={manualEdit.specialRequests}
                    onChange={(e) => setManualEdit({ ...manualEdit, specialRequests: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Internal Notes</label>
                  <textarea
                    rows={3}
                    value={manualEdit.internalNotes}
                    onChange={(e) => setManualEdit({ ...manualEdit, internalNotes: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 flex justify-end gap-3 bg-slate-50">
              <button
                onClick={() => setShowManualEdit(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
                disabled={savingManualEdit}
              >
                Cancel
              </button>
              <button
                onClick={saveManualEdits}
                disabled={savingManualEdit}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50"
              >
                {savingManualEdit && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default withAuth(BookingDetailPage, { permissions: ['manageBookings'] });
