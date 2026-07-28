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
    expect(source.indexOf('const token = await signAdminSessionToken', secondFactorIndex)).toBeGreaterThan(secondFactorIndex);
  });

  it('protects setup endpoints with current admin authorization', () => {
    const source = read('app/api/admin/2fa/route.ts');
    expect(source).toContain('allowTwoFactorEnrollment: true');
    expect(source).toContain('if (!isSameOriginMutation(request))');
    expect(source).toContain('encryptTwoFactorSecret(secret)');
    expect(source).toContain('twoFactorRecoveryCodeHashes = recoveryCodes.map(hashRecoveryCode)');
    expect(source).not.toContain('twoFactorSecret: secret');
    expect(source).toContain('user.twoFactorRecoveryPending = true');
    expect(source).toContain("action === 'acknowledge'");
  });

  it('forces unenrolled admins into setup and blocks normal admin APIs', () => {
    const authorization = read('lib/auth/adminAuth.ts');
    const profile = read('app/api/admin/auth/me/route.ts');
    const guard = read('components/admin/withAuth.tsx');
    const security = read('app/admin/security/page.tsx');

    expect(authorization).toContain("code: 'TWO_FACTOR_SETUP_REQUIRED'");
    expect(authorization).toContain("code: 'TWO_FACTOR_RECOVERY_ACK_REQUIRED'");
    expect(authorization).toContain('ADMIN_ENROLLMENT_SCOPE');
    expect(authorization).toContain('!user.twoFactorEnabled && !options.allowTwoFactorEnrollment');
    expect(profile).toContain('allowTwoFactorEnrollment: true');
    expect(profile).toContain('twoFactorEnabled: Boolean(user.twoFactorEnabled)');
    expect(guard).toContain("router.replace('/admin/security?required=1')");
    expect(guard).toContain("pathname !== '/admin/security'");
    expect(security).toContain('Two-step verification is required');
    expect(security).toContain('await refreshUser()');
  });

  it('only resets mandatory two-factor authentication after a fresh code and signs the account out', () => {
    const source = read('app/api/admin/2fa/route.ts');
    expect(source).toContain("action === 'reset'");
    expect(source).toContain('verifyAndConsumeUserSecondFactor(user, code)');
    expect(source).toContain('buildMandatoryTwoFactorResetUpdate()');
    expect(source).toContain("'two_factor_reset'");
    expect(source).toContain("response.cookies.set('admin-auth-token', ''");
    expect(source.indexOf('verifyAndConsumeUserSecondFactor(user, code)'))
      .toBeLessThan(source.indexOf("if (action === 'reset')"));
  });

  it('includes both the login challenge and account security UI', () => {
    const login = read('components/admin/Login.tsx');
    const security = read('app/admin/security/page.tsx');
    expect(login).toContain('requiresTwoFactor');
    expect(login).toContain('autoComplete="one-time-code"');
    expect(security).toContain('Set up 2FA');
    expect(security).toContain('recovery codes');
    expect(security).toContain('Disable and set up again');
    expect(security).toContain('I understand that I will be signed out and must enroll again.');
  });

  it('unlocks the dashboard only after the server acknowledges recovery codes', () => {
    const security = read('app/admin/security/page.tsx');
    const layout = read('app/admin/AdminClientLayout.tsx');
    expect(security).toContain("postAction('acknowledge')");
    expect(security).toContain('I have saved them · Unlock dashboard');
    expect(security).toContain("router.replace('/admin')");
    expect(layout).toContain('MandatoryTwoFactorShell');
    expect(layout).toContain('user?.twoFactorRecoveryPending === true');
  });
});
