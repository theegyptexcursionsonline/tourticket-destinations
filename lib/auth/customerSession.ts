import type { NextRequest } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { verifyToken } from '@/lib/jwt';
import { verifyFirebaseToken } from '@/lib/firebase/admin';
import User, { type IUser } from '@/lib/models/user';

/** The `scope` claim of a platform customer session token (login, signup). */
export const CUSTOMER_SESSION_SCOPE = 'customer';

export type CustomerAuthenticationResult =
  | {
      success: true;
      user: IUser;
      error?: never;
      statusCode?: never;
    }
  | {
      success: false;
      error: string;
      statusCode: 401;
      user?: never;
    };

function rejected(error = 'Invalid or expired customer session'): CustomerAuthenticationResult {
  return { success: false, error, statusCode: 401 };
}

function activeCustomer(user: IUser | null): IUser | null {
  return user && user.isActive === true && user.role === 'customer' ? user : null;
}

/**
 * `role` and `isActive` joined the account schema on 19 Nov 2025, so older
 * customer records do not store them. Mongoose fills the schema defaults when
 * it loads such a record (an active customer), but a query on `isActive: true`
 * would never match it and would lock those customers out of their bookings.
 * Only an account explicitly switched off is excluded here.
 */
const NOT_DEACTIVATED = { $ne: false } as const;

/**
 * The platform signs customer sessions, admin sessions, admin 2FA-enrollment
 * cookies and checkout receipts with one secret, so a valid signature proves
 * only that this platform issued the token, not what for. Only a token issued
 * as a customer session may act as one.
 */
async function customerForPlatformToken(token: string): Promise<IUser | null> {
  const payload = await verifyToken(token);
  const subject = typeof payload?.sub === 'string' ? payload.sub : '';
  if (payload?.scope !== CUSTOMER_SESSION_SCOPE || !/^[a-f\d]{24}$/i.test(subject)) {
    return null;
  }
  return activeCustomer(await User.findOne({ _id: subject, isActive: NOT_DEACTIVATED }));
}

/**
 * Authenticate a storefront customer from `Authorization: Bearer <token>`.
 *
 * Accepts the storefront's own sign-in (a Firebase ID token for a linked
 * account) or a platform customer session token. Either way the account must
 * still exist, be active and be a customer: staff accounts sign in to the admin
 * portal with a second factor and never act through the customer surface.
 *
 * Bearer only: this network never issues a customer session cookie. Password
 * reset links are not sessions either. If customer accounts move to the
 * platform's own sign-in, port the flagship's hashed single-use reset token
 * (eeo/tourticket lib/auth/passwordReset.ts), never a JWT.
 */
export async function authenticateCustomerSession(
  request: NextRequest,
): Promise<CustomerAuthenticationResult> {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return rejected('Authentication required');
  const token = authorization.slice(7).trim();
  if (!token) return rejected('Authentication required');

  await dbConnect();

  const firebase = await verifyFirebaseToken(token);
  if (firebase.success && firebase.uid) {
    const user = activeCustomer(await User.findOne({ firebaseUid: firebase.uid, isActive: NOT_DEACTIVATED }));
    return user ? { success: true, user } : rejected();
  }

  const user = await customerForPlatformToken(token);
  return user ? { success: true, user } : rejected();
}
