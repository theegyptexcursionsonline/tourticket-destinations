import { createHash, randomUUID } from 'node:crypto';
import ContentPublishReceipt from '@/lib/models/ContentPublishReceipt';

export const CONTENT_PUBLISH_CLAIM_LEASE_MS = 60_000;
export const CONTENT_PUBLISH_RECEIPT_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_KEY_LENGTH = 200;

export type PublishClaim = {
  outcome: 'proceed';
  receiptId: string;
  claimToken: string;
  resourceId: string;
  resumed: boolean;
};

export type BeginPublishResult =
  | PublishClaim
  | { outcome: 'replay'; status: number; body: Record<string, unknown> }
  | { outcome: 'error'; status: number; code: string; error: string };

export function readRequiredIdempotencyKey(value: string | null | undefined):
  | { ok: true; key: string }
  | { ok: false; error: string } {
  const key = value?.trim() ?? '';
  if (!key) return { ok: false, error: 'Idempotency-Key header is required' };
  if (key.length > MAX_KEY_LENGTH || /[\u0000-\u001f\u007f]/.test(key)) {
    return {
      ok: false,
      error: `Idempotency-Key must be at most ${MAX_KEY_LENGTH} printable characters`,
    };
  }
  return { ok: true, key };
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .filter(([, child]) => child !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, child]) => `${JSON.stringify(key)}:${stableStringify(child)}`)
    .join(',')}}`;
}

export function hashPublishRequest(body: unknown): string {
  return createHash('sha256').update(stableStringify(body)).digest('hex');
}

function deterministicObjectId(namespace: string, input: {
  idempotencyKey: string;
  tenantId: string;
  contentType: string;
}): string {
  return createHash('sha256')
    .update(`${namespace}\u0000${input.tenantId}\u0000${input.contentType}\u0000${input.idempotencyKey}`)
    .digest('hex')
    .slice(0, 24);
}

export function contentPublishReceiptId(input: {
  idempotencyKey: string;
  tenantId: string;
  contentType: string;
}): string {
  return deterministicObjectId('content-publish-receipt-v1', input);
}

export function contentPublishResourceId(input: {
  idempotencyKey: string;
  tenantId: string;
  contentType: string;
}): string {
  return deterministicObjectId('content-publish-resource-v1', input);
}

export function contentPublishReceiptExpiresAt(now = Date.now()): Date {
  return new Date(now + CONTENT_PUBLISH_RECEIPT_TTL_MS);
}

function isDuplicateKeyError(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && (error as { code?: number }).code === 11000);
}

function replayOf(receipt: {
  statusCode?: number;
  response?: Record<string, unknown> | null;
}): Extract<BeginPublishResult, { outcome: 'replay' }> {
  return {
    outcome: 'replay',
    status: receipt.statusCode ?? 200,
    body: receipt.response ?? {},
  };
}

export async function beginContentPublish(input: {
  idempotencyKey: string;
  tenantId: string;
  contentType: string;
  requestHash: string;
  resourceId?: string;
  now?: Date;
}): Promise<BeginPublishResult> {
  const selector = {
    idempotencyKey: input.idempotencyKey,
    tenantId: input.tenantId,
    contentType: input.contentType,
  };
  const now = input.now ?? new Date();
  const claimToken = randomUUID();
  // Mongo's built-in unique _id is the lock, so concurrent first claims remain
  // mutually exclusive even before the compound receipt index is migrated.
  const receiptId = contentPublishReceiptId(selector);
  const resourceId = input.resourceId ?? contentPublishResourceId(selector);

  try {
    const receipt = await ContentPublishReceipt.create({
      _id: receiptId,
      ...selector,
      requestHash: input.requestHash,
      resourceId,
      state: 'pending',
      claimToken,
      claimExpiresAt: new Date(now.getTime() + CONTENT_PUBLISH_CLAIM_LEASE_MS),
      expiresAt: contentPublishReceiptExpiresAt(now.getTime()),
    });
    return {
      outcome: 'proceed',
      receiptId: String(receipt._id),
      claimToken,
      resourceId,
      resumed: false,
    };
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
  }

  const existing = await ContentPublishReceipt.findOne(selector).lean<{
    _id: unknown;
    requestHash: string;
    resourceId: string;
    state: 'pending' | 'completed';
    statusCode?: number;
    response?: Record<string, unknown> | null;
  } | null>();
  if (!existing) {
    return {
      outcome: 'error',
      status: 503,
      code: 'IDEMPOTENCY_RECEIPT_UNAVAILABLE',
      error: 'Publish receipt was not readable; retry shortly',
    };
  }
  if (existing.requestHash !== input.requestHash) {
    return {
      outcome: 'error',
      status: 409,
      code: 'IDEMPOTENCY_BODY_CONFLICT',
      error: 'Idempotency-Key is already bound to a different request body',
    };
  }
  if (existing.state === 'completed') return replayOf(existing);

  const reclaimed = await ContentPublishReceipt.findOneAndUpdate(
    {
      _id: existing._id,
      state: 'pending',
      $or: [
        { claimExpiresAt: { $lte: now } },
        { claimExpiresAt: { $exists: false } },
        { claimExpiresAt: null },
      ],
    },
    {
      $set: {
        claimToken,
        claimExpiresAt: new Date(now.getTime() + CONTENT_PUBLISH_CLAIM_LEASE_MS),
        expiresAt: contentPublishReceiptExpiresAt(now.getTime()),
      },
    },
    { new: true },
  ).lean<{ _id: unknown; resourceId: string } | null>();
  if (reclaimed) {
    return {
      outcome: 'proceed',
      receiptId: String(reclaimed._id),
      claimToken,
      resourceId: reclaimed.resourceId,
      resumed: true,
    };
  }

  const latest = await ContentPublishReceipt.findOne(selector).lean<{
    state: 'pending' | 'completed';
    statusCode?: number;
    response?: Record<string, unknown> | null;
  } | null>();
  if (latest?.state === 'completed') return replayOf(latest);
  return {
    outcome: 'error',
    status: 503,
    code: 'IDEMPOTENCY_IN_PROGRESS',
    error: 'A publish with this Idempotency-Key is already in progress; retry shortly',
  };
}

export async function completeContentPublish(
  claim: PublishClaim,
  statusCode: number,
  response: Record<string, unknown>,
): Promise<void> {
  const result = await ContentPublishReceipt.updateOne(
    {
      _id: claim.receiptId,
      claimToken: claim.claimToken,
      resourceId: claim.resourceId,
      state: 'pending',
    },
    {
      $set: {
        state: 'completed',
        statusCode,
        response,
        expiresAt: contentPublishReceiptExpiresAt(),
      },
      $unset: { claimToken: 1, claimExpiresAt: 1 },
    },
  );
  if (result.modifiedCount !== 1) {
    throw new Error('Publish receipt claim was lost before completion');
  }
}

export async function releaseContentPublishClaim(claim: PublishClaim): Promise<void> {
  await ContentPublishReceipt.deleteOne({
    _id: claim.receiptId,
    claimToken: claim.claimToken,
    resourceId: claim.resourceId,
    state: 'pending',
  });
}
