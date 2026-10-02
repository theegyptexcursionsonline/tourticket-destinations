import { createHmac } from 'crypto';
import AbuseRateLimit from '@/lib/models/AbuseRateLimit';
import { requestVisitor } from '@/lib/security/requestVisitor';
import { limitKeyFor } from '@/lib/security/visitorAddress';

const TEST_ONLY_SECRET = 'test-only-public-action-hash-secret-32-bytes';

export interface AbuseLimitBucket {
  scope: string;
  keyHash: string;
  windowStart: Date;
  expiresAt: Date;
}

export interface AbuseLimitStore {
  increment(bucket: AbuseLimitBucket): Promise<number>;
}

export interface AbuseLimitResult {
  allowed: boolean;
  count: number;
  limit: number;
  retryAfterSeconds: number;
}

const isDuplicateKeyError = (error: unknown): boolean =>
  Boolean(error) && (error as { code?: number }).code === 11000;

const mongoAbuseLimitStore: AbuseLimitStore = {
  async increment(bucket) {
    // An upsert against a unique index is not safe under concurrency: when two
    // requests open the same window at the same moment they both miss, both
    // try to insert, and the index rejects the loser with E11000. That is
    // exactly the burst this limiter exists to survive — unhandled, it turned
    // a rate-limited flood into a wall of 500s instead of 429s (observed live,
    // 33 of 50 concurrent requests). The retry finds the winner's document and
    // increments it.
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const document = await AbuseRateLimit.findOneAndUpdate(
          {
            scope: bucket.scope,
            keyHash: bucket.keyHash,
            windowStart: bucket.windowStart,
          },
          {
            $inc: { count: 1 },
            $setOnInsert: {
              scope: bucket.scope,
              keyHash: bucket.keyHash,
              windowStart: bucket.windowStart,
              expiresAt: bucket.expiresAt,
            },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        );

        return Number(document.count);
      } catch (error) {
        if (attempt === 0 && isDuplicateKeyError(error)) continue;
        throw error;
      }
    }

    // Unreachable: the loop either returns or rethrows.
    throw new Error('Abuse limit counter could not be incremented.');
  },
};

export function getAbuseHashSecret(): string {
  const secret = process.env.ABUSE_LIMIT_HASH_SECRET || process.env.JWT_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === 'test') return TEST_ONLY_SECRET;
  throw new Error('ABUSE_LIMIT_HASH_SECRET (or JWT_SECRET fallback) must contain at least 32 characters.');
}

export function hashPrivacyKey(value: string, purpose: string, secret = getAbuseHashSecret()): string {
  return createHmac('sha256', secret).update(`${purpose}\0${value}`).digest('hex');
}

export function extractTrustedClientAddress(request: Request): string | null {
  // Behind the site's edge function (proxy.ts) a route's own x-nf-client-connection-ip
  // is the edge's address, shared by every visitor it serves; the visitor's address
  // arrives as the edge's signed word (lib/security/visitorAddress.ts). We deliberately
  // never trust x-forwarded-for or x-real-ip: a client writes them.
  return requestVisitor(request.headers)?.address ?? null;
}

function normalizedUserAgent(request: Request): string {
  return (request.headers.get('user-agent') || 'unavailable').trim().slice(0, 256);
}

export function publicRequestIdentity(request: Request): string {
  // An IPv6 visitor counts by their /64 (one connection can send from any address in it).
  const network = limitKeyFor(extractTrustedClientAddress(request)) || 'unavailable';
  return `network:${network}|agent:${normalizedUserAgent(request)}`;
}

export async function consumeAbuseLimit(
  input: {
    scope: string;
    identity: string;
    limit: number;
    windowMs: number;
    now?: Date;
  },
  store: AbuseLimitStore = mongoAbuseLimitStore,
): Promise<AbuseLimitResult> {
  if (!/^[a-z0-9:_-]{1,80}$/.test(input.scope)) throw new Error('Invalid abuse-limit scope.');
  if (!input.identity || input.identity.length > 2_048) throw new Error('Invalid abuse-limit identity.');
  if (!Number.isInteger(input.limit) || input.limit < 1 || input.limit > 10_000) {
    throw new Error('Invalid abuse-limit threshold.');
  }
  if (!Number.isInteger(input.windowMs) || input.windowMs < 1_000 || input.windowMs > 86_400_000) {
    throw new Error('Invalid abuse-limit window.');
  }

  const now = input.now || new Date();
  const windowStartMs = Math.floor(now.getTime() / input.windowMs) * input.windowMs;
  const windowEndMs = windowStartMs + input.windowMs;
  const bucket: AbuseLimitBucket = {
    scope: input.scope,
    keyHash: hashPrivacyKey(input.identity, `abuse:${input.scope}`),
    windowStart: new Date(windowStartMs),
    // Keep one additional window for operations evidence; Mongo's TTL monitor
    // deletes it automatically and no raw network/email value is retained.
    expiresAt: new Date(windowEndMs + input.windowMs),
  };
  const count = await store.increment(bucket);

  return {
    allowed: count <= input.limit,
    count,
    limit: input.limit,
    retryAfterSeconds: Math.max(1, Math.ceil((windowEndMs - now.getTime()) / 1_000)),
  };
}

export async function enforcePublicActionLimits(input: {
  request: Request;
  action: string;
  subject?: string;
  networkLimit: number;
  subjectLimit?: number;
  windowMs: number;
}): Promise<AbuseLimitResult> {
  const network = await consumeAbuseLimit({
    scope: `${input.action}:network`,
    identity: publicRequestIdentity(input.request),
    limit: input.networkLimit,
    windowMs: input.windowMs,
  });
  if (!network.allowed || !input.subject || !input.subjectLimit) return network;

  return consumeAbuseLimit({
    scope: `${input.action}:subject`,
    identity: input.subject.trim().toLowerCase(),
    limit: input.subjectLimit,
    windowMs: input.windowMs,
  });
}
