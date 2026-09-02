export const MAX_PARTICIPANTS_PER_TYPE = 50;
export const MAX_PARTICIPANTS_TOTAL = 50;

export class ParticipantCountError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParticipantCountError';
  }
}

type ParticipantInputs = {
  adults?: unknown;
  children?: unknown;
  infants?: unknown;
};

export type ParticipantCounts = {
  adults: number;
  children: number;
  infants: number;
  total: number;
};

function participantCount(value: unknown, fallback: number, label: string): number {
  const resolved = value === undefined ? fallback : value;
  if (
    typeof resolved !== 'number'
    || !Number.isFinite(resolved)
    || !Number.isInteger(resolved)
    || resolved < 0
    || resolved > MAX_PARTICIPANTS_PER_TYPE
  ) {
    throw new ParticipantCountError(
      `${label} must be a whole number between 0 and ${MAX_PARTICIPANTS_PER_TYPE}.`,
    );
  }
  return resolved;
}

/**
 * Validate admin-entered participant counts before pricing or mutation.
 * JSON numeric strings, fractions, infinities and oversized parties fail
 * closed rather than being coerced or rounded into a different booking.
 */
export function validateParticipantCounts(
  input: ParticipantInputs,
  fallback: Omit<ParticipantCounts, 'total'> = { adults: 1, children: 0, infants: 0 },
): ParticipantCounts {
  const adults = participantCount(input.adults, fallback.adults, 'Adults');
  const children = participantCount(input.children, fallback.children, 'Children');
  const infants = participantCount(input.infants, fallback.infants, 'Infants');
  const total = adults + children + infants;
  if (total < 1) {
    throw new ParticipantCountError('At least 1 participant is required.');
  }
  if (total > MAX_PARTICIPANTS_TOTAL) {
    throw new ParticipantCountError(`A booking can contain at most ${MAX_PARTICIPANTS_TOTAL} participants.`);
  }
  return { adults, children, infants, total };
}
