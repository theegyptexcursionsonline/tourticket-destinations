/**
 * Itinerary map rebuild proof.
 *
 * Measures how many times the tour page throws away and re-creates the
 * MapLibre map during an ordinary reading scroll, and captures the map at
 * both a phone and a desktop viewport.
 *
 * A fresh style download from tiles.openfreemap.org happens once per
 * `new maplibre.Map(...)`, so counting style requests counts full rebuilds.
 *
 *   node scripts/itinerary-map-perf-proof.mjs <label> <baseUrl>
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
const SLUG = '/2-days-trip-cairo-from-sharm-el-sheikh-flight';
const OUT = path.join(process.cwd(), 'readiness-proof', '2026-08-20-itinerary-map-perf-en');
fs.mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: 'mobile-390', viewport: { width: 390, height: 844 }, extra: devices['iPhone 13'] },
  { name: 'desktop-1440', viewport: { width: 1440, height: 900 }, extra: {} },
];

const results = [];

for (const target of VIEWPORTS) {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const context = await browser.newContext({
    ...target.extra,
    viewport: target.viewport,
    isMobile: target.name.startsWith('mobile'),
    hasTouch: target.name.startsWith('mobile'),
  });
  const page = await context.newPage();

  let styleRequests = 0;
  let tileRequests = 0;
  page.on('request', (request) => {
    const url = request.url();
    if (!url.includes('openfreemap.org')) return;
    tileRequests += 1;
    if (url.includes('/styles/')) styleRequests += 1;
  });

  await page.goto(baseUrl + SLUG, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  const mapCard = page.getByTestId('interactive-itinerary-map');
  await mapCard.scrollIntoViewIfNeeded();
  // Let the first, legitimate build settle before counting rebuilds.
  await page.waitForTimeout(6000);

  const baselineStyles = styleRequests;
  const baselineTiles = tileRequests;

  // Six reading passes over the itinerary — identical on every run.
  const loadingSamples = await page.evaluate(async () => {
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const card = document.querySelector('[data-testid="interactive-itinerary-map"]');
    const top = card.getBoundingClientRect().top + window.scrollY;
    let samples = 0;
    let loading = 0;
    const poll = setInterval(() => {
      samples += 1;
      if (card.textContent.includes('Loading route map')) loading += 1;
    }, 50);
    for (let pass = 0; pass < 6; pass += 1) {
      for (let i = 0; i < 10; i += 1) { window.scrollTo({ top: top - 300 + i * 360 }); await sleep(90); }
      for (let i = 10; i >= 0; i -= 1) { window.scrollTo({ top: top - 300 + i * 360 }); await sleep(90); }
    }
    clearInterval(poll);
    return { samples, loading };
  });

  await page.waitForTimeout(2500);
  await mapCard.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);

  const state = await page.evaluate(() => {
    const card = document.querySelector('[data-testid="interactive-itinerary-map"]');
    return {
      visible: card.textContent.includes('temporarily unavailable') ? 'UNAVAILABLE'
        : card.textContent.includes('Loading route map') ? 'LOADING' : 'ready',
      canvas: !!card.querySelector('canvas'),
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    };
  });

  const file = path.join(OUT, `${label}-${target.name}.png`);
  await mapCard.screenshot({ path: file });

  results.push({
    label,
    viewport: target.name,
    rebuildsDuringScroll: styleRequests - baselineStyles,
    tileRequestsDuringScroll: tileRequests - baselineTiles,
    pctScrollShowingLoader: Math.round((loadingSamples.loading / loadingSamples.samples) * 100),
    endState: state.visible,
    canvasPresent: state.canvas,
    horizontalOverflow: state.horizontalOverflow,
    screenshot: path.relative(process.cwd(), file),
  });

  await browser.close();
}

const reportPath = path.join(OUT, `${label}-measurements.json`);
fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
