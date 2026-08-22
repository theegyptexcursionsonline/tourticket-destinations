import { createHash } from 'node:crypto';
import dbConnect from '@/lib/dbConnect';
import { CartMetadataTooLargeError, packCartMetadata } from '@/lib/checkout/cartMetadata';
import { normalizeCheckoutAttemptId } from '@/lib/checkout/checkoutAttempt';
import {
  paymentExperienceOrDefault,
  type PaymentExperience,
} from '@/lib/checkout/paymentExperience';
import { resolveExecutablePaymentMethods } from '@/lib/payments/paymentProviderPolicy';
import {
  calculateCheckoutPricing,
  checkoutCustomerRef,
  checkoutFingerprint,
} from '@/lib/security/checkoutPricing';
import { getTenantConfigCached, getTenantFromRequest } from '@/lib/tenant';

type CheckoutCustomer = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  emergencyContact?: string;
  hotelPickupDetails?: string;
  hotelPickupLocation?: { lat: number; lng: number; name?: string; address?: string; placeId?: string };
  specialRequests?: string;
};

export type PreparedStripeCheckout = {
  tenantId: string;
  tenantName: string;
  tenantDomain: string;
  paymentExperience: PaymentExperience;
  checkoutAttemptId: string;
  quoteBinding: string;
  customer: CheckoutCustomer;
  cart: Array<Record<string, unknown>>;
  cartSummary: Array<Record<string, unknown>>;
  pricing: {
    subtotal: number;
    serviceFee: number;
    tax: number;
    discount: number;
    total: number;
    currency: string;
  };
  discountCode?: string;
  locale: string;
  amountMinor: number;
  currency: string;
  metadata: Record<string, string>;
};

export class StripeCheckoutInputError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'StripeCheckoutInputError';
  }
}

function text(value: unknown, maximum: number, required = false): string | undefined {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (required && !normalized) throw new StripeCheckoutInputError(400, 'INCOMPLETE_CUSTOMER', 'Please complete your contact information.');
  if (!normalized) return undefined;
  if (normalized.length > maximum) throw new StripeCheckoutInputError(400, 'INVALID_CUSTOMER_DETAILS', 'One or more contact fields are too long.');
  return normalized;
}

function location(value: unknown): CheckoutCustomer['hotelPickupLocation'] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const item = value as Record<string, unknown>;
  const lat = Number(item.lat);
  const lng = Number(item.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return undefined;
  return {
    lat,
    lng,
    name: text(item.name, 200),
    address: text(item.address, 300),
    placeId: text(item.placeId, 200),
  };
}

async function boundedJson(request: Request): Promise<Record<string, unknown>> {
  const contentLength = Number(request.headers.get('content-length') || '0');
  if (contentLength > 128 * 1024) {
    throw new StripeCheckoutInputError(413, 'PAYLOAD_TOO_LARGE', 'Checkout information is too large.');
  }
  const raw = await request.text();
  if (raw.length > 128 * 1024) {
    throw new StripeCheckoutInputError(413, 'PAYLOAD_TOO_LARGE', 'Checkout information is too large.');
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not an object');
    return parsed as Record<string, unknown>;
  } catch {
    throw new StripeCheckoutInputError(400, 'INVALID_JSON', 'Checkout information is invalid.');
  }
}

function customerFrom(value: unknown): CheckoutCustomer {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new StripeCheckoutInputError(400, 'INCOMPLETE_CUSTOMER', 'Please complete your contact information.');
  }
  const item = value as Record<string, unknown>;
  const email = String(text(item.email, 254, true)).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new StripeCheckoutInputError(400, 'INVALID_EMAIL', 'Please provide a valid email address.');
  }
  return {
    email,
    firstName: String(text(item.firstName, 100, true)),
    lastName: String(text(item.lastName, 100, true)),
    phone: String(text(item.phone, 50, true)),
    emergencyContact: text(item.emergencyContact, 200),
    hotelPickupDetails: text(item.hotelPickupDetails, 300),
    hotelPickupLocation: location(item.hotelPickupLocation),
    specialRequests: text(item.specialRequests, 2_000),
  };
}

function publicTenantOrigin(domain: string): string {
  const candidate = /^https?:\/\//i.test(domain) ? domain : `https://${domain}`;
  const url = new URL(candidate);
  const local = process.env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1'].includes(url.hostname);
  if ((!local && url.protocol !== 'https:') || url.username || url.password || (!local && url.port)) {
    throw new Error('Tenant checkout domain is invalid.');
  }
  return url.origin;
}

export async function prepareStripeCheckout(
  request: Request,
  endpoint: 'payment-element' | 'hosted',
): Promise<PreparedStripeCheckout> {
  const body = await boundedJson(request);
  const customer = customerFrom(body.customer);
  const submittedCart = body.cart;
  const discountCode = typeof body.discountCode === 'string' && body.discountCode.trim()
    ? body.discountCode.trim().toUpperCase()
    : undefined;
  if (discountCode && (discountCode.length > 64 || !/^[A-Z0-9_-]+$/.test(discountCode))) {
    throw new StripeCheckoutInputError(400, 'INVALID_DISCOUNT_CODE', 'Enter a valid promotional code.');
  }
  const checkoutAttemptId = normalizeCheckoutAttemptId(body.checkoutAttemptId);
  if (!checkoutAttemptId) {
    throw new StripeCheckoutInputError(400, 'INVALID_CHECKOUT_ATTEMPT', 'Please restart checkout and try again.');
  }

  await dbConnect();
  const tenantId = await getTenantFromRequest();
  const tenantConfig = await getTenantConfigCached(tenantId);
  if (!tenantConfig) {
    throw new StripeCheckoutInputError(404, 'TENANT_NOT_FOUND', 'This website is not available for checkout.');
  }
  const methods = resolveExecutablePaymentMethods(tenantConfig.payments?.supportedPaymentMethods ?? ['card']);
  if (!methods.includes('card')) {
    throw new StripeCheckoutInputError(409, 'CARD_PAYMENT_DISABLED', 'Online card payment is not available for this website.');
  }

  const paymentExperience = paymentExperienceOrDefault(tenantConfig.payments?.paymentExperience);
  const endpointMatches = endpoint === 'hosted'
    ? paymentExperience === 'hosted'
    : paymentExperience !== 'hosted';
  if (!endpointMatches) {
    throw new StripeCheckoutInputError(
      409,
      'PAYMENT_EXPERIENCE_MISMATCH',
      'The checkout presentation changed. Refresh the page and try again.',
    );
  }

  const validated = await calculateCheckoutPricing(submittedCart, tenantId, discountCode);
  const currency = String(tenantConfig.payments?.currency || 'USD').toLowerCase();
  const pricing = { ...validated.pricing, currency: currency.toUpperCase() };
  const fingerprint = checkoutFingerprint(validated.cart, tenantId, currency);
  const customerRef = checkoutCustomerRef(customer.email);
  const cartSummary = validated.cart.map((item: Record<string, any>, index: number) => ({
    i: index,
    t: item._id || item.id,
    d: item.selectedDate,
    tm: item.selectedTime || '10:00',
    a: item.quantity || 1,
    c: item.childQuantity || 0,
    n: item.infantQuantity || 0,
    bp: item.selectedBookingOption?.price || item.discountPrice || item.price || 0,
    bo: item.selectedBookingOption?.id || '',
    bot: item.selectedBookingOption?.title || '',
    boty: item.selectedBookingOption?.type || '',
    ao: Object.entries(item.selectedAddOns || {}).map(([id, quantity]) => ({
      id,
      q: Number(quantity),
      p: item.selectedAddOnDetails?.[id]?.price || 0,
      pg: Boolean(item.selectedAddOnDetails?.[id]?.perGuest),
      t: item.selectedAddOnDetails?.[id]?.title || '',
    })),
  }));

  let packedCart: Record<string, string>;
  try {
    packedCart = packCartMetadata(cartSummary);
  } catch (error) {
    if (!(error instanceof CartMetadataTooLargeError)) throw error;
    throw new StripeCheckoutInputError(
      400,
      'CART_TOO_LARGE',
      'This booking has too many items to process in one payment. Please book them in two smaller orders.',
    );
  }

  const amountMinor = Math.round(pricing.total * 100);
  const quoteBinding = createHash('sha256').update(JSON.stringify({
    tenantId,
    checkoutAttemptId,
    fingerprint,
    customerRef,
    amountMinor,
    currency,
    discountCode: discountCode || '',
  })).digest('hex');
  const locale = typeof body.locale === 'string' && ['en', 'de', 'es', 'fr', 'ru'].includes(body.locale)
    ? body.locale
    : 'en';

  return {
    tenantId,
    tenantName: tenantConfig.name,
    tenantDomain: publicTenantOrigin(tenantConfig.domain),
    paymentExperience,
    checkoutAttemptId,
    quoteBinding,
    customer,
    cart: validated.cart,
    cartSummary,
    pricing,
    discountCode,
    locale,
    amountMinor,
    currency,
    metadata: {
      has_booking_data: 'true',
      tenant_id: tenantId,
      checkout_fingerprint: fingerprint,
      customer_ref: customerRef,
      customer_email: customer.email,
      customer_first_name: customer.firstName,
      customer_last_name: customer.lastName,
      ...packedCart,
      pricing_total: String(pricing.total),
      pricing_subtotal: String(pricing.subtotal || 0),
      pricing_service_fee: String(pricing.serviceFee || 0),
      pricing_tax: String(pricing.tax || 0),
      pricing_discount: String(pricing.discount || 0),
      pricing_currency: pricing.currency,
      discount_code: discountCode || 'none',
      checkout_experience: paymentExperience,
      checkout_attempt_id: checkoutAttemptId,
      quote_binding: quoteBinding,
      tour_count: String(validated.cart.length),
    },
  };
}

export function checkoutInputErrorResponse(error: unknown): Response | null {
  if (!(error instanceof StripeCheckoutInputError)) return null;
  return Response.json(
    { success: false, code: error.code, message: error.message },
    { status: error.status, headers: { 'Cache-Control': 'no-store' } },
  );
}
