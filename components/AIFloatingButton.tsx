'use client';

import { Bot } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * Floating AI chat button that triggers the unified AI Search Widget
 * Opens directly in AI Agent mode
 */
export default function AIFloatingButton() {
  const handleClick = () => {
    // Dispatch custom event to open AI agent mode in unified widget
    const event = new CustomEvent('openAIAgent', {
      detail: { query: '' }
    });
    window.dispatchEvent(event);
  };

  return (
    <motion.button
      onClick={handleClick}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 1, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      className="fixed bottom-6 end-6 z-[9998] w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300"
      style={{
        background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
        boxShadow: '0 8px 24px -4px rgba(59, 130, 246, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.2) inset',
      }}
      aria-label="Open AI Assistant"
    >
      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 rounded-full"
        animate={{
          boxShadow: [
            '0 0 0 0 rgba(59, 130, 246, 0.4)',
            '0 0 0 12px rgba(59, 130, 246, 0)',
          ],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Icon */}
      <motion.div
        animate={{
          rotate: [0, 5, -5, 0],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <Bot className="w-7 h-7 md:w-8 md:h-8 text-white relative z-10" strokeWidth={2.5} />
      </motion.div>

      {/* Shine effect */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-t from-white/20 to-transparent" />
    </motion.button>
  );
}
