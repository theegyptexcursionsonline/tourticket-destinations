import { normalizeTourDifficulty } from '@/lib/admin/tourDifficulty';

describe('normalizeTourDifficulty', () => {
  it('keeps canonical values', () => {
    expect(normalizeTourDifficulty('Moderate')).toBe('Moderate');
    expect(normalizeTourDifficulty('Difficult')).toBe('Difficult');
  });

  it('maps legacy free-text values onto the schema enum', () => {
    expect(normalizeTourDifficulty(' easy ')).toBe('Easy');
    expect(normalizeTourDifficulty('Medium')).toBe('Moderate');
    expect(normalizeTourDifficulty('Leicht')).toBe('Easy');
    expect(normalizeTourDifficulty('anspruchsvoll')).toBe('Challenging');
  });

  it('falls back to Easy for blank or unknown values', () => {
    expect(normalizeTourDifficulty('')).toBe('Easy');
    expect(normalizeTourDifficulty(undefined)).toBe('Easy');
    expect(normalizeTourDifficulty('Easy to moderate')).toBe('Easy');
  });
});
