import { randomUUID } from 'node:crypto';
import CheckoutAttemptLease from '@/lib/models/CheckoutAttemptLease';

export const CHECKOUT_ATTEMPT_LEASE_MS = 60 * 1000;

const isDuplicateKeyError = (error: unknown): boolean =>
  Boolean(error) && (error as { code?: number }).code === 11000;

/**
 * Claim this shopping attempt's checkout page for a moment, or return null when
 * another request already holds it.
 *
 * An upsert whose filter only matches a lapsed lease is the whole mechanism: if
 * a live lease exists the filter misses, the upsert tries to insert, and the
 * unique index rejects it. A rejected insert therefore means "held", not
 * "broken" — the caller asks the guest to try again rather than opening a second
 * payable Stripe page.
 */
export async function acquireCheckoutAttemptLease(
  tenantId: string,
  checkoutAttemptId: string,
): Promise<string | null> {
  const now = new Date();
  const leaseToken = randomUUID();
  try {
    const lease = await CheckoutAttemptLease.findOneAndUpdate(
      { tenantId, checkoutAttemptId, leaseExpiresAt: { $lte: now } },
      {
        $set: { leaseToken, leaseExpiresAt: new Date(now.getTime() + CHECKOUT_ATTEMPT_LEASE_MS) },
        $setOnInsert: { tenantId, checkoutAttemptId },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean<{ leaseToken?: string } | null>();
    return lease?.leaseToken === leaseToken ? leaseToken : null;
  } catch (error) {
    if (isDuplicateKeyError(error)) return null;
    throw error;
  }
}

/**
 * Give the claim back. Scoped to our own token so a request whose lease already
 * lapsed can never release the successor's claim.
 */
export async function releaseCheckoutAttemptLease(
  tenantId: string,
  checkoutAttemptId: string,
  leaseToken: string,
): Promise<void> {
  await CheckoutAttemptLease.deleteOne({ tenantId, checkoutAttemptId, leaseToken });
}
