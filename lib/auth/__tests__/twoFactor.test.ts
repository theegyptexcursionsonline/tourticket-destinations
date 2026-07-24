import User from '@/lib/models/user';
import {
  buildAuthenticatorUri,
  decryptTwoFactorSecret,
  encryptTwoFactorSecret,
  generateRecoveryCodes,
  generateTwoFactorSecret,
  hashRecoveryCode,
  normalizeRecoveryCode,
  verifyTotpCode,
} from '@/lib/auth/twoFactor';
import { verifyAndConsumeUserSecondFactor } from '@/lib/auth/userSecondFactor';

jest.mock('@/lib/models/user', () => ({
  __esModule: true,
  default: {
    updateOne: jest.fn(),
  },
}));

const updateOne = User.updateOne as jest.Mock;

describe('admin two-factor authentication', () => {
  const originalKey = process.env.TWO_FACTOR_ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.TWO_FACTOR_ENCRYPTION_KEY = 'test-only-two-factor-encryption-key-1234567890';
    updateOne.mockReset();
  });

  afterAll(() => {
    if (originalKey === undefined) delete process.env.TWO_FACTOR_ENCRYPTION_KEY;
    else process.env.TWO_FACTOR_ENCRYPTION_KEY = originalKey;
  });

  it('encrypts authenticator secrets at rest and decrypts them losslessly', () => {
    const secret = generateTwoFactorSecret();
    const encrypted = encryptTwoFactorSecret(secret);

    expect(encrypted).toMatch(/^v1\./);
    expect(encrypted).not.toContain(secret);
    expect(decryptTwoFactorSecret(encrypted)).toBe(secret);
  });

  it('matches the RFC 6238 SHA-1 test vector with six displayed digits', () => {
    const rfcSecret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
    expect(verifyTotpCode(rfcSecret, '287082', 59_000)).toEqual({
      valid: true,
      step: 1,
    });
    expect(verifyTotpCode(rfcSecret, '000000', 59_000)).toEqual({ valid: false });
  });

  it('creates a standards-compatible authenticator URI', () => {
    const uri = buildAuthenticatorUri('Admin@Example.com', 'ABC234');
    expect(uri).toContain('otpauth://totp/');
    expect(uri).toContain('secret=ABC234');
    expect(uri).toContain('digits=6');
    expect(uri).toContain('period=30');
    expect(uri).toContain('admin%40example.com');
  });

  it('generates unique recovery codes and hashes normalized equivalents identically', () => {
    const codes = generateRecoveryCodes();
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    expect(codes.every((code) => /^[A-Z2-7]{4}(?:-[A-Z2-7]{4}){3}$/.test(code))).toBe(true);
    expect(normalizeRecoveryCode(codes[0])).toHaveLength(16);
    expect(hashRecoveryCode(codes[0])).toBe(hashRecoveryCode(codes[0].toLowerCase().replaceAll('-', ' ')));
  });

  it('atomically accepts a TOTP time step once and rejects replay', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(59_000);
    const encryptedSecret = encryptTwoFactorSecret('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
    updateOne
      .mockResolvedValueOnce({ modifiedCount: 1 })
      .mockResolvedValueOnce({ modifiedCount: 0 });

    const user = { _id: 'user-1', twoFactorSecret: encryptedSecret };
    await expect(verifyAndConsumeUserSecondFactor(user, '287082')).resolves.toBe(true);
    await expect(verifyAndConsumeUserSecondFactor(user, '287082')).resolves.toBe(false);
    expect(updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ _id: 'user-1', twoFactorEnabled: true }),
      { $set: { twoFactorLastUsedStep: 1 } },
    );
    jest.restoreAllMocks();
  });

  it('consumes a recovery code with an atomic pull', async () => {
    updateOne.mockResolvedValue({ modifiedCount: 1 });
    const recoveryCode = 'ABCD-EFGH-JKLM-NPQR';

    await expect(verifyAndConsumeUserSecondFactor(
      { _id: 'user-2', twoFactorSecret: encryptTwoFactorSecret(generateTwoFactorSecret()) },
      recoveryCode,
    )).resolves.toBe(true);

    expect(updateOne).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: 'user-2',
        twoFactorRecoveryCodeHashes: hashRecoveryCode(recoveryCode),
      }),
      { $pull: { twoFactorRecoveryCodeHashes: hashRecoveryCode(recoveryCode) } },
    );
  });
});
