import { expect, test, type Locator } from '@playwright/test';

type TourRecord = { slug?: unknown };

function firstTourSlug(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object') return undefined;

  const body = payload as {
    data?: unknown;
    tours?: unknown;
    results?: unknown;
  };
  const candidates = [body.data, body.tours, body.results];

  for (const candidate of candidates) {
    const list = Array.isArray(candidate)
      ? candidate
      : candidate && typeof candidate === 'object' && Array.isArray((candidate as { tours?: unknown }).tours)
        ? (candidate as { tours: unknown[] }).tours
        : [];

    const record = list.find(
      (item): item is TourRecord =>
        !!item &&
        typeof item === 'object' &&
        typeof (item as TourRecord).slug === 'string',
    );
    if (record && typeof record.slug === 'string') return record.slug;
  }

  return undefined;
}

function homepageTourSlugs(html: string): string[] {
  const reservedRoutes = new Set([
    'about',
    'contact',
    'destinations',
    'faqs',
    'interests',
    'login',
    'privacy',
    'search',
    'signup',
    'terms',
    'tours',
  ]);
  const slugs = new Set<string>();

  for (const match of html.matchAll(/href=["']\/([^\/"'?#]+)["']/g)) {
    const slug = match[1];
    if (
      slug &&
      !slug.startsWith('_') &&
      !slug.includes('.') &&
      !reservedRoutes.has(slug)
    ) {
      slugs.add(slug);
    }
  }

  return [...slugs];
}

async function preferTestId(primary: Locator, fallback: Locator): Promise<Locator> {
  return (await primary.count()) > 0 ? primary : fallback;
}

async function rect(locator: Locator) {
  return locator.evaluate((element) => {
    const box = element.getBoundingClientRect();
    return { top: box.top, bottom: box.bottom, height: box.height };
  });
}

test.describe('Booking drawer overflow containment', () => {
  test.setTimeout(90_000);

  let tourSlug: string | undefined;

  test.beforeAll(async ({ request }) => {
    const response = await request.get('/api/tours/public?limit=1');
    if (response.ok()) {
      tourSlug = firstTourSlug(await response.json());
    }

    // The main EEO slim public endpoint intentionally omits tour slugs.
    // Resolve a real detail URL through the scoped live-search endpoint there.
    if (!tourSlug) {
      const searchResponse = await request.get(
        '/api/search/live?q=sharm&limit=10',
      );
      if (searchResponse.ok()) {
        tourSlug = firstTourSlug(await searchResponse.json());
      }
    }

    // A tenant alias can legitimately return a sibling catalogue record from
    // a generic API while that slug is unavailable on the active domain.
    // Validate the candidate, then fall back to tour links rendered by this
    // exact storefront so the geometry test never runs against a custom 404.
    if (tourSlug) {
      const detailResponse = await request.get(`/${tourSlug}`);
      if (!detailResponse.ok()) tourSlug = undefined;
    }

    if (!tourSlug) {
      const homepageResponse = await request.get('/');
      if (homepageResponse.ok()) {
        const candidates = homepageTourSlugs(await homepageResponse.text());
        for (const candidate of candidates) {
          const detailResponse = await request.get(`/${candidate}`);
          if (detailResponse.ok()) {
            tourSlug = candidate;
            break;
          }
        }
      }
    }
  });

  for (const viewport of [
    { name: 'short desktop', width: 1280, height: 640, mobile: false },
    { name: 'short mobile', width: 390, height: 640, mobile: true },
  ]) {
    test(`keeps fixed controls separate from scrolling content on ${viewport.name}`, async ({
      page,
    }) => {
      test.skip(!tourSlug, 'No public tour is available for the booking-drawer test');

      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      await page.goto(`/${tourSlug}`, {
        waitUntil: 'domcontentloaded',
        timeout: 45_000,
      });
      await page.waitForLoadState('load');
      // Next.js can paint server HTML before the client event handlers hydrate.
      // Give the tour controls a deterministic hydration window before clicking.
      await page.waitForTimeout(1_000);

      const hydrationProbe = page
        .getByRole('button', {
          name: /select date.*time|datum.*zeit|termin/i,
        })
        .last();
      await expect
        .poll(
          () =>
            hydrationProbe
              .evaluate((element) => {
                const reactNode = element as unknown as Record<string, unknown>;
                return Object.keys(reactNode).some((key) => {
                  if (!key.startsWith('__reactProps$')) return false;
                  const props = reactNode[key] as { onClick?: unknown } | undefined;
                  return typeof props?.onClick === 'function';
                });
              })
              .catch(() => false),
          {
            message: 'Tour booking controls should be hydrated before interaction',
            timeout: 20_000,
          },
        )
        .toBe(true);

      if (viewport.mobile) {
        await page.evaluate(() => {
          window.scrollTo(0, 800);
          window.dispatchEvent(new Event('scroll'));
        });
      }

      const opener = viewport.mobile
        ? await preferTestId(
            page.getByTestId('open-booking-drawer-mobile'),
            page.getByRole('button', { name: /book now|jetzt buchen/i }).last(),
          )
        : await preferTestId(
            page.getByTestId('open-booking-drawer'),
            page
              .getByRole('button', {
                name: /select date.*time|datum.*zeit|termin/i,
              })
              .last(),
          );

      await expect(opener).toBeVisible({ timeout: 15_000 });
      await opener.click();

      const dialog = page.getByRole('dialog');
      const fallbackShell = dialog.locator(':scope > div').nth(1);
      const shell = await preferTestId(
        page.getByTestId('booking-drawer-shell'),
        fallbackShell,
      );
      const header = await preferTestId(
        page.getByTestId('booking-drawer-header'),
        shell.locator(':scope > div').nth(0),
      );
      const progress = await preferTestId(
        page.getByTestId('booking-drawer-progress'),
        shell.locator(':scope > div').nth(1),
      );
      const boundary = await preferTestId(
        page.getByTestId('booking-drawer-scroll-boundary'),
        shell.locator(':scope > div').nth(2),
      );
      const scroller = await preferTestId(
        page.getByTestId('booking-drawer-scroll-region'),
        boundary.locator(':scope > div').nth(0),
      );
      const footer = await preferTestId(
        page.getByTestId('booking-drawer-footer'),
        shell.locator(':scope > div').nth(3),
      );

      // Retry once if the first click landed during the final hydration tick.
      if (!(await shell.isVisible().catch(() => false))) {
        await page.waitForTimeout(750);
        await opener.click();
      }

      await expect(shell).toBeVisible({ timeout: 15_000 });
      await expect(header).toBeVisible();
      await expect(progress).toBeVisible();
      await expect(boundary).toBeVisible();
      await expect(footer).toBeVisible();
      // Measure stable layout, not Framer Motion's entrance transform.
      await page.waitForTimeout(1_200);

      // Force a deterministic overflow condition so this test exercises the
      // real fixed-header/footer contract even with a minimal CI tour fixture.
      await scroller.evaluate((element) => {
        const probe = document.createElement('div');
        probe.dataset.testid = 'forced-overflow-probe';
        probe.setAttribute('aria-hidden', 'true');
        probe.style.height = '600px';
        probe.style.flex = '0 0 600px';
        element.appendChild(probe);
      });

      const scrollMetrics = await scroller.evaluate((element) => ({
        scrollHeight: element.scrollHeight,
        clientHeight: element.clientHeight,
      }));
      const before = {
        shell: await rect(shell),
        header: await rect(header),
        progress: await rect(progress),
        boundary: await rect(boundary),
        footer: await rect(footer),
        viewportHeight: await page.evaluate(() => window.innerHeight),
        ...scrollMetrics,
      };

      expect(before.shell.top).toBeGreaterThanOrEqual(-1);
      expect(before.shell.bottom).toBeLessThanOrEqual(before.viewportHeight + 1);
      expect(before.header.bottom).toBeLessThanOrEqual(before.progress.top + 2);
      expect(before.progress.bottom).toBeLessThanOrEqual(before.boundary.top + 2);
      expect(before.boundary.bottom).toBeLessThanOrEqual(before.footer.top + 2);
      expect(before.scrollHeight).toBeGreaterThan(before.clientHeight);

      await scroller.evaluate((element) => {
        element.scrollTop = element.scrollHeight;
      });

      await expect
        .poll(() => scroller.evaluate((element) => element.scrollTop))
        .toBeGreaterThan(0);

      const after = {
        header: await rect(header),
        progress: await rect(progress),
        boundary: await rect(boundary),
        footer: await rect(footer),
      };

      expect(after.header.top).toBeCloseTo(before.header.top, 0);
      expect(after.progress.top).toBeCloseTo(before.progress.top, 0);
      expect(after.footer.bottom).toBeCloseTo(before.footer.bottom, 0);
      expect(after.progress.bottom).toBeLessThanOrEqual(after.boundary.top + 2);
      expect(after.boundary.bottom).toBeLessThanOrEqual(after.footer.top + 2);
    });
  }
});
