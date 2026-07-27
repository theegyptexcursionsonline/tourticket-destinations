import fs from 'node:fs';
import path from 'node:path';

const read = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('English network team invitation UI contract', () => {
  const teamPage = read('app/admin/team/page.tsx');
  const acceptancePage = read('app/[locale]/accept-invitation/page.tsx');

  it('keeps the invite card sticky only on desktop-sized layouts', () => {
    expect(teamPage).toContain('lg:sticky lg:top-24 lg:self-start');
    expect(teamPage).not.toContain('sticky top-24');
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
});
