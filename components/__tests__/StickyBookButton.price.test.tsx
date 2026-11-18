import { act, fireEvent, render, screen } from '@testing-library/react';
import StickyBookButton from '@/components/StickyBookButton';

jest.mock('@/hooks/useSettings', () => ({ useSettings: () => ({ formatPrice: (n: number) => `$${n.toFixed(2)}` }) }));

const showBar = () => {
  act(() => {
    Object.defineProperty(window, 'scrollY', { value: 900, configurable: true });
    fireEvent.scroll(window);
  });
};

describe('phone booking bar price (#2727)', () => {
  it('shows a real per-person price', () => {
    render(<StickyBookButton price={45} currency="$" onClick={jest.fn()} />);
    showBar();
    expect(screen.getByText('$45.00')).toBeInTheDocument();
  });

  it.each([0, null])('says price on request instead of $0.00 for %s', (price) => {
    render(<StickyBookButton price={price} currency="$" onClick={jest.fn()} />);
    showBar();
    expect(screen.getByText('price.onRequest')).toBeInTheDocument();
    expect(screen.queryByText('$0.00')).not.toBeInTheDocument();
    // The guest can still open the panel to see the options.
    expect(screen.getByTestId('open-booking-drawer-mobile')).toBeInTheDocument();
  });
});
