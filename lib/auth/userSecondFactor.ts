import User from '@/lib/models/user';
import {
  decryptTwoFactorSecret,
  hashRecoveryCode,
  looksLikeRecoveryCode,
  verifyTotpCode,
} from '@/lib/auth/twoFactor';

interface SecondFactorUser {
  _id: unknown;
  twoFactorSecret?: string;
}

export async function verifyAndConsumeUserSecondFactor(
  user: SecondFactorUser,
  input: string,
): Promise<boolean> {
  const code = input.trim();
  if (!code || !user.twoFactorSecret) return false;

  if (looksLikeRecoveryCode(code)) {
    const hash = hashRecoveryCode(code);
    const result = await User.updateOne(
      {
        _id: user._id,
        twoFactorEnabled: true,
        twoFactorRecoveryCodeHashes: hash,
      },
      { $pull: { twoFactorRecoveryCodeHashes: hash } },
    );
    return result.modifiedCount === 1;
  }

  try {
    const verification = verifyTotpCode(decryptTwoFactorSecret(user.twoFactorSecret), code);
    if (!verification.valid || verification.step === undefined) return false;

    const result = await User.updateOne(
      {
        _id: user._id,
        twoFactorEnabled: true,
        $or: [
          { twoFactorLastUsedStep: { $exists: false } },
          { twoFactorLastUsedStep: { $lt: verification.step } },
        ],
      },
      { $set: { twoFactorLastUsedStep: verification.step } },
    );
    return result.modifiedCount === 1;
  } catch {
    return false;
  }
}
