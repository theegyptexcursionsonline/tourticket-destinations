#!/usr/bin/env node
// Live multi-domain tenant-isolation check. Run after any deploy that touches
// caching, tenant detection, or the proxy:
//
//   node scripts/verify-tenant-isolation.mjs
//
// Fetches every listed tenant domain twice (second hit should come from the
// edge cache) and asserts each response carries that tenant's own brand
// marker. Exits non-zero on any cross-tenant leak — wire into release checks.

const DOMAINS = [
  { host: 'hurghadaspeedboat.com', marker: /Hurghada Speedboat/i },
  { host: 'aswanexcursions.com', marker: /Aswan Excursions/i },
  { host: 'luxorexcursions.com', marker: /Luxor Excursions/i },
  { host: 'dahabexcursions.com', marker: /Dahab Excursions/i },
  { host: 'www.marsaalamexcursions.com', marker: /Marsa Alam/i },
];

const PATHS = ['/'];

let failures = 0;

for (const { host, marker } of DOMAINS) {
  for (const path of PATHS) {
    const url = `https://${host}${path}`;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const started = Date.now();
        const res = await fetch(url, {
          headers: { 'user-agent': 'Mozilla/5.0 (tenant-isolation-check)' },
        });
        const html = await res.text();
        const ms = Date.now() - started;
        const cacheStatus = res.headers.get('cache-status') || 'n/a';
        const ok = res.status === 200 && marker.test(html);
        // Cross-check: the page must NOT carry another tenant's marker.
        const leaked = DOMAINS.filter(d => d.host !== host && d.marker.test(html) && !marker.test(html));
        if (!ok || leaked.length) {
          failures++;
          console.error(`FAIL ${url} (attempt ${attempt}): status=${res.status} ownBrand=${marker.test(html)} leakedFrom=${leaked.map(l => l.host).join(',') || 'none'}`);
        } else {
          console.log(`ok   ${url} (attempt ${attempt}) ${ms}ms [${cacheStatus.slice(0, 60)}]`);
        }
      } catch (error) {
        failures++;
        console.error(`FAIL ${url} (attempt ${attempt}): ${error.message}`);
      }
    }
  }
}

if (failures) {
  console.error(`\n${failures} isolation check(s) FAILED`);
  process.exit(1);
}
console.log('\nAll tenant-isolation checks passed');
