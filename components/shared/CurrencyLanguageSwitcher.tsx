// components/shared/CurrencyLanguageSwitcher.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Globe, Loader2, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettings } from '@/hooks/useSettings';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import { Currency } from '@/types';
import { currencies, currencyCountries } from '@/utils/localization';
import { routing } from '@/i18n/routing';

// Locale display data
const LOCALE_DATA: Record<string, { name: string; nativeName: string; flag: string }> = {
  en: { name: 'English', nativeName: 'English', flag: '🇬🇧' },
  ar: { name: 'Arabic', nativeName: 'العربية', flag: '🇪🇬' },
  ru: { name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  de: { name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
};

// =================================================================
// --- CURRENCY MODAL COMPONENT ---
// =================================================================
interface CurrencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  currencies: Currency[];
  selectedCurrency: Currency;
  onSelectCurrency: (currency: Currency) => void;
  isLoading: boolean;
}

const CurrencyModal: React.FC<CurrencyModalProps> = ({
  isOpen, onClose, title, currencies: items, selectedCurrency, onSelectCurrency, isLoading,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredItems, setFilteredItems] = useState<Currency[]>(items);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredItems(items);
    } else {
      const filtered = items.filter(item =>
        Object.values(item).some(value =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
      setFilteredItems(filtered);
    }
  }, [searchTerm, items]);

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => setSearchTerm(''), 300);
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-md flex items-start justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="relative bg-white text-slate-900 shadow-2xl w-full max-w-6xl flex flex-col max-h-[90vh] rounded-lg overflow-hidden mt-20"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b bg-slate-50">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
                <p className="text-sm text-slate-600 mt-1">
                  {filteredItems.length} of {items.length} options
                </p>
              </div>
              <button onClick={onClose} className="p-2 text-slate-500 hover:bg-slate-200 rounded-full transition-colors" aria-label="Close">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 border-b bg-white">
              <div className="relative">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search currencies..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full ps-10 pe-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {filteredItems.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-slate-400 text-lg mb-2">No results found</div>
                  <div className="text-slate-500 text-sm">Try adjusting your search terms</div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredItems.map(item => {
                    const countries = currencyCountries[item.code] || [];
                    return (
                      <button
                        key={item.code}
                        onClick={() => { onSelectCurrency(item); onClose(); }}
                        className={`p-4 rounded-lg text-start transition-all duration-200 hover:scale-105 ${
                          selectedCurrency.code === item.code
                            ? 'bg-red-500 text-white shadow-lg transform scale-105'
                            : 'bg-slate-100 hover:bg-slate-200 hover:shadow-md text-slate-800'
                        }`}
                      >
                        <div className="space-y-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-lg">{item.symbol}</span>
                              <span className="font-bold">{item.code}</span>
                              {isLoading && selectedCurrency.code === item.code && (
                                <Loader2 size={14} className="animate-spin" />
                              )}
                            </div>
                            <div className="text-sm text-slate-600 line-clamp-1">{item.name}</div>
                          </div>
                          {countries.length > 0 && (
                            <div className={`text-xs ${
                              selectedCurrency.code === item.code ? 'text-red-100' : 'text-slate-500'
                            }`}>
                              Used in: {countries.slice(0, 2).join(', ')}
                              {countries.length > 2 && ` +${countries.length - 2} more`}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// =================================================================
// --- LANGUAGE DROPDOWN (LOCALE-AWARE) ---
// =================================================================
const LanguageDropdown: React.FC<{
  variant: 'header' | 'footer';
  headerLinkClasses?: string;
  isTransparent?: boolean;
}> = ({ variant, headerLinkClasses, isTransparent = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const currentLocaleData = LOCALE_DATA[locale] || LOCALE_DATA.en;

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const switchLocale = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale });
    setIsOpen(false);
  };

  const baseButtonClasses = "p-2 rounded-md transition-all duration-300";
  const transparentBgClasses = "bg-white/10 hover:bg-white/20 backdrop-blur-sm";

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={
          variant === 'header'
            ? `${headerLinkClasses} ${baseButtonClasses} flex items-center gap-1.5 group ${isTransparent ? transparentBgClasses : ''}`
            : "inline-flex h-8 items-center rounded-md border border-slate-300 px-3 hover:bg-slate-200 text-slate-700 text-sm"
        }
      >
        {variant === 'header' && <Globe size={20} className="group-hover:text-red-500" />}
        <span>{locale.toUpperCase()}</span>
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.15 }}
            className="absolute end-0 top-full mt-2 w-48 bg-white rounded-lg shadow-xl border py-1 z-50"
          >
            {routing.locales.map((loc) => {
              const data = LOCALE_DATA[loc];
              if (!data) return null;
              const isActive = locale === loc;
              return (
                <button
                  key={loc}
                  onClick={() => switchLocale(loc)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-start transition-colors ${
                    isActive
                      ? 'bg-slate-100 text-slate-900 font-semibold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-lg">{data.flag}</span>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{data.nativeName}</div>
                    <div className="text-xs text-slate-500">{data.name}</div>
                  </div>
                  {isActive && (
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// =================================================================
// --- MAIN SWITCHER COMPONENT ---
// =================================================================
interface CurrencyLanguageSwitcherProps {
  variant: 'header' | 'footer';
  headerLinkClasses?: string;
  isTransparent?: boolean;
}

export default function CurrencyLanguageSwitcher({
  variant,
  headerLinkClasses,
  isTransparent = false,
}: CurrencyLanguageSwitcherProps) {
  const [isCurrencyModalOpen, setCurrencyModalOpen] = useState(false);
  const t = useTranslations();

  const {
    selectedCurrency,
    setSelectedCurrency,
    isLoading,
  } = useSettings();

  const baseButtonClasses = "p-2 rounded-md transition-all duration-300";
  const transparentBgClasses = "bg-white/10 hover:bg-white/20 backdrop-blur-sm";

  return (
    <>
      <div className={variant === 'header' ? 'flex items-center gap-2 font-semibold text-sm' : 'flex items-center gap-4'}>
        {/* Currency Button */}
        <button
          onClick={() => setCurrencyModalOpen(true)}
          disabled={isLoading}
          className={
            variant === 'header'
              ? `${headerLinkClasses} ${baseButtonClasses} hidden sm:inline-flex items-center gap-1.5 ${isTransparent ? transparentBgClasses : ''} disabled:opacity-50`
              : "inline-flex h-8 items-center rounded-md border border-slate-300 px-3 hover:bg-slate-200 text-slate-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          }
        >
          {isLoading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <>
              <span className="font-bold">{selectedCurrency.symbol}</span>
              <span>{selectedCurrency.code}</span>
            </>
          )}
        </button>

        {/* Language Dropdown (locale-aware) */}
        <LanguageDropdown
          variant={variant}
          headerLinkClasses={headerLinkClasses}
          isTransparent={isTransparent}
        />
      </div>

      {/* Currency Modal */}
      <CurrencyModal
        isOpen={isCurrencyModalOpen}
        onClose={() => setCurrencyModalOpen(false)}
        title={t('currency.title')}
        currencies={currencies}
        selectedCurrency={selectedCurrency}
        onSelectCurrency={(item) => setSelectedCurrency(item)}
        isLoading={isLoading}
      />
    </>
  );
}
