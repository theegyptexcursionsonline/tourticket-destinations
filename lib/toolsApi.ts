// lib/toolsApi.ts
// Client for the central foxes-tools API. Every EEO network site renders the
// free tools from this one source of truth (pricing model + credit links). If
// the API is unreachable the built-in fallback keeps the page fully working.

const TOOLS_API_URL = (process.env.TOOLS_API_URL || 'https://foxes-tools-api-production.up.railway.app').replace(/\/+$/, '');

export interface TripStyleDef { label: string; hotel: number; food: number; transport: number; activities: number }
export interface RegionDef { label: string; hotel: number; food: number; transport: number; activities: number }
export interface SeasonDef { label: string; mult: number }

export interface TripCostConfig {
  styles: Record<string, TripStyleDef>;
  regions: Record<string, RegionDef>;
  seasons: Record<string, SeasonDef>;
  visaPerPerson: number;
  flightAddon: number;
  links: { name: string; url: string }[];
  embedBase: string;
}

// Mirrors the API defaults — used only when the API can't be reached.
export const FALLBACK_CONFIG: TripCostConfig = {
  styles: {
    budget: { label: 'Budget', hotel: 25, food: 12, transport: 8, activities: 15 },
    comfort: { label: 'Comfort', hotel: 70, food: 25, transport: 15, activities: 35 },
    luxury: { label: 'Luxury', hotel: 180, food: 60, transport: 40, activities: 80 },
  },
  regions: {
    cairo: { label: 'Cairo & Giza', hotel: 1.1, food: 1.0, transport: 1.0, activities: 1.1 },
    luxor: { label: 'Luxor & Aswan', hotel: 0.9, food: 0.9, transport: 1.0, activities: 1.3 },
    redsea: { label: 'Hurghada / Red Sea', hotel: 0.85, food: 0.85, transport: 0.9, activities: 1.0 },
    sinai: { label: 'Sharm & Sinai', hotel: 0.9, food: 0.9, transport: 0.9, activities: 1.05 },
    combo: { label: 'Nile + Red Sea combo', hotel: 1.0, food: 0.95, transport: 1.25, activities: 1.15 },
  },
  seasons: {
    peak: { label: 'Peak (Oct–Apr)', mult: 1.15 },
    shoulder: { label: 'Shoulder (May & Sep)', mult: 1.0 },
    summer: { label: 'Summer (Jun–Aug)', mult: 0.85 },
  },
  visaPerPerson: 25,
  flightAddon: 110,
  links: [{ name: 'Hurghada Excursions Online', url: 'https://hurghadaexcursionsonline.com' }],
  embedBase: 'https://egypt-excursionsonline.com',
};

export async function getTripCostConfig(host: string): Promise<TripCostConfig> {
  try {
    const res = await fetch(
      `${TOOLS_API_URL}/v1/tools/trip-cost-calculator/config?host=${encodeURIComponent(host)}`,
      { next: { revalidate: 300 }, signal: AbortSignal.timeout(4000) },
    );
    if (!res.ok) return FALLBACK_CONFIG;
    const data = (await res.json()) as Partial<TripCostConfig>;
    if (!data.styles || !data.visaPerPerson || !Array.isArray(data.links) || data.links.length === 0) {
      return FALLBACK_CONFIG;
    }
    return {
      styles: data.styles,
      regions: data.regions || FALLBACK_CONFIG.regions,
      seasons: data.seasons || FALLBACK_CONFIG.seasons,
      visaPerPerson: data.visaPerPerson,
      flightAddon: data.flightAddon ?? FALLBACK_CONFIG.flightAddon,
      links: data.links,
      embedBase: data.embedBase || FALLBACK_CONFIG.embedBase,
    };
  } catch {
    return FALLBACK_CONFIG;
  }
}

// ── Local quote math (same model as the API) ─────────────────────────────────
export function clamp(n: unknown, min: number, max: number): number {
  const v = parseInt(String(n), 10);
  if (isNaN(v)) return min;
  return Math.min(max, Math.max(min, v));
}

export interface TripCostInput {
  days?: number;
  travelers?: number;
  style?: string;
  region?: string;
  season?: string;
  flight?: boolean;
}

export interface TripCostResult {
  days: number;
  travelers: number;
  style: string;
  region: string;
  season: string;
  flight: boolean;
  perDay: number;
  breakdown: { hotel: number; food: number; transport: number; activities: number };
  visa: number;
  flightAddon: number;
  perPerson: number;
  total: number;
  range: { low: number; high: number };
}

const RANGE_PCT = 0.12;

export function computeTripCost(config: TripCostConfig, input: TripCostInput = {}): TripCostResult {
  const days = clamp(input.days == null ? 7 : input.days, 1, 30);
  const travelers = clamp(input.travelers == null ? 2 : input.travelers, 1, 12);
  const style = input.style && config.styles[input.style] ? input.style : 'comfort';
  const region = input.region && config.regions[input.region] ? input.region : 'cairo';
  const season = input.season && config.seasons[input.season] ? input.season : 'peak';
  const flight = !!input.flight;

  const s = config.styles[style];
  const r = config.regions[region];
  const m = config.seasons[season].mult;

  const transportBase = s.transport * r.transport * (travelers >= 3 ? 0.85 : 1);
  const breakdown = {
    hotel: s.hotel * r.hotel * m,
    food: s.food * r.food,
    transport: transportBase,
    activities: s.activities * r.activities * m,
  };
  const perDay = breakdown.hotel + breakdown.food + breakdown.transport + breakdown.activities;
  const extras = config.visaPerPerson + (flight ? config.flightAddon : 0);
  const perPerson = Math.round(perDay * days + extras);
  const total = perPerson * travelers;
  const roundTo = (n: number, step: number) => Math.round(n / step) * step;
  return {
    days, travelers, style, region, season, flight,
    perDay, breakdown,
    visa: config.visaPerPerson,
    flightAddon: flight ? config.flightAddon : 0,
    perPerson, total,
    range: { low: roundTo(total * (1 - RANGE_PCT), 10), high: roundTo(total * (1 + RANGE_PCT), 10) },
  };
}

export function formatUsd(n: number): string {
  return '$' + Math.round(n).toLocaleString('en-US');
}
