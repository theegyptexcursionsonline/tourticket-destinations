import {
  assertRevenuePilotTourAllowed,
  parseRevenuePilotAllowedTourIds,
  requireRevenueIdempotencyKey,
  RevenuePricingWriteError,
} from '@/lib/revenue/priceWriteGate';

const tourA = '68dada7e6617c4b6defc34b5';
const tourB = '68dada7e6617c4b6defc34b6';

describe('RevenuePilot price-write gate', () => {
  it('fails closed when no exact tour IDs are configured', () => {
    expect(() => assertRevenuePilotTourAllowed(tourA, '')).toThrow(RevenuePricingWriteError);
    try {
      assertRevenuePilotTourAllowed(tourA, '');
    } catch (error) {
      expect(error).toMatchObject({ status: 503, code: 'TOUR_ALLOWLIST_NOT_CONFIGURED' });
    }
  });

  it('accepts only exact approved IDs and rejects wildcards', () => {
    expect(parseRevenuePilotAllowedTourIds(` ${tourA},${tourB} `)).toEqual(new Set([tourA, tourB]));
    expect(() => assertRevenuePilotTourAllowed(tourA, `${tourA},${tourB}`)).not.toThrow();
    expect(() => assertRevenuePilotTourAllowed('68dada7e6617c4b6defc34b7', `${tourA},${tourB}`)).toThrow('not approved');
    expect(() => parseRevenuePilotAllowedTourIds('*')).toThrow('wildcards are not allowed');
  });

  it('bounds idempotency keys before they reach unique indexes', () => {
    expect(requireRevenueIdempotencyKey(' execution:123 ')).toBe('execution:123');
    expect(() => requireRevenueIdempotencyKey(null)).toThrow('required');
    expect(() => requireRevenueIdempotencyKey('a'.repeat(201))).toThrow('at most 200');
    expect(() => requireRevenueIdempotencyKey('bad\nkey')).toThrow('printable');
  });
});
