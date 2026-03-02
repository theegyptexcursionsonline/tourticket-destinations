import { test, expect } from '@playwright/test';

const KEY_PAGES = [
  '/',
  '/destinations',
  '/tours',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
  '/careers',
  '/blog',
  '/search',
];

test.describe('Full site page crawl', () => {
  test.setTimeout(120_000);

  for (const path of KEY_PAGES) {
    test(`${path} — loads without error`, async ({ page }) => {
      const jsErrors: string[] = [];
      page.on('pageerror', (err) => jsErrors.push(`${err.name}: ${err.message}`));

      const response = await page.goto(path, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });

      const status = response?.status() ?? 0;
      expect(status, `${path} returned ${status}`).toBeLessThan(400);
      expect(jsErrors, `JS errors on ${path}: ${jsErrors.join('; ')}`).toHaveLength(0);
    });
  }

  test('sitemap.xml — returns valid XML with URLs', async ({ request }) => {
    const response = await request.get('/sitemap.xml');
    expect(response.ok()).toBeTruthy();
    const text = await response.text();
    expect(text).toContain('<urlset');
    expect(text).toContain('<loc>');
  });

  test('sitemap pages all return 2xx', async ({ page, request }) => {
    const sitemapRes = await request.get('/sitemap.xml');
    if (!sitemapRes.ok()) {
      test.skip();
      return;
    }

    const xml = await sitemapRes.text();
    const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);

    if (urls.length === 0) {
      test.skip();
      return;
    }

    const failures: string[] = [];

    // Test up to 30 URLs to keep runtime reasonable
    for (const url of urls.slice(0, 30)) {
      try {
        const res = await request.get(url, { timeout: 15_000 });
        if (res.status() >= 400) {
          failures.push(`[${res.status()}] ${url}`);
        }
      } catch (err) {
        failures.push(`[TIMEOUT] ${url}`);
      }
    }

    expect(failures, `Broken sitemap URLs:\n${failures.join('\n')}`).toHaveLength(0);
  });

  test('no broken images on homepage', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle', timeout: 30_000 });

    const brokenImages = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img[src]'));
      return imgs
        .filter((img) => {
          const el = img as HTMLImageElement;
          return el.naturalWidth === 0 && el.src && !el.src.startsWith('data:');
        })
        .map((img) => (img as HTMLImageElement).src);
    });

    expect(
      brokenImages,
      `Broken images found:\n${brokenImages.join('\n')}`,
    ).toHaveLength(0);
  });
});
