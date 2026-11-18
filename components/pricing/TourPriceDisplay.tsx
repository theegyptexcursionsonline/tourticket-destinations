import { useTranslations } from 'next-intl';
import { percentageOff, type PricedTour } from '@/lib/pricing/effectivePrice';
import { bookableTripPrice, type DisplayableTour } from '@/lib/pricing/displayPrice';

interface TourPriceDisplayProps {
  tour: PricedTour & Pick<DisplayableTour, 'bookingOptions'>;
  formatPrice: (value: number) => string;
  align?: 'left' | 'center' | 'right';
  priceClassName?: string;
  originalClassName?: string;
  showPerPerson?: boolean;
  perPersonLabel?: string;
}

const alignmentClasses = {
  left: 'items-start text-left',
  center: 'items-center text-center',
  right: 'items-end text-right',
} as const;

/** Shared base-price presentation for every storefront surface. */
export default function TourPriceDisplay({
  tour,
  formatPrice,
  align = 'right',
  priceClassName = 'text-3xl md:text-4xl font-extrabold text-red-600',
  originalClassName = 'text-slate-500 line-through text-lg',
  showPerPerson = true,
  perPersonLabel = 'per person',
}: TourPriceDisplayProps) {
  const t = useTranslations();
  // The tour's own price when it has one; a tour saved at 0 and priced through
  // its options shows its cheapest real option; nothing priced → on request.
  const pricing = bookableTripPrice(tour);

  if (!pricing) {
    return (
      <div className={`flex flex-col ${alignmentClasses[align]}`} data-testid="tour-base-price" data-price-state="on-request">
        <span className="text-xl md:text-2xl font-bold text-slate-700">{t('price.onRequest')}</span>
      </div>
    );
  }

  const discount = percentageOff(pricing.originalPrice, pricing.price);

  return (
    <div className={`flex flex-col ${alignmentClasses[align]}`} data-testid="tour-base-price">
      {pricing.discountApplied && (
        <div className="mb-1 flex flex-wrap items-center gap-2" data-testid="tour-base-discount">
          <span className={originalClassName}>{formatPrice(pricing.originalPrice)}</span>
          {discount > 0 && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
              {discount}% OFF
            </span>
          )}
        </div>
      )}
      <span className={priceClassName}>{formatPrice(pricing.price)}</span>
      {showPerPerson && <span className="text-sm text-slate-500">{perPersonLabel}</span>}
    </div>
  );
}
