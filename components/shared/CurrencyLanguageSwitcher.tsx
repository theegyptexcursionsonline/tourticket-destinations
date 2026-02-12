// components/shared/CurrencyLanguageSwitcher.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { X, Search, Globe, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettings } from '@/hooks/useSettings';
import { Currency, Language } from '@/types';
import { currencies, languages, currencyCountries, languageCountries } from '@/utils/localization';

// =================================================================
// --- REUSABLE MODAL COMPONENT ---
// =================================================================
interface Item { code: string; name: string; [key: string]: any; }
interface SettingsModalProps<T extends Item> {
  isOpen: boolean; onClose: () => void; title: string; items: T[];
  selectedItem: T; onSelectItem: (item: T) => void; renderItem: (item: T) => React.ReactNode;
  searchPlaceholder?: string; showCountries?: boolean;
}

const SettingsModal = <T extends Item>({ 
  isOpen, onClose, title, items, selectedItem, onSelectItem, renderItem, 
  searchPlaceholder = "Search...", showCountries = false 
}: SettingsModalProps<T>) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredItems, setFilteredItems] = useState<T[]>(items);

  // Filter items based on search term
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

  // Get countries for currency/language
  const getCountriesForItem = (item: T): string[] => {
    if (showCountries) {
      const isLanguage = 'nativeName' in item;
      if (isLanguage) {
        return languageCountries[item.code] || [];
      } else {
        return currencyCountries[item.code] || [];
      }
    }
    return [];
  };

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
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b bg-slate-50">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
                <p className="text-sm text-slate-600 mt-1">
                  {filteredItems.length} of {items.length} options
                </p>
              </div>
              <button 
                onClick={onClose} 
                className="p-2 text-slate-500 hover:bg-slate-200 rounded-full transition-colors" 
                aria-label="Close"
              >
                <X size={24} />
              </button>
            </div>
            
            {/* Search */}
            <div className="p-6 border-b bg-white">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input 
                  type="text" 
                  placeholder={searchPlaceholder}
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)} 
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                />
              </div>
            </div>
            
            {/* Items Grid */}
            <div className="flex-1 overflow-y-auto p-6">
              {filteredItems.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-slate-400 text-lg mb-2">No results found</div>
                  <div className="text-slate-500 text-sm">Try adjusting your search terms</div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredItems.map(item => {
                    const countries = getCountriesForItem(item);
                    return (
                      <button 
                        key={item.code} 
                        onClick={() => { onSelectItem(item); onClose(); }} 
                        className={`p-4 rounded-lg text-left transition-all duration-200 hover:scale-105 ${
                          selectedItem.code === item.code
                            ? 'bg-red-500 text-white shadow-lg transform scale-105'
                            : 'bg-slate-100 hover:bg-slate-200 hover:shadow-md text-slate-800'
                        }`}
                      >
                        <div className="space-y-2">
                          {renderItem(item)}
                          {countries.length > 0 && (
                            <div className={`text-xs ${
                              selectedItem.code === item.code ? 'text-red-100' : 'text-slate-500'
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
  isTransparent = false 
}: CurrencyLanguageSwitcherProps) {
  const [isCurrencyModalOpen, setCurrencyModalOpen] = useState(false);
  const [isLanguageModalOpen, setLanguageModalOpen] = useState(false);
  
  const { 
    selectedCurrency, 
    setSelectedCurrency, 
    selectedLanguage, 
    setSelectedLanguage,
    isLoading,
    t
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
        
        {/* Language Button */}
        <button
          onClick={() => setLanguageModalOpen(true)}
          className={
            variant === 'header'
              ? `${headerLinkClasses} ${baseButtonClasses} flex items-center gap-1.5 group ${isTransparent ? transparentBgClasses : ''}`
              : "inline-flex h-8 items-center rounded-md border border-slate-300 px-3 hover:bg-slate-200 text-slate-700 text-sm"
          }
        >
          {variant === 'header' && <Globe size={20} className="group-hover:text-red-500" />}
          <span>
            {variant === 'header'
              ? selectedLanguage.code.toUpperCase()
              : `${selectedLanguage.name} (${selectedLanguage.code.toUpperCase()})`
            }
          </span>
        </button>
      </div>

      {/* Currency Modal */}
      <SettingsModal
        isOpen={isCurrencyModalOpen}
        onClose={() => setCurrencyModalOpen(false)}
        title={t('currency.title')}
        searchPlaceholder="Search currencies..."
        items={currencies}
        selectedItem={selectedCurrency}
        onSelectItem={(item) => setSelectedCurrency(item as Currency)}
        showCountries={true}
        renderItem={(item) => (
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
        )}
      />
      
      {/* Language Modal */}
      <SettingsModal
        isOpen={isLanguageModalOpen}
        onClose={() => setLanguageModalOpen(false)}
        title={t('language.title')}
        searchPlaceholder="Search languages..."
        items={languages}
        selectedItem={selectedLanguage}
        onSelectItem={(item) => setSelectedLanguage(item as Language)}
        showCountries={true}
        renderItem={(item) => (
          <div>
            <div className="font-bold mb-1">{item.name}</div>
            <div className="text-sm text-slate-600 line-clamp-1">{item.nativeName}</div>
          </div>
        )}
      />
    </>
  );
}