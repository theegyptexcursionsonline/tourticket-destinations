/**
 * A tour carries an admin-set `rating` independently of its review documents,
 * so the storefront could advertise "4.8 (0 reviews)" on a tour nobody had
 * reviewed. These cases pin the rule: no reviews, no rating shown.
 */
import { provableRating, ratingLabel, resolveReviewCount, reviewCountLabel } from '@/lib/tours/ratingDisplay';

describe('resolveReviewCount', () => {
  it('counts a populated review array', () => {
    expect(resolveReviewCount([{}, {}, {}])).toBe(3);
  });

  it('accepts a pre-counted number', () => {
    expect(resolveReviewCount(12)).toBe(12);
  });

  it.each([[undefined], [null], ['4'], [{}], [NaN], [-3]])('treats %p as zero', (input) => {
    expect(resolveReviewCount(input)).toBe(0);
  });
});

describe('provableRating', () => {
  it('returns the rating when real reviews back it', () => {
    expect(provableRating(4.8, [{}, {}])).toEqual({ rating: 4.8, reviewCount: 2 });
  });

  it('refuses a rating with zero reviews — the reported live defect', () => {
    expect(provableRating(4.8, [])).toBeNull();
  });

  it('refuses the legacy invented default when nothing was reviewed', () => {
    expect(provableRating(4.5, undefined)).toBeNull();
  });

  it.each([[0], [undefined], [null], ['4.8'], [NaN]])('refuses unusable rating %p', (rating) => {
    expect(provableRating(rating, [{}, {}])).toBeNull();
  });

  it('rounds to one decimal so stored averages do not leak precision', () => {
    expect(provableRating(4.8333, [{}])).toEqual({ rating: 4.8, reviewCount: 1 });
  });
});

describe('reviewCountLabel', () => {
  it.each([
    [[], '0 reviews'],
    [[{}], '1 review'],
    [[{}, {}], '2 reviews'],
    [2400, '2,400 reviews'],
    [undefined, '0 reviews'],
  ])('renders %p as %p', (reviews, expected) => {
    expect(reviewCountLabel(reviews)).toBe(expected);
  });
});

describe('ratingLabel', () => {
  it('formats a plural label', () => {
    expect(ratingLabel(4.8, [{}, {}])).toBe('4.8 (2 reviews)');
  });

  it('uses the singular for exactly one review', () => {
    expect(ratingLabel(5, [{}])).toBe('5 (1 review)');
  });

  it('groups thousands', () => {
    expect(ratingLabel(4.6, 2400)).toBe('4.6 (2,400 reviews)');
  });

  it('returns null instead of a bare "Rating:" when unprovable', () => {
    expect(ratingLabel(4.8, [])).toBeNull();
  });
});
