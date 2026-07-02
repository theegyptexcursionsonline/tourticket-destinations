// lib/tripCost.ts
// Pure pricing model for the free Egypt trip-cost calculator (/tools/trip-cost-calculator).
// Side-effect free so it can be unit-tested in Node.

export const VISA_PER_PERSON = 25; // Egypt e-visa, USD

export const TRIP_STYLES = {
  budget: { label: 'Budget', hotel: 25, food: 12, transport: 8, activities: 15 },
  comfort: { label: 'Comfort', hotel: 70, food: 25, transport: 15, activities: 35 },
  luxury: { label: 'Luxury', hotel: 180, food: 60, transport: 40, activities: 80 },
} as const;

export type TripStyle = keyof typeof TRIP_STYLES;

export interface TripCostInput {
  days?: number;
  travelers?: number;
  style?: string;
}

export interface TripCostResult {
  days: number;
  travelers: number;
  style: TripStyle;
  perDay: number;
  breakdown: { hotel: number; food: number; transport: number; activities: number };
  visa: number;
  perPerson: number;
  total: number;
}

export function clamp(n: unknown, min: number, max: number): number {
  const v = parseInt(String(n), 10);
  if (isNaN(v)) return min;
  return Math.min(max, Math.max(min, v));
}

export function computeTripCost(input: TripCostInput = {}): TripCostResult {
  const days = clamp(input.days == null ? 7 : input.days, 1, 30);
  const travelers = clamp(input.travelers == null ? 2 : input.travelers, 1, 12);
  const style: TripStyle = input.style && input.style in TRIP_STYLES ? (input.style as TripStyle) : 'comfort';
  const s = TRIP_STYLES[style];
  // Shared vans/taxis get cheaper per head for 3+ travellers.
  const transport = s.transport * (travelers >= 3 ? 0.85 : 1);
  const breakdown = { hotel: s.hotel, food: s.food, transport, activities: s.activities };
  const perDay = breakdown.hotel + breakdown.food + breakdown.transport + breakdown.activities;
  const perPerson = Math.round(perDay * days + VISA_PER_PERSON);
  return { days, travelers, style, perDay, breakdown, visa: VISA_PER_PERSON, perPerson, total: perPerson * travelers };
}

export function formatUsd(n: number): string {
  return '$' + Math.round(n).toLocaleString('en-US');
}
