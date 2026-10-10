/**
 * @jest-environment node
 *
 * Every storefront customer route accepts exactly one kind of platform token:
 * a customer session (`scope: 'customer'`) for an active customer account.
 *
 * All tokens here are signed with the production signing code and key layout
 * (issuer, audience, HS256), so a token that is refused is refused for its
 * kind, not because the test minted it differently. Each route's customer-token
 * row is the positive control for that.
 *
 * Regression (9 Oct 2026): one signing secret signs customer sessions, admin
 * sessions, the 15-minute admin 2FA-enrollment cookie, checkout receipt tokens
 * and the old password-reset link token. The customer routes only asked for a
 * `sub`, so any of those worked as a customer session: a reset link let its
 * reader list and cancel the account's bookings, and an admin password alone
 * (enrollment cookie, no second factor) did the same for the admin's account.
 */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { NextRequest } from 'next/server';
import { signAdminSessionToken } from '@/lib/auth/adminSession';

const mockState: {
  users: any[];
  bookings: any[];
  reviews: any[];
  tours: any[];
  effects: string[];
} = { users: [], bookings: [], reviews: [], tours: [], effects: [] };

const mockVerifyFirebaseToken = jest.fn();

// jose 6 ships as ESM only, which this Jest setup does not transform. Load the
// real package through Node's own loader (Jest's `module` shim would hand back
// this mock again), so tokens are signed and verified by the production code
// path, not a stand-in.
jest.mock('jose', () => (process as unknown as {
  getBuiltinModule: (id: 'module') => typeof import('node:module');
}).getBuiltinModule('module').createRequire(__filename)('jose'));

function mockQuery(produce: () => unknown) {
  const query: any = {
    select: () => query,
    populate: () => query,
    sort: () => query,
    skip: () => query,
    limit: () => query,
    lean: () => query,
    then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve().then(produce).then(resolve, reject),
  };
  return query;
}

function mockMatches(doc: Record<string, unknown>, filter: Record<string, unknown>) {
  return Object.entries(filter).every(([key, value]) => {
    if (value && typeof value === 'object' && !(value instanceof mongoose.Types.ObjectId)) return true;
    const actual = key === 'user' && doc.user && typeof doc.user === 'object' && '_id' in (doc.user as object)
      ? (doc.user as { _id: unknown })._id
      : doc[key];
    return String(actual) === String(value);
  });
}

jest.mock('@/lib/dbConnect', () => ({ __esModule: true, default: jest.fn(async () => undefined) }));
jest.mock('@/lib/firebase/admin', () => ({
  verifyFirebaseToken: (...args: unknown[]) => mockVerifyFirebaseToken(...args),
}));
jest.mock('@/lib/tenant', () => ({
  getTenantFromRequest: async () => 'brand-one',
  buildStrictTenantQuery: (query: Record<string, unknown>, tenantId: string) => ({ ...query, tenantId }),
  getTenantEmailBranding: () => ({}),
  getTenantConfigCached: async () => null,
}));
jest.mock('@/lib/admin/adminAudit', () => ({
  withAdminAudit: (handler: unknown) => handler,
  registerAdminAuditActor: () => undefined,
}));
jest.mock('@/lib/auth/adminAuth', () => {
  const { NextResponse } = jest.requireActual('next/server');
  return { requireAdminAuth: async () => NextResponse.json({ error: 'admin only' }, { status: 401 }) };
});
jest.mock('@/lib/email/emailService', () => ({
  EmailService: new Proxy({}, {
    get: (_target, name) => async () => { mockState.effects.push(`email:${String(name)}`); },
  }),
}));
jest.mock('@/lib/models/Tenant', () => ({
  __esModule: true,
  default: { findOne: () => mockQuery(() => null) },
}));
jest.mock('@/lib/models/user', () => ({
  __esModule: true,
  default: {
    findOne: (filter: Record<string, unknown>) =>
      mockQuery(() => mockState.users.find((user) => mockMatches(user, filter)) ?? null),
    findById: (id: unknown) =>
      mockQuery(() => mockState.users.find((user) => String(user._id) === String(id)) ?? null),
    findByIdAndUpdate: (id: unknown) => mockQuery(() => {
      mockState.effects.push('user:update');
      return mockState.users.find((user) => String(user._id) === String(id)) ?? null;
    }),
  },
}));
jest.mock('@/lib/models/Booking', () => ({
  __esModule: true,
  default: {
    countDocuments: async (filter: Record<string, unknown>) =>
      mockState.bookings.filter((booking) => mockMatches(booking, { user: filter.user })).length,
    find: (filter: Record<string, unknown>) =>
      mockQuery(() => mockState.bookings.filter((booking) => mockMatches(booking, { user: filter.user }))),
    findById: (id: unknown) =>
      mockQuery(() => mockState.bookings.find((booking) => String(booking._id) === String(id)) ?? null),
    findOne: (filter: Record<string, unknown>) =>
      mockQuery(() => mockState.bookings.find((booking) => mockMatches(booking, { user: filter.user })) ?? null),
  },
}));
jest.mock('@/lib/models/Tour', () => ({
  __esModule: true,
  default: {
    findOne: () => mockQuery(() => mockState.tours[0] ?? null),
    findById: () => mockQuery(() => mockState.tours[0] ?? null),
    findByIdAndUpdate: () => mockQuery(() => mockState.tours[0] ?? null),
  },
}));
jest.mock('@/lib/models/Review', () => {
  const byId = (id: unknown) => mockState.reviews.find((review) => String(review._id) === String(id)) ?? null;
  return {
    __esModule: true,
    default: {
      findById: (id: unknown) => mockQuery(() => byId(id)),
      findOne: (filter: Record<string, unknown>) => mockQuery(() => (
        filter._id !== undefined
          ? byId(filter._id)
          : mockState.reviews.find((review) => mockMatches(review, { tour: filter.tour, user: filter.user })) ?? null
      )),
      findByIdAndUpdate: (id: unknown, update: Record<string, unknown>) => mockQuery(() => {
        mockState.effects.push('review:update');
        return { ...byId(id), ...update };
      }),
      findOneAndUpdate: (filter: Record<string, unknown>, update: Record<string, unknown>) => mockQuery(() => {
        mockState.effects.push('review:update');
        return { ...byId(filter._id), ...update };
      }),
      deleteOne: async () => {
        mockState.effects.push('review:delete');
        return { deletedCount: 1 };
      },
      create: async (doc: Record<string, unknown>) => {
        mockState.effects.push('review:create');
        const created = { _id: new mongoose.Types.ObjectId(), createdAt: new Date(), ...doc };
        mockState.reviews.push(created);
        return created;
      },
      aggregate: async () => [],
    },
  };
});

import * as userBookings from '@/app/api/user/bookings/route';
import * as changePassword from '@/app/api/user/change-password/route';
import * as bookings from '@/app/api/bookings/route';
import * as bookingById from '@/app/api/bookings/[id]/route';
import * as cancelBooking from '@/app/api/bookings/[id]/cancel/route';
import * as reviews from '@/app/api/reviews/route';
import * as reviewById from '@/app/api/reviews/[id]/route';
import * as tourReviews from '@/app/api/tours/[tourId]/reviews/route';
import * as reviewCheck from '@/app/api/tours/[tourId]/reviews/check/route';

const JWT_SECRET = 'unit-test-customer-session-secret-0123456789';
const TENANT = 'brand-one';
const CUSTOMER_ID = '64f000000000000000000001';
const ADMIN_ID = '64f000000000000000000002';
const INACTIVE_ID = '64f000000000000000000003';
const MISSING_ID = '64f000000000000000000009';
const BOOKING_ID = '64f0000000000000000000b1';
const TOUR_ID = '64f0000000000000000000c1';
const REVIEWED_TOUR_ID = '64f0000000000000000000c2';
const REVIEW_ID = '64f0000000000000000000d1';
const CURRENT_PASSWORD = 'Current-pass-123';
let passwordHash = '';

/** Signs exactly as lib/jwt.ts does, so tokens minted by older code can be replayed. */
async function mint(payload: Record<string, unknown>, expiresIn = '2h', secret = JWT_SECRET) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer('urn:tourticket:issuer')
    .setAudience('urn:tourticket:audience')
    .setExpirationTime(expiresIn)
    .sign(new TextEncoder().encode(secret));
}

const customerToken = (sub = CUSTOMER_ID) => mint({ sub, email: 'guest@example.com', scope: 'customer' });

const adminIdentity = (userId: string) => ({
  userId,
  email: 'guest@example.com',
  role: 'admin',
  permissions: [],
});

/**
 * Every token kind the platform signs, other than a customer session, carrying
 * the customer's own id so the only thing that differs is what it is for.
 */
const refusedKinds: Array<[string, () => Promise<string>]> = [
  ['admin 2FA-enrollment cookie (scope admin-2fa-enrollment)', () => signAdminSessionToken(adminIdentity(CUSTOMER_ID), true)],
  ['admin session cookie (scope admin)', () => signAdminSessionToken(adminIdentity(CUSTOMER_ID))],
  ['password-reset link token (no scope)', () => mint({ sub: CUSTOMER_ID, email: 'guest@example.com' }, '15m')],
  ['checkout receipt token (scope receipt)', () => mint({
    sub: CUSTOMER_ID,
    scope: 'receipt',
    tenantId: TENANT,
    bookingReference: 'BRAND-100',
    orderId: 'BRAND-100',
    bookingIds: [BOOKING_ID],
  }, '1h')],
  ['customer token from another signing key', () => mint({ sub: CUSTOMER_ID, scope: 'customer' }, '2h', 'another-secret-that-is-at-least-32-characters')],
  ['expired customer token', () => mint({ sub: CUSTOMER_ID, scope: 'customer' }, '-1m')],
];

const refusedAccounts: Array<[string, string]> = [
  ['an admin account', ADMIN_ID],
  ['a deactivated customer', INACTIVE_ID],
  ['an account that no longer exists', MISSING_ID],
];

function request(method: string, path: string, token: string | null, body?: unknown) {
  const headers: Record<string, string> = { host: 'brand-one.example' };
  if (token !== null) headers.authorization = `Bearer ${token}`;
  if (body !== undefined) headers['content-type'] = 'application/json';
  return new NextRequest(`https://brand-one.example${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const params = <T extends Record<string, string>>(value: T) => ({ params: Promise.resolve(value) });

type Route = {
  name: string;
  succeeds: number;
  call: (token: string | null) => Promise<Response>;
};

const routes: Route[] = [
  {
    name: 'GET /api/user/bookings',
    succeeds: 200,
    call: (token) => userBookings.GET(request('GET', '/api/user/bookings', token)),
  },
  {
    name: 'POST /api/user/change-password',
    succeeds: 200,
    call: (token) => changePassword.POST(request('POST', '/api/user/change-password', token, {
      currentPassword: CURRENT_PASSWORD,
      newPassword: 'A-brand-new-pass-456',
    })),
  },
  {
    name: 'GET /api/bookings',
    succeeds: 200,
    call: (token) => bookings.GET(request('GET', '/api/bookings', token)),
  },
  {
    name: 'GET /api/bookings/[id]',
    succeeds: 200,
    call: (token) => bookingById.GET(request('GET', `/api/bookings/${BOOKING_ID}`, token), params({ id: BOOKING_ID })),
  },
  {
    name: 'POST /api/bookings/[id]/cancel',
    succeeds: 200,
    call: (token) => cancelBooking.POST(
      request('POST', `/api/bookings/${BOOKING_ID}/cancel`, token, { reason: 'Plans changed' }),
      params({ id: BOOKING_ID }),
    ),
  },
  {
    name: 'PUT /api/reviews/[id]',
    succeeds: 200,
    call: (token) => reviewById.PUT(
      request('PUT', `/api/reviews/${REVIEW_ID}`, token, { rating: 5, comment: 'Even better on a second look.' }),
      params({ id: REVIEW_ID }),
    ),
  },
  {
    name: 'DELETE /api/reviews/[id]',
    succeeds: 200,
    call: (token) => reviewById.DELETE(request('DELETE', `/api/reviews/${REVIEW_ID}`, token), params({ id: REVIEW_ID })),
  },
  {
    name: 'POST /api/tours/[tourId]/reviews',
    succeeds: 201,
    call: (token) => tourReviews.POST(
      request('POST', `/api/tours/${TOUR_ID}/reviews`, token, { rating: 5, comment: 'A wonderful day out on the water.' }),
      params({ tourId: TOUR_ID }),
    ),
  },
  {
    name: 'GET /api/tours/[tourId]/reviews/check',
    succeeds: 200,
    call: (token) => reviewCheck.GET(
      request('GET', `/api/tours/${REVIEWED_TOUR_ID}/reviews/check`, token),
      params({ tourId: REVIEWED_TOUR_ID }),
    ),
  },
];

function seed() {
  const customer = {
    _id: new mongoose.Types.ObjectId(CUSTOMER_ID),
    email: 'guest@example.com',
    firstName: 'Test',
    lastName: 'Guest',
    role: 'customer',
    isActive: true,
    password: passwordHash,
    firebaseUid: 'firebase-customer',
  };
  mockState.users = [
    customer,
    { ...customer, _id: new mongoose.Types.ObjectId(ADMIN_ID), email: 'staff@example.com', role: 'admin', firebaseUid: 'firebase-admin' },
    { ...customer, _id: new mongoose.Types.ObjectId(INACTIVE_ID), email: 'gone@example.com', isActive: false, firebaseUid: 'firebase-inactive' },
  ];
  const tour = { _id: new mongoose.Types.ObjectId(TOUR_ID), title: 'Island trip', tenantId: TENANT };
  mockState.tours = [tour];
  mockState.bookings = mockState.users.map((user, index) => ({
    _id: index === 0 ? new mongoose.Types.ObjectId(BOOKING_ID) : new mongoose.Types.ObjectId(),
    bookingReference: `BRAND-10${index}`,
    tenantId: TENANT,
    tour,
    user,
    status: 'Confirmed',
    date: new Date(Date.now() - 24 * 60 * 60 * 1000),
    time: '09:00',
    guests: 2,
    totalPrice: 120,
    save: async () => { mockState.effects.push('booking:save'); },
  }));
  mockState.reviews = [{
    _id: new mongoose.Types.ObjectId(REVIEW_ID),
    tenantId: TENANT,
    tour: new mongoose.Types.ObjectId(REVIEWED_TOUR_ID),
    user: new mongoose.Types.ObjectId(CUSTOMER_ID),
    userName: 'Test Guest',
    userEmail: 'guest@example.com',
    rating: 4,
    title: 'Lovely',
    comment: 'A lovely morning with a great crew.',
    createdAt: new Date(),
  }];
  mockState.effects = [];
}

// change-password hashes at bcrypt cost 12 by design; leave room on a busy host
// so a slow run cannot spill one test's writes into the next.
jest.setTimeout(60_000);

beforeAll(async () => {
  process.env.JWT_SECRET = JWT_SECRET;
  passwordHash = await bcrypt.hash(CURRENT_PASSWORD, 4);
});

beforeEach(() => {
  seed();
  mockVerifyFirebaseToken.mockReset();
  mockVerifyFirebaseToken.mockResolvedValue({ success: false, error: 'not a Firebase ID token' });
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe.each(routes)('$name', (route) => {
  it('serves a customer session for an active customer', async () => {
    const response = await route.call(await customerToken());
    expect(response.status).toBe(route.succeeds);
  });

  it.each(refusedKinds)('refuses a %s with 401 and changes nothing', async (_kind, makeToken) => {
    const response = await route.call(await makeToken());
    expect(response.status).toBe(401);
    expect(mockState.effects).toEqual([]);
  });

  it.each(refusedAccounts)('refuses a customer-scoped token for %s', async (_account, subject) => {
    const response = await route.call(await customerToken(subject));
    expect(response.status).toBe(401);
    expect(mockState.effects).toEqual([]);
  });

  it('refuses a request without a token', async () => {
    const response = await route.call(null);
    expect(response.status).toBe(401);
    expect(mockState.effects).toEqual([]);
  });

  it('serves a verified storefront sign-in for an active customer', async () => {
    mockVerifyFirebaseToken.mockImplementation(async (token: string) => (
      token === 'firebase-id-token'
        ? { success: true, uid: 'firebase-customer' }
        : { success: false, error: 'not a Firebase ID token' }
    ));
    const response = await route.call('firebase-id-token');
    expect(response.status).toBe(route.succeeds);
  });

  it.each([
    ['an admin account', 'firebase-admin'],
    ['a deactivated customer', 'firebase-inactive'],
    ['an unknown account', 'firebase-unknown'],
  ])('refuses a verified storefront sign-in for %s', async (_account, uid) => {
    mockVerifyFirebaseToken.mockResolvedValue({ success: true, uid });
    const response = await route.call('firebase-id-token');
    expect(response.status).toBe(401);
    expect(mockState.effects).toEqual([]);
  });
});

describe('the retired direct-creation endpoints never accept any token', () => {
  it.each([
    ['POST /api/bookings', (token: string) => bookings.POST(request('POST', '/api/bookings', token, {}))],
    ['POST /api/reviews', (token: string) => reviews.POST(request('POST', '/api/reviews', token, {}))],
  ])('%s', async (_name, call) => {
    for (const token of [await customerToken(), ...await Promise.all(refusedKinds.map(([, make]) => make()))]) {
      const response = await call(token);
      expect(response.status).toBeGreaterThanOrEqual(400);
    }
    expect(mockState.effects).toEqual([]);
  });
});
