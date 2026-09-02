import { classifyExistingPriceExecution } from '@/lib/revenue/priceWriteIdempotency';

const base = { idempotencyKey: 'idem-1', requestHash: 'hash-1', state: 'applied' as const };

describe('RevenuePilot apply idempotency classification', () => {
  it('binds an idempotency key to the exact request hash', () => {
    expect(classifyExistingPriceExecution(base, 'idem-1', 'different')).toBe('idempotency_payload_mismatch');
  });

  it('does not treat execution-ID reuse as an idempotent replay', () => {
    expect(classifyExistingPriceExecution(base, 'idem-2', 'hash-1')).toBe('execution_id_conflict');
  });

  it('preserves terminal non-success outcomes for the caller', () => {
    expect(classifyExistingPriceExecution({ ...base, state: 'conflict' }, 'idem-1', 'hash-1')).toBe('terminal_replay');
    expect(classifyExistingPriceExecution({ ...base, state: 'blocked' }, 'idem-1', 'hash-1')).toBe('terminal_replay');
    expect(classifyExistingPriceExecution({ ...base, state: 'rollback_applied' }, 'idem-1', 'hash-1')).toBe('terminal_replay');
  });

  it('distinguishes an active execution lease from a completed replay', () => {
    expect(classifyExistingPriceExecution({ ...base, state: 'pending' }, 'idem-1', 'hash-1')).toBe('pending');
    expect(classifyExistingPriceExecution(base, 'idem-1', 'hash-1')).toBe('successful_replay');
  });
});
