/**
 * A tour's `rating` is an admin-editable number that lives independently of the
 * review collection, so a tour with no reviews can still carry one. Printing it
 * unconditionally advertises a score nobody gave — the same fabricated-figures
 * defect fixed on attraction templates in 3ed1b59. Resolve through here so a
 * rating only reaches a customer when real reviews back it.
 */

export function resolveReviewCount(reviews: unknown): number {
  if (Array.isArray(reviews)) return reviews.length;
  if (typeof reviews === 'number' && Number.isFinite(reviews)) {
    return Math.max(0, Math.trunc(reviews));
  }
  return 0;
}

export interface ProvableRating {
  rating: number;
  reviewCount: number;
}

export function provableRating(rating: unknown, reviews: unknown): ProvableRating | null {
  const reviewCount = resolveReviewCount(reviews);
  if (reviewCount < 1) return null;

  const value = typeof rating === 'number' && Number.isFinite(rating) ? rating : NaN;
  if (!(value > 0)) return null;

  return { rating: Math.round(value * 10) / 10, reviewCount };
}

/** "12 reviews" / "1 review" — for surfaces that render the score separately. */
export function reviewCountLabel(reviews: unknown): string {
  const count = resolveReviewCount(reviews);
  return `${count.toLocaleString()} ${count === 1 ? 'review' : 'reviews'}`;
}

/** "4.8 (12 reviews)" — or null when nothing is provable. Singular-safe. */
export function ratingLabel(rating: unknown, reviews: unknown): string | null {
  const provable = provableRating(rating, reviews);
  if (!provable) return null;
  return `${provable.rating} (${reviewCountLabel(reviews)})`;
}
