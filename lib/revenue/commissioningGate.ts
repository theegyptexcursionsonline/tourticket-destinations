import type { PriceWrite } from '@/lib/revenue/priceWriteValidation';
import { RevenuePricingWriteError } from '@/lib/revenue/priceWriteGate';

const TOUR_OBJECT_ID = /^[a-f0-9]{24}$/i;
const OPTION_KEY = /^[A-Za-z0-9._:-]{1,120}$/;

export type RevenueCommissioningTarget = { tenantId: string; tourId: string; optionKey: string; date: string; time: string };

export function parseRevenueCommissioningTarget(raw?: string) {
  const value = raw?.trim();
  if (!value) return null;
  const [tenantId, tourId, optionKey, date, time, ...extra] = value.split('|').map((part) => part.trim());
  const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(date || '') ? new Date(`${date}T00:00:00.000Z`) : null;
  const validDate = Boolean(parsedDate && Number.isFinite(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === date);
  if (extra.length || !/^[a-z0-9][a-z0-9-]{0,62}$/.test(tenantId || '') || !TOUR_OBJECT_ID.test(tourId || '') || !OPTION_KEY.test(optionKey || '') || !validDate || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time || '')) {
    throw new RevenuePricingWriteError(503, 'COMMISSIONING_TARGET_INVALID', 'REVENUEPILOT_COMMISSIONING_TARGET must be one exact tenantId|tourId|optionKey|YYYY-MM-DD|HH:mm target.');
  }
  return { tenantId: tenantId!, tourId: tourId!.toLowerCase(), optionKey: optionKey!, date: date!, time: time! };
}

export function revenueCommissioningArmState(env: NodeJS.ProcessEnv = process.env, now = new Date()) {
  let target: RevenueCommissioningTarget | null = null;
  try { target = parseRevenueCommissioningTarget(env.REVENUEPILOT_COMMISSIONING_TARGET); }
  catch { return { enabled: false, blockReason: 'exact_target_invalid', target: null, notAfter: null }; }
  const notAfter = env.REVENUEPILOT_COMMISSIONING_NOT_AFTER ? new Date(env.REVENUEPILOT_COMMISSIONING_NOT_AFTER) : null;
  const validExpiry = Boolean(notAfter && Number.isFinite(notAfter.getTime()));
  const future = Boolean(notAfter && notAfter.getTime() > now.getTime());
  const bounded = Boolean(notAfter && notAfter.getTime() <= now.getTime() + 24 * 60 * 60 * 1000);
  const blockReason = env.REVENUEPILOT_COMMISSIONING_ENABLED !== 'true'
    ? 'globally_disabled'
    : env.REVENUEPILOT_COMMISSIONING_CONFIRMATION !== 'ENABLE_MT_ONE_TIME_COMMISSIONING'
      ? 'confirmation_missing'
      : !target
        ? 'exact_target_missing'
        : !validExpiry
          ? 'expiry_missing'
          : !future
            ? 'window_expired'
            : !bounded
              ? 'window_exceeds_24_hours'
              : null;
  return { enabled: blockReason === null, blockReason, target, notAfter };
}

function targetMatches(left: RevenueCommissioningTarget, right: PriceWrite['target']) {
  return left.tourId === right.tourId.toLowerCase()
    && left.optionKey === right.optionKey
    && left.date === right.date
    && left.time === right.time;
}

export function assertRevenuePilotCommissioningAllowed(input: PriceWrite, env: NodeJS.ProcessEnv = process.env, now = new Date()) {
  const arm = revenueCommissioningArmState(env, now);
  if (!arm.enabled || !arm.target) throw new RevenuePricingWriteError(503, 'COMMISSIONING_NOT_ARMED', 'The one-time commissioning window is disabled, expired, or not exactly scoped.');
  if (arm.target.tenantId !== input.tenantId || !targetMatches(arm.target, input.target)) throw new RevenuePricingWriteError(403, 'COMMISSIONING_TARGET_FORBIDDEN', 'This exact tenant, tour, option, date and time is not commissioned.');
}

export function commissioningMovementIsSafe(current: PriceWrite['prices'], probe: PriceWrite['prices']) {
  let changed = 0;
  const safe = (['adult', 'child', 'infant'] as const).every((guest) => {
    const before = current[guest];
    const after = probe[guest];
    if (!Number.isFinite(before) || !Number.isFinite(after) || before < 0 || after < 0) return false;
    if (before === 0) return after === 0;
    const absolute = Math.abs(after - before);
    if (absolute > 0) changed += 1;
    return absolute > 0 && absolute <= 1.000001 && absolute / before <= 0.01000001;
  });
  return safe && changed > 0;
}
