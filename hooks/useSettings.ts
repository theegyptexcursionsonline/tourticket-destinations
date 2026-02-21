// hooks/useSettings.ts
'use client';

import { useContext } from 'react';
import { SettingsContext } from '@/contexts/SettingsContext';

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

// Additional utility hooks for specific formatting needs
export const usePriceFormatter = () => {
  const { formatPrice } = useSettings();
  return formatPrice;
};

export const useNumberFormatter = () => {
  const { formatNumber } = useSettings();
  return formatNumber;
};

export const useDateFormatter = () => {
  const { formatDate } = useSettings();
  return formatDate;
};

// Enhanced hooks for booking-specific formatting
export const usePriceRangeFormatter = () => {
  const { formatPriceRange } = useSettings();
  return formatPriceRange;
};

export const useDiscountFormatter = () => {
  const { formatDiscount } = useSettings();
  return formatDiscount;
};

export const useSavingsFormatter = () => {
  const { formatSavings } = useSettings();
  return formatSavings;
};

export const useCurrencySymbol = () => {
  const { getCurrencySymbol } = useSettings();
  return getCurrencySymbol;
};

export const usePriceConverter = () => {
  const { convertPrice } = useSettings();
  return convertPrice;
};

// Custom hook for currency information
export const useCurrencyInfo = () => {
  const { selectedCurrency, exchangeRates, isLoading } = useSettings();

  return {
    currency: selectedCurrency,
    symbol: selectedCurrency.symbol,
    code: selectedCurrency.code,
    name: selectedCurrency.name,
    exchangeRate: exchangeRates[selectedCurrency.code] || 1,
    isExchangeRatesLoading: isLoading,
  };
};

// Custom hook for language information
export const useLanguageInfo = () => {
  const { selectedLanguage } = useSettings();

  return {
    language: selectedLanguage,
    code: selectedLanguage.code,
    name: selectedLanguage.name,
    nativeName: selectedLanguage.nativeName,
  };
};
