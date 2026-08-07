import {
  CART_METADATA_CAPACITY,
  CartMetadataTooLargeError,
  cartMetadataKey,
  packCartMetadata,
  unpackCartMetadata,
} from '@/lib/checkout/cartMetadata';

// The checkout accepts up to 10 tours, but the cart was written into just two
// 500-character metadata keys. Past ~5 tours the tail was dropped silently, the
// webhook parsed malformed JSON, and a customer who had already paid was
// refunded instead of booked.
const realItem = {
  i: 0,
  t: '6986127df1598842cc1e5103',
  d: '2026-08-11',
  tm: '10:00',
  a: 2,
  c: 0,
  n: 0,
  bp: 35,
  bo: 'eda9e2bf-bbe1-4d72-9265-2c316822f663',
  bot: 'Snorkeling Trip',
  ao: [] as unknown[],
};
const cartOf = (count: number) => Array.from({ length: count }, (_, i) => ({ ...realItem, i }));

describe('cart metadata packing', () => {
  it('survives the largest cart the checkout allows', () => {
    // Ten items is the documented maximum; this is the case that was broken.
    const cart = cartOf(10);
    const packed = packCartMetadata(cart);
    expect(JSON.parse(unpackCartMetadata(packed))).toEqual(cart);
  });

  it('round-trips a single item without changing the first key name', () => {
    const cart = cartOf(1);
    const packed = packCartMetadata(cart);
    // Payments created before this change carry `cart_data`; the reader must
    // still find them under that name.
    expect(Object.keys(packed)).toContain('cart_data');
    expect(JSON.parse(unpackCartMetadata(packed))).toEqual(cart);
  });

  it('keeps every chunk inside Stripe 500-character limit', () => {
    for (const value of Object.values(packCartMetadata(cartOf(10)))) {
      expect(value.length).toBeLessThanOrEqual(500);
    }
  });

  it('reads a cart written by the old two-key format', () => {
    const serialized = JSON.stringify(cartOf(3));
    const legacy = {
      cart_data: serialized.slice(0, 500),
      cart_data_2: serialized.slice(500, 1000),
    };
    expect(JSON.parse(unpackCartMetadata(legacy))).toEqual(cartOf(3));
  });

  it('refuses an oversized cart instead of silently truncating it', () => {
    const huge = [{ ...realItem, bot: 'x'.repeat(CART_METADATA_CAPACITY) }];
    expect(() => packCartMetadata(huge)).toThrow(CartMetadataTooLargeError);
  });

  it('stops at a missing chunk rather than splicing a false cart together', () => {
    const packed = packCartMetadata(cartOf(10));
    delete packed[cartMetadataKey(1)];
    // A gap must produce unparseable JSON, never a plausible shorter cart.
    expect(() => JSON.parse(unpackCartMetadata(packed))).toThrow();
  });

  it('ignores unrelated metadata keys', () => {
    const packed = { ...packCartMetadata(cartOf(2)), tenant_id: 'el-gouna', pricing_total: '75.6' };
    expect(JSON.parse(unpackCartMetadata(packed))).toEqual(cartOf(2));
  });

  it('treats absent metadata as an empty string, not a crash', () => {
    expect(unpackCartMetadata(undefined)).toBe('');
    expect(unpackCartMetadata(null)).toBe('');
    expect(unpackCartMetadata({})).toBe('');
  });
});
