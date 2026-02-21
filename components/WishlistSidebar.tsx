'use client';

import { useWishlist } from '@/contexts/WishlistContext';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { useSettings } from '@/hooks/useSettings';
import { useTranslations } from 'next-intl';

export default function WishlistSidebar() {
  const { isWishlistSidebarOpen, closeWishlistSidebar, wishlist, removeFromWishlist } = useWishlist();
  const { formatPrice } = useSettings();
  const t = useTranslations();

  return (
    <AnimatePresence>
      {isWishlistSidebarOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/60 z-50"
            onClick={closeWishlistSidebar}
            aria-hidden="true"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed top-0 end-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-labelledby="wishlist-heading"
          >
            <div className="flex items-center justify-between p-6 border-b">
              <h2 id="wishlist-heading" className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Star className="text-yellow-500" />
                {t('wishlist.title')}
              </h2>
              <button
                onClick={closeWishlistSidebar}
                className="p-2 rounded-full text-slate-500 hover:bg-slate-100 transition-colors"
                aria-label={t('common.close')}
              >
                <X size={24} />
              </button>
            </div>

            {wishlist.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                <Star size={48} className="text-slate-300 mb-4" />
                <h3 className="font-bold text-lg text-slate-700">{t('wishlist.empty')}</h3>
                <p className="text-slate-500 mt-2">{t('wishlist.emptyDescription')}</p>
                <Link
                  href="/search"
                  onClick={closeWishlistSidebar}
                  className="mt-6 bg-red-600 text-white font-bold py-3 px-6 rounded-full hover:bg-red-700 transition-colors"
                >
                  {t('wishlist.exploreTours')}
                </Link>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {wishlist.map((tour) => (
                  <div key={tour._id} className="flex gap-4 items-start">
                    <Link href={`/${tour.slug}`} onClick={closeWishlistSidebar} className="flex-shrink-0">
                      <Image
                        src={tour.image}
                        alt={tour.title}
                        width={100}
                        height={100}
                        className="w-24 h-24 object-cover rounded-lg"
                      />
                    </Link>
                    <div className="flex-1">
                      <Link href={`/${tour.slug}`} onClick={closeWishlistSidebar}>
                        <h4 className="font-bold text-slate-800 hover:text-red-600 transition-colors line-clamp-2">
                          {tour.title}
                        </h4>
                      </Link>
                      <p className="text-sm text-slate-600 mt-1 font-semibold">
                        {formatPrice(tour.discountPrice)}
                      </p>
                    </div>
                    <button
                      onClick={() => removeFromWishlist(tour._id!)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                      aria-label={t('wishlist.removeFromWishlist')}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
             {wishlist.length > 0 && (
              <div className="p-6 border-t">
                <Link
                  href="/user/favorites"
                  onClick={closeWishlistSidebar}
                  className="w-full block text-center bg-slate-800 text-white font-bold py-3 px-6 rounded-full hover:bg-slate-900 transition-colors"
                >
                  {t('common.viewAll')}
                </Link>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
