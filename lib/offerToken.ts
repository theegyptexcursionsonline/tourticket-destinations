import { createHmac, timingSafeEqual } from 'crypto';

/**
 * A planner offer link is one opaque segment: base64url(payload).base64url(hmac).
 *
 * The token carries WHO the offer is for and WHICH code to apply — never the
 * discount value. The tenant's Discount collection stays the single authority on
 * what the code is worth, so a link can never advertise a rate checkout refuses.
 */
export type OfferPayload = {
  firstName: string;
  discountCode: string;
  expiresAt: string; // ISO instant the planner's window closes (drives the countdown)
};

export type OfferInvalidReason =
  | 'malformed'
  | 'verification_unavailable'
  | 'bad_signature'
  | 'bad_payload';

export type VerifiedOffer =
  | { state: 'valid'; offer: OfferPayload }
  | { state: 'expired'; offer: OfferPayload }
  | { state: 'invalid'; reason: OfferInvalidReason };

const MAX_TOKEN_LENGTH = 1024;

function secret(): string {
  const value = process.env.OFFER_TOKEN_SECRET;
  if (!value || value.length < 16) throw new Error('OFFER_TOKEN_SECRET is not configured');
  return value;
}

function hmacFor(encodedPayload: string): Buffer {
  return createHmac('sha256', secret()).update(encodedPayload).digest();
}

export function signOffer(offer: OfferPayload): string {
  const firstName = offer.firstName.trim().slice(0, 40);
  const discountCode = offer.discountCode.trim().toUpperCase().slice(0, 24);
  if (!firstName || !discountCode) {
    throw new Error('An offer needs a first name and a discount code');
  }
  if (!Number.isFinite(new Date(offer.expiresAt).getTime())) {
    throw new Error('An offer needs a valid expiry instant');
  }
  const payload = Buffer.from(
    JSON.stringify({ firstName, discountCode, expiresAt: offer.expiresAt }),
    'utf8',
  ).toString('base64url');
  return `${payload}.${hmacFor(payload).toString('base64url')}`;
}

export function verifyOffer(token: string): VerifiedOffer {
  const parts = token.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1] || token.length > MAX_TOKEN_LENGTH) {
    return { state: 'invalid', reason: 'malformed' };
  }

  let signature: Buffer;
  try {
    signature = Buffer.from(parts[1], 'base64url');
  } catch {
    return { state: 'invalid', reason: 'malformed' };
  }

  // A deployment without its signing secret fails closed to the designed page,
  // never a 500 in front of a customer.
  let expected: Buffer;
  try {
    expected = hmacFor(parts[0]);
  } catch {
    return { state: 'invalid', reason: 'verification_unavailable' };
  }
  if (signature.length !== expected.length || !timingSafeEqual(signature, expected)) {
    return { state: 'invalid', reason: 'bad_signature' };
  }

  let offer: OfferPayload;
  try {
    offer = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
  } catch {
    return { state: 'invalid', reason: 'bad_payload' };
  }
  if (
    typeof offer.firstName !== 'string' || !offer.firstName.trim() ||
    typeof offer.discountCode !== 'string' || !offer.discountCode.trim() ||
    !Number.isFinite(new Date(offer.expiresAt).getTime())
  ) {
    return { state: 'invalid', reason: 'bad_payload' };
  }

  if (new Date(offer.expiresAt).getTime() <= Date.now()) return { state: 'expired', offer };
  return { state: 'valid', offer };
}

/**
 * The exact discount arithmetic used by checkout (`lib/security/checkoutPricing.ts`).
 * Sharing one function is what guarantees the price a customer is quoted on the
 * offer page is the price the payment intent charges.
 */
export function discountAmountFor(
  subtotal: number,
  discount: { discountType: 'percentage' | 'fixed'; value: number },
): number {
  const amount = discount.discountType === 'percentage'
    ? (subtotal * Math.min(Number(discount.value), 100)) / 100
    : Math.min(Number(discount.value), subtotal);
  return Number(amount.toFixed(2));
}

export function priceAfterDiscount(
  subtotal: number,
  discount: { discountType: 'percentage' | 'fixed'; value: number },
): number {
  return Number((subtotal - discountAmountFor(subtotal, discount)).toFixed(2));
}

/**
 * Short, human-readable link slugs: `amira-7k2m`.
 *
 * The alphabet omits characters that are misread when a link is spoken aloud or
 * retyped from a screenshot (0/O, 1/l/I), because these get shared by hand.
 */
const SLUG_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

export function offerSlugFor(firstName: string, random: () => number = Math.random): string {
  const name = firstName
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z]/g, '')
    .slice(0, 14);
  let suffix = '';
  for (let index = 0; index < 4; index += 1) {
    suffix += SLUG_ALPHABET[Math.floor(random() * SLUG_ALPHABET.length)];
  }
  return name ? `${name}-${suffix}` : `offer-${suffix}`;
}

/** A short slug never contains a dot; a signed token always does. */
export function looksLikeOfferSlug(value: string): boolean {
  return /^[a-z]{0,14}-?[a-z0-9-]{1,20}$/.test(value) && !value.includes('.');
}

/**
 * A campaign link is just the discount code itself (`/offer/planner15`): one
 * link per campaign instead of one per customer. Tried only after the personal
 * slug lookup misses, so a minted slug always wins over a same-shaped code.
 */
export function looksLikeCampaignCode(value: string): boolean {
  return /^[A-Za-z0-9]{3,24}$/.test(value);
}
