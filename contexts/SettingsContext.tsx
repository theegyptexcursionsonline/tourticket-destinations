'use client';

import { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Currency, Language } from '@/types';
import { currencies, languages } from '@/utils/localization';

// --- Interface Definitions ---
interface SettingsContextType {
  selectedCurrency: Currency;
  setSelectedCurrency: (currency: Currency) => void;
  selectedLanguage: Language;
  setSelectedLanguage: (language: Language) => void;
  formatPrice: (priceInUsd: number) => string;
  formatNumber: (number: number) => string;
  formatDate: (date: Date | string) => string;
  exchangeRates: { [key: string]: number };
  isLoading: boolean;
  // Enhanced methods for booking
  formatPriceRange: (minPrice: number, maxPrice: number) => string;
  formatDiscount: (originalPrice: number, discountedPrice: number) => string;
  formatSavings: (savings: number) => string;
  getCurrencySymbol: () => string;
  convertPrice: (priceInUsd: number) => number;
}

export const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// FIXED: Enhanced usePersistentState with better error handling
const usePersistentState = <T,>(key: string, defaultValue: T): [T, (value: T) => void] => {
  const [state, setState] = useState<T>(defaultValue);
  const [isLoaded, setIsLoaded] = useState(false);
  
  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        // Try to parse as JSON first
        try {
          const parsedItem = JSON.parse(item);
          setState(parsedItem);
        } catch (_parseError) {
          console.log(`Item ${key} in localStorage is not valid JSON, checking if it's a simple string value`);
          
          // Handle legacy storage format or simple string values
          if (key === 'selectedLanguage') {
            // If it's just a language code like "es", find the language object
            const language = languages.find(lang => lang.code === item);
            if (language) {
              setState(language as T);
            }
          } else if (key === 'selectedCurrency') {
            // If it's just a currency code like "USD", find the currency object
            const currency = currencies.find(curr => curr.code === item);
            if (currency) {
              setState(currency as T);
            }
          } else {
            // For other cases, try to use the raw string value
            setState(item as T);
          }
        }
      }
    } catch (_error) {
      console.error(`Error loading ${key} from localStorage:`, _error);
      // Clear corrupted data
      try {
        window.localStorage.removeItem(key);
      } catch (clearError) {
        console.error(`Error clearing corrupted ${key} from localStorage:`, clearError);
      }
    } finally {
      setIsLoaded(true);
    }
  }, [key]);
  
  const setValue = (value: T) => {
    try {
      setState(value);
      if (isLoaded) {
        window.localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (_error) {
      console.error(`Error saving ${key} to localStorage:`, _error);
    }
  };
  
  return [state, setValue];
};

// Enhanced exchange rate fetching function with fallback and caching
const fetchExchangeRates = async (): Promise<{ [key: string]: number }> => {
  const CACHE_KEY = 'exchangeRates';
  const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds
  
  try {
    // Check cached rates first
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { rates, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
        return rates;
      }
    }
  } catch (_error) {
    console.log('Error reading cached exchange rates');
  }

  try {
    // Try multiple API sources for better reliability
    const apiSources = [
      'https://api.exchangerate-api.com/v4/latest/EUR',
      'https://api.fixer.io/latest?base=EUR',
    ];

    for (const apiUrl of apiSources) {
      try {
        const response = await fetch(apiUrl, {
          headers: {
            'Accept': 'application/json',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          const rates = {
            EUR: 1,
            ...data.rates,
          };
          
          // Cache the successful response
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({
              rates,
              timestamp: Date.now(),
            }));
          } catch (_error) {
            console.log('Error caching exchange rates');
          }
          
          return rates;
        }
      } catch (_error) {
        console.log(`Failed to fetch from ${apiUrl}:`, _error);
        continue;
      }
    }
  } catch (_error) {
    console.error('Failed to fetch exchange rates:', _error);
  }
  
  // Enhanced fallback rates (more comprehensive and recent)
  return {
    EUR: 1,
    USD: 1.08,
    GBP: 0.85,
    JPY: 169.5,
    INR: 90.5,
    AUD: 1.63,
    CAD: 1.48,
    CHF: 0.97,
    CNY: 7.82,
    SEK: 11.23,
    NZD: 1.76,
    MXN: 18.15,
    SGD: 1.46,
    HKD: 8.45,
    NOK: 11.33,
    KRW: 1485.25,
    TRY: 35.15,
    RUB: 99.5,
    BRL: 5.58,
    ZAR: 20.25,
    DKK: 7.46,
    PLN: 4.32,
    CZK: 24.15,
    HUF: 389.25,
    RON: 4.98,
    BGN: 1.96,
    HRK: 7.53,
    ISK: 145.35,
    THB: 38.25,
    MYR: 4.85,
    PHP: 61.25,
    IDR: 16850.5,
    VND: 26450.75,
  };
};

export function SettingsProvider({ children }: { children: ReactNode }) {
  // Get browser's preferred language
  const getPreferredLanguage = (): Language => {
    try {
      if (typeof window !== 'undefined') {
        const browserLang = navigator.language.split('-')[0];
        const language = languages.find(l => l.code === browserLang);
        if (language) return language;
      }
    } catch (_error) {
      console.log('Could not detect browser language');
    }
    return languages[0]; // Default to English
  };

  const [selectedCurrency, setSelectedCurrency] = usePersistentState<Currency>('selectedCurrency', currencies[1]); // Default to USD
  const [selectedLanguage, setSelectedLanguage] = usePersistentState<Language>('selectedLanguage', getPreferredLanguage()); // Use browser language
  const [exchangeRates, setExchangeRates] = useState<{ [key: string]: number }>({});
  const [isLoading, setIsLoading] = useState(true);

  // Fetch exchange rates on mount and every hour
  useEffect(() => {
    const loadExchangeRates = async () => {
      setIsLoading(true);
      const rates = await fetchExchangeRates();
      setExchangeRates(rates);
      setIsLoading(false);
    };

    loadExchangeRates();
    
    // Update rates every hour
    const interval = setInterval(loadExchangeRates, 60 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const convertPrice = useCallback((priceInUsd: number): number => {
    // If USD is selected, return as-is (no conversion needed)
    if (selectedCurrency.code === 'USD') {
      return priceInUsd;
    }
    
    // Get exchange rates (these are EUR-based from the API)
    const usdRate = exchangeRates['USD'] || 1.08; // USD rate against EUR
    const targetRate = exchangeRates[selectedCurrency.code] || 1; // Target currency rate against EUR
    
    // Convert USD to target currency via EUR
    // Formula: USD -> EUR -> Target Currency
    const eurValue = priceInUsd / usdRate; // Convert USD to EUR first
    const targetValue = eurValue * targetRate; // Convert EUR to target currency
    
    return targetValue;
  }, [exchangeRates, selectedCurrency.code]);

  const formatPrice = useCallback((priceInUsd: number): string => {
    const convertedPrice = convertPrice(priceInUsd);
    
    const getLocale = (currencyCode: string): string => {
      const localeMap: { [key: string]: string } = {
        USD: 'en-US', EUR: 'de-DE', GBP: 'en-GB', JPY: 'ja-JP', INR: 'en-IN',
        AUD: 'en-AU', CAD: 'en-CA', CHF: 'de-CH', CNY: 'zh-CN', SEK: 'sv-SE',
        NZD: 'en-NZ', MXN: 'es-MX', SGD: 'en-SG', HKD: 'en-HK', NOK: 'no-NO',
        KRW: 'ko-KR', TRY: 'tr-TR', RUB: 'ru-RU', BRL: 'pt-BR', ZAR: 'en-ZA',
        DKK: 'da-DK', PLN: 'pl-PL', CZK: 'cs-CZ', HUF: 'hu-HU', RON: 'ro-RO',
        BGN: 'bg-BG', HRK: 'hr-HR', ISK: 'is-IS', THB: 'th-TH', MYR: 'ms-MY',
        PHP: 'en-PH', IDR: 'id-ID', VND: 'vi-VN',
      };
      return localeMap[currencyCode] || 'en-US';
    };

    try {
      const formatter = new Intl.NumberFormat(getLocale(selectedCurrency.code), {
        style: 'currency',
        currency: selectedCurrency.code,
        minimumFractionDigits: ['JPY', 'KRW', 'VND', 'IDR'].includes(selectedCurrency.code) ? 0 : 2,
        maximumFractionDigits: ['JPY', 'KRW', 'VND', 'IDR'].includes(selectedCurrency.code) ? 0 : 2,
      });

      return formatter.format(convertedPrice);
    } catch (_error) {
      const decimals = ['JPY', 'KRW', 'VND', 'IDR'].includes(selectedCurrency.code) ? 0 : 2;
      const formattedNumber = convertedPrice.toLocaleString('en-US', { 
        minimumFractionDigits: decimals, 
        maximumFractionDigits: decimals 
      });
      return `${selectedCurrency.symbol}${formattedNumber}`;
    }
  }, [selectedCurrency, convertPrice]);

  const formatPriceRange = useCallback((minPrice: number, maxPrice: number): string => {
    if (minPrice === maxPrice) {
      return formatPrice(minPrice);
    }
    return `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}`;
  }, [formatPrice]);

  const formatDiscount = useCallback((originalPrice: number, discountedPrice: number): string => {
    if (originalPrice <= discountedPrice) return '';
    const discountPercent = Math.round(((originalPrice - discountedPrice) / originalPrice) * 100);
    return `-${discountPercent}%`;
  }, []);

  const getCurrencySymbol = useCallback((): string => {
    return selectedCurrency.symbol;
  }, [selectedCurrency.symbol]);

  const formatNumber = useCallback((number: number): string => {
    const getLocale = (): string => {
      const localeMap: { [key: string]: string } = {
        en: 'en-US', es: 'es-ES', fr: 'fr-FR', de: 'de-DE', it: 'it-IT',
        pt: 'pt-PT', nl: 'nl-NL', da: 'da-DK', sv: 'sv-SE', no: 'no-NO',
        fi: 'fi-FI', ru: 'ru-RU', ja: 'ja-JP', ko: 'ko-KR', zh: 'zh-CN',
        ar: 'ar-SA', hi: 'hi-IN', pl: 'pl-PL', tr: 'tr-TR', he: 'he-IL',
      };
      return localeMap[selectedLanguage.code] || 'en-US';
    };

    try {
      return new Intl.NumberFormat(getLocale()).format(number);
    } catch (_error) {
      return number.toLocaleString('en-US');
    }
  }, [selectedLanguage]);

  const formatDate = useCallback((date: Date | string): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    const getLocale = (): string => {
      const localeMap: { [key: string]: string } = {
        en: 'en-US', es: 'es-ES', fr: 'fr-FR', de: 'de-DE', it: 'it-IT',
        pt: 'pt-PT', nl: 'nl-NL', da: 'da-DK', sv: 'sv-SE', no: 'no-NO',
        fi: 'fi-FI', ru: 'ru-RU', ja: 'ja-JP', ko: 'ko-KR', zh: 'zh-CN',
        ar: 'ar-SA', hi: 'hi-IN', pl: 'pl-PL', tr: 'tr-TR', he: 'he-IL',
      };
      return localeMap[selectedLanguage.code] || 'en-US';
    };

    try {
      return new Intl.DateTimeFormat(getLocale(), {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(dateObj);
    } catch (_error) {
      return dateObj.toLocaleDateString('en-US');
    }
  }, [selectedLanguage]);
  
  const formatSavings = useCallback((savings: number): string => {
    return `Save ${formatPrice(savings)}`;
  }, [formatPrice]);

  return (
    <SettingsContext.Provider value={{
      selectedCurrency,
      setSelectedCurrency,
      selectedLanguage,
      setSelectedLanguage,
      formatPrice,
      formatNumber,
      formatDate,
      exchangeRates,
      isLoading,
      // Enhanced methods
      formatPriceRange,
      formatDiscount,
      formatSavings,
      getCurrencySymbol,
      convertPrice,
    }}>
      {children}
    </SettingsContext.Provider>
  );
}