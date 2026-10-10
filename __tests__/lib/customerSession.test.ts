/**
 * @jest-environment node
 *
 * authenticateCustomerSession is the only gate in front of the storefront's
 * customer routes. Tokens are signed and verified with the real lib/jwt.ts.
 */
import { SignJWT } from 'jose';
import { NextRequest } from 'next/server';
import { signToken } from '@/lib/jwt';
import { authenticateCustomerSession, CUSTOMER_SESSION_SCOPE } from '@/lib/auth/customerSession';

// jose 6 ships as ESM only; load the real package through Node's own loader.
jest.mock('jose', () => (process as unknown as {
  getBuiltinModule: (id: 'module') => typeof import('node:module');
}).getBuiltinModule('module').createRequire(__filename)('jose'));

const mockFindOne = jest.fn();
const mockVerifyFirebaseToken = jest.fn();
jest.mock('@/lib/dbConnect', () => ({ __esModule: true, default: jest.fn(async () => undefined) }));
jest.mock('@/lib/firebase/admin', () => ({
  verifyFirebaseToken: (...args: unknown[]) => mockVerifyFirebaseToken(...args),
}));
jest.mock('@/lib/models/user', () => ({
  __esModule: true,
  default: { findOne: (...args: unknown[]) => mockFindOne(...args) },
}));

const SECRET = 'unit-test-customer-session-secret-0123456789';
const CUSTOMER_ID = '64f000000000000000000001';
const customer = { _id: CUSTOMER_ID, email: 'guest@example.com', role: 'customer', isActive: true };

function request(authorization?: string) {
  const headers: Record<string, string> = { host: 'brand-one.example' };
  if (authorization !== undefined) headers.authorization = authorization;
  return new NextRequest('https://brand-one.example/api/user/bookings', { headers });
}

async function mint(
  payload: Record<string, unknown>,
  options: { expiresIn?: string; secret?: string; issuer?: string; audience?: string } = {},
) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(options.issuer ?? 'urn:tourticket:issuer')
    .setAudience(options.audience ?? 'urn:tourticket:audience')
    .setExpirationTime(options.expiresIn ?? '2h')
    .sign(new TextEncoder().encode(options.secret ?? SECRET));
}

beforeAll(() => {
  process.env.JWT_SECRET = SECRET;
});

beforeEach(() => {
  jest.clearAllMocks();
  mockVerifyFirebaseToken.mockResolvedValue({ success: false, error: 'not a Firebase ID token' });
  mockFindOne.mockResolvedValue(customer);
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('platform customer session tokens', () => {
  it('accepts a customer session for an active customer', async () => {
    const token = await signToken({ sub: CUSTOMER_ID, scope: CUSTOMER_SESSION_SCOPE });

    const result = await authenticateCustomerSession(request(`Bearer ${token}`));

    expect(result).toEqual({ success: true, user: customer });
    expect(mockFindOne).toHaveBeenCalledWith({ _id: CUSTOMER_ID, isActive: { $ne: false } });
  });

  it.each([
    ['an admin 2FA-enrollment token', { scope: 'admin-2fa-enrollment' }],
    ['an admin session token', { scope: 'admin' }],
    ['a checkout receipt token', { scope: 'receipt' }],
    ['a token with no scope (the old reset link)', {}],
    ['a password-reset token', { scope: 'password-reset' }],
    ['a differently cased customer scope', { scope: 'Customer' }],
    ['a scope list containing customer', { scope: ['customer'] }],
  ])('refuses %s before reading the account', async (_label, claims) => {
    const token = await mint({ sub: CUSTOMER_ID, ...claims });

    const result = await authenticateCustomerSession(request(`Bearer ${token}`));

    expect(result).toEqual({ success: false, error: 'Invalid or expired customer session', statusCode: 401 });
    expect(mockFindOne).not.toHaveBeenCalled();
  });

  it.each([
    ['no subject', {}],
    ['a subject that is not an account id', { sub: 'not-an-object-id' }],
    ['a twelve-character subject', { sub: 'abcdefghijkl' }],
    ['a numeric subject', { sub: 1234 }],
  ])('refuses a customer token with %s before reading the account', async (_label, claims) => {
    const token = await mint({ scope: 'customer', ...claims });

    const result = await authenticateCustomerSession(request(`Bearer ${token}`));

    expect(result.success).toBe(false);
    expect(mockFindOne).not.toHaveBeenCalled();
  });

  it.each([
    ['another signing key', { secret: 'another-secret-that-is-at-least-32-characters' }],
    ['another issuer', { issuer: 'urn:someone-else' }],
    ['another audience', { audience: 'urn:someone-else' }],
    ['an expiry in the past', { expiresIn: '-1m' }],
  ])('refuses a customer token with %s', async (_label, options) => {
    const token = await mint({ sub: CUSTOMER_ID, scope: 'customer' }, options);

    const result = await authenticateCustomerSession(request(`Bearer ${token}`));

    expect(result.success).toBe(false);
    expect(mockFindOne).not.toHaveBeenCalled();
  });

  it('refuses a tampered token', async () => {
    const token = await signToken({ sub: CUSTOMER_ID, scope: 'customer' });
    const [header, , signature] = token.split('.');
    const forged = Buffer.from(JSON.stringify({ sub: CUSTOMER_ID, scope: 'customer', exp: 9_999_999_999 })).toString('base64url');

    const result = await authenticateCustomerSession(request(`Bearer ${header}.${forged}.${signature}`));

    expect(result.success).toBe(false);
  });

  it.each([
    ['a staff account', { ...customer, role: 'admin' }],
    ['a deactivated account', { ...customer, isActive: false }],
    ['a missing account', null],
  ])('refuses a customer token for %s', async (_label, account) => {
    mockFindOne.mockResolvedValue(account);
    const token = await signToken({ sub: CUSTOMER_ID, scope: 'customer' });

    const result = await authenticateCustomerSession(request(`Bearer ${token}`));

    expect(result).toEqual({ success: false, error: 'Invalid or expired customer session', statusCode: 401 });
  });
});

describe('the Authorization header', () => {
  it.each([
    ['missing', undefined],
    ['not a Bearer credential', 'Basic Z3Vlc3Q6cGFzcw=='],
    ['an empty Bearer credential', 'Bearer    '],
  ])('is required: %s', async (_label, header) => {
    const result = await authenticateCustomerSession(request(header));

    expect(result).toEqual({ success: false, error: 'Authentication required', statusCode: 401 });
    expect(mockVerifyFirebaseToken).not.toHaveBeenCalled();
    expect(mockFindOne).not.toHaveBeenCalled();
  });
});

describe('storefront (Firebase) sign-in', () => {
  it('accepts a verified sign-in linked to an active customer', async () => {
    mockVerifyFirebaseToken.mockResolvedValue({ success: true, uid: 'firebase-customer' });

    const result = await authenticateCustomerSession(request('Bearer firebase-id-token'));

    expect(result).toEqual({ success: true, user: customer });
    expect(mockFindOne).toHaveBeenCalledWith({ firebaseUid: 'firebase-customer', isActive: { $ne: false } });
  });

  it.each([
    ['no linked account', null],
    ['a staff account', { ...customer, role: 'admin' }],
    ['a deactivated account', { ...customer, isActive: false }],
  ])('refuses a verified sign-in with %s and does not try it as a platform token', async (_label, account) => {
    mockVerifyFirebaseToken.mockResolvedValue({ success: true, uid: 'firebase-uid' });
    mockFindOne.mockResolvedValue(account);

    const result = await authenticateCustomerSession(request('Bearer firebase-id-token'));

    expect(result.success).toBe(false);
    expect(mockFindOne).toHaveBeenCalledTimes(1);
  });
});

describe('customer records stored before roles existed (19 Nov 2025)', () => {
  // Built with the real account schema: these records have no `role` or `isActive` field.
  function legacyRecord(fields: Record<string, unknown>) {
    const { default: RealUser } = jest.requireActual('@/lib/models/user') as typeof import('@/lib/models/user');
    return RealUser.hydrate({ _id: CUSTOMER_ID, email: 'early-guest@example.com', ...fields });
  }

  it('lets an early customer signed in with Firebase see their bookings, and never filters the field out', async () => {
    const record = legacyRecord({ firebaseUid: 'firebase-early' });
    mockVerifyFirebaseToken.mockResolvedValue({ success: true, uid: 'firebase-early' });
    mockFindOne.mockResolvedValue(record);

    const result = await authenticateCustomerSession(request('Bearer firebase-id-token'));

    expect(result).toEqual({ success: true, user: record });
    const [filter] = mockFindOne.mock.calls[0] as [Record<string, unknown>];
    expect(filter).toEqual({ firebaseUid: 'firebase-early', isActive: { $ne: false } });
  });

  it('lets an early customer use a platform customer session', async () => {
    const record = legacyRecord({});
    mockFindOne.mockResolvedValue(record);
    const token = await signToken({ sub: CUSTOMER_ID, scope: CUSTOMER_SESSION_SCOPE });

    const result = await authenticateCustomerSession(request(`Bearer ${token}`));

    expect(result).toEqual({ success: true, user: record });
  });

  it('still refuses an early record that was explicitly switched off', async () => {
    mockVerifyFirebaseToken.mockResolvedValue({ success: true, uid: 'firebase-early' });
    mockFindOne.mockResolvedValue(legacyRecord({ firebaseUid: 'firebase-early', isActive: false }));

    const result = await authenticateCustomerSession(request('Bearer firebase-id-token'));

    expect(result).toEqual({ success: false, error: 'Invalid or expired customer session', statusCode: 401 });
  });
});
