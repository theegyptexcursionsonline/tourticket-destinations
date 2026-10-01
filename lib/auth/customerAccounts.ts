/**
 * Customer accounts — sign-in, sign-up, password reset and "My bookings" — are
 * paused on this network. They authenticate only through the Google/Firebase
 * project `egypt-excursionsonline`, which is suspended, so every attempt fails.
 * Until accounts move to the platform's own sign-in, the storefront hides the
 * account entry points and explains the pause instead of showing forms that
 * cannot work. Guest checkout does not depend on an account and is unaffected.
 *
 * Re-enable only once sign-in has been verified end to end, by building with
 * NEXT_PUBLIC_CUSTOMER_ACCOUNTS_ENABLED=true.
 */
export function customerAccountsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_CUSTOMER_ACCOUNTS_ENABLED === 'true';
}
