import { computeTripCost, getTripCostConfig, FALLBACK_CONFIG, clamp, formatUsd } from '@/lib/toolsApi';

describe('toolsApi — local quote math v2', () => {
  const cfg = FALLBACK_CONFIG;

  it('computes with region + season multipliers (defaults cairo/peak)', () => {
    const r = computeTripCost(cfg, { days: 7, travelers: 2, style: 'comfort' });
    const s = cfg.styles.comfort, reg = cfg.regions.cairo, m = cfg.seasons.peak.mult;
    const perDay = s.hotel * reg.hotel * m + s.food * reg.food + s.transport * reg.transport + s.activities * reg.activities * m;
    expect(r.perPerson).toBe(Math.round(perDay * 7 + cfg.visaPerPerson));
    expect(r.total).toBe(r.perPerson * 2);
    expect(r.range.low).toBeLessThan(r.total);
    expect(r.range.high).toBeGreaterThan(r.total);
  });

  it('summer is cheaper than peak; red sea cheaper than cairo (comfort)', () => {
    const peak = computeTripCost(cfg, { season: 'peak' });
    const summer = computeTripCost(cfg, { season: 'summer' });
    expect(summer.perPerson).toBeLessThan(peak.perPerson);
    const cairo = computeTripCost(cfg, { region: 'cairo' });
    const redsea = computeTripCost(cfg, { region: 'redsea' });
    expect(redsea.perPerson).toBeLessThan(cairo.perPerson);
  });

  it('internal flight adds the addon per person; group discount on transport', () => {
    const off = computeTripCost(cfg, { travelers: 2 });
    const on = computeTripCost(cfg, { travelers: 2, flight: true });
    expect(on.perPerson).toBe(off.perPerson + cfg.flightAddon);
    const three = computeTripCost(cfg, { travelers: 3 });
    expect(three.breakdown.transport).toBeCloseTo(off.breakdown.transport * 0.85);
  });

  it('clamps and falls back on unknown keys', () => {
    const r = computeTripCost(cfg, { days: 400, travelers: -1, style: 'presidential', region: 'mars', season: 'monsoon' });
    expect(r.days).toBe(30);
    expect(r.travelers).toBe(1);
    expect(r.style).toBe('comfort');
    expect(r.region).toBe('cairo');
    expect(r.season).toBe('peak');
    expect(clamp('abc', 1, 30)).toBe(1);
    expect(formatUsd(1234.6)).toBe('$1,235');
  });
});

describe('toolsApi — config fetch resilience', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('returns API config when healthy (v2 fields with fallback fill)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        styles: FALLBACK_CONFIG.styles,
        visaPerPerson: 25,
        links: [{ name: 'X', url: 'https://x.com' }],
      }),
    }) as unknown as typeof fetch;
    const cfg = await getTripCostConfig('egypt-excursionsonline.com');
    expect(cfg.links[0].name).toBe('X');
    expect(cfg.regions.cairo).toBeDefined(); // filled from fallback
    expect(cfg.flightAddon).toBe(FALLBACK_CONFIG.flightAddon);
  });

  it('falls back when the API errors, times out, or returns junk', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('down')) as unknown as typeof fetch;
    expect(await getTripCostConfig('a.com')).toEqual(FALLBACK_CONFIG);

    global.fetch = jest.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;
    expect(await getTripCostConfig('a.com')).toEqual(FALLBACK_CONFIG);

    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ nope: 1 }) }) as unknown as typeof fetch;
    expect(await getTripCostConfig('a.com')).toEqual(FALLBACK_CONFIG);
  });
});
