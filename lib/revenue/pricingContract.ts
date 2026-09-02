import type { GuestPrices } from '@/lib/models/RevenuePriceOverride';

export const STANDARD_OPTION_KEY = 'standard' as const;

export type EffectivePriceQuote = {
  tourId: string;
  tourTitle: string;
  optionKey: string;
  date: string;
  time: string;
  currency: string;
  prices: GuestPrices;
  cataloguePrices: GuestPrices;
  version: number;
  overrideId: string | null;
  executionId: string | null;
  source: 'catalogue' | 'override';
  sourceVersion: string;
};
