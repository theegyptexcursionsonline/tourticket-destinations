/**
 * Does the itinerary map still build after an in-app (client-side) navigation
 * between tours, rather than a fresh page load?
 *
 *   node scripts/itinerary-map-clientnav.mjs <label> <baseUrl>
 */
// Launched with software WebGL. This machine's headless GPU access is not
// dependable across long runs, and without it MapLibre cannot create a map at
// all — which would look like a failure of the code under test rather than of
// the harness. Software rasterisation changes how pixels are drawn, not which
// maps get built, so the rebuild counts stay meaningful.
import { chromium, devices } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const [, , label = 'local', baseUrl = 'http://localhost:3064'] = process.argv;
const MAP_TOUR = '/2-days-trip-cairo-from-sharm-el-sheikh-flight';
const OTHER_TOUR = '/2-days-trip-to-cairo-from-hurghada-by-flight';
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
  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)); });
  page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${String(e).slice(0, 200)}`));

  // Fresh load of the tour that HAS a map — the baseline that already works.
  await page.goto(baseUrl + MAP_TOUR, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  await page.getByTestId('interactive-itinerary-map').scrollIntoViewIfNeeded();
  const freshLoadOk = await page.waitForFunction(() => {
    const c = document.querySelector('[data-testid="interactive-itinerary-map"]');
    return !!c && !!c.querySelector('canvas') && !c.textContent.includes('Loading route map');
  }, undefined, { timeout: 25000 }).then(() => true).catch(() => false);

  // In-app navigation away, then back.
  await page.locator(`a[href="${OTHER_TOUR}"]`).first().click();
  await page.waitForURL(`**${OTHER_TOUR}`, { timeout: 20000 });
  await page.waitForTimeout(2500);

  await page.locator(`a[href="${MAP_TOUR}"]`).first().click();
  await page.waitForURL(`**${MAP_TOUR}`, { timeout: 20000 });
  await page.waitForTimeout(2000);

  const hardNavigations = await page.evaluate(() => performance.getEntriesByType('navigation').length);
  await page.getByTestId('interactive-itinerary-map').scrollIntoViewIfNeeded();

  const startedWaiting = Date.now();
  const afterClientNavOk = await page.waitForFunction(() => {
    const c = document.querySelector('[data-testid="interactive-itinerary-map"]');
    return !!c && !!c.querySelector('canvas') && !c.textContent.includes('Loading route map');
  }, undefined, { timeout: 25000 }).then(() => true).catch(() => false);

  const finalState = await page.evaluate(() => {
    const c = document.querySelector('[data-testid="interactive-itinerary-map"]');
    return {
      text: c.textContent.includes('temporarily unavailable') ? 'UNAVAILABLE'
        : c.textContent.includes('Loading route map') ? 'LOADING' : 'ready',
      canvas: !!c.querySelector('canvas'),
    };
  });

  if (!afterClientNavOk) {
    await page.getByTestId('interactive-itinerary-map')
      .screenshot({ path: path.join(OUT, `${label}-clientnav-stuck-${name}.png`) });
  }

  results.push({
    label,
    viewport: name,
    mapBuildsOnFreshLoad: freshLoadOk,
    mapBuildsAfterInAppNavigation: afterClientNavOk,
    msWaitedAfterNav: Date.now() - startedWaiting,
    hardNavigationsInDocument: hardNavigations,
    finalState,
    consoleErrors: consoleErrors.slice(0, 5),
  });
  await browser.close();
}

fs.writeFileSync(path.join(OUT, `${label}-clientnav.json`), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
