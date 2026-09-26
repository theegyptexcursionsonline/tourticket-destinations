import mongoose, { type Document, type Model, Schema } from 'mongoose';

/**
 * A short claim over one shopping attempt's hosted checkout page.
 *
 * Opening a Stripe Checkout page is a multi-step money operation: read the
 * attempt's current page, close it, open a replacement, record it. Two requests
 * running that at once (a double-tapped Pay button, a retried fetch) can leave
 * two payable pages behind, which is two charges and two bookings for one
 * order. This lease lets one request at a time do it; the other is told to
 * retry. It is deliberately short, so a crashed request never locks a guest out
 * of paying for more than a minute.
 */
export interface ICheckoutAttemptLease extends Document {
  tenantId: string;
  checkoutAttemptId: string;
  leaseToken: string;
  leaseExpiresAt: Date;
}

const CheckoutAttemptLeaseSchema = new Schema<ICheckoutAttemptLease>({
  tenantId: { type: String, required: true },
  checkoutAttemptId: { type: String, required: true },
  leaseToken: { type: String, required: true },
  leaseExpiresAt: { type: Date, required: true },
}, { timestamps: true });

CheckoutAttemptLeaseSchema.index(
  { tenantId: 1, checkoutAttemptId: 1 },
  { unique: true, name: 'tenant_checkout_attempt_lease_unique' },
);
// Housekeeping only. Correctness never depends on the reaper having run: a
// lease is claimable again the moment leaseExpiresAt has passed.
CheckoutAttemptLeaseSchema.index({ leaseExpiresAt: 1 }, { expireAfterSeconds: 300 });

const CheckoutAttemptLease: Model<ICheckoutAttemptLease> =
  (mongoose.models.NetworkCheckoutAttemptLease as Model<ICheckoutAttemptLease> | undefined)
  || mongoose.model<ICheckoutAttemptLease>(
    'NetworkCheckoutAttemptLease',
    CheckoutAttemptLeaseSchema,
    'networkcheckoutattemptleases',
  );

export default CheckoutAttemptLease;
