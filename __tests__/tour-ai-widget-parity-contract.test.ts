import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

describe('tour AI widget parity', () => {
  it('uses the current tenant-scoped storefront search and removes the legacy AI Magic widget', () => {
    const tourPage = read('app/[locale]/[slug]/TourDetailClientPage.tsx');

    expect(tourPage).toContain("import AISearchWidget from '@/components/AISearchWidget'");
    expect(tourPage).toContain('<AISearchWidget avoidMobileBookingBar />');
    expect(tourPage).not.toContain('TourPageAIWidget');
    expect(existsSync(join(process.cwd(), 'components/TourPageAIWidget.tsx'))).toBe(false);
  });

  it('keeps the unified launcher above the rendered mobile booking bar', () => {
    const widget = read('components/AISearchWidget.tsx');
    const bookingBar = read('components/StickyBookButton.tsx');

    expect(widget).toContain('avoidMobileBookingBar?: boolean');
    expect(widget).toContain('data-ai-search-widget="unified"');
    expect(widget).toContain("'[data-mobile-booking-bar=\"true\"]'");
    expect(widget).toContain('Math.ceil(height) + 12');
    expect(bookingBar).toContain('data-mobile-booking-bar="true"');
  });
});
