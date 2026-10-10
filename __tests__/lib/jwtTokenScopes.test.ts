/**
 * @jest-environment node
 *
 * One secret signs every platform token, so a token's kind lives only in its
 * `scope` claim. Nothing may mint a token without one, and every verifier must
 * check it. Signing and verifying use the real lib/jwt.ts.
 */
import fs from 'fs';
import path from 'path';
import { signToken, verifyToken, TOKEN_SCOPES } from '@/lib/jwt';
import { ADMIN_ENROLLMENT_SCOPE, ADMIN_SESSION_SCOPE } from '@/lib/auth/adminSession';
import { CUSTOMER_SESSION_SCOPE } from '@/lib/auth/customerSession';

// jose 6 ships as ESM only; load the real package through Node's own loader.
jest.mock('jose', () => (process as unknown as {
  getBuiltinModule: (id: 'module') => typeof import('node:module');
}).getBuiltinModule('module').createRequire(__filename)('jose'));
jest.mock('@/lib/dbConnect', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@/lib/firebase/admin', () => ({ verifyFirebaseToken: jest.fn() }));
jest.mock('@/lib/models/user', () => ({ __esModule: true, default: {} }));

const ROOT = path.resolve(__dirname, '../..');

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === '__tests__' || entry.name === 'node_modules' ? [] : sourceFiles(full);
    }
    return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

const relative = (file: string) => path.relative(ROOT, file).split(path.sep).join('/');

beforeAll(() => {
  process.env.JWT_SECRET = 'unit-test-token-scope-secret-0123456789';
});

describe('signToken', () => {
  it.each(TOKEN_SCOPES.map((scope) => [scope]))('signs a %s token whose scope survives verification', async (scope) => {
    const payload = await verifyToken(await signToken({ sub: '64f000000000000000000001', scope }));
    expect(payload?.scope).toBe(scope);
  });

  it.each([
    ['no scope', { sub: '64f000000000000000000001' }],
    ['an unknown scope', { sub: '64f000000000000000000001', scope: 'password-reset' }],
    ['an empty scope', { sub: '64f000000000000000000001', scope: '' }],
  ])('refuses to sign a token with %s', async (_label, payload) => {
    await expect(signToken(payload as never)).rejects.toThrow('known scope');
  });

  it('knows every scope the admin and customer gates accept', () => {
    expect(TOKEN_SCOPES).toEqual(expect.arrayContaining([
      ADMIN_SESSION_SCOPE,
      ADMIN_ENROLLMENT_SCOPE,
      CUSTOMER_SESSION_SCOPE,
      'receipt',
    ]));
  });
});

describe('token verifiers', () => {
  // Each of these checks the token's scope before trusting it. A new caller of
  // verifyToken must check scope too, then be added here.
  const SCOPE_CHECKING_VERIFIERS = [
    'app/api/checkout/receipt/route.ts',
    'lib/auth/adminAuth.ts',
    'lib/auth/customerSession.ts',
  ];

  it('are only the gates that check what a token is for', () => {
    const callers = [...sourceFiles(path.join(ROOT, 'app')), ...sourceFiles(path.join(ROOT, 'lib'))]
      .filter((file) => /\bverifyToken\(/.test(fs.readFileSync(file, 'utf8')))
      .filter((file) => /from '@\/lib\/jwt'/.test(fs.readFileSync(file, 'utf8')))
      .map(relative)
      .sort();

    expect(callers).toEqual(SCOPE_CHECKING_VERIFIERS);
  });

  it.each(SCOPE_CHECKING_VERIFIERS.map((file) => [file]))('%s compares the scope claim', (file) => {
    expect(fs.readFileSync(path.join(ROOT, file), 'utf8')).toMatch(/\.scope\b|\bscope\s*[!=]==/);
  });
});

describe('token minters', () => {
  it('are only customer sign-in, checkout receipts and admin sessions', () => {
    const minters = [...sourceFiles(path.join(ROOT, 'app')), ...sourceFiles(path.join(ROOT, 'lib'))]
      .filter((file) => /\bsignToken\(/.test(fs.readFileSync(file, 'utf8')))
      .map(relative)
      .filter((file) => file !== 'lib/jwt.ts')
      .sort();

    expect(minters).toEqual([
      'app/api/auth/login/route.ts',
      'app/api/auth/signup/route.ts',
      'app/api/checkout/route.ts',
      'lib/auth/adminSession.ts',
    ]);
  });

  it('include no password-reset endpoint that emails a signed token as the link', () => {
    // A reset link is not a session. If customer accounts move to the platform,
    // port the flagship's hashed single-use reset token instead.
    expect(fs.existsSync(path.join(ROOT, 'app/api/auth/forgot-password/route.ts'))).toBe(false);
  });
});
