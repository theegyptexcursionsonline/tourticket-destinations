/**
 * Captures what the customer sees when an ordinary reading scroll throws the
 * rendered itinerary map away and starts it again.
 *
 * The rebuild itself is entirely real and untouched — it is caused by the page,
 * not by this script. Only its VISIBILITY is helped: on a fast desktop
 * connection the replacement map paints again within a few hundred
 * milliseconds, which is quicker than a screenshot round-trip. So after the
 * first build has completed, the map style response is held back for a few
 * seconds, which is what a customer on a normal mobile connection experiences
 * anyway. The held response is disclosed in the filename.
 *
 *   node scripts/itinerary-map-rebuild-frame.mjs <label> <baseUrl>
 */
// Launched with software WebGL. This machine's headless GPU access is not
// dependable across long runs, and without it MapLibre cannot create a map at
// all — which would look like a failure of the code under test rather than of
// the harness. Software rasterisation changes how pixels are drawn, not which
// maps get built, so the rebuild counts stay meaningful.
import { chromium, devices } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const [, , label = 'before-live', baseUrl = 'https://egypt-excursionsonline.com'] = process.argv;
const SLUG = '/2-days-trip-cairo-from-sharm-el-sheikh-flight';
const OUT = path.join(process.cwd(), 'readiness-proof', '2026-08-20-itinerary-map-perf-en');
const HOLD_MS = 5000;
fs.mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: 'mobile-390', viewport: { width: 390, height: 844 }, extra: devices['iPhone 13'] },
  { name: 'desktop-1440', viewport: { width: 1440, height: 900 }, extra: {} },
];

const outcome = [];

for (const target of VIEWPORTS) {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const context = await browser.newContext({
    ...target.extra,
    viewport: target.viewport,
    isMobile: target.name.startsWith('mobile'),
    hasTouch: target.name.startsWith('mobile'),
  });
  const page = await context.newPage();

  let firstBuildDone = false;
  await page.route('**/styles/bright**', async (route) => {
    if (firstBuildDone) await new Promise((resolve) => setTimeout(resolve, HOLD_MS));
    await route.continue();
  });

  await page.goto(baseUrl + SLUG, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  const mapCard = page.getByTestId('interactive-itinerary-map');
  await mapCard.scrollIntoViewIfNeeded();
  await page.waitForTimeout(6000); // the first, legitimate build finishes at full speed
  firstBuildDone = true;

  const anchorTop = await page.evaluate(() => {
    const card = document.querySelector('[data-testid="interactive-itinerary-map"]');
    return card.getBoundingClientRect().top + window.scrollY;
  });

  let caught = false;
  outer:
  for (let pass = 0; pass < 6 && !caught; pass += 1) {
    for (let i = 0; i < 12; i += 1) {
      await page.evaluate((top) => window.scrollTo({ top }), anchorTop - 300 + i * 360);
      const loading = await page.evaluate(() => document
        .querySelector('[data-testid="interactive-itinerary-map"]')
        .textContent.includes('Loading route map'));
      if (loading) {
        await page.evaluate((top) => window.scrollTo({ top }), anchorTop - 140);
        await mapCard.screenshot({
          path: path.join(OUT, `${label}-rebuilding-styleheld-${target.name}.png`),
        });
        caught = true;
        break outer;
      }
    }
  }

  outcome.push({
    label,
    viewport: target.name,
    scrollCausedRebuild: caught,
    note: caught
      ? `Rebuild caused by scrolling alone; style response held ${HOLD_MS}ms so the state is photographable.`
      : 'Scrolling never rebuilt the map — nothing to capture.',
    screenshot: caught
      ? path.relative(process.cwd(), path.join(OUT, `${label}-rebuilding-styleheld-${target.name}.png`))
      : null,
  });
  await browser.close();
}

fs.writeFileSync(path.join(OUT, `${label}-rebuild-frame.json`), JSON.stringify(outcome, null, 2));
console.log(JSON.stringify(outcome, null, 2));
