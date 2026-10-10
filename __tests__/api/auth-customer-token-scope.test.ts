/**
 * @jest-environment node
 *
 * Storefront sign-in and sign-up issue customer session tokens, and only to
 * customer accounts. The issued token must be one the customer routes accept.
 * Tokens are signed and verified with the real lib/jwt.ts; no email is sent.
 */
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import { POST as login } from '@/app/api/auth/login/route';
import { POST as signup } from '@/app/api/auth/signup/route';

// jose 6 ships as ESM only; load the real package through Node's own loader.
jest.mock('jose', () => (process as unknown as {
  getBuiltinModule: (id: 'module') => typeof import('node:module');
}).getBuiltinModule('module').createRequire(__filename)('jose'));

const mockUsers: any[] = [];
const mockSentEmails: string[] = [];

function mockQuery(produce: () => unknown) {
  const query: any = {
    select: () => query,
    limit: () => query,
    lean: () => query,
    then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve().then(produce).then(resolve, reject),
  };
  return query;
}

jest.mock('@/lib/dbConnect', () => ({ __esModule: true, default: jest.fn(async () => undefined) }));
jest.mock('@/lib/firebase/admin', () => ({
  verifyFirebaseToken: async () => ({ success: false, error: 'not a Firebase ID token' }),
}));
jest.mock('@/lib/tenant', () => ({
  getTenantFromRequest: async () => 'brand-one',
  buildStrictTenantQuery: (query: Record<string, unknown>, tenantId: string) => ({ ...query, tenantId }),
  getTenantEmailBranding: () => ({}),
}));
jest.mock('@/lib/email/emailService', () => ({
  EmailService: { sendWelcomeEmail: async (input: { customerEmail: string }) => { mockSentEmails.push(input.customerEmail); } },
}));
jest.mock('@/lib/models/Tenant', () => ({ __esModule: true, default: { findOne: () => mockQuery(() => null) } }));
jest.mock('@/lib/models/Tour', () => ({ __esModule: true, default: { find: () => mockQuery(() => []) } }));
jest.mock('@/lib/models/user', () => ({
  __esModule: true,
  default: {
    // Matches like MongoDB for the filters these routes use: equality, and `$ne` (a missing field is "not equal").
    findOne: (filter: Record<string, unknown>) => mockQuery(() => mockUsers.find((user) => (
      Object.entries(filter).every(([key, value]) => (
        value !== null && typeof value === 'object' && '$ne' in value
          ? user[key] !== (value as { $ne: unknown }).$ne
          : String(user[key]) === String(value)
      ))
    )) ?? null),
    findOneAndUpdate: () => mockQuery(() => null),
    updateOne: async () => ({ acknowledged: true }),
    create: async (doc: Record<string, unknown>) => {
      const created = { _id: new mongoose.Types.ObjectId(), role: 'customer', isActive: true, permissions: [], ...doc };
      mockUsers.push(created);
      return created;
    },
  },
}));

const PASSWORD = 'Correct-horse-42';

function post(path: string, body: Record<string, unknown>) {
  return new NextRequest(`https://brand-one.example${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', host: 'brand-one.example' },
    body: JSON.stringify(body),
  });
}

/** The gate every customer route uses (loaded lazily, so the minting checks run on their own). */
async function customerSession(token: string) {
  const { authenticateCustomerSession } = await import('@/lib/auth/customerSession');
  return authenticateCustomerSession(bearer(token));
}

function bearer(token: string) {
  return new NextRequest('https://brand-one.example/api/user/bookings', {
    headers: { authorization: `Bearer ${token}`, host: 'brand-one.example' },
  });
}

beforeAll(async () => {
  process.env.JWT_SECRET = 'unit-test-customer-sign-in-secret-0123456789';
  const password = await bcrypt.hash(PASSWORD, 4);
  mockUsers.push(
    { _id: new mongoose.Types.ObjectId(), email: 'guest@example.com', firstName: 'Test', lastName: 'Guest', role: 'customer', isActive: true, permissions: [], password },
    { _id: new mongoose.Types.ObjectId(), email: 'staff@example.com', firstName: 'Staff', lastName: 'Member', role: 'admin', isActive: true, permissions: [], password },
    { _id: new mongoose.Types.ObjectId(), email: 'owner@example.com', firstName: 'Brand', lastName: 'Owner', role: 'super_admin', isActive: true, permissions: [], password },
  );
});

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('POST /api/auth/login', () => {
  it('issues a customer session token that the customer routes accept', async () => {
    const response = await login(post('/api/auth/login', { email: 'guest@example.com', password: PASSWORD }));
    expect(response.status).toBe(200);
    const { token } = await response.json();

    expect((await verifyToken(token))?.scope).toBe('customer');
    const session = await customerSession(token);
    expect(session.success).toBe(true);
    expect(String(session.user?._id)).toBe(String(mockUsers[0]._id));
  });

  it.each([
    ['an admin', 'staff@example.com'],
    ['a super admin', 'owner@example.com'],
  ])('gives %s no token for a correct password, exactly as for a wrong one', async (_label, email) => {
    const right = await login(post('/api/auth/login', { email, password: PASSWORD }));
    const wrong = await login(post('/api/auth/login', { email, password: 'not-the-password' }));

    expect(right.status).toBe(401);
    const body = await right.json();
    expect(body).toEqual({ error: 'Invalid credentials' });
    expect(body).toEqual(await wrong.json());
  });
});

describe('POST /api/auth/signup', () => {
  it('issues a customer session token for the new customer', async () => {
    const response = await signup(post('/api/auth/signup', {
      firstName: 'New',
      lastName: 'Guest',
      email: 'new-guest@example.com',
      password: 'A-long-enough-password-1',
    }));
    expect(response.status).toBe(200);
    const { token } = await response.json();

    expect((await verifyToken(token))?.scope).toBe('customer');
    expect((await customerSession(token)).success).toBe(true);
    expect(mockSentEmails).toEqual(['new-guest@example.com']);
  });
});
