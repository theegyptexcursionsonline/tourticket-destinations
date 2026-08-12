export function isAllowedStripeCheckoutUrl(value: unknown): boolean {
  if (typeof value !== 'string' || value.length > 4_096) return false;
  try {
    const destination = new URL(value);
    const hostname = destination.hostname.toLowerCase().replace(/\.$/, '');
    return destination.protocol === 'https:'
      && destination.port === ''
      && destination.username === ''
      && destination.password === ''
      && hostname.endsWith('.stripe.com');
  } catch {
    return false;
  }
}
