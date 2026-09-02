import { revenueBookingCurrency } from '@/lib/revenue/bookingContract';

describe('RevenuePilot booking read contract', () => {
  it('normalizes legacy blank EEO rows to the authoritative tenant currency', () => {
    expect(revenueBookingCurrency(null)).toBe('USD');
    expect(revenueBookingCurrency(undefined)).toBe('USD');
    expect(revenueBookingCurrency('')).toBe('USD');
  });

  it('preserves explicit ISO currency and rejects corrupt non-empty values', () => {
    expect(revenueBookingCurrency('EUR')).toBe('EUR');
    expect(() => revenueBookingCurrency('usd')).toThrow(/outside the RevenuePilot read contract/);
  });
});
