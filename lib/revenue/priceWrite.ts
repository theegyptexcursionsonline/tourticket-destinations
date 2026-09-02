import { createHash, randomUUID } from 'node:crypto';
import RevenuePriceExecution, { type IRevenuePriceExecution } from '@/lib/models/RevenuePriceExecution';
import RevenuePriceOverride, { type GuestPrices } from '@/lib/models/RevenuePriceOverride';
import { assertRevenuePilotTourAllowed, RevenuePricingWriteError } from '@/lib/revenue/priceWriteGate';
import { classifyExistingPriceExecution } from '@/lib/revenue/priceWriteIdempotency';
import { normalizePriceDate, resolveEffectivePrice } from '@/lib/revenue/pricingResolver';
import { assertRevenuePriceTargetSellable } from '@/lib/revenue/sellableDeparture';
import type { PriceWrite } from '@/lib/revenue/priceWriteValidation';
import { assertRevenuePilotCommissioningAllowed, commissioningMovementIsSafe } from '@/lib/revenue/commissioningGate';
import mongoose, { type HydratedDocument } from 'mongoose';
export { validatePriceWrite } from '@/lib/revenue/priceWriteValidation';

const APPLY_LEASE_MS = 30_000;

const targetWithTenant = (input: PriceWrite) => ({ ...input.target, tenantId: input.tenantId });

export function hashRevenuePayload(bodyText: string) {
  return createHash('sha256').update(bodyText).digest('hex');
}

const mongoErrorCode = (error: unknown) => {
  if (!error || typeof error !== 'object' || !('code' in error)) return undefined;
  return (error as { code?: unknown }).code;
};

function movement(previous: GuestPrices, next: GuestPrices) {
  return Math.max(...(['adult', 'child', 'infant'] as const).map((guest) => {
    if (previous[guest] === 0) return next[guest] === 0 ? 0 : Infinity;
    return Math.abs(next[guest] - previous[guest]) / previous[guest] * 100;
  }));
}

async function safeEffectivePrice(input: PriceWrite) {
  try {
    return await resolveEffectivePrice(targetWithTenant(input));
  } catch {
    return null;
  }
}

async function replayExistingExecution(existing: IRevenuePriceExecution, input: PriceWrite) {
  const receipt = existing;
  if (['applied', 'verified', 'replayed'].includes(existing.state)) {
    return { receipt, effective: await safeEffectivePrice(input), state: 'replayed' as const, outcome: existing.state, replayed: true };
  }
  if (existing.state === 'conflict') {
    return { receipt, current: await safeEffectivePrice(input), state: 'conflict' as const, replayed: true };
  }
  if (existing.state === 'blocked') {
    return { receipt, current: await safeEffectivePrice(input), state: 'blocked' as const, reason: existing.blockReason || 'The original request was blocked.', replayed: true };
  }
  if (existing.state === 'rollback_applied') {
    return { receipt, effective: await safeEffectivePrice(input), state: 'rollback_applied' as const, replayed: true };
  }
  if (existing.state === 'rollback_failed') {
    return { receipt, effective: await safeEffectivePrice(input), state: 'rollback_failed' as const, replayed: true };
  }
  return { receipt, state: existing.state === 'rollback_pending' ? 'rollback_pending' as const : 'pending' as const, replayed: true };
}

async function settleClaimedIntent(
  intent: HydratedDocument<IRevenuePriceExecution>,
  claimToken: string,
  input: PriceWrite,
  state: 'blocked' | 'conflict',
  eventType: string,
  reason?: string,
  effectivePrices?: GuestPrices,
) {
  const now = new Date();
  const receipt = await RevenuePriceExecution.findOneAndUpdate(
    {
      _id: intent._id,
      state: 'pending',
      applyClaimToken: claimToken,
      applyClaimExpiresAt: { $gt: now },
    },
    {
      $set: {
        state,
        ...(reason ? { blockReason: reason } : {}),
        ...(effectivePrices ? { effectivePrices } : {}),
      },
      $unset: { applyClaimToken: 1, applyClaimExpiresAt: 1 },
      $push: { events: { type: eventType, ...(reason ? { reason } : {}), at: now.toISOString() } },
    },
    { new: true },
  ).lean<IRevenuePriceExecution | null>();
  if (receipt) return { receipt } as const;
  const latest = await RevenuePriceExecution.findById(intent._id).lean<IRevenuePriceExecution | null>();
  return {
    result: latest
      ? await replayExistingExecution(latest, input)
      : { state: 'pending' as const, replayed: true },
  } as const;
}

async function markBlocked(
  intent: HydratedDocument<IRevenuePriceExecution>,
  claimToken: string,
  input: PriceWrite,
  reason: string,
  eventType: string,
  effectivePrices?: GuestPrices,
) {
  return settleClaimedIntent(intent, claimToken, input, 'blocked', eventType, reason, effectivePrices);
}

async function markConflict(
  intent: HydratedDocument<IRevenuePriceExecution>,
  claimToken: string,
  input: PriceWrite,
  effectivePrices?: GuestPrices,
) {
  return settleClaimedIntent(intent, claimToken, input, 'conflict', 'version_conflict', undefined, effectivePrices);
}

class RevenueOverrideVersionConflict extends Error {}

async function commitClaimedPriceOverride(input: {
  intent: HydratedDocument<IRevenuePriceExecution>;
  claimToken: string;
  write: PriceWrite;
  currentPrices: GuestPrices;
  cataloguePrices: GuestPrices;
  nextVersion: number;
  date: Date;
  sellability: Record<string, unknown>;
}) {
  const session = await mongoose.startSession();
  let receipt: IRevenuePriceExecution | null = null;
  try {
    await session.withTransaction(async () => {
      receipt = null;
      const now = new Date();
      // Updating the receipt first takes the transaction's write lock on this
      // exact lease. The override and receipt then commit atomically. A stale
      // worker cannot pass this fence after another worker renews or settles
      // the claim, and a crash cannot leave only one of the two records live.
      receipt = await RevenuePriceExecution.findOneAndUpdate(
        {
          _id: input.intent._id,
          state: 'pending',
          applyClaimToken: input.claimToken,
          applyClaimExpiresAt: { $gt: now },
        },
        {
          $set: { state: 'applied', appliedVersion: input.nextVersion, effectivePrices: input.write.prices },
          $unset: { applyClaimToken: 1, applyClaimExpiresAt: 1 },
          $push: {
            events: {
              $each: [
                { type: 'sellable_departure_verified', ...input.sellability, at: now.toISOString() },
                { type: 'price_applied', at: now.toISOString() },
              ],
            },
          },
        },
        { new: true, session },
      ).lean<IRevenuePriceExecution | null>();
      if (!receipt) return;

      let override;
      try {
        override = await RevenuePriceOverride.findOneAndUpdate(
          {
            tenantId: input.write.tenantId,
            tourId: input.write.target.tourId,
            optionKey: input.write.target.optionKey,
            date: input.date,
            time: input.write.target.time,
            version: input.write.expectedVersion,
          },
          {
            $set: {
              currency: input.write.currency,
              prices: input.write.prices,
              cataloguePrices: input.cataloguePrices,
              previousPrices: input.currentPrices,
              version: input.nextVersion,
              source: 'revenuepilot',
              recommendationId: input.write.recommendationId,
              executionId: input.write.executionId,
              active: true,
            },
            $unset: { revertedAt: 1 },
          },
          {
            new: true,
            upsert: input.write.expectedVersion === 0,
            runValidators: true,
            session,
          },
        );
      } catch (error: unknown) {
        if (mongoErrorCode(error) !== 11000) throw error;
      }
      if (!override) throw new RevenueOverrideVersionConflict();
    }, {
      readConcern: { level: 'snapshot' },
      writeConcern: { w: 'majority' },
    });
    return receipt
      ? { state: 'applied' as const, receipt }
      : { state: 'lease_lost' as const };
  } catch (error: unknown) {
    if (error instanceof RevenueOverrideVersionConflict) return { state: 'version_conflict' as const };
    throw error;
  } finally {
    await session.endSession();
  }
}

async function acquireExistingPending(
  existing: IRevenuePriceExecution,
  input: PriceWrite,
) {
  const effective = await resolveEffectivePrice(targetWithTenant(input));
  if (effective.executionId === input.executionId && effective.version === input.expectedVersion + 1) {
    const receipt = await RevenuePriceExecution.findOneAndUpdate(
      { _id: existing._id, state: 'pending' },
      {
        $set: { state: 'applied', appliedVersion: effective.version, effectivePrices: effective.prices },
        $unset: { applyClaimToken: 1, applyClaimExpiresAt: 1 },
        $push: { events: { type: 'apply_recovered', at: new Date().toISOString() } },
      },
      { new: true },
    ).lean();
    if (receipt) return { result: { receipt, effective, state: 'replayed' as const, outcome: 'applied' as const, replayed: true } };
    const latest = await RevenuePriceExecution.findById(existing._id).lean<IRevenuePriceExecution | null>();
    return { result: latest ? await replayExistingExecution(latest, input) : { state: 'pending' as const, replayed: true } };
  }
  if (effective.version !== input.expectedVersion) {
    const receipt = await RevenuePriceExecution.findOneAndUpdate(
      { _id: existing._id, state: 'pending' },
      {
        $set: { state: 'conflict', effectivePrices: effective.prices },
        $unset: { applyClaimToken: 1, applyClaimExpiresAt: 1 },
        $push: { events: { type: 'version_conflict_recovered', at: new Date().toISOString() } },
      },
      { new: true },
    ).lean();
    if (receipt) return { result: { receipt, current: effective, state: 'conflict' as const, replayed: true } };
    const latest = await RevenuePriceExecution.findById(existing._id).lean<IRevenuePriceExecution | null>();
    return { result: latest ? await replayExistingExecution(latest, input) : { state: 'pending' as const, replayed: true } };
  }

  const claimToken = randomUUID();
  const now = new Date();
  const intent = await RevenuePriceExecution.findOneAndUpdate(
    {
      _id: existing._id,
      state: 'pending',
      $or: [
        { applyClaimExpiresAt: { $lte: now } },
        { applyClaimExpiresAt: { $exists: false } },
        { applyClaimExpiresAt: null },
      ],
    },
    {
      $set: { applyClaimToken: claimToken, applyClaimExpiresAt: new Date(now.getTime() + APPLY_LEASE_MS) },
      $push: { events: { type: 'apply_resumed', at: now.toISOString() } },
    },
    { new: true },
  );
  if (!intent) {
    const latest = await RevenuePriceExecution.findById(existing._id).lean<IRevenuePriceExecution | null>();
    return { result: latest ? await replayExistingExecution(latest, input) : { state: 'pending' as const, replayed: true } };
  }
  return { intent, effective, claimToken };
}

async function resultForConcurrentExecution(
  concurrent: IRevenuePriceExecution,
  input: PriceWrite,
  idempotencyKey: string,
  requestHash: string,
) {
  const disposition = classifyExistingPriceExecution(concurrent, idempotencyKey, requestHash);
  if (disposition === 'idempotency_payload_mismatch') {
    throw new RevenuePricingWriteError(409, 'IDEMPOTENCY_PAYLOAD_MISMATCH', 'This Idempotency-Key is already bound to a different request body.');
  }
  if (disposition === 'execution_id_conflict') {
    return { current: await safeEffectivePrice(input), state: 'conflict' as const, reason: 'The execution ID is already bound to another idempotency key.' };
  }
  return replayExistingExecution(concurrent, input);
}

export async function applyPriceWrite(input: PriceWrite, idempotencyKey: string, bodyText: string) {
  const requestHash = hashRevenuePayload(bodyText);
  const existing = await RevenuePriceExecution.findOne({ $or: [{ idempotencyKey }, { executionId: input.executionId }] }).lean<IRevenuePriceExecution | null>();
  let intent: HydratedDocument<IRevenuePriceExecution> | null = null;
  let current;
  let claimToken = randomUUID();

  if (existing) {
    const disposition = classifyExistingPriceExecution(existing, idempotencyKey, requestHash);
    if (disposition === 'idempotency_payload_mismatch') {
      throw new RevenuePricingWriteError(409, 'IDEMPOTENCY_PAYLOAD_MISMATCH', 'This Idempotency-Key is already bound to a different request body.');
    }
    if (disposition === 'execution_id_conflict') {
      return { current: await safeEffectivePrice(input), state: 'conflict' as const, reason: 'The execution ID is already bound to another idempotency key.' };
    }
    if (disposition !== 'pending') return replayExistingExecution(existing, input);
    if (input.mode === 'commissioning') assertRevenuePilotCommissioningAllowed(input);
    else assertRevenuePilotTourAllowed(input.target.tourId);
    const acquired = await acquireExistingPending(existing, input);
    if ('result' in acquired) return acquired.result;
    intent = acquired.intent;
    current = acquired.effective;
    claimToken = acquired.claimToken;
  } else {
    if (input.mode === 'commissioning') assertRevenuePilotCommissioningAllowed(input);
    else assertRevenuePilotTourAllowed(input.target.tourId);
    current = await resolveEffectivePrice(targetWithTenant(input));
    try {
      intent = await RevenuePriceExecution.create({
        executionId: input.executionId,
        idempotencyKey,
        tenantId: input.tenantId,
        recommendationId: input.recommendationId,
        actor: input.actor,
        mode: input.mode,
        target: { ...input.target, date: normalizePriceDate(input.target.date) },
        currency: input.currency,
        expectedVersion: input.expectedVersion,
        previousPrices: current.prices,
        requestedPrices: input.prices,
        policyHash: input.policyHash,
        policySnapshot: input.policySnapshot,
        sourceVersion: input.sourceVersion,
        confidence: input.confidence,
        requestHash,
        state: 'pending',
        applyClaimToken: claimToken,
        applyClaimExpiresAt: new Date(Date.now() + APPLY_LEASE_MS),
        events: [{ type: 'apply_started', at: new Date().toISOString() }],
      });
    } catch (error: unknown) {
      if (mongoErrorCode(error) !== 11000) throw error;
      const concurrent = await RevenuePriceExecution.findOne({ $or: [{ idempotencyKey }, { executionId: input.executionId }] }).lean<IRevenuePriceExecution | null>();
      if (!concurrent) throw error;
      return resultForConcurrentExecution(concurrent, input, idempotencyKey, requestHash);
    }
  }

  if (!intent || !current) throw new Error('Price execution intent could not be acquired.');
  if (current.version !== input.expectedVersion) {
    const settled = await markConflict(intent, claimToken, input, current.prices);
    if ('result' in settled) return settled.result;
    return { receipt: settled.receipt, current, state: 'conflict' as const };
  }
  if (current.sourceVersion !== input.sourceVersion) {
    const reason = 'Catalogue mapping source version is stale.';
    const settled = await markBlocked(intent, claimToken, input, reason, 'source_version_blocked', current.prices);
    if ('result' in settled) return settled.result;
    return { receipt: settled.receipt, current, state: 'blocked' as const, reason };
  }
  const configuredMovement = Number(process.env.REVENUEPILOT_MAX_WRITE_PERCENT || 5);
  const maxMovement = Math.min(Number.isFinite(configuredMovement) ? configuredMovement : 5, input.policySnapshot.maxChangePercent);
  if (input.mode === 'commissioning' && !commissioningMovementIsSafe(current.prices, input.prices)) {
    const reason = 'Commissioning movement must be non-zero and no more than 1% or $1 for every paid guest type.';
    const settled = await markBlocked(intent, claimToken, input, reason, 'commissioning_movement_blocked', current.prices);
    if ('result' in settled) return settled.result;
    return { receipt: settled.receipt, current, state: 'blocked' as const, reason };
  }
  if (input.mode !== 'commissioning' && movement(current.prices, input.prices) > maxMovement) {
    const reason = `Maximum movement is ${maxMovement}%.`;
    const settled = await markBlocked(intent, claimToken, input, reason, 'movement_blocked', current.prices);
    if ('result' in settled) return settled.result;
    return { receipt: settled.receipt, current, state: 'blocked' as const, reason };
  }

  let sellability;
  try {
    sellability = await assertRevenuePriceTargetSellable(targetWithTenant(input));
  } catch (error: unknown) {
    if (!(error instanceof RevenuePricingWriteError)) throw error;
    const settled = await markBlocked(intent, claimToken, input, error.message, error.code, current.prices);
    if ('result' in settled) return settled.result;
    return { receipt: settled.receipt, current, state: 'blocked' as const, reason: error.message, code: error.code };
  }

  const nextVersion = current.version + 1;
  const date = normalizePriceDate(input.target.date);
  const committed = await commitClaimedPriceOverride({
    intent,
    claimToken,
    write: input,
    currentPrices: current.prices,
    cataloguePrices: current.cataloguePrices,
    nextVersion,
    date,
    sellability,
  });
  if (committed.state === 'lease_lost') {
    const latest = await RevenuePriceExecution.findById(intent._id).lean<IRevenuePriceExecution | null>();
    if (latest) return replayExistingExecution(latest, input);
    throw new Error('Price execution lease was lost and its receipt is unavailable.');
  }
  if (committed.state === 'version_conflict') {
    const effective = await resolveEffectivePrice(targetWithTenant(input));
    if (effective.executionId === input.executionId && effective.version === nextVersion) {
      const recovered = await RevenuePriceExecution.findOneAndUpdate(
        { _id: intent._id, state: 'pending' },
        {
          $set: { state: 'applied', appliedVersion: nextVersion, effectivePrices: effective.prices },
          $unset: { applyClaimToken: 1, applyClaimExpiresAt: 1 },
          $push: { events: { $each: [{ type: 'sellable_departure_verified', ...sellability, at: new Date().toISOString() }, { type: 'apply_recovered', at: new Date().toISOString() }] } },
        },
        { new: true },
      ).lean();
      return { receipt: recovered || intent.toObject(), effective, state: 'replayed' as const, outcome: 'applied' as const, replayed: true };
    }
    const settled = await markConflict(intent, claimToken, input, effective.prices);
    if ('result' in settled) return settled.result;
    return { receipt: settled.receipt, current: effective, state: 'conflict' as const };
  }

  return { receipt: committed.receipt, effective: await resolveEffectivePrice(targetWithTenant(input)), state: 'applied' as const };
}
