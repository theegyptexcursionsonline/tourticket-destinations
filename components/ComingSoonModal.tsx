'use client';

import { FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Building2 } from 'lucide-react';

interface ComingSoonModalProps {
  isOpen: boolean;
  onClose: () => void;
  destination: string;
}

const ComingSoonModal: FC<ComingSoonModalProps> = ({ isOpen, onClose, destination }) => {
  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const modalVariants: any = {
    hidden: { scale: 0.9, opacity: 0 },
    visible: { scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 25 } },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial="hidden"
          animate="visible"
          exit="hidden"
        >
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            variants={backdropVariants}
            onClick={onClose}
          />
          <motion.div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md text-center p-8"
            variants={modalVariants}
          >
            <button
              onClick={onClose}
              className="absolute top-4 end-4 p-2 rounded-full text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <X size={24} />
            </button>
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-blue-100 text-blue-600 rounded-full">
                <Building2 size={40} />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Coming Soon!</h2>
            <p className="text-slate-600 mt-2">
              We're working hard to bring you exciting tours and tickets for <span className="font-bold">{destination}</span>.
            </p>
            <p className="text-sm text-slate-500 mt-4">
              Please check back later!
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ComingSoonModal;
