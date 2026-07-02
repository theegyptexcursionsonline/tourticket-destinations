import { computeTripCost, getTripCostConfig, FALLBACK_CONFIG, clamp, formatUsd } from '@/lib/toolsApi';

describe('toolsApi — local quote math', () => {
  it('computes per-person and total from config', () => {
    const r = computeTripCost(FALLBACK_CONFIG, { days: 7, travelers: 2, style: 'comfort' });
    expect(r.perPerson).toBe(1040); // (70+25+15+35)*7 + 25
    expect(r.total).toBe(2080);
  });

  it('applies the 3+ traveller transport discount', () => {
    const two = computeTripCost(FALLBACK_CONFIG, { travelers: 2, style: 'luxury' });
    const three = computeTripCost(FALLBACK_CONFIG, { travelers: 3, style: 'luxury' });
    expect(three.breakdown.transport).toBeCloseTo(two.breakdown.transport * 0.85);
  });

  it('clamps inputs and falls back to comfort on unknown style', () => {
    const r = computeTripCost(FALLBACK_CONFIG, { days: 400, travelers: -1, style: 'presidential' });
    expect(r.days).toBe(30);
    expect(r.travelers).toBe(1);
    expect(r.style).toBe('comfort');
    expect(clamp('abc', 1, 30)).toBe(1);
    expect(formatUsd(1234.6)).toBe('$1,235');
  });
});

describe('toolsApi — config fetch resilience', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('returns API config when healthy', async () => {
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
