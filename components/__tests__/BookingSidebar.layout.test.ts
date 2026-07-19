import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(
  path.join(process.cwd(), 'components', 'BookingSidebar.tsx'),
  'utf8',
);

function openingTag(testId: string): string {
  const marker = `data-testid="${testId}"`;
  const markerIndex = source.indexOf(marker);
  expect(markerIndex).toBeGreaterThanOrEqual(0);

  const tagStart = source.lastIndexOf('<', markerIndex);
  const tagEnd = source.indexOf('>', markerIndex);
  expect(tagStart).toBeGreaterThanOrEqual(0);
  expect(tagEnd).toBeGreaterThan(markerIndex);

  return source.slice(tagStart, tagEnd + 1);
}

function classTokens(testId: string): Set<string> {
  const tag = openingTag(testId);
  const match = tag.match(/className="([^"]+)"/);
  expect(match).not.toBeNull();
  return new Set(match?.[1].split(/\s+/).filter(Boolean));
}

function expectClasses(testId: string, expected: string[]) {
  const classes = classTokens(testId);
  for (const className of expected) {
    expect(classes).toContain(className);
  }
}

describe('BookingSidebar containment regression contract', () => {
  it('keeps the drawer as an isolated, viewport-height flex column', () => {
    expectClasses('booking-drawer-shell', [
      'relative',
      'isolate',
      'h-[100dvh]',
      'flex',
      'flex-col',
      'overflow-hidden',
    ]);
  });

  it('keeps header, progress and footer above content and non-shrinking', () => {
    for (const testId of [
      'booking-drawer-header',
      'booking-drawer-progress',
      'booking-drawer-footer',
    ]) {
      expectClasses(testId, ['relative', 'z-20', 'flex-shrink-0', 'bg-white']);
    }

    expect(source).toContain('className="min-w-0 flex-1"');
  });

  it('allows scrolling only inside the bounded middle region', () => {
    expectClasses('booking-drawer-scroll-boundary', [
      'relative',
      'flex-1',
      'min-h-0',
      'overflow-hidden',
    ]);
    expectClasses('booking-drawer-scroll-region', [
      'h-full',
      'overflow-y-auto',
      'overscroll-contain',
      'scroll-pt-4',
      'scroll-pb-4',
      '[scrollbar-gutter:stable]',
    ]);

    expect(classTokens('booking-drawer-shell')).not.toContain('overflow-y-auto');
    expect(classTokens('booking-drawer-header')).not.toContain('overflow-y-auto');
    expect(classTokens('booking-drawer-footer')).not.toContain('overflow-y-auto');
  });

  it('keeps visual guards at both fixed-content boundaries', () => {
    expectClasses('booking-drawer-top-guard', [
      'pointer-events-none',
      'absolute',
      'top-0',
      'z-10',
      'bg-gradient-to-b',
    ]);
    expectClasses('booking-drawer-bottom-guard', [
      'pointer-events-none',
      'absolute',
      'bottom-0',
      'z-10',
      'bg-gradient-to-t',
    ]);

    expect(openingTag('booking-drawer-top-guard')).toContain('aria-hidden="true"');
    expect(openingTag('booking-drawer-bottom-guard')).toContain('aria-hidden="true"');
  });

  it('renders the fixed regions in the required vertical order', () => {
    const shellStart = source.indexOf('data-testid="booking-drawer-shell"');
    const header = source.indexOf('data-testid="booking-drawer-header"', shellStart);
    const progress = source.indexOf('<StepsIndicator', header);
    const scrollBoundary = source.indexOf(
      'data-testid="booking-drawer-scroll-boundary"',
      progress,
    );
    const footer = source.indexOf(
      'data-testid="booking-drawer-footer"',
      scrollBoundary,
    );

    expect(shellStart).toBeGreaterThanOrEqual(0);
    expect(header).toBeGreaterThan(shellStart);
    expect(progress).toBeGreaterThan(header);
    expect(scrollBoundary).toBeGreaterThan(progress);
    expect(footer).toBeGreaterThan(scrollBoundary);
  });

  it('exposes stable browser-test hooks for desktop and mobile booking entry', () => {
    const tourPageSource = fs.readFileSync(
      path.join(
        process.cwd(),
        'app',
        '[locale]',
        '[slug]',
        'TourDetailClientPage.tsx',
      ),
      'utf8',
    );
    const stickyButtonSource = fs.readFileSync(
      path.join(process.cwd(), 'components', 'StickyBookButton.tsx'),
      'utf8',
    );

    expect(tourPageSource).toContain('data-testid="open-booking-drawer"');
    expect(stickyButtonSource).toContain(
      'data-testid="open-booking-drawer-mobile"',
    );
  });
});
