// lib/toolsApi.ts
// Client for the central foxes-tools API. Every EEO network site renders the
// free tools from this one source of truth (pricing + credit links). If the API
// is unreachable the built-in fallback below keeps the page fully working —
// a tools outage must never take a network site down with it.

const TOOLS_API_URL = (process.env.TOOLS_API_URL || 'https://foxes-tools-api-production.up.railway.app').replace(/\/+$/, '');

export interface TripStyleDef {
  label: string;
  hotel: number;
  food: number;
  transport: number;
  activities: number;
}

export interface TripCostConfig {
  styles: Record<string, TripStyleDef>;
  visaPerPerson: number;
  links: { name: string; url: string }[];
}

// Mirrors the API defaults — used only when the API can't be reached.
export const FALLBACK_CONFIG: TripCostConfig = {
  styles: {
    budget: { label: 'Budget', hotel: 25, food: 12, transport: 8, activities: 15 },
    comfort: { label: 'Comfort', hotel: 70, food: 25, transport: 15, activities: 35 },
    luxury: { label: 'Luxury', hotel: 180, food: 60, transport: 40, activities: 80 },
  },
  visaPerPerson: 25,
  links: [{ name: 'Hurghada Excursions Online', url: 'https://hurghadaexcursionsonline.com' }],
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
    return { styles: data.styles, visaPerPerson: data.visaPerPerson, links: data.links };
  } catch {
    return FALLBACK_CONFIG;
  }
}

// ── Local quote math (same model as the API) ─────────────────────────────────
// The client computes locally from the fetched config so sliders react
// instantly — no per-click API round-trips.
export function clamp(n: unknown, min: number, max: number): number {
  const v = parseInt(String(n), 10);
  if (isNaN(v)) return min;
  return Math.min(max, Math.max(min, v));
}

export interface TripCostResult {
  days: number;
  travelers: number;
  style: string;
  perDay: number;
  breakdown: { hotel: number; food: number; transport: number; activities: number };
  visa: number;
  perPerson: number;
  total: number;
}

export function computeTripCost(
  config: TripCostConfig,
  input: { days?: number; travelers?: number; style?: string } = {},
): TripCostResult {
  const days = clamp(input.days == null ? 7 : input.days, 1, 30);
  const travelers = clamp(input.travelers == null ? 2 : input.travelers, 1, 12);
  const style = input.style && config.styles[input.style] ? input.style : 'comfort';
  const s = config.styles[style];
  const transport = s.transport * (travelers >= 3 ? 0.85 : 1);
  const breakdown = { hotel: s.hotel, food: s.food, transport, activities: s.activities };
  const perDay = breakdown.hotel + breakdown.food + breakdown.transport + breakdown.activities;
  const perPerson = Math.round(perDay * days + config.visaPerPerson);
  return { days, travelers, style, perDay, breakdown, visa: config.visaPerPerson, perPerson, total: perPerson * travelers };
}

export function formatUsd(n: number): string {
  return '$' + Math.round(n).toLocaleString('en-US');
}
