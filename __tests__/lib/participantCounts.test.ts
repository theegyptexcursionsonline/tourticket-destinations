import {
  MAX_PARTICIPANTS_TOTAL,
  ParticipantCountError,
  validateParticipantCounts,
} from '@/lib/bookings/participantCounts';

describe('manual-booking participant validation', () => {
  it('defaults a new booking to one adult', () => {
    expect(validateParticipantCounts({})).toEqual({ adults: 1, children: 0, infants: 0, total: 1 });
  });

  it('preserves validated existing counts for an omitted update field', () => {
    expect(validateParticipantCounts(
      { children: 2 },
      { adults: 2, children: 0, infants: 1 },
    )).toEqual({ adults: 2, children: 2, infants: 1, total: 5 });
  });

  const invalidInputs: Array<[Record<string, unknown>, string]> = [
    [{ adults: 1.5 }, 'fraction'],
    [{ adults: -1 }, 'negative'],
    [{ adults: Number.POSITIVE_INFINITY }, 'infinite'],
    [{ adults: Number.NaN }, 'NaN'],
    [{ adults: '2' }, 'numeric string'],
    [{ children: 51 }, 'per-type overflow'],
  ];

  it.each(invalidInputs)('rejects %s (%s)', (input) => {
    expect(() => validateParticipantCounts(input)).toThrow(ParticipantCountError);
  });

  it('rejects an empty party and a total above the booking ceiling', () => {
    expect(() => validateParticipantCounts({ adults: 0, children: 0, infants: 0 }))
      .toThrow('At least 1 participant is required.');
    expect(() => validateParticipantCounts({ adults: 25, children: 25, infants: 1 }))
      .toThrow(`at most ${MAX_PARTICIPANTS_TOTAL}`);
  });
});
