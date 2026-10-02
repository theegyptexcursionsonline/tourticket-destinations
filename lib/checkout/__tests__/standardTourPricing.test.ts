import { authoritativeBasePrice } from '@/lib/pricing/authoritativePrice';
import { resolveCatalogueGuestPrices } from '@/lib/revenue/guestPrices';
describe('catalogue-only standard tour pricing', () => {
  const tour = { price: 100, bookingOptions: [], availability: { slots: [{ time: '09:00', price: 80 }] } };
  it.each(['standard-default', 'standard-tour', 'standard'])('prices valid no-option alias %s from actual catalogue slot', (id) => {
    expect(resolveCatalogueGuestPrices(tour, { selectedBookingOption: { id, pricingKey: 'standard' }, selectedTime: '09:00' })).toEqual({ adult: 80, child: 40, infant: 0 });
  });
  it.each([{ id: 'forged', pricingKey: 'standard' }, { id: 'standard-default', pricingKey: 'forged' }])('rejects a forged option even on a no-option tour', (selection) => {
    expect(() => authoritativeBasePrice(tour, { selectedBookingOption: selection })).toThrow('Pricing option unavailable');
  });
  it('never lets a standard alias bypass real configured options', () => {
    expect(() => authoritativeBasePrice({ ...tour, bookingOptions: [{ id: 'boat', pricingKey: 'boat', price: 90 }] }, { selectedBookingOption: { id: 'standard-default', pricingKey: 'standard' } })).toThrow('Pricing option unavailable');
  });
});
