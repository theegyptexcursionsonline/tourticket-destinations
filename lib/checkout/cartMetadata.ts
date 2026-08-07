/**
 * Packing the paid cart into Stripe metadata.
 *
 * Stripe caps each metadata value at 500 characters. The original code wrote
 * `substring(0, 500)` and `substring(500, 1000)` and stopped there, while the
 * checkout accepts up to 10 items at ~172 characters each. Anything past about
 * five tours lost its tail silently, so the webhook parsed malformed JSON, took
 * the invalid-cart path, and refunded a customer who had already been charged.
 *
 * Two rules follow from that:
 *   - split across as many keys as the cart actually needs, and
 *   - if it still will not fit, refuse to create the payment. Declining a
 *     checkout is recoverable; taking money for a booking we cannot reconstruct
 *     is not.
 */

export const CART_METADATA_CHUNK_SIZE = 500;
/** 10 items x ~172 chars leaves generous headroom at 8 chunks (4,000 chars). */
export const CART_METADATA_MAX_CHUNKS = 8;

export const CART_METADATA_CAPACITY = CART_METADATA_CHUNK_SIZE * CART_METADATA_MAX_CHUNKS;

/** `cart_data`, then `cart_data_2`, `cart_data_3`, … — key 1 keeps its name. */
export function cartMetadataKey(index: number): string {
  return index === 0 ? 'cart_data' : `cart_data_${index + 1}`;
}

export class CartMetadataTooLargeError extends Error {
  constructor(public readonly length: number) {
    super(`Cart metadata is ${length} characters; the limit is ${CART_METADATA_CAPACITY}`);
    this.name = 'CartMetadataTooLargeError';
  }
}

/**
 * Split the serialized cart across numbered metadata keys.
 * Throws rather than truncating — the caller must not create a PaymentIntent
 * it cannot later reconstruct.
 */
export function packCartMetadata(cartSummary: unknown): Record<string, string> {
  const serialized = JSON.stringify(cartSummary);
  if (serialized.length > CART_METADATA_CAPACITY) {
    throw new CartMetadataTooLargeError(serialized.length);
  }

  const packed: Record<string, string> = {};
  for (let index = 0; index * CART_METADATA_CHUNK_SIZE < serialized.length; index += 1) {
    const start = index * CART_METADATA_CHUNK_SIZE;
    packed[cartMetadataKey(index)] = serialized.slice(start, start + CART_METADATA_CHUNK_SIZE);
  }
  // An empty cart still needs the key present; the webhook reads it directly.
  if (Object.keys(packed).length === 0) packed[cartMetadataKey(0)] = serialized;
  return packed;
}

/**
 * Reassemble the cart written by packCartMetadata.
 * Stops at the first missing chunk so a partial write can never be parsed as a
 * complete cart — JSON.parse will reject it, which is the safe outcome.
 */
export function unpackCartMetadata(metadata: Record<string, string> | null | undefined): string {
  if (!metadata) return '';
  let joined = '';
  for (let index = 0; index < CART_METADATA_MAX_CHUNKS; index += 1) {
    const chunk = metadata[cartMetadataKey(index)];
    if (typeof chunk !== 'string' || chunk === '') break;
    joined += chunk;
  }
  return joined;
}
