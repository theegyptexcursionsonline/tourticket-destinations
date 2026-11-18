/**
 * A cart line whose adult (or whole-unit) price is 0 or blank. The catalogue
 * has no free products: a 0 price is an option left at its 0 starting base or
 * a start time not priced yet. Refusing it here, before any payment is
 * prepared, stops a $0 line from riding along beside a priced one (only a
 * whole-cart total of 0 was refused before).
 */
export class PriceUnavailableError extends Error {
  readonly code = 'PRICE_UNAVAILABLE';

  constructor() {
    super('This option has no price yet and cannot be booked online. Please contact us for a price.');
    this.name = 'PriceUnavailableError';
  }
}
