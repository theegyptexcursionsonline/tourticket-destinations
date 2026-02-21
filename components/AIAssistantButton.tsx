'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import SearchModal from './SearchModel';

export default function AIAssistantButton() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleOpenSearch = () => {
    setIsSearchOpen(true);
  };

  const handleCloseSearch = () => {
    setIsSearchOpen(false);
  };

  return (
    <>
      {/* AI Assistant Button - Fixed on Bottom Left with Mobile Optimization */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.4, type: "spring" }}
        className="hidden md:block fixed bottom-4 start-4 sm:bottom-6 sm:start-6 z-30"
      >
        <motion.button
          onClick={handleOpenSearch}
          className="group relative w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-red-500 via-red-600 to-orange-500 text-white rounded-full shadow-xl flex items-center justify-center hover:shadow-2xl transition-all"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Open AI Travel Assistant"
        >
          {/* Icon with better mobile sizing */}
          <div className="relative z-10">
            <Sparkles size={24} className="sm:w-7 sm:h-7 animate-pulse" strokeWidth={2.5} />
          </div>

          {/* Tooltip - Hidden on mobile, shown on desktop */}
          <div className="hidden sm:block absolute start-full ms-3 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            AI Travel Assistant
            <div className="absolute end-full top-1/2 -translate-y-1/2 border-8 border-transparent border-r-slate-900"></div>
          </div>

          {/* Animated Pulse Ring */}
          <motion.div
            className="absolute inset-0 rounded-full bg-red-400 opacity-75"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.75, 0, 0.75]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />

          {/* Gradient Glow */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-red-400 to-orange-400 blur-md opacity-60 animate-pulse"></div>
        </motion.button>

        {/* AI Badge - Better mobile visibility */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.7, type: "spring" }}
          className="absolute -top-1 -end-1 sm:-top-2 sm:-end-2 bg-white text-red-600 text-[10px] sm:text-xs font-bold px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full shadow-lg border-2 border-red-100"
        >
          AI
        </motion.div>

        {/* Mobile-only text label below button */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="sm:hidden absolute top-full start-1/2 -translate-x-1/2 mt-2 text-[10px] font-semibold text-slate-700 bg-white px-2 py-1 rounded-full shadow-md whitespace-nowrap"
        >
          AI Assistant
        </motion.div>
      </motion.div>

      {/* Search Modal */}
      <AnimatePresence>
        {isSearchOpen && (
          <SearchModal
            onClose={handleCloseSearch}
            onSearch={(term) => {
              console.log('Search term:', term);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
