import { buildMandatoryTwoFactorResetUpdate } from '@/lib/auth/mandatoryTwoFactorReset';

describe('mandatory two-factor reset', () => {
  it('revokes the authenticator and every recovery credential without touching identity fields', () => {
    const update = buildMandatoryTwoFactorResetUpdate();

    expect(update).toEqual({
      $set: { twoFactorEnabled: false, twoFactorRecoveryPending: false },
      $unset: {
        twoFactorSecret: 1,
        twoFactorPendingSecret: 1,
        twoFactorRecoveryCodeHashes: 1,
        twoFactorEnabledAt: 1,
        twoFactorLastUsedStep: 1,
      },
    });
    expect(update.$set).not.toHaveProperty('password');
    expect(update.$set).not.toHaveProperty('role');
    expect(update.$unset).not.toHaveProperty('password');
  });
});
