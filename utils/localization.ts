// utils/localization.ts
import { Currency, Language } from '@/types';

export const currencies: Currency[] = [
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'USD', name: 'United States Dollar', symbol: '$' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
    { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
    { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
    { code: 'MXN', name: 'Mexican Peso', symbol: '$' },
    { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
    { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
    { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
    { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
    { code: 'TRY', name: 'Turkish Lira', symbol: '₺' },
    { code: 'RUB', name: 'Russian Ruble', symbol: '₽' },
    { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
    { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
    { code: 'DKK', name: 'Danish Krone', symbol: 'kr.' },
    { code: 'PLN', name: 'Polish Złoty', symbol: 'zł' },
    { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč' },
    { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft' },
    { code: 'RON', name: 'Romanian Leu', symbol: 'lei' },
    { code: 'BGN', name: 'Bulgarian Lev', symbol: 'лв' },
    { code: 'HRK', name: 'Croatian Kuna', symbol: 'kn' },
    { code: 'ISK', name: 'Icelandic Króna', symbol: 'kr' },
    { code: 'THB', name: 'Thai Baht', symbol: '฿' },
    { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
    { code: 'PHP', name: 'Philippine Peso', symbol: '₱' },
    { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp' },
    { code: 'VND', name: 'Vietnamese Đồng', symbol: '₫' },
];

export const languages: Language[] = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'es', name: 'Spanish', nativeName: 'Español' },
    { code: 'fr', name: 'French', nativeName: 'Français' },
    { code: 'de', name: 'German', nativeName: 'Deutsch' },
    { code: 'it', name: 'Italian', nativeName: 'Italiano' },
    { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
    { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
    { code: 'da', name: 'Danish', nativeName: 'Dansk' },
    { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
    { code: 'no', name: 'Norwegian', nativeName: 'Norsk' },
    { code: 'fi', name: 'Finnish', nativeName: 'Suomi' },
    { code: 'ru', name: 'Russian', nativeName: 'Русский' },
    { code: 'ja', name: 'Japanese', nativeName: '日本語' },
    { code: 'ko', name: 'Korean', nativeName: '한국어' },
    { code: 'zh', name: 'Chinese', nativeName: '中文' },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
    { code: 'pl', name: 'Polish', nativeName: 'Polski' },
    { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
    { code: 'he', name: 'Hebrew', nativeName: 'עברית' },
    { code: 'cs', name: 'Czech', nativeName: 'Čeština' },
    { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina' },
    { code: 'hu', name: 'Hungarian', nativeName: 'Magyar' },
    { code: 'ro', name: 'Romanian', nativeName: 'Română' },
    { code: 'bg', name: 'Bulgarian', nativeName: 'Български' },
    { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski' },
    { code: 'sr', name: 'Serbian', nativeName: 'Српски' },
    { code: 'sl', name: 'Slovenian', nativeName: 'Slovenščina' },
    { code: 'et', name: 'Estonian', nativeName: 'Eesti' },
    { code: 'lv', name: 'Latvian', nativeName: 'Latviešu' },
    { code: 'lt', name: 'Lithuanian', nativeName: 'Lietuvių' },
    { code: 'is', name: 'Icelandic', nativeName: 'Íslenska' },
    { code: 'mt', name: 'Maltese', nativeName: 'Malti' },
    { code: 'th', name: 'Thai', nativeName: 'ไทย' },
    { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
    { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu' },
    { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
    { code: 'tl', name: 'Filipino', nativeName: 'Filipino' },
];

// Currency-to-country mapping for better UX
export const currencyCountries: { [key: string]: string[] } = {
  EUR: ['Germany', 'France', 'Spain', 'Italy', 'Netherlands'],
  USD: ['United States', 'Canada'],
  GBP: ['United Kingdom'],
  JPY: ['Japan'],
  AUD: ['Australia'],
  CAD: ['Canada'],
  CHF: ['Switzerland'],
  CNY: ['China'],
  SEK: ['Sweden'],
  NOK: ['Norway'],
  DKK: ['Denmark'],
  PLN: ['Poland'],
  CZK: ['Czech Republic'],
  HUF: ['Hungary'],
  INR: ['India'],
  KRW: ['South Korea'],
  THB: ['Thailand'],
  SGD: ['Singapore'],
  MYR: ['Malaysia'],
  HKD: ['Hong Kong'],
};

// Language-to-country mapping
export const languageCountries: { [key: string]: string[] } = {
  en: ['United States', 'United Kingdom', 'Canada', 'Australia'],
  es: ['Spain', 'Mexico', 'Argentina', 'Colombia'],
  fr: ['France', 'Canada', 'Belgium', 'Switzerland'],
  de: ['Germany', 'Austria', 'Switzerland'],
  it: ['Italy', 'Switzerland'],
  pt: ['Portugal', 'Brazil'],
  nl: ['Netherlands', 'Belgium'],
  da: ['Denmark'],
  sv: ['Sweden'],
  no: ['Norway'],
  fi: ['Finland'],
  ru: ['Russia'],
  ja: ['Japan'],
  ko: ['South Korea'],
  zh: ['China', 'Taiwan', 'Hong Kong'],
  ar: ['Saudi Arabia', 'UAE', 'Egypt'],
  hi: ['India'],
  pl: ['Poland'],
  tr: ['Turkey'],
  he: ['Israel'],
};

// Get user's preferred currency based on location (if available)
export const getPreferredCurrency = async (): Promise<Currency> => {
  try {
    // Try to get user's location
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    const countryCode = data.country_code;
    
    // Map country codes to currencies
    const countryToCurrency: { [key: string]: string } = {
      US: 'USD', CA: 'CAD', GB: 'GBP', JP: 'JPY', AU: 'AUD',
      DE: 'EUR', FR: 'EUR', ES: 'EUR', IT: 'EUR', NL: 'EUR',
      CH: 'CHF', CN: 'CNY', SE: 'SEK', NO: 'NOK', DK: 'DKK',
      PL: 'PLN', CZ: 'CZK', HU: 'HUF', IN: 'INR', KR: 'KRW',
      TH: 'THB', SG: 'SGD', MY: 'MYR', HK: 'HKD', BR: 'BRL',
    };
    
    const currencyCode = countryToCurrency[countryCode];
    if (currencyCode) {
      const currency = currencies.find(c => c.code === currencyCode);
      if (currency) return currency;
    }
  } catch (_error) {
    console.log('Could not detect location for currency preference');
  }
  
  // Default to EUR
  return currencies.find(c => c.code === 'EUR') || currencies[0];
};

// Get user's preferred language based on browser settings
export const getPreferredLanguage = (): Language => {
  try {
    const browserLang = navigator.language.split('-')[0];
    const language = languages.find(l => l.code === browserLang);
    if (language) return language;
  } catch (_error) {
    console.log('Could not detect browser language');
  }
  
  // Default to English
  return languages.find(l => l.code === 'en') || languages[0];
};

// Format currency with proper locale
export const formatCurrencyWithLocale = (
  amount: number, 
  currency: Currency, 
  language: Language
): string => {
  const getLocale = (): string => {
    // Try to match language with currency locale
    const localeMap: { [key: string]: { [key: string]: string } } = {
      USD: { en: 'en-US', es: 'es-US' },
      EUR: { en: 'en-DE', de: 'de-DE', fr: 'fr-FR', es: 'es-ES', it: 'it-IT' },
      GBP: { en: 'en-GB' },
      JPY: { en: 'en-JP', ja: 'ja-JP' },
      // Add more combinations as needed
    };
    
    return localeMap[currency.code]?.[language.code] || `${language.code}-${currency.code}` || 'en-US';
  };

  try {
    return new Intl.NumberFormat(getLocale(), {
      style: 'currency',
      currency: currency.code,
      minimumFractionDigits: currency.code === 'JPY' || currency.code === 'KRW' ? 0 : 2,
      maximumFractionDigits: currency.code === 'JPY' || currency.code === 'KRW' ? 0 : 2,
    }).format(amount);
  } catch (_error) {
    // Fallback to simple formatting
    const decimals = currency.code === 'JPY' || currency.code === 'KRW' ? 0 : 2;
    return `${currency.symbol}${amount.toLocaleString('en-US', { 
      minimumFractionDigits: decimals, 
      maximumFractionDigits: decimals 
    })}`;
  }
};