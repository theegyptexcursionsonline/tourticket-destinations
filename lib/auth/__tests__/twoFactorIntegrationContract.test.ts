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
    expect(source).toContain('allowTwoFactorEnrollment: true');
    expect(source).toContain('if (!isSameOriginMutation(request))');
    expect(source).toContain('encryptTwoFactorSecret(secret)');
    expect(source).toContain('twoFactorRecoveryCodeHashes = recoveryCodes.map(hashRecoveryCode)');
    expect(source).not.toContain('twoFactorSecret: secret');
  });

  it('forces unenrolled admins into setup and blocks normal admin APIs', () => {
    const authorization = read('lib/auth/adminAuth.ts');
    const profile = read('app/api/admin/auth/me/route.ts');
    const guard = read('components/admin/withAuth.tsx');
    const security = read('app/admin/security/page.tsx');

    expect(authorization).toContain("code: 'TWO_FACTOR_SETUP_REQUIRED'");
    expect(authorization).toContain('!user.twoFactorEnabled && !options.allowTwoFactorEnrollment');
    expect(profile).toContain('allowTwoFactorEnrollment: true');
    expect(profile).toContain('twoFactorEnabled: Boolean(user.twoFactorEnabled)');
    expect(guard).toContain("router.replace('/admin/security?required=1')");
    expect(guard).toContain("pathname !== '/admin/security'");
    expect(security).toContain('Two-step verification is required');
    expect(security).toContain('await refreshUser()');
  });

  it('does not permit mandatory two-factor authentication to be disabled', () => {
    const source = read('app/api/admin/2fa/route.ts');
    expect(source).toContain("code: 'TWO_FACTOR_REQUIRED'");
    expect(source).toContain('cannot be disabled');
    expect(source).not.toContain('user.twoFactorEnabled = false');
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
