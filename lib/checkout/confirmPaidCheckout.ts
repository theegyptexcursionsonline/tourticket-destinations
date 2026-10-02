/** Poll only the original checkout submission; 202 is never confirmation. */
export async function confirmPaidCheckout(
  bookingPayload: unknown,
  fetcher: typeof fetch = fetch,
  wait: (milliseconds: number) => Promise<void> = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)),
): Promise<{ response: Response; result: Record<string, any> }> {
  const body = JSON.stringify(bookingPayload);
  for (let attempt = 0; ; attempt += 1) {
    const response = await fetcher('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    const result = await response.json() as Record<string, any>;
    if (response.status !== 202 || result.code !== 'PAYMENT_CONFIRMATION_PROCESSING' || attempt >= 7) return { response, result };
    await wait(2000);
  }
}
