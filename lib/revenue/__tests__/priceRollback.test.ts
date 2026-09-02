import { classifyRollbackRequest } from '@/lib/revenue/priceRollbackState';
import fs from 'node:fs';
import path from 'node:path';

const now = new Date('2026-07-13T10:00:00.000Z');

describe('RevenuePilot rollback claim classification', () => {
  it('allows one claim and fences a different idempotency key', () => {
    expect(classifyRollbackRequest({ state: 'applied' }, 'rollback-1', 'hash-1', now)).toBe('claimable');
    expect(classifyRollbackRequest({ state: 'rollback_pending', rollbackIdempotencyKey: 'rollback-1', rollbackRequestHash: 'hash-1', rollbackClaimExpiresAt: new Date('2026-07-13T10:01:00.000Z') }, 'rollback-2', 'hash-1', now)).toBe('idempotency_key_conflict');
  });

  it('binds the rollback key to the exact body hash', () => {
    expect(classifyRollbackRequest({ state: 'rollback_pending', rollbackIdempotencyKey: 'rollback-1', rollbackRequestHash: 'hash-1' }, 'rollback-1', 'hash-2', now)).toBe('idempotency_payload_mismatch');
  });

  it('returns in-progress during a live lease and resumes only after expiry', () => {
    const receipt = { state: 'rollback_pending' as const, rollbackIdempotencyKey: 'rollback-1', rollbackRequestHash: 'hash-1' };
    expect(classifyRollbackRequest({ ...receipt, rollbackClaimExpiresAt: new Date('2026-07-13T10:00:01.000Z') }, 'rollback-1', 'hash-1', now)).toBe('in_progress');
    expect(classifyRollbackRequest({ ...receipt, rollbackClaimExpiresAt: new Date('2026-07-13T09:59:59.000Z') }, 'rollback-1', 'hash-1', now)).toBe('resumable');
  });

  it('preserves both successful and failed terminal outcomes', () => {
    expect(classifyRollbackRequest({ state: 'rollback_applied', rollbackIdempotencyKey: 'rollback-1', rollbackRequestHash: 'hash-1' }, 'rollback-1', 'hash-1', now)).toBe('terminal_replay');
    expect(classifyRollbackRequest({ state: 'rollback_failed', rollbackIdempotencyKey: 'rollback-1', rollbackRequestHash: 'hash-1' }, 'rollback-1', 'hash-1', now)).toBe('terminal_replay');
  });

  it('keeps incident rollback independent of the current forward-write allowlist', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'lib/revenue/priceRollback.ts'), 'utf8');
    expect(source).not.toContain('assertRevenuePilotTourAllowed');
    expect(source).toContain("state: { $in: ['applied', 'verified', 'replayed'] }");
    expect(source).toContain('{ ...target, executionId, version: claimed.appliedVersion }');
  });
});
