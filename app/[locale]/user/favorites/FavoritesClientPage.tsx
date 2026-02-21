'use client';

import React from 'react';
import { Link } from '@/i18n/navigation';
import { useWishlist } from '@/contexts/WishlistContext';
import { UserTourCard } from '@/components/user/TourCard';
import { Heart, Compass } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';

export default function FavoritesClientPage() {
  const { wishlist, removeFromWishlist } = useWishlist();
  const t = useTranslations();

  return (
    <div>
      <div className="bg-white rounded-xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-sm border border-slate-100 mb-6 sm:mb-8">
        <h1 className="text-3xl font-bold text-slate-900">{t('user.myWishlist')}</h1>
        <p className="mt-2 text-slate-600">
          {t('wishlist.emptyDescription')}
        </p>
      </div>

      <AnimatePresence>
        {wishlist.length > 0 ? (
          <motion.div 
            className="space-y-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {wishlist.map((tour) => (
              <UserTourCard key={tour._id} tour={tour} onRemove={removeFromWishlist} />
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center py-12 sm:py-20 bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-100"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-slate-100 flex items-center justify-center">
              <Heart size={32} className="text-slate-400" />
            </div>
            <h2 className="text-2xl font-semibold text-slate-700 mb-2">{t('wishlist.empty')}</h2>
            <p className="text-slate-500 mb-6 max-w-sm mx-auto">
              {t('wishlist.emptyDescription')}
            </p>
            <Link
              href="/search"
              className="inline-flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              <Compass size={16} />
              {t('wishlist.exploreTours')}
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
