export function buildMandatoryTwoFactorResetUpdate() {
  return {
    $set: {
      twoFactorEnabled: false,
      twoFactorRecoveryPending: false,
    },
    $unset: {
      twoFactorSecret: 1,
      twoFactorPendingSecret: 1,
      twoFactorRecoveryCodeHashes: 1,
      twoFactorEnabledAt: 1,
      twoFactorLastUsedStep: 1,
    },
  } as const;
}
