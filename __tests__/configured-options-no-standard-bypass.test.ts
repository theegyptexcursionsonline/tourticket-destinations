import { readFileSync } from 'fs';
import { join } from 'path';

const source = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

describe('configured booking options have no implicit Standard side door', () => {
  it('requires a stored option in checkout and both manual booking mutations', () => {
    const checkout = source('lib/security/checkoutPricing.ts');
    const create = source('app/api/bookings/manual/route.ts');
    const update = source('app/api/bookings/manual/[id]/route.ts');
    expect(checkout).toContain('optionIdIsStandard && pricingKeyIsStandard && options.length > 0');
    expect(create).toContain('bookingOptionKey === STANDARD_OPTION_KEY && bookingOptions.length === 0');
    expect(update).toContain('nextOptionKey === STANDARD_OPTION_KEY && bookingOptions.length === 0');
  });

  it('does not manufacture an unpriced quick-add selection on the tour page', () => {
    const page = source('app/[locale]/[slug]/TourDetailClientPage.tsx');
    expect(page).not.toContain('handleQuickAdd');
    expect(page).not.toContain("selectedTime: 'Anytime'");
    expect(page).toContain('data-testid="open-booking-drawer"');
  });
});
