import { readFileSync } from 'fs';
import { join } from 'path';

const source = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

/** MT sheet (31 Aug) storefront items — pinned so parity with EEO cannot regress silently. */
describe('MT sheet 31 Aug — storefront contracts', () => {
  const sidebar = source('components/BookingSidebar.tsx');
  const tourPage = source('app/[locale]/[slug]/TourDetailClientPage.tsx');

  it('defaults a new booking to one adult', () => {
    expect(sidebar).not.toMatch(/adults:\s*2,/);
    expect((sidebar.match(/adults:\s*1,/g) || []).length).toBeGreaterThanOrEqual(2);
  });

  it('re-measures the option description once the collapsed card is shown', () => {
    expect(sidebar).toContain('}, [option.description, expanded]);');
    expect(sidebar).toContain('new ResizeObserver(measure)');
  });

  it('lets guests pick 1..N units of a per-person add-on instead of auto-multiplying', () => {
    expect(sidebar).toContain('clampAddOnQuantity(quantity, perPersonLimit)');
    expect(sidebar).toContain('aria-label={`Add one ${addOn.title}`}');
    expect(sidebar).toContain('aria-label={`Remove one ${addOn.title}`}');
    expect(sidebar).not.toContain('addOn.perGuest ? totalGuests : quantity');
    expect(sidebar).not.toContain('addOn.perGuest ? guestCount : quantity');
  });

  it("renders What's Not Included and merges the (List) variant of What's Included", () => {
    expect(tourPage).toContain('mergeContentLists(tour.includes, tour.whatsIncluded)');
    expect(tourPage).toContain('mergeContentLists(tour.whatsNotIncluded)');
    expect(tourPage).toContain('data-section="not-included"');
    expect(tourPage).toContain("t('notIncluded')");
  });

  it('carries the notIncluded label in every locale', () => {
    for (const locale of ['en', 'de', 'fr', 'es', 'ar', 'ru']) {
      const messages = JSON.parse(source(`messages/${locale}.json`));
      expect(typeof messages.tour.notIncluded).toBe('string');
      expect(messages.tour.notIncluded.trim().length).toBeGreaterThan(0);
    }
  });

  it('lightens hued 700+ text on darkened tinted cards (What to Know in dark mode)', () => {
    const map = source('scripts/theme/darkSurfaceMap.ts');
    expect(map).toContain('export const HUE_INKS');
    expect(map).toContain('RE.textHue.exec(base)');
    const css = source('app/globals.css');
    expect(css).toMatch(/\[class~="text-amber-900"\][^{]*\{\s*color: #fcd34d/);
    expect(css).toMatch(/\[class~="text-rose-800"\][^{]*\{\s*color: #fda4af/);
  });
});

describe('MT sheet 31 Aug — guest prices, add-on groups and page-type switch reach the customer/admin UI', () => {
  const sidebar = source('components/BookingSidebar.tsx');

  it('quotes the sidebar and option cards from the stored guest prices of the chosen departure', () => {
    expect(sidebar).toContain("from '@/lib/revenue/guestPrices'");
    expect(sidebar).toContain('guestPricedSubtotal(option, cardGuestPrices, adults, children, infants)');
    expect(sidebar).toContain('guestPricedSubtotal(pricedOption, effectiveGuestPrices,');
  });

  it('renders add-on groups with their titles', () => {
    expect(sidebar).toContain('groupAvailableAddOns(availableAddOns).map((group)');
    expect(sidebar).toContain('data-testid={`addon-group-${group.key}`}');
  });

  it('matches an assigned add-on against the durable booking-option pricing key', () => {
    expect(sidebar).toContain('selectedBookingOption?.pricingKey || selectedBookingOption?.id || null');
  });

  it('mounts the "Change page type safely" block in both page editors', () => {
    const category = source('components/admin/CategoryForm.tsx');
    const attraction = source('components/admin/AttractionPageForm.tsx');
    expect(category).toContain('<PageTypeConversionActions pageId={categoryId} currentKind="category" />');
    expect(attraction).toContain("<PageTypeConversionActions pageId={pageId} currentKind={formData.pageType === 'category' ? 'category-landing' : 'attraction'} />");
  });
});
