import { signToken } from '@/lib/jwt';

export const ADMIN_SESSION_SCOPE = 'admin';
export const ADMIN_ENROLLMENT_SCOPE = 'admin-2fa-enrollment';
export const ADMIN_SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;
export const ADMIN_ENROLLMENT_MAX_AGE_SECONDS = 15 * 60;

interface AdminSessionIdentity {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  permissions: string[];
  tenantIds?: string[];
}

export async function signAdminSessionToken(
  identity: AdminSessionIdentity,
  enrollmentOnly = false,
): Promise<string> {
  return signToken(
    {
      sub: identity.userId,
      email: identity.email,
      given_name: identity.firstName,
      family_name: identity.lastName,
      role: identity.role,
      permissions: enrollmentOnly ? [] : identity.permissions,
      ...(identity.tenantIds
        ? { tenantIds: enrollmentOnly ? [] : identity.tenantIds }
        : {}),
      scope: enrollmentOnly ? ADMIN_ENROLLMENT_SCOPE : ADMIN_SESSION_SCOPE,
    },
    { expiresIn: enrollmentOnly ? '15m' : '8h' },
  );
}
