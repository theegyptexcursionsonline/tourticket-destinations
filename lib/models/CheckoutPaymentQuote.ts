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
  status: 'open' | 'paid' | 'expired' | 'refunded';
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
  status: { type: String, enum: ['open', 'paid', 'expired', 'refunded'], required: true, default: 'open' },
  expiresAt: { type: Date, required: true },
}, { timestamps: true, minimize: false });

CheckoutPaymentQuoteSchema.index(
  { tenantId: 1, quoteBinding: 1 },
  { unique: true, name: 'tenant_checkout_quote_unique' },
);
CheckoutPaymentQuoteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

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
