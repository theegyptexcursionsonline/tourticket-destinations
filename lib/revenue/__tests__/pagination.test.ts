jest.mock('mongoose', () => ({
  __esModule: true,
  default: { Types: { ObjectId: { isValid: (value: unknown) => /^[a-f0-9]{24}$/i.test(String(value || '')) } } },
}));

import { decodeRevenueCursor, encodeRevenueCursor, parseRevenuePageLimit } from '@/lib/revenue/pagination';

describe('RevenuePilot opaque cursors', () => {
  const expected = { resource: 'catalog' as const, tenantId: 'mountain-tours' };
  const encoded = () => encodeRevenueCursor({ ...expected, afterId: '507f1f77bcf86cd799439011' });

  it('round-trips an exact tenant and resource-bound cursor', () => {
    expect(decodeRevenueCursor(encoded(), expected)).toEqual({ cursor: { afterId: '507f1f77bcf86cd799439011' } });
  });

  it.each([
    ['malformed base64', 'not+a+cursor'],
    ['wrong resource', encodeRevenueCursor({ resource: 'departures', tenantId: 'mountain-tours', afterId: '507f1f77bcf86cd799439011' })],
    ['wrong tenant', encodeRevenueCursor({ resource: 'catalog', tenantId: 'other-tenant', afterId: '507f1f77bcf86cd799439011' })],
    ['invalid id', Buffer.from(JSON.stringify({ v: 1, resource: 'catalog', tenantId: 'mountain-tours', afterId: 'nope' })).toString('base64url')],
    ['unknown field', Buffer.from(JSON.stringify({ v: 1, resource: 'catalog', tenantId: 'mountain-tours', afterId: '507f1f77bcf86cd799439011', extra: true })).toString('base64url')],
  ])('rejects %s', (_label, cursor) => {
    expect(decodeRevenueCursor(cursor, expected)).toHaveProperty('error');
  });

  it('bounds limits instead of silently coercing or truncating them', () => {
    expect(parseRevenuePageLimit(null, 25, 50)).toEqual({ limit: 25 });
    expect(parseRevenuePageLimit('50', 25, 50)).toEqual({ limit: 50 });
    expect(parseRevenuePageLimit('0', 25, 50)).toHaveProperty('error');
    expect(parseRevenuePageLimit('51', 25, 50)).toHaveProperty('error');
    expect(parseRevenuePageLimit('1.5', 25, 50)).toHaveProperty('error');
    expect(parseRevenuePageLimit('abc', 25, 50)).toHaveProperty('error');
  });

  it('binds departure cursors to the original date range', () => {
    const departureCursor = encodeRevenueCursor({
      resource: 'departures',
      tenantId: 'mountain-tours',
      afterId: '507f1f77bcf86cd799439011',
      scope: '2099-09-20:2099-09-21',
    });
    expect(decodeRevenueCursor(departureCursor, {
      resource: 'departures', tenantId: 'mountain-tours', scope: '2099-09-20:2099-09-21',
    })).toEqual({ cursor: { afterId: '507f1f77bcf86cd799439011' } });
    expect(decodeRevenueCursor(departureCursor, {
      resource: 'departures', tenantId: 'mountain-tours', scope: '2099-09-20:2099-09-22',
    })).toHaveProperty('error');
  });
});
