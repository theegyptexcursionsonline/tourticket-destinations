import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { requireAdminAuth } from '@/lib/auth/adminAuth';
import User from '@/lib/models/user';
import {
  buildAuthenticatorUri,
  decryptTwoFactorSecret,
  encryptTwoFactorSecret,
  generateRecoveryCodes,
  generateTwoFactorSecret,
  hashRecoveryCode,
  verifyTotpCode,
} from '@/lib/auth/twoFactor';
import { verifyAndConsumeUserSecondFactor } from '@/lib/auth/userSecondFactor';

function invalidCodeResponse() {
  return NextResponse.json(
    { success: false, error: 'The authentication code is invalid or has already been used.' },
    { status: 400 },
  );
}

function isSameOriginMutation(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const publicHost =
    request.headers.get('x-forwarded-host')?.split(',')[0]?.trim()
    || request.headers.get('host')
    || request.nextUrl.host;
  try {
    return Boolean(origin && new URL(origin).host === publicHost);
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if (auth instanceof NextResponse) return auth;
  const user = await User.findById(auth.userId).select('twoFactorEnabled twoFactorEnabledAt').lean();
  if (!user) return NextResponse.json({ success: false, error: 'Admin account not found.' }, { status: 404 });
  return NextResponse.json({
    success: true,
    enabled: Boolean(user.twoFactorEnabled),
    enabledAt: user.twoFactorEnabledAt || null,
  });
}

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json({ success: false, error: 'Invalid request origin.' }, { status: 403 });
  }
  const auth = await requireAdminAuth(request);
  if (auth instanceof NextResponse) return auth;
  const body = await request.json().catch(() => null) as { action?: unknown; code?: unknown } | null;
  const action = typeof body?.action === 'string' ? body.action : '';
  const code = typeof body?.code === 'string' ? body.code.trim() : '';
  if (!['setup', 'enable', 'regenerate', 'disable'].includes(action) || code.length > 64) {
    return NextResponse.json({ success: false, error: 'Invalid request.' }, { status: 400 });
  }
  const user = await User.findById(auth.userId)
    .select('+twoFactorSecret +twoFactorPendingSecret +twoFactorRecoveryCodeHashes +twoFactorLastUsedStep');
  if (!user) return NextResponse.json({ success: false, error: 'Admin account not found.' }, { status: 404 });

  if (action === 'setup') {
    if (user.twoFactorEnabled) {
      return NextResponse.json({ success: false, error: 'Two-factor authentication is already enabled.' }, { status: 409 });
    }
    const secret = generateTwoFactorSecret();
    user.twoFactorPendingSecret = encryptTwoFactorSecret(secret);
    await user.save({ validateBeforeSave: false });
    const qrCodeDataUrl = await QRCode.toDataURL(buildAuthenticatorUri(user.email, secret), {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 280,
    });
    return NextResponse.json({ success: true, qrCodeDataUrl, manualKey: secret });
  }

  if (action === 'enable') {
    if (user.twoFactorEnabled) {
      return NextResponse.json({ success: false, error: 'Two-factor authentication is already enabled.' }, { status: 409 });
    }
    if (!user.twoFactorPendingSecret || !code) return invalidCodeResponse();
    try {
      const verification = verifyTotpCode(decryptTwoFactorSecret(user.twoFactorPendingSecret), code);
      if (!verification.valid || verification.step === undefined) return invalidCodeResponse();
      const recoveryCodes = generateRecoveryCodes();
      user.twoFactorEnabled = true;
      user.twoFactorSecret = user.twoFactorPendingSecret;
      user.twoFactorPendingSecret = undefined;
      user.twoFactorRecoveryCodeHashes = recoveryCodes.map(hashRecoveryCode);
      user.twoFactorEnabledAt = new Date();
      user.twoFactorLastUsedStep = verification.step;
      await user.save({ validateBeforeSave: false });
      return NextResponse.json({ success: true, enabled: true, recoveryCodes });
    } catch {
      return invalidCodeResponse();
    }
  }

  if (!user.twoFactorEnabled || !code) return invalidCodeResponse();
  if (!await verifyAndConsumeUserSecondFactor(user, code)) return invalidCodeResponse();
  if (action === 'regenerate') {
    const recoveryCodes = generateRecoveryCodes();
    user.twoFactorRecoveryCodeHashes = recoveryCodes.map(hashRecoveryCode);
    await user.save({ validateBeforeSave: false });
    return NextResponse.json({ success: true, recoveryCodes });
  }
  user.twoFactorEnabled = false;
  user.twoFactorSecret = undefined;
  user.twoFactorPendingSecret = undefined;
  user.twoFactorRecoveryCodeHashes = undefined;
  user.twoFactorEnabledAt = undefined;
  user.twoFactorLastUsedStep = undefined;
  await user.save({ validateBeforeSave: false });
  return NextResponse.json({ success: true, enabled: false });
}
