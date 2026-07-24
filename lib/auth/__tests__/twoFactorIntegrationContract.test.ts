import fs from 'node:fs';
import path from 'node:path';

const read = (relativePath: string) => fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('two-factor authentication integration contract', () => {
  it('requires the second factor before issuing an admin session', () => {
    const source = read('app/api/admin/login/route.ts');
    expect(source).toContain("recordLoginAudit(request.headers, identifier, 'two_factor_required')");
    expect(source).toContain('verifyAndConsumeUserSecondFactor(user, twoFactorCode)');
    const secondFactorIndex = source.indexOf('if (user.twoFactorEnabled)');
    expect(secondFactorIndex).toBeGreaterThan(-1);
    expect(source.indexOf('const token = await signToken', secondFactorIndex)).toBeGreaterThan(secondFactorIndex);
  });

  it('protects setup endpoints with current admin authorization', () => {
    const source = read('app/api/admin/2fa/route.ts');
    expect(source).toContain('const auth = await requireAdminAuth(request)');
    expect(source).toContain('if (!isSameOriginMutation(request))');
    expect(source).toContain('encryptTwoFactorSecret(secret)');
    expect(source).toContain('twoFactorRecoveryCodeHashes = recoveryCodes.map(hashRecoveryCode)');
    expect(source).not.toContain('twoFactorSecret: secret');
  });

  it('includes both the login challenge and account security UI', () => {
    const login = read('components/admin/Login.tsx');
    const security = read('app/admin/security/page.tsx');
    expect(login).toContain('requiresTwoFactor');
    expect(login).toContain('autoComplete="one-time-code"');
    expect(security).toContain('Set up 2FA');
    expect(security).toContain('recovery codes');
  });
});
