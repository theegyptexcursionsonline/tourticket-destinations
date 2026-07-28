import fs from 'node:fs';
import path from 'node:path';

const read = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('English network team invitation UI contract', () => {
  const teamPage = read('app/admin/team/page.tsx');
  const acceptancePage = read('app/[locale]/accept-invitation/page.tsx');
  const teamRoute = read('app/api/admin/team/[id]/route.ts');
  const permanentRoute = read('app/api/admin/team/[id]/permanent/route.ts');

  it('keeps the invite card sticky only on desktop-sized layouts', () => {
    expect(teamPage).toContain('lg:sticky lg:top-4 lg:self-start');
    expect(teamPage).not.toContain('sticky top-4');
  });

  it('presents pending invitations as offers, not active access', () => {
    expect(teamPage).toContain('invitationPending');
    expect(teamPage).toContain('Withdraw');
    expect(teamPage).toContain('Resend Invite');
  });

  it('does not ask existing account holders to replace their password', () => {
    expect(acceptancePage).toContain('requiresPasswordSetup');
    expect(acceptancePage).toContain('Your existing password and customer account will not change.');
  });

  it('separates access removal from guarded account deletion', () => {
    expect(teamPage).toContain('Remove access');
    expect(teamPage).toContain('Access removed — account preserved');
    expect(teamPage).toContain('Invite again');
    expect(teamPage).toContain("user?.role === 'super_admin'");
    expect(teamPage).toContain('Permanently delete account');
    expect(teamRoute).toContain("formerAdminScopes: 'multiTenant'");
    expect(teamRoute).toContain('formerAdminTenantIds');
    expect(permanentRoute).toContain("auth.role !== 'super_admin'");
    expect(permanentRoute).toContain('inspectAccountDependencies');
    expect(permanentRoute).toContain('ACCOUNT_HAS_DEPENDENCIES');
  });
});
