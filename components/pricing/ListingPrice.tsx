import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { isRealPrice } from '@/lib/pricing/effectivePrice';

interface ListingPriceProps {
  /** A real price, or null/0 when the tour has none yet. */
  value: number | null | undefined;
  formatPrice: (value: number) => string;
  /** Shown before the amount only, e.g. a "From" label. */
  prefix?: ReactNode;
  /** Shown after the amount only, e.g. "per person". */
  suffix?: ReactNode;
}

/** A tour's listed price, or "Price on request" — never $0.00. */
export default function ListingPrice({ value, formatPrice, prefix, suffix }: ListingPriceProps) {
  const t = useTranslations();
  if (!isRealPrice(value)) {
    return <span data-price-state="on-request">{t('price.onRequest')}</span>;
  }
  return <>{prefix}{formatPrice(value)}{suffix}</>;
}
