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
import { recordLoginAudit } from '@/lib/auth/loginAudit';
import { buildMandatoryTwoFactorResetUpdate } from '@/lib/auth/mandatoryTwoFactorReset';
import { verifyAndConsumeUserSecondFactor } from '@/lib/auth/userSecondFactor';
import { ADMIN_SESSION_MAX_AGE_SECONDS, signAdminSessionToken } from '@/lib/auth/adminSession';
import { getDefaultPermissions } from '@/lib/constants/adminPermissions';
import { serializeTenantIds } from '@/lib/auth/serializeAdminIdentity';

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
  const auth = await requireAdminAuth(request, { allowTwoFactorEnrollment: true });
  if (auth instanceof NextResponse) return auth;
  const user = await User.findById(auth.userId)
    .select('twoFactorEnabled twoFactorEnabledAt twoFactorRecoveryPending')
    .lean();
  if (!user) return NextResponse.json({ success: false, error: 'Admin account not found.' }, { status: 404 });
  return NextResponse.json({
    success: true,
    enabled: Boolean(user.twoFactorEnabled),
    enabledAt: user.twoFactorEnabledAt || null,
    recoveryPending: Boolean(user.twoFactorRecoveryPending),
    required: true,
  });
}

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json({ success: false, error: 'Invalid request origin.' }, { status: 403 });
  }
  const auth = await requireAdminAuth(request, { allowTwoFactorEnrollment: true });
  if (auth instanceof NextResponse) return auth;
  const body = await request.json().catch(() => null) as { action?: unknown; code?: unknown } | null;
  const action = typeof body?.action === 'string' ? body.action : '';
  const code = typeof body?.code === 'string' ? body.code.trim() : '';
  if (!['setup', 'enable', 'resume-recovery', 'acknowledge', 'regenerate', 'reset'].includes(action) || code.length > 64) {
    return NextResponse.json({ success: false, error: 'Invalid request.' }, { status: 400 });
  }
  const user = await User.findById(auth.userId)
    .select(
      '+twoFactorSecret +twoFactorPendingSecret +twoFactorRecoveryCodeHashes '
      + '+twoFactorLastUsedStep email firstName lastName role permissions tenantIds '
      + 'twoFactorEnabled twoFactorRecoveryPending',
    );
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
      user.twoFactorRecoveryPending = true;
      user.twoFactorEnabledAt = new Date();
      user.twoFactorLastUsedStep = verification.step;
      await user.save({ validateBeforeSave: false });
      return NextResponse.json({ success: true, enabled: true, recoveryPending: true, recoveryCodes });
    } catch {
      return invalidCodeResponse();
    }
  }

  if (action === 'acknowledge') {
    if (!user.twoFactorEnabled || !user.twoFactorRecoveryPending) {
      return NextResponse.json({ success: false, error: 'Recovery-code confirmation is not pending.' }, { status: 409 });
    }
    user.twoFactorRecoveryPending = false;
    await user.save({ validateBeforeSave: false });
    const permissions = user.permissions?.length
      ? [...user.permissions]
      : getDefaultPermissions(user.role);
    const token = await signAdminSessionToken({
      userId: String(user._id),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      permissions,
      tenantIds: serializeTenantIds(user.tenantIds),
    });
    const response = NextResponse.json({
      success: true,
      enabled: true,
      recoveryPending: false,
      recoveryAcknowledged: true,
    });
    response.cookies.set('admin-auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
    });
    return response;
  }

  if (!user.twoFactorEnabled || !code) return invalidCodeResponse();
  if (!await verifyAndConsumeUserSecondFactor(user, code)) return invalidCodeResponse();
  if (action === 'resume-recovery') {
    if (!user.twoFactorRecoveryPending) {
      return NextResponse.json({ success: false, error: 'Recovery-code confirmation is not pending.' }, { status: 409 });
    }
    const recoveryCodes = generateRecoveryCodes();
    user.twoFactorRecoveryCodeHashes = recoveryCodes.map(hashRecoveryCode);
    await user.save({ validateBeforeSave: false });
    return NextResponse.json({ success: true, recoveryPending: true, recoveryCodes });
  }
  if (action === 'regenerate') {
    const recoveryCodes = generateRecoveryCodes();
    user.twoFactorRecoveryCodeHashes = recoveryCodes.map(hashRecoveryCode);
    await user.save({ validateBeforeSave: false });
    return NextResponse.json({ success: true, recoveryCodes });
  }
  if (action === 'reset') {
    const reset = await User.updateOne(
      { _id: user._id, twoFactorEnabled: true },
      buildMandatoryTwoFactorResetUpdate(),
    );
    if (reset.modifiedCount !== 1) {
      return NextResponse.json(
        { success: false, error: 'Two-factor authentication changed before the reset completed. Please sign in and try again.' },
        { status: 409 },
      );
    }
    await recordLoginAudit(request.headers, user.email, 'two_factor_reset');
    const response = NextResponse.json({
      success: true,
      enabled: false,
      requiresSetup: true,
    });
    response.cookies.set('admin-auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: new Date(0),
      maxAge: 0,
    });
    return response;
  }
  return NextResponse.json({ success: false, error: 'Invalid request.' }, { status: 400 });
}
