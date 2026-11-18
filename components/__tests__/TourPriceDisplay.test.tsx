import { render, screen } from '@testing-library/react';
import TourPriceDisplay from '@/components/pricing/TourPriceDisplay';

const formatPrice = (value: number) => `$${value.toFixed(2)}`;

describe('TourPriceDisplay', () => {
  it('shows base, calculated customer price and percentage', () => {
    render(
      <TourPriceDisplay
        tour={{ discountPrice: 50, originalPrice: 999, discountPercent: 10 }}
        formatPrice={formatPrice}
      />,
    );
    expect(screen.getByText('$50.00')).toHaveClass('line-through');
    expect(screen.getByText('$45.00')).toBeInTheDocument();
    expect(screen.getByText('10% OFF')).toBeInTheDocument();
  });

  it('keeps a legacy price pair when no percentage is configured', () => {
    render(<TourPriceDisplay tour={{ discountPrice: 80, originalPrice: 100 }} formatPrice={formatPrice} />);
    expect(screen.getByText('$100.00')).toHaveClass('line-through');
    expect(screen.getByText('$80.00')).toBeInTheDocument();
  });

  it('does not invent a discount', () => {
    render(<TourPriceDisplay tour={{ discountPrice: 50 }} formatPrice={formatPrice} />);
    expect(screen.queryByTestId('tour-base-discount')).not.toBeInTheDocument();
  });

  // #2727: a tour saved at 0 must never read $0.00.
  it('shows the cheapest real option price when the tour base is 0', () => {
    render(
      <TourPriceDisplay
        tour={{ discountPrice: 0, bookingOptions: [{ price: 0, timeSlots: [{ price: 0 }, { price: 116 }] }, { price: 0 }] }}
        formatPrice={formatPrice}
      />,
    );
    expect(screen.getByText('$116.00')).toBeInTheDocument();
    expect(screen.queryByText('$0.00')).not.toBeInTheDocument();
  });

  it('says price on request when nothing is priced', () => {
    render(<TourPriceDisplay tour={{ discountPrice: 0, bookingOptions: [{ price: 0 }] }} formatPrice={formatPrice} />);
    expect(screen.getByTestId('tour-base-price')).toHaveAttribute('data-price-state', 'on-request');
    expect(screen.getByText('price.onRequest')).toBeInTheDocument();
    expect(screen.queryByText('$0.00')).not.toBeInTheDocument();
  });
});
