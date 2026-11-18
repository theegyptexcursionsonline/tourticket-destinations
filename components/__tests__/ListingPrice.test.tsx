import { render, screen } from '@testing-library/react';
import ListingPrice from '@/components/pricing/ListingPrice';

const formatPrice = (n: number) => `$${n.toFixed(2)}`;

describe('ListingPrice (#2727)', () => {
  it('renders a real price with its prefix', () => {
    render(<span data-testid="card"><ListingPrice value={35} formatPrice={formatPrice} prefix="From " /></span>);
    expect(screen.getByTestId('card')).toHaveTextContent('From $35.00');
  });

  it.each([0, null, undefined, Number.NaN, -5])('never renders $0.00 for %s', (value) => {
    render(<span data-testid="card"><ListingPrice value={value} formatPrice={formatPrice} prefix="From " /></span>);
    expect(screen.getByTestId('card')).toHaveTextContent('price.onRequest');
    expect(screen.getByTestId('card')).not.toHaveTextContent('$');
  });
});
