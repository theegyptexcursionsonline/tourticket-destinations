import { randomUUID } from 'node:crypto';
import RevenuePriceExecution, { type IRevenuePriceExecution } from '@/lib/models/RevenuePriceExecution';
import RevenuePriceOverride, { type GuestPrices } from '@/lib/models/RevenuePriceOverride';
import { hashRevenuePayload } from '@/lib/revenue/priceWrite';
import { RevenuePricingWriteError } from '@/lib/revenue/priceWriteGate';
import { classifyRollbackRequest } from '@/lib/revenue/priceRollbackState';

const ROLLBACK_LEASE_MS = 30_000;

function pricesAreValid(prices: GuestPrices | undefined): prices is GuestPrices {
  return Boolean(prices && ['adult', 'child', 'infant'].every((guest) => Number.isFinite(prices[guest as keyof GuestPrices]) && prices[guest as keyof GuestPrices] >= 0));
}

function pricesEqual(left: GuestPrices | undefined, right: GuestPrices | undefined) {
  return pricesAreValid(left) && pricesAreValid(right)
    && left.adult === right.adult
    && left.child === right.child
    && left.infant === right.infant;
}

function terminalResult(receipt: IRevenuePriceExecution, replayed = true) {
  if (receipt.state === 'rollback_failed') {
    return { state: 'rollback_failed' as const, receipt, effectivePrices: null, replayed, reason: receipt.rollbackFailureReason || 'Rollback failed.' };
  }
  if (receipt.state === 'rollback_applied') {
    return { state: 'rollback_applied' as const, receipt, effectivePrices: receipt.previousPrices || null, replayed };
  }
  return { state: 'rollback_pending' as const, receipt, effectivePrices: null, replayed };
}

async function latestResult(id: unknown) {
  const latest = await RevenuePriceExecution.findById(id).lean<IRevenuePriceExecution | null>();
  if (!latest) throw new RevenuePricingWriteError(404, 'EXECUTION_NOT_FOUND', 'Execution not found.');
  return terminalResult(latest);
}

export async function rollbackPriceExecution(
  executionId: string,
  idempotencyKey: string,
  bodyText: string,
  tenantId: string,
) {
  const requestHash = hashRevenuePayload(bodyText);
  const original = await RevenuePriceExecution.findOne({ executionId, tenantId }).lean<IRevenuePriceExecution | null>();
  if (!original) throw new RevenuePricingWriteError(404, 'EXECUTION_NOT_FOUND', 'Execution not found.');

  let disposition = classifyRollbackRequest(original, idempotencyKey, requestHash);
  if (disposition === 'idempotency_key_conflict') {
    throw new RevenuePricingWriteError(409, 'ROLLBACK_IDEMPOTENCY_CONFLICT', 'This execution is already bound to another rollback idempotency key.');
  }
  if (disposition === 'idempotency_payload_mismatch') {
    throw new RevenuePricingWriteError(409, 'IDEMPOTENCY_PAYLOAD_MISMATCH', 'This rollback Idempotency-Key is already bound to a different request body.');
  }
  if (disposition === 'terminal_replay') return terminalResult(original);
  if (disposition === 'in_progress') return terminalResult(original);
  if (disposition === 'unavailable') {
    throw new RevenuePricingWriteError(409, 'ROLLBACK_UNAVAILABLE', 'Execution is not in a state that can be rolled back.');
  }
  if (original.appliedVersion === undefined || !pricesAreValid(original.previousPrices) || !pricesAreValid(original.effectivePrices)) {
    throw new RevenuePricingWriteError(409, 'ROLLBACK_UNAVAILABLE', 'Execution does not contain a complete applied price snapshot.');
  }

  // The original execution was tenant-scoped and admitted by the forward
  // write gate. Rollback remains available after operators disable writes or
  // clear the canary allowlist during an incident; exact execution, tenant,
  // idempotency key and applied override version still fence the mutation.
  const claimToken = randomUUID();
  const now = new Date();
  const rollbackExecutionId = original.rollbackExecutionId || `${executionId}:rollback`;
  const commonSet = {
    state: 'rollback_pending',
    rollbackExecutionId,
    rollbackIdempotencyKey: idempotencyKey,
    rollbackRequestHash: requestHash,
    rollbackClaimToken: claimToken,
    rollbackClaimExpiresAt: new Date(now.getTime() + ROLLBACK_LEASE_MS),
  };

  let claimed: IRevenuePriceExecution | null;
  if (disposition === 'claimable') {
    claimed = await RevenuePriceExecution.findOneAndUpdate(
      {
        _id: original._id,
        state: { $in: ['applied', 'verified', 'replayed'] },
        $or: [{ rollbackIdempotencyKey: { $exists: false } }, { rollbackIdempotencyKey: null }],
      },
      {
        $set: commonSet,
        $push: { events: { type: 'rollback_started', at: now.toISOString() } },
      },
      { new: true },
    ).lean<IRevenuePriceExecution | null>();
  } else {
    claimed = await RevenuePriceExecution.findOneAndUpdate(
      {
        _id: original._id,
        state: 'rollback_pending',
        rollbackIdempotencyKey: idempotencyKey,
        rollbackRequestHash: requestHash,
        $or: [
          { rollbackClaimExpiresAt: { $lte: now } },
          { rollbackClaimExpiresAt: { $exists: false } },
          { rollbackClaimExpiresAt: null },
        ],
      },
      {
        $set: commonSet,
        $push: { events: { type: 'rollback_resumed', at: now.toISOString() } },
      },
      { new: true },
    ).lean<IRevenuePriceExecution | null>();
  }

  if (!claimed) {
    const latest = await RevenuePriceExecution.findById(original._id).lean<IRevenuePriceExecution | null>();
    if (!latest) throw new RevenuePricingWriteError(404, 'EXECUTION_NOT_FOUND', 'Execution not found.');
    disposition = classifyRollbackRequest(latest, idempotencyKey, requestHash);
    if (disposition === 'idempotency_key_conflict') {
      throw new RevenuePricingWriteError(409, 'ROLLBACK_IDEMPOTENCY_CONFLICT', 'This execution is already bound to another rollback idempotency key.');
    }
    if (disposition === 'idempotency_payload_mismatch') {
      throw new RevenuePricingWriteError(409, 'IDEMPOTENCY_PAYLOAD_MISMATCH', 'This rollback Idempotency-Key is already bound to a different request body.');
    }
    return terminalResult(latest);
  }

  const target = {
    tenantId: claimed.tenantId,
    tourId: claimed.target.tourId,
    optionKey: claimed.target.optionKey,
    date: claimed.target.date,
    time: claimed.target.time,
    active: true,
  };
  const nextVersion = claimed.appliedVersion! + 1;
  let updated = await RevenuePriceOverride.findOneAndUpdate(
    { ...target, executionId, version: claimed.appliedVersion },
    {
      $set: {
        prices: claimed.previousPrices,
        previousPrices: claimed.effectivePrices,
        version: nextVersion,
        source: 'revenuepilot',
        executionId: rollbackExecutionId,
        revertedAt: new Date(),
      },
    },
    { new: true, runValidators: true },
  ).lean<{ prices: GuestPrices; version: number; executionId: string } | null>();

  let recovered = false;
  if (!updated) {
    const existingOverride = await RevenuePriceOverride.findOne(target)
      .select('prices version executionId')
      .lean<{ prices: GuestPrices; version: number; executionId: string } | null>();
    if (existingOverride?.executionId === rollbackExecutionId
      && existingOverride.version === nextVersion
      && pricesEqual(existingOverride.prices, claimed.previousPrices)) {
      updated = existingOverride;
      recovered = true;
    }
  }

  const state = updated ? 'rollback_applied' as const : 'rollback_failed' as const;
  const failureReason = updated ? undefined : 'Rollback could not claim the exact applied override version; further writes require operator review.';
  const finalized = await RevenuePriceExecution.findOneAndUpdate(
    { _id: claimed._id, state: 'rollback_pending', rollbackClaimToken: claimToken },
    {
      $set: { state, ...(failureReason ? { rollbackFailureReason: failureReason } : {}) },
      $unset: { rollbackClaimToken: 1, rollbackClaimExpiresAt: 1, ...(updated ? { rollbackFailureReason: 1 } : {}) },
      $push: { events: { type: state, recovered, reason: failureReason, at: new Date().toISOString() } },
    },
    { new: true },
  ).lean<IRevenuePriceExecution | null>();
  if (!finalized) return latestResult(claimed._id);
  return updated
    ? { state, receipt: finalized, effectivePrices: updated.prices, replayed: false, recovered, overrideVersion: updated.version }
    : { state, receipt: finalized, effectivePrices: null, replayed: false, recovered, reason: failureReason };
}
