import mongoose, { type Document, type Model, Schema } from 'mongoose';
import type { PaymentExperience } from '@/lib/checkout/paymentExperience';

export interface ICheckoutPaymentQuote extends Document {
  tenantId: string;
  quoteBinding: string;
  checkoutAttemptId: string;
  checkoutSessionId: string;
  paymentIntentId?: string;
  paymentExperience: PaymentExperience;
  customer: Record<string, unknown>;
  cart: unknown[];
  cartSummary: unknown[];
  pricing: {
    subtotal: number;
    serviceFee: number;
    tax: number;
    discount: number;
    total: number;
    currency: string;
  };
  discountCode?: string;
  status: 'open' | 'paid' | 'expired' | 'refunded' | 'superseded';
  /** When the current Stripe Checkout page stops being payable. */
  checkoutExpiresAt?: Date;
  /** Earlier pages of the same attempt; still reachable from a return link. */
  supersededSessionIds?: string[];
  /** Retention deadline for the record itself, well after the page expires. */
  expiresAt: Date;
}

const CheckoutPaymentQuoteSchema = new Schema<ICheckoutPaymentQuote>({
  tenantId: { type: String, required: true, index: true },
  quoteBinding: { type: String, required: true, match: /^[a-f0-9]{64}$/ },
  checkoutAttemptId: {
    type: String,
    required: true,
    lowercase: true,
    match: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  },
  checkoutSessionId: { type: String, required: true, unique: true, index: true },
  paymentIntentId: { type: String, index: true, sparse: true },
  paymentExperience: { type: String, enum: ['inline', 'modal', 'hosted'], required: true },
  customer: { type: Schema.Types.Mixed, required: true },
  cart: { type: [Schema.Types.Mixed], required: true },
  cartSummary: { type: [Schema.Types.Mixed], required: true },
  pricing: {
    subtotal: { type: Number, required: true },
    serviceFee: { type: Number, required: true },
    tax: { type: Number, required: true },
    discount: { type: Number, required: true },
    total: { type: Number, required: true },
    currency: { type: String, required: true },
  },
  discountCode: { type: String },
  status: {
    type: String,
    // `superseded` is a page we closed to open a replacement. It is not a
    // terminal state: a payment taken on that page before Stripe closed it
    // still settles the quote, so the webhook can move it to paid.
    enum: ['open', 'paid', 'expired', 'refunded', 'superseded'],
    required: true,
    default: 'open',
  },
  checkoutExpiresAt: { type: Date },
  supersededSessionIds: { type: [String], default: undefined },
  // Retention, not the payment deadline: the page dies long before the record.
  expiresAt: { type: Date, required: true },
}, { timestamps: true, minimize: false });

CheckoutPaymentQuoteSchema.index(
  { tenantId: 1, quoteBinding: 1 },
  { unique: true, name: 'tenant_checkout_quote_unique' },
);
CheckoutPaymentQuoteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
CheckoutPaymentQuoteSchema.index(
  { tenantId: 1, checkoutAttemptId: 1, status: 1 },
  { name: 'tenant_attempt_status' },
);
CheckoutPaymentQuoteSchema.index(
  { supersededSessionIds: 1 },
  { sparse: true, name: 'superseded_session_lookup' },
);

// The network shares infrastructure with the flagship, whose checkout quote
// has a different lifecycle. Keep the collections distinct so either app can
// evolve or build indexes without changing the other's money records.
const CheckoutPaymentQuote: Model<ICheckoutPaymentQuote> =
  (mongoose.models.NetworkCheckoutPaymentQuote as Model<ICheckoutPaymentQuote> | undefined)
  || mongoose.model<ICheckoutPaymentQuote>(
    'NetworkCheckoutPaymentQuote',
    CheckoutPaymentQuoteSchema,
    'networkcheckoutpaymentquotes',
  );

export default CheckoutPaymentQuote;
