interface EmptyCheckoutState {
  isCartReady: boolean;
  cartLength: number;
  isConfirmed: boolean;
}

/**
 * A guest cart is restored from browser storage after the first render. Leaving
 * checkout before that restoration completes strands a valid customer cart on
 * the homepage. Only a confirmed, hydrated empty cart may leave checkout.
 */
export function shouldRedirectEmptyCheckout({
  isCartReady,
  cartLength,
  isConfirmed,
}: EmptyCheckoutState): boolean {
  return isCartReady && cartLength === 0 && !isConfirmed;
}
