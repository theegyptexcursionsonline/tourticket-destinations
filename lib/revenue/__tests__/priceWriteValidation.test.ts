import { hashRevenuePolicy, validatePriceWrite } from '@/lib/revenue/priceWriteValidation';

const policySnapshot = { floor: 80, ceiling: 130, maxChangePercent: 5, minConfidence: 85, cooldownHours: 24, mode: 'assist' as const };
const valid = {
  executionId: 'exec_12345678', recommendationId: 'rec_12345678', tenantId: 'default',
  target: { tourId: '68dada7e6617c4b6defc34b5', optionKey: 'standard', date: '2026-08-01', time: '10:00' },
  prices: { adult: 104, child: 52, infant: 0 }, currency: 'USD', expectedVersion: 0,
  policyHash: hashRevenuePolicy(policySnapshot), policySnapshot, sourceVersion: `pv1_${'a'.repeat(64)}`, confidence: 90, actor: 'owner@example.com', mode: 'assist' as const,
};

describe('RevenuePilot price-write validation', () => {
  it('accepts an explicit policy-bound guest-price request', () => expect(validatePriceWrite(valid)).toMatchObject(valid));
  it('rejects policy tampering and prices outside the corridor', () => {
    expect(() => validatePriceWrite({ ...valid, policySnapshot: { ...policySnapshot, ceiling: 200 } })).toThrow('Invalid policy hash');
    expect(() => validatePriceWrite({ ...valid, prices: { ...valid.prices, adult: 140 } })).toThrow('outside policy corridor');
    expect(() => validatePriceWrite({ ...valid, mode: 'manual' })).toThrow('Invalid policy hash');
  });
  it('requires a zero-padded 24-hour departure time', () => {
    expect(() => validatePriceWrite({ ...valid, target: { ...valid.target, time: '9:00' } })).toThrow('Invalid price time');
    expect(() => validatePriceWrite({ ...valid, target: { ...valid.target, time: '24:00' } })).toThrow('Invalid price time');
  });
  it('rejects calendar dates that JavaScript would otherwise normalize', () => {
    expect(() => validatePriceWrite({ ...valid, target: { ...valid.target, date: '2026-02-31' } })).toThrow('Invalid price date');
  });
  it('enforces the canary confidence, movement and cooldown bounds independently', () => {
    expect(() => validatePriceWrite({ ...valid, confidence: 84 })).toThrow('Invalid recommendation confidence');
    expect(() => validatePriceWrite({ ...valid, confidence: 85, policySnapshot: { ...policySnapshot, minConfidence: 90 }, policyHash: hashRevenuePolicy({ ...policySnapshot, minConfidence: 90 }) })).toThrow('below policy minimum');
    expect(() => validatePriceWrite({ ...valid, policySnapshot: { ...policySnapshot, maxChangePercent: 6 }, policyHash: hashRevenuePolicy({ ...policySnapshot, maxChangePercent: 6 }) })).toThrow('Invalid policy snapshot');
    expect(() => validatePriceWrite({ ...valid, policySnapshot: { ...policySnapshot, cooldownHours: 23 }, policyHash: hashRevenuePolicy({ ...policySnapshot, cooldownHours: 23 }) })).toThrow('Invalid policy snapshot');
  });
});
