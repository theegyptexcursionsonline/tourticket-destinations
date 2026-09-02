export type PriceExecutionState =
  | 'pending'
  | 'applied'
  | 'replayed'
  | 'conflict'
  | 'blocked'
  | 'verified'
  | 'rollback_pending'
  | 'rollback_applied'
  | 'rollback_failed';

type ExistingExecution = {
  idempotencyKey: string;
  requestHash: string;
  state: PriceExecutionState;
};

export function classifyExistingPriceExecution(
  existing: ExistingExecution,
  idempotencyKey: string,
  requestHash: string,
) {
  if (existing.idempotencyKey !== idempotencyKey) return 'execution_id_conflict' as const;
  if (!existing.requestHash || existing.requestHash !== requestHash) return 'idempotency_payload_mismatch' as const;
  if (existing.state === 'pending') return 'pending' as const;
  if (['applied', 'verified', 'replayed'].includes(existing.state)) return 'successful_replay' as const;
  return 'terminal_replay' as const;
}

