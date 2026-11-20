import fs from 'fs';
import path from 'path';
import { displayGuestPrices, resolveCatalogueGuestPrices } from '@/lib/revenue/guestPrices';

// 16 Nov 2026: booking from a home-page card replaced the whole site with
// "Application error". The card hands the booking panel a trimmed tour whose
// embedded options carry only a price, while the panel lists the current
// options (with ids and pricing keys) from /api/tours/[id]/options.

const trimmedCardTour = {
  _id: 'tour-1',
  price: 65,
  discountPrice: 50,
  bookingOptions: [{ price: 50 }],
};
const liveOption = { id: '3611b86f-d285-44e6-b383-abd67b4696cd', pricingKey: 'beach-day-214e5e3f339c' };
const serverGuestPrices = { adult: 50, child: 25, infant: 0 };

describe('booking panel guest price labels', () => {
  it('checkout still refuses an option the stored tour does not have', () => {
    expect(() => resolveCatalogueGuestPrices(trimmedCardTour as any, { selectedBookingOption: liveOption }))
      .toThrow('Pricing option unavailable');
  });

  it('shows the server-computed guest prices of the live option instead of failing', () => {
    expect(displayGuestPrices(trimmedCardTour as any, { selectedBookingOption: liveOption }, serverGuestPrices))
      .toEqual(serverGuestPrices);
  });

  it('shows no guest prices when the trimmed tour cannot price the option and none came from the server', () => {
    expect(displayGuestPrices(trimmedCardTour as any, { selectedBookingOption: liveOption })).toBeNull();
    expect(displayGuestPrices(trimmedCardTour as any, { selectedBookingOption: liveOption }, null)).toBeNull();
  });

  it('keeps the stored-tour resolution, unchanged, whenever the tour can price the option', () => {
    const fullTour = {
      _id: 'tour-1',
      price: 65,
      discountPrice: 50,
      bookingOptions: [{ id: liveOption.id, pricingKey: liveOption.pricingKey, price: 50, guestPrices: { adult: 50, child: 30, infant: 5 } }],
    };
    const cartItem = { selectedBookingOption: liveOption };
    const stored = resolveCatalogueGuestPrices(fullTour as any, cartItem);
    // A different server value must not override what checkout will charge.
    expect(displayGuestPrices(fullTour as any, cartItem, { adult: 1, child: 1, infant: 1 })).toEqual(stored);
  });

  it('uses the server guest prices while the panel has no tour yet', () => {
    expect(displayGuestPrices(null, null, serverGuestPrices)).toEqual(serverGuestPrices);
    expect(displayGuestPrices(null, null)).toBeNull();
  });

  it('every price label in the booking panel goes through the non-throwing display helper', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'components/BookingSidebar.tsx'), 'utf8');
    expect(source).toMatch(/const cardGuestPrices = displayGuestPrices\(tour,/);
    expect(source).toMatch(/const participantGuestPrices = useMemo\(\(\) => displayGuestPrices\(tour,/);
    expect(source).not.toMatch(/const (cardGuestPrices|participantGuestPrices|quotedGuestPrices)[^\n]*resolveCatalogueGuestPrices\(tour/);
    expect(source).not.toMatch(/\?\s*resolveCatalogueGuestPrices\(tour,/);
  });
});
