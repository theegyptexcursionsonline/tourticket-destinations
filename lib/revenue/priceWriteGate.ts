const OBJECT_ID = /^[a-f0-9]{24}$/i;

export class RevenuePricingWriteError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'RevenuePricingWriteError';
  }
}

export function parseRevenuePilotAllowedTourIds(raw = process.env.REVENUEPILOT_ALLOWED_TOUR_IDS || '') {
  const values = raw.split(',').map((value) => value.trim()).filter(Boolean);
  if (values.some((value) => value === '*' || !OBJECT_ID.test(value))) {
    throw new RevenuePricingWriteError(
      503,
      'TOUR_ALLOWLIST_INVALID',
      'REVENUEPILOT_ALLOWED_TOUR_IDS must contain only comma-separated TourTicket tour IDs; wildcards are not allowed.',
    );
  }
  return new Set(values.map((value) => value.toLowerCase()));
}

export function assertRevenuePilotTourAllowed(tourId: string, raw = process.env.REVENUEPILOT_ALLOWED_TOUR_IDS || '') {
  if (!OBJECT_ID.test(tourId)) {
    throw new RevenuePricingWriteError(400, 'INVALID_TOUR', 'Invalid TourTicket tour ID.');
  }
  const allowed = parseRevenuePilotAllowedTourIds(raw);
  if (allowed.size === 0) {
    throw new RevenuePricingWriteError(
      503,
      'TOUR_ALLOWLIST_NOT_CONFIGURED',
      'Automatic pricing is unavailable until at least one exact TourTicket tour ID is approved.',
    );
  }
  if (!allowed.has(tourId.toLowerCase())) {
    throw new RevenuePricingWriteError(403, 'TOUR_NOT_APPROVED', 'This tour is not approved for RevenuePilot price execution.');
  }
}

export function requireRevenueIdempotencyKey(value: string | null) {
  const key = value?.trim() || '';
  if (!key) throw new RevenuePricingWriteError(400, 'IDEMPOTENCY_REQUIRED', 'Idempotency-Key is required.');
  if (key.length > 200 || /[\u0000-\u001f\u007f]/.test(key)) {
    throw new RevenuePricingWriteError(400, 'IDEMPOTENCY_INVALID', 'Idempotency-Key must be at most 200 printable characters.');
  }
  return key;
}

