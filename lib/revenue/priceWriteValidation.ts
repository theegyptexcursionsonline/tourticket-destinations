import { createHash } from 'node:crypto';
import type { GuestPrices } from '@/lib/models/RevenuePriceOverride';

export type PriceWrite = {
  executionId: string; recommendationId: string; tenantId: string;
  target: { tourId: string; optionKey: string; date: string; time: string };
  prices: GuestPrices; currency: string; expectedVersion: number;
  policyHash: string; policySnapshot: { floor: number; ceiling: number; maxChangePercent: number; minConfidence: number; cooldownHours: number; mode: 'manual' | 'assist' | 'autopilot' | 'commissioning' }; sourceVersion: string; confidence: number; actor: string; mode: 'manual' | 'assist' | 'autopilot' | 'commissioning';
};

const canonicalJson = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`).join(',')}}`;
  return JSON.stringify(value);
};

export function hashRevenuePolicy(value: unknown) {
  return createHash('sha256').update(canonicalJson(value)).digest('hex');
}

export function validatePriceWrite(value: unknown): PriceWrite {
  const candidate = value && typeof value === 'object' ? value as Partial<PriceWrite> : {};
  const prices = candidate.prices;
  const required = [candidate.executionId, candidate.recommendationId, candidate.tenantId, candidate.target?.tourId, candidate.target?.optionKey, candidate.target?.date, candidate.target?.time, candidate.currency, candidate.policyHash, candidate.sourceVersion, candidate.actor, candidate.mode];
  if (required.some((item) => typeof item !== 'string' || !item.trim())) throw new Error('Missing required execution fields');
  if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(candidate.tenantId || '')) throw new Error('Invalid tenant');
  if (!candidate.target || !/^[a-f0-9]{24}$/i.test(candidate.target.tourId)) throw new Error('Invalid tour');
  if (!candidate.mode || !['manual', 'assist', 'autopilot', 'commissioning'].includes(candidate.mode)) throw new Error('Invalid execution mode');
  if (!Number.isInteger(candidate.expectedVersion) || (candidate.expectedVersion ?? -1) < 0) throw new Error('Invalid expectedVersion');
  if (!Number.isFinite(candidate.confidence) || (candidate.confidence ?? -1) < 85 || (candidate.confidence ?? 101) > 100) throw new Error('Invalid recommendation confidence');
  if (!/^[A-Z]{3}$/.test(candidate.currency || '')) throw new Error('Invalid currency');
  if (!prices) throw new Error('Missing required execution fields');
  for (const guest of ['adult', 'child', 'infant'] as const) {
    const price = prices?.[guest];
    if (!Number.isFinite(price) || price === undefined || price < 0) throw new Error(`Invalid ${guest} price`);
  }
  const policy = candidate.policySnapshot;
  if (!policy || !Number.isFinite(policy.floor) || !Number.isFinite(policy.ceiling) || policy.floor < 0 || policy.floor >= policy.ceiling || !Number.isFinite(policy.maxChangePercent) || policy.maxChangePercent < 1 || policy.maxChangePercent > 5 || !Number.isFinite(policy.minConfidence) || policy.minConfidence < 85 || policy.minConfidence > 100 || !Number.isInteger(policy.cooldownHours) || policy.cooldownHours < 24 || policy.cooldownHours > 168 || !['manual', 'assist', 'autopilot', 'commissioning'].includes(policy.mode)) throw new Error('Invalid policy snapshot');
  if (policy.mode !== candidate.mode || hashRevenuePolicy(policy) !== candidate.policyHash) throw new Error('Invalid policy hash');
  if ((candidate.confidence ?? 0) < policy.minConfidence) throw new Error('Recommendation confidence is below policy minimum');
  if (candidate.mode === 'commissioning' && (candidate.confidence !== 100 || policy.maxChangePercent !== 1 || policy.minConfidence !== 100 || policy.cooldownHours !== 24)) throw new Error('Invalid commissioning policy');
  if (prices.adult < policy.floor || prices.adult > policy.ceiling) throw new Error('Adult price is outside policy corridor');
  const priceDate = String(candidate.target.date || '');
  const parsedPriceDate = /^\d{4}-\d{2}-\d{2}$/.test(priceDate)
    ? new Date(`${priceDate}T00:00:00.000Z`)
    : null;
  if (!parsedPriceDate || !Number.isFinite(parsedPriceDate.getTime()) || parsedPriceDate.toISOString().slice(0, 10) !== priceDate) throw new Error('Invalid price date');
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(candidate.target.time)) throw new Error('Invalid price time');
  if (!candidate.sourceVersion || !/^pv1_[a-f0-9]{64}$/.test(candidate.sourceVersion)) throw new Error('Invalid source version');
  return candidate as PriceWrite;
}
