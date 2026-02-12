'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Import from the existing utils and hooks
import { currencies, languages } from '@/utils/localization';
import { useSettings } from '@/hooks/useSettings';
import { Currency, Language } from '@/types';

// --- REUSABLE MODAL COMPONENT WITH PORTAL ---
interface Item { 
  code: string; 
  name: string; 
  [key: string]: any; 
}

interface SettingsModalProps<T extends Item> {
  isOpen: boolean; 
  onClose: () => void; 
  title: string; 
  items: T[];
  selectedItem: T; 
  onSelectItem: (item: T) => void; 
  renderItem: (item: T) => React.ReactNode;
}

const SettingsModal = <T extends Item>({ 
  isOpen, 
  onClose, 
  title, 
  items, 
  selectedItem, 
  onSelectItem, 
  renderItem 
}: SettingsModalProps<T>) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => setSearchTerm(''), 300);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (target && target.closest('.settings-modal-content')) {
        return;
      }
      onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  const filteredItems = items.filter(item => 
    Object.values(item).some(value => 
      String(value).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-start justify-center p-4"
        >
          <motion.div 
            initial={{ y: -50, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            exit={{ y: -50, opacity: 0 }} 
            transition={{ duration: 0.3, ease: 'easeInOut' }} 
            className="settings-modal-content relative bg-white shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh] rounded-lg" 
          >
            <button 
              onClick={onClose} 
              className="absolute top-4 right-4 p-2 text-slate-500 hover:bg-slate-100 rounded-full z-10" 
              aria-label="Close"
            >
              <X size={24} />
            </button>
            
            <div className="flex items-center p-6 border-b">
              <div className="relative flex-1">
                <Search className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-400" />
                <input 
                  type="text" 
                  placeholder={`Search ${title}...`} 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)} 
                  className="w-full text-xl pl-10 bg-transparent focus:outline-none" 
                />
              </div>
            </div>
            
            <div className="overflow-y-auto p-6">
              <h2 className="text-2xl font-bold text-slate-800 mb-6">{title}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {filteredItems.map(item => (
                  <button 
                    key={item.code} 
                    onClick={() => { 
                      onSelectItem(item); 
                      onClose(); 
                    }} 
                    className={`p-4 rounded-lg text-left transition-colors duration-200 ${
                      selectedItem.code === item.code
                        ? 'bg-red-500 text-white shadow'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                    }`}
                  >
                    {renderItem(item)}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (!isMounted) return null;

  return createPortal(modalContent, document.body);
};

// --- MAIN SWITCHER COMPONENT (EXPORTED) ---
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
  
  // Use the real settings context
  const { selectedCurrency, setSelectedCurrency, selectedLanguage, setSelectedLanguage } = useSettings();

  const baseButtonClasses = "p-2 rounded-md transition-all duration-300";
  const transparentBgClasses = "bg-white/10 hover:bg-white/20 backdrop-blur-sm";

  return (
    <>
      <div className={variant === 'header' ? 'flex items-center gap-2 font-semibold text-sm' : 'flex items-center gap-4'}>
        <button 
          onClick={() => setCurrencyModalOpen(true)} 
          className={
            variant === 'header' 
              ? `${headerLinkClasses} ${baseButtonClasses} hidden sm:inline-flex items-center gap-1.5 ${isTransparent ? transparentBgClasses : ''}` 
              : "inline-flex h-8 items-center rounded-md border border-slate-300 px-3 hover:bg-slate-200 text-sm"
          }
        >
          <span className="font-bold">{selectedCurrency.symbol}</span>
          <span>{selectedCurrency.code}</span>
        </button>
        
        <button 
          onClick={() => setLanguageModalOpen(true)} 
          className={
            variant === 'header' 
              ? `${headerLinkClasses} ${baseButtonClasses} flex items-center gap-1.5 group ${isTransparent ? transparentBgClasses : ''}` 
              : "inline-flex h-8 items-center rounded-md border border-slate-300 px-3 hover:bg-slate-200 text-sm"
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

      <SettingsModal
        isOpen={isCurrencyModalOpen}
        onClose={() => setCurrencyModalOpen(false)}
        title="Select a Currency"
        items={currencies}
        selectedItem={selectedCurrency}
        onSelectItem={(item) => setSelectedCurrency(item as Currency)}
        renderItem={(item) => (
          <>
            <div className="font-bold">{item.code} <span className="font-normal">{item.symbol}</span></div>
            <div className="text-sm opacity-80">{item.name}</div>
          </>
        )}
      />
      
      <SettingsModal
        isOpen={isLanguageModalOpen}
        onClose={() => setLanguageModalOpen(false)}
        title="Select a Language"
        items={languages}
        selectedItem={selectedLanguage}
        onSelectItem={(item) => setSelectedLanguage(item as Language)}
        renderItem={(item) => (
          <>
            <div className="font-bold">{item.name}</div>
            <div className="text-sm opacity-80">{item.nativeName}</div>
          </>
        )}
      />
    </>
  );
}