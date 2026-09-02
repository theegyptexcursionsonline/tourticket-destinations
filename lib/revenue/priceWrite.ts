import { createHash, randomUUID } from 'node:crypto';
import RevenuePriceExecution, { type IRevenuePriceExecution } from '@/lib/models/RevenuePriceExecution';
import RevenuePriceOverride, { type GuestPrices } from '@/lib/models/RevenuePriceOverride';
import { assertRevenuePilotTourAllowed, RevenuePricingWriteError } from '@/lib/revenue/priceWriteGate';
import { classifyExistingPriceExecution } from '@/lib/revenue/priceWriteIdempotency';
import { normalizePriceDate, resolveEffectivePrice } from '@/lib/revenue/pricingResolver';
import { assertRevenuePriceTargetSellable } from '@/lib/revenue/sellableDeparture';
import type { PriceWrite } from '@/lib/revenue/priceWriteValidation';
import { assertRevenuePilotCommissioningAllowed, commissioningMovementIsSafe } from '@/lib/revenue/commissioningGate';
import type { HydratedDocument } from 'mongoose';
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

async function markBlocked(
  intent: HydratedDocument<IRevenuePriceExecution>,
  reason: string,
  eventType: string,
  effectivePrices?: GuestPrices,
) {
  intent.state = 'blocked';
  intent.blockReason = reason;
  if (effectivePrices) intent.effectivePrices = effectivePrices;
  intent.applyClaimToken = undefined;
  intent.applyClaimExpiresAt = undefined;
  intent.events.push({ type: eventType, reason, at: new Date().toISOString() });
  return intent.save();
}

async function markConflict(
  intent: HydratedDocument<IRevenuePriceExecution>,
  effectivePrices?: GuestPrices,
) {
  intent.state = 'conflict';
  if (effectivePrices) intent.effectivePrices = effectivePrices;
  intent.applyClaimToken = undefined;
  intent.applyClaimExpiresAt = undefined;
  intent.events.push({ type: 'version_conflict', at: new Date().toISOString() });
  return intent.save();
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
    return { result: { receipt: receipt || existing, effective, state: 'replayed' as const, outcome: 'applied' as const, replayed: true } };
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
    return { result: { receipt: receipt || existing, current: effective, state: 'conflict' as const, replayed: true } };
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
    const receipt = await markConflict(intent, current.prices);
    return { receipt: receipt.toObject(), current, state: 'conflict' as const };
  }
  if (current.sourceVersion !== input.sourceVersion) {
    const reason = 'Catalogue mapping source version is stale.';
    const receipt = await markBlocked(intent, reason, 'source_version_blocked', current.prices);
    return { receipt: receipt.toObject(), current, state: 'blocked' as const, reason };
  }
  const configuredMovement = Number(process.env.REVENUEPILOT_MAX_WRITE_PERCENT || 5);
  const maxMovement = Math.min(Number.isFinite(configuredMovement) ? configuredMovement : 5, input.policySnapshot.maxChangePercent);
  if (input.mode === 'commissioning' && !commissioningMovementIsSafe(current.prices, input.prices)) {
    const reason = 'Commissioning movement must be non-zero and no more than 1% or $1 for every paid guest type.';
    const receipt = await markBlocked(intent, reason, 'commissioning_movement_blocked', current.prices);
    return { receipt: receipt.toObject(), current, state: 'blocked' as const, reason };
  }
  if (input.mode !== 'commissioning' && movement(current.prices, input.prices) > maxMovement) {
    const reason = `Maximum movement is ${maxMovement}%.`;
    const receipt = await markBlocked(intent, reason, 'movement_blocked', current.prices);
    return { receipt: receipt.toObject(), current, state: 'blocked' as const, reason };
  }

  let sellability;
  try {
    sellability = await assertRevenuePriceTargetSellable(targetWithTenant(input));
  } catch (error: unknown) {
    if (!(error instanceof RevenuePricingWriteError)) throw error;
    const receipt = await markBlocked(intent, error.message, error.code, current.prices);
    return { receipt: receipt.toObject(), current, state: 'blocked' as const, reason: error.message, code: error.code };
  }

  const nextVersion = current.version + 1;
  const date = normalizePriceDate(input.target.date);
  let override;
  try {
    override = await RevenuePriceOverride.findOneAndUpdate(
      { tenantId: input.tenantId, tourId: input.target.tourId, optionKey: input.target.optionKey, date, time: input.target.time, version: input.expectedVersion },
      { $set: { currency: input.currency, prices: input.prices, cataloguePrices: current.cataloguePrices, previousPrices: current.prices, version: nextVersion, source: 'revenuepilot', recommendationId: input.recommendationId, executionId: input.executionId, active: true }, $unset: { revertedAt: 1 } },
      { new: true, upsert: input.expectedVersion === 0, runValidators: true },
    );
  } catch (error: unknown) {
    if (mongoErrorCode(error) !== 11000) throw error;
  }
  if (!override) {
    const effective = await resolveEffectivePrice(targetWithTenant(input));
    if (effective.executionId === input.executionId && effective.version === nextVersion) {
      const recovered = await RevenuePriceExecution.findOneAndUpdate(
        { _id: intent._id, state: 'pending', applyClaimToken: claimToken },
        {
          $set: { state: 'applied', appliedVersion: nextVersion, effectivePrices: effective.prices },
          $unset: { applyClaimToken: 1, applyClaimExpiresAt: 1 },
          $push: { events: { $each: [{ type: 'sellable_departure_verified', ...sellability, at: new Date().toISOString() }, { type: 'apply_recovered', at: new Date().toISOString() }] } },
        },
        { new: true },
      ).lean();
      return { receipt: recovered || intent.toObject(), effective, state: 'replayed' as const, outcome: 'applied' as const, replayed: true };
    }
    const receipt = await markConflict(intent, effective.prices);
    return { receipt: receipt.toObject(), current: effective, state: 'conflict' as const };
  }

  const receipt = await RevenuePriceExecution.findOneAndUpdate(
    { _id: intent._id, state: 'pending', applyClaimToken: claimToken },
    {
      $set: { state: 'applied', appliedVersion: nextVersion, effectivePrices: input.prices },
      $unset: { applyClaimToken: 1, applyClaimExpiresAt: 1 },
      $push: { events: { $each: [{ type: 'sellable_departure_verified', ...sellability, at: new Date().toISOString() }, { type: 'price_applied', at: new Date().toISOString() }] } },
    },
    { new: true },
  ).lean<IRevenuePriceExecution | null>();
  if (!receipt) {
    const latest = await RevenuePriceExecution.findById(intent._id).lean<IRevenuePriceExecution | null>();
    if (latest) return replayExistingExecution(latest, input);
    throw new Error('Applied price receipt could not be finalized.');
  }

  return { receipt, effective: await resolveEffectivePrice(targetWithTenant(input)), state: 'applied' as const };
}
