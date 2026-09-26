import { randomUUID } from 'node:crypto';
import CheckoutAttemptLease from '@/lib/models/CheckoutAttemptLease';

/**
 * Deliberately shorter than the platform's function limit (26s, netlify.toml).
 * A lease that outlives the invocation holding it locks the guest out of paying
 * long after they were shown an error, and leaves a zombie request able to act
 * on a claim it no longer owns.
 */
export const CHECKOUT_ATTEMPT_LEASE_MS = 20 * 1000;

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
 * Is this claim still ours, and still live?
 *
 * Checked again immediately before anything that opens a payable page, because
 * the close work before it can outlast the lease. Without this fence a request
 * that ran past its deadline races the request that took over and both open a
 * page. A lease that cannot be read counts as lost: fail closed.
 */
export async function holdsCheckoutAttemptLease(
  tenantId: string,
  checkoutAttemptId: string,
  leaseToken: string,
): Promise<boolean> {
  try {
    const lease = await CheckoutAttemptLease.findOne({
      tenantId,
      checkoutAttemptId,
      leaseToken,
      leaseExpiresAt: { $gt: new Date() },
    }).lean<{ _id?: unknown } | null>();
    return Boolean(lease);
  } catch {
    return false;
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
