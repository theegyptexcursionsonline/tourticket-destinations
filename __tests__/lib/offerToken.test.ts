import {
  discountAmountFor,
  priceAfterDiscount,
  signOffer,
  verifyOffer,
  type OfferPayload,
} from '@/lib/offerToken';

const OLD_ENV = process.env.OFFER_TOKEN_SECRET;

const validOffer = (over: Partial<OfferPayload> = {}): OfferPayload => ({
  firstName: 'Amira',
  discountCode: 'PLANNER15',
  expiresAt: new Date(Date.now() + 6 * 3_600_000).toISOString(),
  ...over,
});

beforeEach(() => {
  process.env.OFFER_TOKEN_SECRET = 'fictional-offer-secret-value-for-tests';
});

afterAll(() => {
  if (OLD_ENV === undefined) delete process.env.OFFER_TOKEN_SECRET;
  else process.env.OFFER_TOKEN_SECRET = OLD_ENV;
});

describe('planner offer tokens', () => {
  it('round-trips a signed offer and normalises the code', () => {
    const result = verifyOffer(signOffer(validOffer({ discountCode: 'planner15' })));
    expect(result.state).toBe('valid');
    if (result.state !== 'valid') return;
    expect(result.offer).toMatchObject({ firstName: 'Amira', discountCode: 'PLANNER15' });
  });

  it('never carries a discount value — the tenant database stays the authority', () => {
    const token = signOffer(validOffer());
    const payload = JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString('utf8'));
    expect(Object.keys(payload).sort()).toEqual(['discountCode', 'expiresAt', 'firstName']);
  });

  it('separates an expired offer from an invalid one and keeps the name for the message', () => {
    const token = signOffer(validOffer({ expiresAt: new Date(Date.now() - 1_000).toISOString() }));
    const result = verifyOffer(token);
    expect(result.state).toBe('expired');
    if (result.state !== 'expired') return;
    expect(result.offer.firstName).toBe('Amira');
  });

  it('rejects a tampered name or code', () => {
    for (const patch of [{ firstName: 'Someone Else' }, { discountCode: 'FREESTUFF' }]) {
      const token = signOffer(validOffer());
      const [payload, signature] = token.split('.');
      const decoded = { ...JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')), ...patch };
      const forged = `${Buffer.from(JSON.stringify(decoded), 'utf8').toString('base64url')}.${signature}`;
      const result = verifyOffer(forged);
      expect(result.state).toBe('invalid');
      if (result.state !== 'invalid') return;
      expect(result.reason).toBe('bad_signature');
    }
  });

  it('rejects a token signed with another secret', () => {
    const token = signOffer(validOffer());
    process.env.OFFER_TOKEN_SECRET = 'a-completely-different-secret-value';
    expect(verifyOffer(token)).toMatchObject({ state: 'invalid', reason: 'bad_signature' });
  });

  it('rejects malformed and oversized tokens', () => {
    for (const bad of ['', '.', 'onlyonepart', 'a.b.c', `${'x'.repeat(1200)}.y`]) {
      expect(verifyOffer(bad)).toMatchObject({ state: 'invalid', reason: 'malformed' });
    }
  });

  it('fails closed when the signing secret is absent instead of throwing', () => {
    const token = signOffer(validOffer());
    delete process.env.OFFER_TOKEN_SECRET;
    expect(verifyOffer(token)).toMatchObject({ state: 'invalid', reason: 'verification_unavailable' });
  });

  it('refuses to mint without a name, a code or a real expiry', () => {
    expect(() => signOffer(validOffer({ firstName: '  ' }))).toThrow();
    expect(() => signOffer(validOffer({ discountCode: '' }))).toThrow();
    expect(() => signOffer(validOffer({ expiresAt: 'not-a-date' }))).toThrow();
  });
});

describe('offer pricing matches checkout pricing exactly', () => {
  // Mirrors lib/security/checkoutPricing.ts: percentage capped at 100,
  // fixed capped at the subtotal, rounded to two decimals.
  const checkoutDiscount = (subtotal: number, record: { discountType: 'percentage' | 'fixed'; value: number }) => {
    const raw = record.discountType === 'percentage'
      ? (subtotal * Math.min(Number(record.value), 100)) / 100
      : Math.min(Number(record.value), subtotal);
    return Number(raw.toFixed(2));
  };

  const cases: Array<[number, { discountType: 'percentage' | 'fixed'; value: number }]> = [
    [40, { discountType: 'percentage', value: 15 }],
    [24, { discountType: 'percentage', value: 12.5 }],
    [75, { discountType: 'fixed', value: 10 }],
    [8, { discountType: 'fixed', value: 25 }],            // fixed larger than subtotal
    [30, { discountType: 'percentage', value: 150 }],      // percentage above 100
    [33.33, { discountType: 'percentage', value: 15 }],
  ];

  it.each(cases)('agrees with checkout on subtotal %s', (subtotal, record) => {
    expect(discountAmountFor(subtotal, record)).toBe(checkoutDiscount(subtotal, record));
  });

  it('never produces a negative price', () => {
    expect(priceAfterDiscount(8, { discountType: 'fixed', value: 25 })).toBe(0);
    expect(priceAfterDiscount(30, { discountType: 'percentage', value: 150 })).toBe(0);
  });
});
