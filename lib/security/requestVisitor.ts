import { createHmac, timingSafeEqual } from 'crypto';
import {
  EDGE_VISITOR_HEADER,
  edgeVisitorSignedText,
  parseEdgeVisitor,
  visitorBehind,
  visitorSigningSecret,
  type ConnectionVisitor,
  type HeaderReader,
} from '@/lib/security/visitorAddress';

/**
 * Where server code read a visitor's address: vouched for by the edge (`cf`, `peer`), or
 * only this function's own connection reading (`origin-cf`, `origin-peer`), which behind
 * the edge is the edge's address. Labels, never addresses.
 */
export type VisitorSource = 'cf' | 'peer' | 'origin-cf' | 'origin-peer';
export interface RequestVisitor {
  address: string;
  source: VisitorSource;
}

// A vouching that does not check is logged at most this often per instance: an edge and a
// server holding different secrets must be visible, and junk from callers must not flood
// the log.
const INVALID_VOUCHING_LOG_MS = 60_000;
let lastInvalidVouchingLog = Number.NEGATIVE_INFINITY;

function logInvalidVouching() {
  const now = Date.now();
  if (now - lastInvalidVouchingLog < INVALID_VOUCHING_LOG_MS) return;
  lastInvalidVouchingLog = now;
  console.warn(
    `[visitor-address] A request carried ${EDGE_VISITOR_HEADER} that does not check; it is counted by `
    + 'its connection. If it came from the site\'s edge, the edge and the server functions hold '
    + 'different signing secrets and every visitor is counted as the edge.',
  );
}

/** The visitor the edge vouched for in `value`, or null unless its signature checks and it
 *  is recent. */
export function vouchedVisitor(
  value: string | null | undefined,
  secret: string | undefined,
  now: number = Date.now(),
): ConnectionVisitor | null {
  if (!value || !secret) return null;
  const parsed = parseEdgeVisitor(value, now);
  if (!parsed) return null;
  const expected = createHmac('sha256', secret)
    .update(edgeVisitorSignedText(parsed.issuedAt, parsed.via, parsed.address))
    .digest();
  const supplied = Buffer.from(parsed.mac, 'hex');
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
  return { address: parsed.address, via: parsed.via };
}

/**
 * The visitor's address for server code (abuse limits, audit rows): the one the edge vouched
 * for, else this function's own connection reading (behind the edge, the edge's address: it
 * errs toward counting visitors together, never toward a forger). Null when neither is an
 * address (a local run without Netlify headers).
 */
export function requestVisitor(
  headers: HeaderReader,
  secret: string | undefined = visitorSigningSecret(),
  now: number = Date.now(),
): RequestVisitor | null {
  const word = headers.get(EDGE_VISITOR_HEADER);
  const vouched = vouchedVisitor(word, secret, now);
  if (vouched) return { address: vouched.address, source: vouched.via };
  if (word) logInvalidVouching();
  const own = visitorBehind(headers.get('x-nf-client-connection-ip'), headers);
  return own ? { address: own.address, source: own.via === 'cf' ? 'origin-cf' : 'origin-peer' } : null;
}
