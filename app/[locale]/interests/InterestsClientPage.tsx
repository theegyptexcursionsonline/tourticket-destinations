'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { Tag, Search, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { ICategory } from '@/lib/models/Category';

interface CategoryWithCount extends ICategory {
  tourCount: number;
}

interface InterestsClientPageProps {
  categories: CategoryWithCount[];
}

const CategoryCard = ({ category }: { category: CategoryWithCount }) => (
  <Link href={`/interests/${category.slug}`} className="group block bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden">
    <div className="relative h-48">
      <Image
        src={category.heroImage || (category as any).image || '/hero2.jpg'}
        alt={`Image of ${category.name}`}
        fill
        className="object-cover transition-transform duration-300 group-hover:scale-105"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
      {category.featured && (
        <div className="absolute top-3 start-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
          <Star size={12} className="fill-current" />
          Featured
        </div>
      )}
    </div>
    <div className="p-4">
      <div className="flex items-center gap-2 mb-2">
        {category.icon && (
          <span className="text-2xl" aria-hidden="true">
            {category.icon}
          </span>
        )}
        <h3 className="text-xl font-bold text-slate-800 group-hover:text-red-600 transition-colors">{category.name}</h3>
      </div>
      {category.description && (
        <p className="text-sm text-slate-600 mb-2 line-clamp-2">{category.description}</p>
      )}
      <div className="flex items-center text-sm text-slate-500 mt-2">
        <Tag size={14} className="me-1.5" />
        <span>{category.tourCount} {category.tourCount === 1 ? 'experience' : 'experiences'} available</span>
      </div>
    </div>
  </Link>
);

export default function InterestsClientPage({ categories }: InterestsClientPageProps) {
  const [query, setQuery] = useState('');

  // Filter categories based on search query
  const filteredCategories = useMemo(() => {
    if (!query.trim()) return categories;

    const searchText = query.toLowerCase();
    return categories.filter(cat =>
      cat.name.toLowerCase().includes(searchText) ||
      cat.description?.toLowerCase().includes(searchText) ||
      cat.keywords?.some(kw => kw.toLowerCase().includes(searchText))
    );
  }, [categories, query]);

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 mb-4">
          Explore All Categories & Interests
        </h1>
        <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
          Discover amazing tours and experiences organized by interest. From adventure activities to cultural experiences, find your perfect Egyptian adventure.
        </p>

        {/* Search Bar */}
        <div className="mt-8 max-w-2xl mx-auto">
          <div className="relative group">
            <div className="relative bg-white/95 backdrop-blur-xl rounded-full shadow-xl hover:shadow-2xl border-2 border-blue-300/30 hover:border-blue-400/50 transition-all duration-300">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search categories..."
                className="w-full ps-14 md:ps-16 pe-4 py-4 text-sm md:text-base text-gray-900 placeholder:text-gray-400/70 placeholder:font-normal font-medium bg-transparent outline-none rounded-full relative z-10"
              />
              <div className="absolute start-4 md:start-5 top-1/2 transform -translate-y-1/2 z-10">
                <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center shadow-md">
                  <Search className="w-4 h-4 text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Search Results Count */}
          {query && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 text-sm text-slate-600"
            >
              Found {filteredCategories.length} {filteredCategories.length === 1 ? 'category' : 'categories'}
            </motion.p>
          )}
        </div>
      </div>

      {filteredCategories.length > 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
        >
          {filteredCategories.map((cat, index) => (
            <motion.div
              key={String(cat._id)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <CategoryCard category={cat} />
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          {query ? (
            <>
              <p className="text-slate-500 mb-4">
                No categories found matching "{query}"
              </p>
              <button
                onClick={() => setQuery('')}
                className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors"
              >
                Clear Search
              </button>
            </>
          ) : (
            <p className="text-slate-500">No categories are currently available. Please check back later.</p>
          )}
        </motion.div>
      )}
    </div>
  );
}

