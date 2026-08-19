/**
 * Proves the itinerary map can recover when the tile host stalls.
 *
 * The tile style request is blocked so the 15s timeout fires and the customer
 * sees the unavailable panel; then the tile host is allowed through again and
 * "Try again" is pressed. Before this change there was no way back — the panel
 * was terminal for the rest of the page visit.
 *
 *   node scripts/itinerary-map-retry-proof.mjs <label> <baseUrl>
 */
// Launched with software WebGL. This machine's headless GPU access is not
// dependable across long runs, and without it MapLibre cannot create a map at
// all — which would look like a failure of the code under test rather than of
// the harness. Software rasterisation changes how pixels are drawn, not which
// maps get built, so the rebuild counts stay meaningful.
import { chromium, devices } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const [, , label = 'after-fixed', baseUrl = 'http://localhost:3064'] = process.argv;
const SLUG = '/2-days-trip-cairo-from-sharm-el-sheikh-flight';
const OUT = path.join(process.cwd(), 'readiness-proof', '2026-08-20-itinerary-map-perf-en');
fs.mkdirSync(OUT, { recursive: true });

const results = [];

for (const name of ['mobile-390', 'desktop-1440']) {
  const isMobile = name.startsWith('mobile');
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const context = await browser.newContext({
    ...(isMobile ? devices['iPhone 13'] : {}),
    viewport: isMobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    isMobile,
    hasTouch: isMobile,
  });
  const page = await context.newPage();

  let blockTiles = true;
  await page.route('**://tiles.openfreemap.org/**', async (route) => {
    if (blockTiles) await route.abort('failed');
    else await route.continue();
  });

  await page.goto(baseUrl + SLUG, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  const mapCard = page.getByTestId('interactive-itinerary-map');
  await mapCard.scrollIntoViewIfNeeded();

  const wentUnavailable = await page.waitForFunction(() => document
    .querySelector('[data-testid="interactive-itinerary-map"]')
    .textContent.includes('temporarily unavailable'), undefined, { timeout: 30000 })
    .then(() => true).catch(() => false);

  if (wentUnavailable) {
    await mapCard.screenshot({ path: path.join(OUT, `${label}-tilehost-down-${name}.png`) });
  }

  const retry = page.getByRole('button', { name: 'Try again' });
  const retryOffered = await retry.count() > 0;

  let recovered = false;
  if (retryOffered) {
    blockTiles = false; // the tile host comes back
    await retry.click();
    recovered = await page.waitForFunction(() => {
      const c = document.querySelector('[data-testid="interactive-itinerary-map"]');
      return !!c.querySelector('canvas') && !c.textContent.includes('temporarily unavailable')
        && !c.textContent.includes('Loading route map');
    }, undefined, { timeout: 30000 }).then(() => true).catch(() => false);
    if (recovered) {
      await mapCard.screenshot({ path: path.join(OUT, `${label}-recovered-after-retry-${name}.png`) });
    }
  }

  results.push({ label, viewport: name, showedUnavailablePanel: wentUnavailable, retryOffered, recoveredAfterRetry: recovered });
  await browser.close();
}

fs.writeFileSync(path.join(OUT, `${label}-retry.json`), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
