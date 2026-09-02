import type { PriceExecutionState } from '@/lib/revenue/priceWriteIdempotency';

type RollbackState = {
  state: PriceExecutionState;
  rollbackIdempotencyKey?: string;
  rollbackRequestHash?: string;
  rollbackClaimExpiresAt?: Date;
};

export function classifyRollbackRequest(
  receipt: RollbackState,
  idempotencyKey: string,
  requestHash: string,
  now = new Date(),
) {
  if (receipt.rollbackIdempotencyKey && receipt.rollbackIdempotencyKey !== idempotencyKey) return 'idempotency_key_conflict' as const;
  if (receipt.rollbackIdempotencyKey && receipt.rollbackRequestHash !== requestHash) return 'idempotency_payload_mismatch' as const;
  if (receipt.state === 'rollback_applied' || receipt.state === 'rollback_failed') return 'terminal_replay' as const;
  if (receipt.state === 'rollback_pending') {
    if (!receipt.rollbackIdempotencyKey) return 'unavailable' as const;
    if (receipt.rollbackClaimExpiresAt && new Date(receipt.rollbackClaimExpiresAt).getTime() > now.getTime()) return 'in_progress' as const;
    return 'resumable' as const;
  }
  if (['applied', 'verified', 'replayed'].includes(receipt.state) && !receipt.rollbackIdempotencyKey) return 'claimable' as const;
  return 'unavailable' as const;
}

