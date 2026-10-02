import { resolveBookingCutoff } from './bookingCutoff';
import { buildStrictTenantQuery, getTenantConfigCached } from '@/lib/tenant';
import { isTourScheduled, localDepartureToUtc, parseIsoDateOnly } from '@/lib/revenue/departureSchedule';

export class DepartureAdmissionError extends Error {
  readonly code = 'DEPARTURE_UNAVAILABLE';
  constructor(message = 'This departure is no longer available. Choose another date or time.') {
    super(message);
    this.name = 'DepartureAdmissionError';
  }
}

export class DepartureConfigurationError extends Error {
  readonly code = 'DEPARTURE_CONFIGURATION_UNAVAILABLE';
  constructor() { super('Booking timezone is unavailable. Please try again later.'); this.name = 'DepartureConfigurationError'; }
}

export function assertBookingTimeZone(timeZone: string): void {
  try {
    if (!timeZone) throw new Error();
    new Intl.DateTimeFormat('en', { timeZone }).format(0);
  } catch { throw new DepartureConfigurationError(); }
}

type Slot = { time?: string };
type Option = { id?: unknown; _id?: unknown; pricingKey?: string; timeSlots?: Slot[] };
export type DepartureCatalogue = {
  bookingCutoffMinutes?: number;
  bookingOptions?: Option[];
  availability?: Parameters<typeof isTourScheduled>[0]['availability'] & { slots?: Slot[] };
};

/** Booking requires an authored departure; an absent schedule is not a date-only grant. */
export function departureDeadline(
  tour: DepartureCatalogue,
  selection: { date: string; time?: string | null; optionId?: string; optionKey?: string },
  timeZone: string,
): number {
  assertBookingTimeZone(timeZone);
  const day = parseIsoDateOnly(selection.date);
  if (!day || !timeZone) throw new DepartureAdmissionError('A valid booking date and timezone are required.');
  if (!tour.availability || !isTourScheduled(tour, day)) throw new DepartureAdmissionError('The selected date is not scheduled.');
  const options = tour.bookingOptions || [];
  const standard = !selection.optionId || ['standard-default', 'standard-tour', 'standard'].includes(selection.optionId);
  const option = options.find((candidate, index) =>
    (!selection.optionKey || candidate.pricingKey === selection.optionKey)
    && (standard ? Boolean(selection.optionKey && selection.optionKey !== 'standard') : String(candidate.id || candidate._id || `option-${index}`) === selection.optionId));
  if (!options.length && (!standard || (selection.optionKey && selection.optionKey !== 'standard'))) throw new DepartureAdmissionError('The booking option is unavailable.');
  if (options.length && !option) throw new DepartureAdmissionError('A configured booking option is required.');
  const slots = option?.timeSlots?.length ? option.timeSlots : tour.availability?.slots || [];
  const time = selection.time?.trim() || '';
  try {
    if (slots.length) {
      if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time) || !slots.some((slot) => slot.time === time)) {
        throw new DepartureAdmissionError('The selected departure time is unavailable.');
      }
      const base = Date.parse(localDepartureToUtc(selection.date, time, timeZone));
      const desired = Date.parse(`${selection.date}T${time}:00Z`);
      const formatter = new Intl.DateTimeFormat('en-CA', { timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const wallClock = (instant: number) => {
        const parts = Object.fromEntries(formatter.formatToParts(new Date(instant)).filter(part => part.type !== 'literal').map(part => [part.type, Number(part.value)]));
        return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
      };
      // Resolve both sides of a clock change. Nonexistent local times are not
      // valid departures; repeated local times close at the earlier instant.
      const candidates = [-86400000, 0, 86400000].map(delta => {
        const sample = base + delta;
        return desired - (wallClock(sample) - sample);
      }).filter(candidate => wallClock(candidate) === desired);
      if (!candidates.length) throw new DepartureAdmissionError('The local departure time does not exist.');
      return Math.min(...candidates) - resolveBookingCutoff(tour.bookingCutoffMinutes) * 60_000;
    }
    throw new DepartureAdmissionError('A configured departure time is required.');
  } catch (error) {
    if (error instanceof DepartureAdmissionError) throw error;
    throw new DepartureAdmissionError('The departure timezone or time is unavailable.');
  }
}

export function assertFutureDeparture(deadline: number, now = Date.now()): void {
  if (!Number.isFinite(deadline) || deadline <= now) throw new DepartureAdmissionError();
}

export async function resolveCheckoutDepartureDeadlines(cart: Array<Record<string, any>>, tenantId: string, legacyPayment = false): Promise<number[]> {
  const { default: Tour } = await import('@/lib/models/Tour');
  const tenant = await getTenantConfigCached(tenantId);
  if (!tenant || tenant.isActive === false) throw new DepartureAdmissionError('This website is unavailable for booking.');
  const timeZone = tenant.localization?.defaultTimezone;
  const deadlines: number[] = [];
  for (const item of cart) {
    const tour = await Tour.findOne(buildStrictTenantQuery({ _id: item._id || item.id, isPublished: true, archivedAt: null }, tenantId))
      .select('availability bookingOptions bookingCutoffMinutes').lean<DepartureCatalogue | null>();
    if (!tour) throw new DepartureAdmissionError('The selected tour is unavailable.');
    deadlines.push(departureDeadline(legacyPayment ? { ...tour, bookingCutoffMinutes: 0 } : tour, {
      date: String(item.selectedDate || ''), time: item.selectedTime,
      optionId: item.selectedBookingOption?.id, optionKey: item.selectedBookingOption?.pricingKey,
    }, timeZone));
  }
  return deadlines;
}

export function futureCatalogueTimes(tour: DepartureCatalogue, date: string, timeZone: string, now = Date.now()): Record<string, string[]> {
  assertBookingTimeZone(timeZone);
  const options = tour.bookingOptions?.length ? tour.bookingOptions : [{ id: 'standard-default', pricingKey: 'standard' }];
  return Object.fromEntries(options.map((option, index) => {
    const id = String(option.id || option._id || `option-${index}`);
    const slots = option.timeSlots?.length ? option.timeSlots : tour.availability?.slots || [];
    return [id, slots.flatMap((slot) => {
      if (!slot.time) return [];
      try {
        assertFutureDeparture(departureDeadline(tour, { date, time: slot.time, optionId: id, optionKey: option.pricingKey }, timeZone), now);
        return [slot.time];
      } catch { return []; }
    })];
  }));
}

/** Fresh after all awaited catalogue reads; no client clock is accepted. */
export async function assertCheckoutDepartures(cart: Array<Record<string, any>>, tenantId: string): Promise<number[]> {
  const deadlines = await resolveCheckoutDepartureDeadlines(cart, tenantId);
  deadlines.forEach((deadline) => assertFutureDeparture(deadline));
  return deadlines;
}

export function readDepartureSnapshot(metadata: Record<string, string>, itemCount: number): number[] | null {
  if (!metadata.departure_deadlines_utc) return null;
  try {
    const values: unknown = JSON.parse(metadata.departure_deadlines_utc);
    if (!Array.isArray(values) || values.length !== itemCount || values.some(value => !Number.isSafeInteger(value) || value <= 0)) throw new Error();
    return values as number[];
  } catch { throw new DepartureAdmissionError('The paid departure evidence is invalid.'); }
}

export async function recheckPreparedDepartures(cart: Array<Record<string, any>>, tenantId: string, metadata: Record<string, string>): Promise<void> {
  const current = await assertCheckoutDepartures(cart, tenantId);
  const snapshot = readDepartureSnapshot(metadata, cart.length);
  if (!snapshot || current.some((deadline, index) => deadline !== snapshot[index])) {
    throw new DepartureAdmissionError('The departure schedule changed. Review your booking again.');
  }
}
