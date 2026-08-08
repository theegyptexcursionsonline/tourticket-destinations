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
});
