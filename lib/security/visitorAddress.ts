/**
 * The visitor's network address, read so the visitor can't choose it.
 *
 * Every request to the brand storefronts first runs proxy.ts, which Netlify deploys as an
 * Edge Function. Only that edge function sees the connection the visitor
 * made: Netlify hands it over as `context.ip` (the `Netlify.context` global). The server
 * function behind it (every API route) sees the edge function as its client: its
 * `x-nf-client-connection-ip` is the edge's own address. That address is shared by every
 * visitor one edge instance serves, and changes for one visitor whenever another instance
 * serves them. Abuse limits and audit rows keyed by it counted many visitors as one and
 * let one visitor spread over several keys (proven live on the flagship storefront, 2 Oct 2026).
 *
 * So the edge reads the address and vouches for it in `x-eeo-edge-visitor`: signed with the
 * server secret (visitorSigningSecret) and dated, after removing any copy the request arrived
 * with. Server code believes only a copy whose signature checks (lib/security/requestVisitor.ts).
 *
 * The brand domains reach Netlify directly, and dashboard.egypt-excursionsonline.com through
 * Cloudflare. Through Cloudflare the connection the edge sees is a Cloudflare address and
 * Cloudflare's `cf-connecting-ip` carries the visitor. Anyone reaching Netlify directly can
 * send a `cf-connecting-ip` of their choosing, so that header is believed only when the
 * connection really came from one of Cloudflare's published ranges; otherwise the connection
 * itself is the address. `x-forwarded-for` is never read: its first entry is whatever the
 * client sent.
 *
 * This module runs inside the edge function: plain TypeScript and Web Crypto only.
 */

/** A request's headers, as far as this module reads them. */
export interface HeaderReader {
  get(name: string): string | null;
}

// https://www.cloudflare.com/ips-v4/ and /ips-v6/ (checked 2 Oct 2026).
export const CLOUDFLARE_RANGES = [
  '173.245.48.0/20', '103.21.244.0/22', '103.22.200.0/22', '103.31.4.0/22', '141.101.64.0/18',
  '108.162.192.0/18', '190.93.240.0/20', '188.114.96.0/20', '197.234.240.0/22', '198.41.128.0/17',
  '162.158.0.0/15', '104.16.0.0/13', '104.24.0.0/14', '172.64.0.0/13', '131.0.72.0/22',
  '2400:cb00::/32', '2606:4700::/32', '2803:f800::/32', '2405:b500::/32', '2405:8100::/32',
  '2a06:98c0::/29', '2c0f:f248::/32',
];

/** An address as its bytes: 4 for IPv4, 16 for IPv6. */
type Parsed = { version: 4 | 6; bytes: number[] };

function ipv4Bytes(text: string): number[] | null {
  const parts = text.split('.');
  if (parts.length !== 4) return null;
  const bytes: number[] = [];
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part) || Number(part) > 255) return null;
    bytes.push(Number(part));
  }
  return bytes;
}

function ipv6Bytes(text: string): number[] | null {
  let body = text;
  let tail: number[] = [];
  if (body.includes('.')) {
    // An embedded IPv4 address fills the last 32 bits.
    const lastColon = body.lastIndexOf(':');
    const embedded = ipv4Bytes(body.slice(lastColon + 1));
    if (!embedded) return null;
    tail = embedded;
    body = body.slice(0, lastColon + 1) || ':';
    if (body.endsWith(':') && !body.endsWith('::')) body = body.slice(0, -1);
  }
  const groupsWanted = tail.length ? 6 : 8;
  const halves = body.split('::');
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(':') : [];
  const rest = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const missing = groupsWanted - head.length - rest.length;
  if (halves.length === 1 ? head.length !== groupsWanted : missing < 1) return null;
  const groups = [...head, ...Array<string>(halves.length === 2 ? missing : 0).fill('0'), ...rest];
  const bytes: number[] = [];
  for (const group of groups) {
    if (!/^[0-9a-fA-F]{1,4}$/.test(group)) return null;
    const value = parseInt(group, 16);
    bytes.push(value >> 8, value & 0xff);
  }
  return [...bytes, ...tail];
}

export function parseAddress(raw: string | null | undefined): Parsed | null {
  if (!raw) return null;
  let text = raw.trim();
  if (!text || text.length > 64) return null;
  if (text.startsWith('[') && text.includes(']')) text = text.slice(1, text.indexOf(']'));
  text = text.split('%')[0] ?? '';
  if (text.includes(':')) {
    const bytes = ipv6Bytes(text);
    return bytes && bytes.length === 16 ? { version: 6, bytes } : null;
  }
  const bytes = ipv4Bytes(text);
  return bytes ? { version: 4, bytes } : null;
}

function inRange(address: Parsed, cidr: string): boolean {
  const [base, bits] = cidr.split('/');
  const network = parseAddress(base);
  if (!network || network.version !== address.version) return false;
  let remaining = Number(bits);
  for (let index = 0; remaining > 0; index += 1, remaining -= 8) {
    const mask = remaining >= 8 ? 0xff : (0xff << (8 - remaining)) & 0xff;
    if (((address.bytes[index] ?? 0) & mask) !== ((network.bytes[index] ?? 0) & mask)) return false;
  }
  return true;
}

export function fromCloudflare(address: string | null | undefined): boolean {
  const parsed = parseAddress(address);
  return parsed !== null && CLOUDFLARE_RANGES.some((cidr) => inRange(parsed, cidr));
}

function isMappedIpv4(bytes: number[]): boolean {
  return bytes.slice(0, 10).every((b) => b === 0) && bytes[10] === 0xff && bytes[11] === 0xff;
}

function ipv6Text(bytes: number[]): string {
  const groups: string[] = [];
  for (let index = 0; index < 16; index += 2) groups.push((((bytes[index] ?? 0) << 8) | (bytes[index + 1] ?? 0)).toString(16));
  return groups.join(':');
}

/**
 * An address in one written form, or null: brackets and surrounding space removed, an IPv4
 * address written as IPv6 (::ffff:a.b.c.d) as plain IPv4, an IPv6 address as eight full
 * lower-case groups, and nothing but hex digits, colons and dots (so it can be signed and
 * sent on unchanged, and one visitor is never two spellings).
 */
export function cleanAddress(raw: string | null | undefined): string | null {
  let text = (raw ?? '').trim();
  if (text.startsWith('[') && text.endsWith(']')) text = text.slice(1, -1);
  if (!text || text.length > 64 || !/^[0-9A-Fa-f:.]+$/.test(text)) return null;
  const parsed = parseAddress(text);
  if (!parsed) return null;
  const { bytes } = parsed;
  if (parsed.version === 6 && isMappedIpv4(bytes)) return bytes.slice(12).join('.');
  return parsed.version === 4 ? bytes.join('.') : ipv6Text(bytes);
}

/**
 * The key a request limit counts a visitor by: an IPv4 address as itself, an IPv6 address
 * by its /64. One IPv6 connection is usually given a whole /64 and can send from any
 * address in it, so a limit kept per full IPv6 address never limits anyone who rotates
 * through their own network. Null for anything that is not an address.
 */
export function limitKeyFor(address: string | null | undefined): string | null {
  const clean = cleanAddress(address);
  const parsed = clean ? parseAddress(clean) : null;
  if (!clean || !parsed) return null;
  if (parsed.version === 4) return clean;
  return `${ipv6Text([...parsed.bytes.slice(0, 8), 0, 0, 0, 0, 0, 0, 0, 0])}/64`;
}

/** Where the address was read: vouched for by the edge (`cf`, `peer`). Labels, never addresses. */
export type EdgeVia = 'cf' | 'peer';
export type ConnectionVisitor = { address: string; via: EdgeVia };

/** The visitor behind a connection from `peer`: Cloudflare's `cf-connecting-ip` when the
 *  connection came from Cloudflare, otherwise the connection itself. */
export function visitorBehind(peer: string | null | undefined, headers: HeaderReader): ConnectionVisitor | null {
  const connection = cleanAddress(peer);
  if (!connection) return null;
  const viaCloudflare = cleanAddress(headers.get('cf-connecting-ip'));
  if (viaCloudflare && fromCloudflare(connection)) return { address: viaCloudflare, via: 'cf' };
  return { address: connection, via: 'peer' };
}

// ---------------------------------------------------------------- the edge's vouching

export const EDGE_VISITOR_HEADER = 'x-eeo-edge-visitor';
export const EDGE_VISITOR_VERSION = 'v1';
/** A vouching is for the request it came with: accepted within this many seconds. */
export const EDGE_VISITOR_MAX_AGE_SECONDS = 300;
export const EDGE_VISITOR_MAX_SKEW_SECONDS = 60;
const MIN_SECRET_LENGTH = 32;

/**
 * The secret the edge signs with and server code checks with: the abuse-limit secret, else
 * JWT_SECRET (the same choice as lib/security/distributedAbuseLimit.ts). Both are site
 * variables the edge function and the server functions read alike. Undefined when neither is
 * long enough: then nothing is vouched for and nothing is believed.
 */
export function visitorSigningSecret(
  environment: Record<string, string | undefined> = process.env,
): string | undefined {
  const secret = environment.ABUSE_LIMIT_HASH_SECRET || environment.JWT_SECRET;
  return secret && secret.length >= MIN_SECRET_LENGTH ? secret : undefined;
}

/** The text a vouching signs. Its own prefix, so the signature can never stand for anything
 *  else the secret signs (sessions, privacy hashes). */
export function edgeVisitorSignedText(issuedAt: number, via: EdgeVia, address: string): string {
  return `eeo-edge-visitor:${EDGE_VISITOR_VERSION};${issuedAt};${via};${address}`;
}

export type ParsedVouching = { issuedAt: number; via: EdgeVia; address: string; mac: string };

/** A vouching's parts, or null unless it is well formed and recent. The signature is checked
 *  by the caller. */
export function parseEdgeVisitor(value: string | null | undefined, now: number = Date.now()): ParsedVouching | null {
  if (!value || value.length > 200) return null;
  const parts = value.split(';');
  if (parts.length !== 5) return null;
  const [version, issued, via, address, mac] = parts as [string, string, string, string, string];
  if (version !== EDGE_VISITOR_VERSION || (via !== 'cf' && via !== 'peer')) return null;
  if (!/^\d{1,12}$/.test(issued) || !/^[0-9a-f]{64}$/.test(mac)) return null;
  const issuedAt = Number(issued);
  const nowSeconds = Math.floor(now / 1000);
  if (issuedAt < nowSeconds - EDGE_VISITOR_MAX_AGE_SECONDS || issuedAt > nowSeconds + EDGE_VISITOR_MAX_SKEW_SECONDS) {
    return null;
  }
  if (cleanAddress(address) !== address) return null;
  return { issuedAt, via, address, mac };
}

/** The connection Netlify's edge saw (an edge function's `context.ip`), or null where Netlify
 *  gives none (a local run, a test). Only meaningful in the edge function. */
export function edgeConnectionAddress(): string | null {
  const netlify = (globalThis as { Netlify?: { context?: { ip?: unknown } | null } }).Netlify;
  const ip = netlify?.context?.ip;
  return typeof ip === 'string' ? ip : null;
}

/** Whether this code runs in a Netlify edge function. */
export function runsOnNetlifyEdge(): boolean {
  return typeof (globalThis as { Netlify?: unknown }).Netlify !== 'undefined';
}

let cachedKey: { secret: string; key: Promise<CryptoKey> } | null = null;

function signingKey(secret: string): Promise<CryptoKey> {
  if (cachedKey?.secret !== secret) {
    const key = crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    cachedKey = { secret, key };
    // A failed import is not kept: the next request tries again.
    key.catch(() => {
      if (cachedKey?.key === key) cachedKey = null;
    });
  }
  return cachedKey.key;
}

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** The edge's vouching for the visitor behind `peer`, to forward as EDGE_VISITOR_HEADER;
 *  null without a secret or a readable connection, or when signing fails. */
export async function vouchForVisitor(
  headers: HeaderReader,
  secret: string | undefined,
  peer: string | null = edgeConnectionAddress(),
  now: number = Date.now(),
): Promise<string | null> {
  if (!secret) return null;
  const visitor = visitorBehind(peer, headers);
  if (!visitor) return null;
  const issuedAt = Math.floor(now / 1000);
  try {
    const mac = await crypto.subtle.sign(
      'HMAC',
      await signingKey(secret),
      new TextEncoder().encode(edgeVisitorSignedText(issuedAt, visitor.via, visitor.address)) as BufferSource,
    );
    return [EDGE_VISITOR_VERSION, issuedAt, visitor.via, visitor.address, toHex(mac)].join(';');
  } catch {
    return null;
  }
}
