import {
  assertRevenuePilotCommissioningAllowed,
  commissioningMovementIsSafe,
  parseRevenueCommissioningTarget,
  revenueCommissioningArmState,
} from '@/lib/revenue/commissioningGate';
import { hashRevenuePolicy, type PriceWrite } from '@/lib/revenue/priceWriteValidation';

const target = { tenantId: 'default', tourId: '507f1f77bcf86cd799439011', optionKey: 'sunrise_private', date: '2026-08-10', time: '06:30' };
const policy = { floor: 0, ceiling: 200, maxChangePercent: 1, minConfidence: 100, cooldownHours: 24, mode: 'commissioning' as const };
const input: PriceWrite = {
  executionId: 'commissioning_exec_1', recommendationId: 'commissioning_1', tenantId: 'default', target,
  prices: { adult: 101, child: 25.25, infant: 0 }, currency: 'USD', expectedVersion: 1,
  policyHash: hashRevenuePolicy(policy), policySnapshot: policy, sourceVersion: `pv1_${'a'.repeat(64)}`,
  confidence: 100, actor: 'owner@example.com', mode: 'commissioning',
};

describe('RevenuePilot commissioning gate', () => {
  it('parses and requires one exact target', () => {
    expect(parseRevenueCommissioningTarget(`${target.tenantId}|${target.tourId}|${target.optionKey}|${target.date}|${target.time}`)).toEqual(target);
    expect(() => parseRevenueCommissioningTarget(`*|${target.tourId}|standard|${target.date}|${target.time}`)).toThrow(/exact/);
    expect(() => parseRevenueCommissioningTarget(`${target.tenantId}|${target.tourId}|standard|2026-02-31|${target.time}`)).toThrow(/exact/);
  });

  it('requires a confirmed, future window no longer than 24 hours', () => {
    const env = {
      REVENUEPILOT_COMMISSIONING_ENABLED: 'true',
      REVENUEPILOT_COMMISSIONING_CONFIRMATION: 'ENABLE_MT_ONE_TIME_COMMISSIONING',
      REVENUEPILOT_COMMISSIONING_TARGET: `${target.tenantId}|${target.tourId}|${target.optionKey}|${target.date}|${target.time}`,
      REVENUEPILOT_COMMISSIONING_NOT_AFTER: '2026-08-01T12:00:00.000Z',
    } as unknown as NodeJS.ProcessEnv;
    const now = new Date('2026-08-01T00:00:00.000Z');
    expect(revenueCommissioningArmState(env, now).enabled).toBe(true);
    expect(() => assertRevenuePilotCommissioningAllowed(input, env, now)).not.toThrow();
    expect(() => assertRevenuePilotCommissioningAllowed({ ...input, target: { ...target, date: '2026-08-11' } }, env, now)).toThrow(/not commissioned/);
    expect(revenueCommissioningArmState({ ...env, REVENUEPILOT_COMMISSIONING_NOT_AFTER: '2026-08-03T00:00:00.000Z' }, now).blockReason).toBe('window_exceeds_24_hours');
  });

  it('requires every paid guest probe to stay within one percent and one dollar', () => {
    const current = { adult: 100, child: 25, infant: 0 };
    expect(commissioningMovementIsSafe(current, input.prices)).toBe(true);
    expect(commissioningMovementIsSafe(current, { ...input.prices, child: 26.01 })).toBe(false);
    expect(commissioningMovementIsSafe(current, { ...input.prices, infant: 0.01 })).toBe(false);
    expect(commissioningMovementIsSafe({ adult: 0, child: 0, infant: 0 }, { adult: 0, child: 0, infant: 0 })).toBe(false);
  });
});
