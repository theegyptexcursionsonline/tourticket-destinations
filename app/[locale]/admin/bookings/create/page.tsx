// app/admin/bookings/create/page.tsx
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import withAuth from '@/components/admin/withAuth';
import { useRouter } from '@/i18n/navigation';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Mail,
  Phone,
  Globe,
  ClipboardList,
  CreditCard,
  Save,
  Loader2,
  Tag,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { useAdminTenant } from '@/contexts/AdminTenantContext';
import { useAdminAuth } from '@/contexts/AdminAuthContext';

type PaymentStatus = 'pending' | 'paid' | 'pay_on_arrival';
type PaymentMethodUi = 'cash' | 'card' | 'bank' | 'other';

interface TourOptionLite {
  id: string;
  title: string;
  tenantId?: string;
}

interface TourOptionApiOption {
  id: string;
  title: string;
  type?: string;
  price: number;
  originalPrice?: number;
  duration?: string;
  badge?: string;
  timeSlots?: Array<{ id: string; time: string; available?: number; price?: number }>;
}

interface OfferBestResponse {
  success: boolean;
  data?: {
    bestOffer: null | {
      originalPrice: number;
      discountedPrice: number;
      discountAmount: number;
      discountPercentage: number;
      offer: { _id: string; name: string; type: string; discountValue: number; endDate: string };
      displayText: string;
      timeRemaining: string;
      showUrgency: boolean;
    };
  };
}

type BestOfferPreview = NonNullable<OfferBestResponse['data']>['bestOffer'];

const COUNTRIES = [
  'Egypt',
  'United States',
  'United Kingdom',
  'Germany',
  'France',
  'Italy',
  'Spain',
  'Netherlands',
  'Poland',
  'Russia',
  'Saudi Arabia',
  'United Arab Emirates',
  'Kuwait',
  'Qatar',
  'Bahrain',
  'Oman',
  'India',
  'Pakistan',
  'Canada',
  'Australia',
  'Other',
];

function splitName(fullName: string): { firstName: string; lastName: string } {
  const safe = String(fullName || '').trim();
  if (!safe) return { firstName: '', lastName: '' };
  const parts = safe.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

function isValidEmail(email: string): boolean {
  return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(String(email || '').trim());
}

export default withAuth(function CreateManualBookingPage() {
  const router = useRouter();
  const { token } = useAdminAuth();
  const { tenants, selectedTenantId, isAllTenantsSelected } = useAdminTenant();

  // Brand selection (required)
  const [tenantId, setTenantId] = useState<string>(() => (selectedTenantId && selectedTenantId !== 'all' ? selectedTenantId : ''));

  // Tour selection (filtered by brand)
  const [tourOptions, setTourOptions] = useState<TourOptionLite[]>([]);
  const [tourId, setTourId] = useState('');
  const [tourSearch, setTourSearch] = useState('');
  const [isLoadingTours, setIsLoadingTours] = useState(false);

  // Tour options (booking options)
  const [bookingOptions, setBookingOptions] = useState<TourOptionApiOption[]>([]);
  const [bookingOptionType, setBookingOptionType] = useState(''); // maps to Tour.bookingOptions[].type
  const [isLoadingBookingOptions, setIsLoadingBookingOptions] = useState(false);

  // Date/time
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState<string>('');

  // Participants
  const [adults, setAdults] = useState<number>(1);
  const [children, setChildren] = useState<number>(0);
  const [infants, setInfants] = useState<number>(0);

  // Customer
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerCountry, setCustomerCountry] = useState('Egypt');
  const [specialRequests, setSpecialRequests] = useState('');

  // Pickup
  const [pickupLocation, setPickupLocation] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');

  // Payment
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('paid');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodUi>('cash');
  const [amountPaid, setAmountPaid] = useState<string>('');

  // Internal
  const [internalNotes, setInternalNotes] = useState('');
  const [sendEmail, setSendEmail] = useState(true);

  // Pricing preview
  const selectedBookingOption = useMemo(() => bookingOptions.find((o) => (o.type || '') === bookingOptionType) || null, [bookingOptions, bookingOptionType]);
  const basePrice = Number(selectedBookingOption?.price || 0);
  const subtotal = useMemo(() => basePrice * Math.max(0, adults) + (basePrice / 2) * Math.max(0, children), [basePrice, adults, children]);
  const totalGuests = useMemo(() => Math.max(0, adults) + Math.max(0, children) + Math.max(0, infants), [adults, children, infants]);

  const [offerPreview, setOfferPreview] = useState<BestOfferPreview>(null);
  const [isLoadingOffer, setIsLoadingOffer] = useState(false);

  const computedTotal = useMemo(() => {
    if (offerPreview?.discountedPrice !== undefined && offerPreview?.discountedPrice !== null) {
      return Number(offerPreview.discountedPrice) || subtotal;
    }
    return subtotal;
  }, [offerPreview, subtotal]);

  // Initialize brand selection from global filter if set
  useEffect(() => {
    if (!tenantId && selectedTenantId && selectedTenantId !== 'all') {
      setTenantId(selectedTenantId);
    }
  }, [selectedTenantId, tenantId]);

  // Fetch tours for tenant
  const fetchTours = useCallback(async () => {
    if (!tenantId) return;
    setIsLoadingTours(true);
    try {
      const params = new URLSearchParams();
      params.set('tenantId', tenantId);
      if (tourSearch.trim()) params.set('q', tourSearch.trim());
      params.set('limit', '200');
      const res = await fetch(`/api/admin/tours/options?${params.toString()}`);
      const data = await res.json();
      if (data?.success) {
        setTourOptions(data.data || []);
      } else {
        setTourOptions([]);
      }
    } catch (e) {
      console.warn('Failed to fetch tours', e);
      setTourOptions([]);
    } finally {
      setIsLoadingTours(false);
    }
  }, [tenantId, tourSearch]);

  useEffect(() => {
    fetchTours();
  }, [fetchTours]);

  // Fetch booking options for selected tour
  useEffect(() => {
    const run = async () => {
      if (!tourId) return;
      setIsLoadingBookingOptions(true);
      setBookingOptions([]);
      setBookingOptionType('');
      setTime('');
      try {
        const res = await fetch(`/api/tours/${encodeURIComponent(tourId)}/options`);
        const data = await res.json();
        const options = Array.isArray(data) ? (data as TourOptionApiOption[]) : [];
        setBookingOptions(options);
        // Default option
        const first = options[0];
        if (first?.type) {
          setBookingOptionType(first.type);
          // Default time slot if available
          const firstTime = first?.timeSlots?.[0]?.time;
          if (firstTime) setTime(firstTime);
        }
      } catch (e) {
        console.error('Failed to load booking options', e);
        toast.error('Failed to load tour options');
      } finally {
        setIsLoadingBookingOptions(false);
      }
    };
    run();
  }, [tourId]);

  // When booking option changes, default time slot
  useEffect(() => {
    if (!selectedBookingOption) return;
    const firstTime = selectedBookingOption.timeSlots?.[0]?.time;
    if (firstTime && !time) setTime(firstTime);
  }, [selectedBookingOption, time]);

  // Offer preview
  useEffect(() => {
    const run = async () => {
      if (!tourId || !bookingOptionType || !date || totalGuests < 1) {
        setOfferPreview(null);
        return;
      }
      setIsLoadingOffer(true);
      try {
        const params = new URLSearchParams();
        params.set('travelDate', `${date}T00:00:00.000Z`);
        params.set('groupSize', String(totalGuests));
        params.set('optionType', bookingOptionType);
        const res = await fetch(`/api/offers/tour/${encodeURIComponent(tourId)}?${params.toString()}`);
        const data: OfferBestResponse = await res.json();
        setOfferPreview(data?.data?.bestOffer || null);
      } catch {
        setOfferPreview(null);
      } finally {
        setIsLoadingOffer(false);
      }
    };
    run();
  }, [tourId, bookingOptionType, date, totalGuests]);

  const canSubmit = useMemo(() => {
    if (!token) return false;
    if (!tenantId) return false;
    if (!tourId) return false;
    if (!bookingOptionType) return false;
    if (!date || !time) return false;
    if (totalGuests < 1) return false;
    if (!customerName.trim()) return false;
    if (!isValidEmail(customerEmail)) return false;
    if (!customerPhone.trim()) return false;
    return true;
  }, [token, tenantId, tourId, bookingOptionType, date, time, totalGuests, customerName, customerEmail, customerPhone]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !token) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/bookings/manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tenantId,
          tourId,
          bookingOptionType,
          date,
          time,
          adults,
          children,
          infants,
          customerName,
          customerEmail,
          customerPhone,
          customerCountry,
          specialRequests: specialRequests || undefined,
          pickupLocation: pickupLocation || undefined,
          pickupAddress: pickupAddress || undefined,
          paymentStatus,
          paymentMethod,
          amountPaid: amountPaid ? Number(amountPaid) : undefined,
          internalNotes: internalNotes || undefined,
          sendConfirmationEmail: sendEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to create booking');
      }
      toast.success(`Manual booking created: ${data.data.bookingReference}`);
      router.push('/admin/bookings');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to create booking');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    canSubmit,
    token,
    tenantId,
    tourId,
    bookingOptionType,
    date,
    time,
    adults,
    children,
    infants,
    customerName,
    customerEmail,
    customerPhone,
    customerCountry,
    specialRequests,
    pickupLocation,
    pickupAddress,
    paymentStatus,
    paymentMethod,
    amountPaid,
    internalNotes,
    sendEmail,
    router,
  ]);

  const timeSlotsForSelected = useMemo(() => {
    return selectedBookingOption?.timeSlots?.map((s) => s.time).filter(Boolean) || [];
  }, [selectedBookingOption]);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/admin/bookings')}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-600"
            aria-label="Back to bookings"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Create Manual Booking</h1>
            <p className="text-sm text-slate-500">Phone / walk-in / corporate bookings</p>
          </div>
        </div>
      </div>

      {isAllTenantsSelected() && !tenantId && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">Brand selection required</p>
            <p className="text-sm text-amber-700">Select a brand below to load tours and create a booking.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Brand / Tour / Option */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Tag className="w-4 h-4 text-emerald-600" />
              Booking Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Brand *</label>
                <select
                  value={tenantId}
                  onChange={(e) => {
                    setTenantId(e.target.value);
                    setTourId('');
                    setBookingOptions([]);
                    setBookingOptionType('');
                    setTime('');
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Select brand…</option>
                  {tenants.map((t) => (
                    <option key={t.tenantId} value={t.tenantId}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Search Tours</label>
                <input
                  value={tourSearch}
                  onChange={(e) => setTourSearch(e.target.value)}
                  placeholder="Type to filter tours…"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  disabled={!tenantId}
                />
                <p className="text-xs text-slate-500 mt-1">Filtered by selected brand.</p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Tour *</label>
                <select
                  value={tourId}
                  onChange={(e) => setTourId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  disabled={!tenantId || isLoadingTours}
                >
                  <option value="">{isLoadingTours ? 'Loading tours…' : 'Select tour…'}</option>
                  {tourOptions.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tour Option *</label>
                <select
                  value={bookingOptionType}
                  onChange={(e) => {
                    setBookingOptionType(e.target.value);
                    setTime('');
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  disabled={!tourId || isLoadingBookingOptions}
                >
                  <option value="">{isLoadingBookingOptions ? 'Loading options…' : 'Select option…'}</option>
                  {bookingOptions.map((o) => (
                    <option key={o.id} value={o.type || ''}>
                      {o.title} — ${Number(o.price || 0).toFixed(2)}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">Price is used for calculation (children are 50% of adult).</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
                <div className="relative">
                  <Calendar className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full ps-10 pe-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Time *</label>
                {timeSlotsForSelected.length > 0 ? (
                  <select
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                    disabled={!bookingOptionType}
                  >
                    <option value="">Select time…</option>
                    {timeSlotsForSelected.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="relative">
                    <Clock className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full ps-10 pe-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                      disabled={!bookingOptionType}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Participants */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-600" />
              Participants
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Adults *</label>
                <input
                  type="number"
                  min={0}
                  value={adults}
                  onChange={(e) => setAdults(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Children</label>
                <input
                  type="number"
                  min={0}
                  value={children}
                  onChange={(e) => setChildren(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Infants</label>
                <input
                  type="number"
                  min={0}
                  value={infants}
                  onChange={(e) => setInfants(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Total participants: <span className="font-medium">{totalGuests}</span>
            </p>
          </div>

          {/* Customer Details */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Mail className="w-4 h-4 text-emerald-600" />
              Customer Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Customer full name"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Parsed as: <span className="font-medium">{splitName(customerName).firstName || '-'}</span> /{' '}
                  <span className="font-medium">{splitName(customerName).lastName || '-'}</span>
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                <input
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone *</label>
                <div className="relative">
                  <Phone className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+20 ..."
                    className="w-full ps-10 pe-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
                <div className="relative">
                  <Globe className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <select
                    value={customerCountry}
                    onChange={(e) => setCustomerCountry(e.target.value)}
                    className="w-full ps-10 pe-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Special Requests</label>
                <textarea
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  placeholder="Any special requests…"
                />
              </div>
            </div>
          </div>

          {/* Pickup */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-emerald-600" />
              Pickup Details (Optional)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Pickup Location</label>
                <input
                  value={pickupLocation}
                  onChange={(e) => setPickupLocation(e.target.value)}
                  placeholder="e.g., Hurghada / El Gouna"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Hotel / Address</label>
                <input
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  placeholder="Hotel name or address"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Payment */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              Payment
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Payment Status *</label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="pay_on_arrival">Pay on Arrival</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method *</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethodUi)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount Paid (partial)</label>
                <input
                  type="number"
                  min={0}
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <input
                id="sendEmail"
                type="checkbox"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="sendEmail" className="text-sm font-medium text-slate-700">
                Send confirmation email (default: on)
              </label>
            </div>
          </div>

          {/* Internal Notes */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-emerald-600" />
              Internal Notes (Not visible to customer)
            </h2>
            <textarea
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
              placeholder="Internal notes for operators…"
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              className="flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Create Booking
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-4">Pricing Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Adults</span>
                <span className="font-medium text-slate-800">{adults}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Children</span>
                <span className="font-medium text-slate-800">{children}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Infants</span>
                <span className="font-medium text-slate-800">{infants}</span>
              </div>
              <div className="pt-3 border-t border-slate-200 flex justify-between">
                <span className="text-slate-600">Subtotal</span>
                <span className="font-semibold text-slate-900">${subtotal.toFixed(2)}</span>
              </div>

              {isLoadingOffer ? (
                <div className="flex items-center gap-2 text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Checking offers…
                </div>
              ) : offerPreview ? (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-amber-800">{offerPreview.displayText}</span>
                    <span className="text-amber-700 font-bold">-${offerPreview.discountAmount.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-amber-700 mt-1">{offerPreview.offer.name}</p>
                  {offerPreview.showUrgency && (
                    <p className="text-xs text-rose-700 mt-1">Ends {offerPreview.timeRemaining}</p>
                  )}
                </div>
              ) : (
                <div className="text-slate-500">No active offers applied.</div>
              )}

              <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
                <span className="text-slate-600">Total</span>
                <span className="text-2xl font-extrabold text-emerald-700">${computedTotal.toFixed(2)}</span>
              </div>
              <p className="text-xs text-slate-500">
                Final total is recalculated on the server (including best offer) when you submit.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}, { permissions: ['manageBookings'] });


