import mongoose from 'mongoose';

const MAX_CURSOR_LENGTH = 1024;
const TENANT_ID = /^[a-z0-9][a-z0-9-]{0,62}$/;

export type RevenueCursorResource = 'catalog' | 'departures';
type PageLimitResult = { limit: number } | { error: string };
type CursorResult = { cursor: { afterId: string } | null } | { error: string };

type RevenueCursorPayload = {
  v: 1;
  resource: RevenueCursorResource;
  tenantId: string;
  afterId: string;
  scope?: string;
};

export function parseRevenuePageLimit(raw: string | null, defaultLimit: number, maxLimit: number): PageLimitResult {
  if (raw === null) return { limit: defaultLimit } as const;
  if (!/^\d+$/.test(raw)) return { error: 'limit must be a positive integer.' } as const;
  const limit = Number(raw);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > maxLimit) {
    return { error: `limit must be between 1 and ${maxLimit}.` } as const;
  }
  return { limit } as const;
}

export function encodeRevenueCursor(input: Omit<RevenueCursorPayload, 'v'>) {
  return Buffer.from(JSON.stringify({ v: 1, ...input }), 'utf8').toString('base64url');
}

export function decodeRevenueCursor(
  raw: string | null,
  expected: { resource: RevenueCursorResource; tenantId: string; scope?: string },
): CursorResult {
  if (raw === null) return { cursor: null } as const;
  if (!raw || raw.length > MAX_CURSOR_LENGTH || !/^[A-Za-z0-9_-]+$/.test(raw)) {
    return { error: 'The revenue cursor is invalid.' } as const;
  }
  try {
    const decoded = Buffer.from(raw, 'base64url').toString('utf8');
    const canonical = Buffer.from(decoded, 'utf8').toString('base64url');
    if (canonical !== raw) return { error: 'The revenue cursor is invalid.' } as const;
    const parsed = JSON.parse(decoded) as Partial<RevenueCursorPayload>;
    if (
      parsed.v !== 1
      || parsed.resource !== expected.resource
      || parsed.tenantId !== expected.tenantId
      || parsed.scope !== expected.scope
      || !TENANT_ID.test(String(parsed.tenantId || ''))
      || !mongoose.Types.ObjectId.isValid(String(parsed.afterId || ''))
      || Object.keys(parsed).sort().join(',') !== (expected.scope === undefined
        ? 'afterId,resource,tenantId,v'
        : 'afterId,resource,scope,tenantId,v')
    ) {
      return { error: 'The revenue cursor is invalid.' } as const;
    }
    return { cursor: { afterId: String(parsed.afterId) } } as const;
  } catch {
    return { error: 'The revenue cursor is invalid.' } as const;
  }
}
