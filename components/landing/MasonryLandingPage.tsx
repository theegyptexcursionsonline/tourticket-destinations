// components/landing/MasonryLandingPage.tsx
'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { 
  Search, Star, Clock, MapPin, ArrowRight, 
  Eye, Heart, Share2, Award,
  Camera, Zap
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface MasonryLandingPageProps {
  page: {
    title: string;
    description: string;
    heroImage: string;
    images?: string[];
    highlights?: string[];
    features?: string[];
  };
  content: any[];
  linkTree?: {
    title: string;
    links: { name: string; url: string; icon?: string }[];
  };
}

export default function MasonryLandingPage({ 
  page, 
  content = [],
  linkTree 
}: MasonryLandingPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  
  // Filter content based on search and filters
  const filteredContent = content.filter(item => {
    const matchesSearch = !searchQuery || 
      item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = selectedFilter === 'all' || item.type === selectedFilter;
    
    return matchesSearch && matchesFilter;
  });

  // Get unique content types for filter buttons
  const contentTypes = ['all', ...new Set(content.map(item => item.type))];

  return (
    <>
      <Header startSolid />
      <div className="min-h-screen">
        {/* Hero Section with Parallax */}
        <section className="relative h-screen overflow-hidden">
          {/* Background with parallax effect */}
          <div className="absolute inset-0">
            <div 
              className="h-[120%] bg-cover bg-center bg-fixed transform -translate-y-10"
              style={{ backgroundImage: `url(${page.heroImage})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60" />
          </div>
          
          {/* Floating Elements */}
          <div className="absolute inset-0 overflow-hidden">
            {Array.from({ length: 6 }, (_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-white/20 rounded-full"
                animate={{
                  y: [0, -100, 0],
                  x: [0, Math.random() * 100 - 50, 0],
                  opacity: [0.2, 0.8, 0.2]
                }}
                transition={{
                  duration: 4 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 2
                }}
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`
                }}
              />
            ))}
          </div>
          
          {/* Main Content */}
          <div className="relative z-10 h-full flex flex-col items-center justify-center text-white px-6">
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1 }}
              className="text-center max-w-4xl"
            >
              <h1 className="text-6xl md:text-8xl font-black leading-tight mb-8 bg-gradient-to-r from-white via-yellow-200 to-white bg-clip-text text-transparent">
                {page.title}
              </h1>
              <p className="text-xl md:text-2xl font-medium mb-12 text-white/90 leading-relaxed">
                {page.description}
              </p>
              
              {/* Enhanced Search Bar */}
              <motion.div 
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.8 }}
                className="w-full max-w-3xl mx-auto"
              >
                <div className={`bg-white/10 backdrop-blur-md rounded-2xl p-2 transition-all duration-300 ${
                  isSearchFocused ? 'bg-white/20 shadow-2xl scale-105' : ''
                }`}>
                  <div className="flex items-center gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute start-6 top-1/2 transform -translate-y-1/2 h-6 w-6 text-white/70" />
                      <input
                        type="text"
                        placeholder="Discover amazing experiences..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => setIsSearchFocused(true)}
                        onBlur={() => setIsSearchFocused(false)}
                        className="w-full bg-transparent text-white placeholder-white/70 ps-16 pe-6 py-6 focus:outline-none text-lg font-medium"
                      />
                    </div>
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-8 py-6 rounded-xl font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 shadow-lg"
                    >
                      Explore
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Scroll Indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="absolute bottom-8 start-1/2 transform -translate-x-1/2"
            >
              <motion.div
                animate={{ y: [0, 15, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="w-8 h-14 border-2 border-white/50 rounded-full flex justify-center p-2"
              >
                <div className="w-1 h-4 bg-white/70 rounded-full"></div>
              </motion.div>
              <p className="text-white/60 text-sm mt-2 text-center">Scroll to explore</p>
            </motion.div>
          </div>
        </section>

        {/* Filter Bar */}
        <section className="bg-white shadow-lg border-b sticky top-0 z-40">
          <div className="container mx-auto px-6 py-6">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
              {/* Filter Buttons */}
              <div className="flex flex-wrap gap-2">
                {contentTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedFilter(type)}
                    className={`px-6 py-3 rounded-full font-medium transition-all duration-200 capitalize ${
                      selectedFilter === type
                        ? 'bg-indigo-100 text-indigo-600 shadow-md'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {type === 'all' ? 'All Content' : type.replace('-', ' ')}
                  </button>
                ))}
              </div>

              {/* Results Count */}
              <div className="text-slate-600 font-medium">
                {filteredContent.length} {filteredContent.length === 1 ? 'result' : 'results'} found
              </div>
            </div>
          </div>
        </section>
        
        {/* Masonry Grid Content */}
        <section className="container mx-auto px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {/* Sidebar Widgets (first column on desktop) */}
            <div className="xl:col-span-1 space-y-6">
              {/* Link Tree Widget */}
              {linkTree && (
                <motion.div
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white rounded-2xl p-6 shadow-lg sticky top-24"
                >
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Zap className="h-5 w-5 text-indigo-500" />
                    {linkTree.title}
                  </h3>
                  <div className="space-y-3">
                    {linkTree.links.map((link, index) => (
                      <Link
                        key={index}
                        href={link.url}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors group"
                      >
                        {link.icon && <span className="text-xl">{link.icon}</span>}
                        <span className="font-medium text-slate-700 group-hover:text-indigo-600 transition-colors flex-1">
                          {link.name}
                        </span>
                        <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                      </Link>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Highlights Widget */}
              {page.highlights && page.highlights.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100"
                >
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Star className="h-5 w-5 text-indigo-500" />
                    Highlights
                  </h3>
                  <ul className="space-y-3">
                    {page.highlights.map((highlight, index) => (
                      <li key={index} className="flex items-start gap-3 text-sm text-slate-700">
                        <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0" />
                        <span>{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </div>

            {/* Content Cards */}
            <div className="xl:col-span-3">
              <div className="masonry-grid">
                <AnimatePresence>
                  {filteredContent.map((item, index) => (
                    <MasonryContentCard 
                      key={item._id || index} 
                      item={item} 
                      index={index} 
                    />
                  ))}
                </AnimatePresence>
              </div>

              {/* Empty State */}
              {filteredContent.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-16"
                >
                  <div className="w-24 h-24 mx-auto mb-6 bg-slate-100 rounded-full flex items-center justify-center">
                    <Search className="w-10 h-10 text-slate-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-700 mb-2">No results found</h3>
                  <p className="text-slate-500 mb-6">
                    Try adjusting your search or filter criteria.
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedFilter('all');
                    }}
                    className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
                  >
                    Clear Filters
                  </button>
                </motion.div>
              )}
            </div>
          </div>
        </section>

        {/* Additional Content Sections */}
        {page.images && page.images.length > 0 && (
          <section className="bg-slate-100 py-16">
            <div className="container mx-auto px-6">
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-12"
              >
                <h2 className="text-3xl font-bold text-slate-900 mb-4">
                  Explore {page.title} in Pictures
                </h2>
                <p className="text-slate-600 max-w-2xl mx-auto">
                  Discover the beauty and wonder through our curated gallery of stunning photographs.
                </p>
              </motion.div>
              <ImageMasonryGallery images={page.images} />
            </div>
          </section>
        )}
      </div>
      <Footer />
    </>
  );
}

const MasonryContentCard = ({ item, index }: { item: any; index: number }) => {
  const [_imageLoaded, _setImageLoaded] = useState(false);
  const [_cardHeight, _setCardHeight] = useState('auto');

  // Randomize card heights for masonry effect
  const heights = ['h-64', 'h-80', 'h-72', 'h-96', 'h-60'];
  const randomHeight = heights[index % heights.length];

  const getCardContent = () => {
    switch (item.type) {
      case 'tour':
        return <TourMasonryCard item={item} height={randomHeight} />;
      case 'destination':
        return <DestinationMasonryCard item={item} height={randomHeight} />;
      case 'category':
        return <CategoryMasonryCard item={item} height={randomHeight} />;
      case 'review':
        return <ReviewMasonryCard item={item} height={randomHeight} />;
      default:
        return <DefaultMasonryCard item={item} height={randomHeight} />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ 
        duration: 0.5, 
        delay: index * 0.1,
        type: "spring",
        stiffness: 100
      }}
      className="break-inside-avoid mb-6"
    >
      {getCardContent()}
    </motion.div>
  );
};

const TourMasonryCard = ({ item, height }: { item: any; height: string }) => (
  <Link href={`/${item.slug}`} className="group block">
    <div className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 hover:rotate-1">
      <div className={`relative ${height} overflow-hidden`}>
        <Image 
          src={item.image} 
          alt={item.title}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        {/* Floating Price Tag */}
        <div className="absolute top-4 end-4">
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            className="bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg"
          >
            <span className="text-lg font-bold text-slate-900">
              €{item.discountPrice || item.price}
            </span>
          </motion.div>
        </div>

        {/* Content Overlay */}
        <div className="absolute bottom-0 start-0 end-0 p-6">
          <h3 className="text-xl font-bold text-white mb-2 group-hover:text-yellow-300 transition-colors">
            {item.title}
          </h3>
          <div className="flex items-center gap-4 text-sm text-white/80 mb-3">
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {item.duration}
            </span>
            <span className="flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-400 fill-current" />
              {item.rating || '4.5'}
            </span>
          </div>
          {item.destination && (
            <div className="flex items-center gap-1 text-white/70 text-sm">
              <MapPin className="h-3 w-3" />
              <span>{item.destination.name}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Card Footer */}
      <div className="p-4">
        <p className="text-slate-600 text-sm line-clamp-2">{item.description}</p>
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            {item.tags?.slice(0, 2).map((tag: string, i: number) => (
              <span 
                key={i}
                className="px-2 py-1 bg-indigo-100 text-indigo-600 rounded-full text-xs font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
          <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
        </div>
      </div>
    </div>
  </Link>
);

const DestinationMasonryCard = ({ item, height }: { item: any; height: string }) => (
  <Link href={`/${item.slug}`} className="group block">
    <div className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2">
      <div className={`relative ${height} overflow-hidden`}>
        <Image 
          src={item.image || '/images/placeholder-destination.jpg'} 
          alt={item.name}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />
        
        {/* Content Overlay */}
        <div className="absolute top-6 start-6 end-6">
          <h3 className="text-2xl font-bold text-white mb-1 group-hover:text-yellow-300 transition-colors">
            {item.name}
          </h3>
          {item.country && (
            <p className="text-white/80 text-sm">{item.country}</p>
          )}
        </div>

        <div className="absolute bottom-6 start-6 end-6">
          <div className="flex items-center justify-between text-white">
            <span className="text-sm">
              {item.tourCount || 0} tours available
            </span>
            <div className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              <span className="text-sm">Explore</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Link>
);

const CategoryMasonryCard = ({ item, height: _height }: { item: any; height: string }) => (
  <Link href={`/${item.slug}`} className="group block">
    <div className="bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 hover:rotate-1 p-8">
      <div className="text-center">
        <div className="text-6xl mb-6 transform group-hover:scale-110 transition-transform duration-300">
          {item.icon || '📋'}
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-indigo-600 transition-colors">
          {item.name}
        </h3>
        <p className="text-slate-600 text-sm leading-relaxed">
          {item.description || 'Discover amazing experiences in this category'}
        </p>
        <div className="mt-6">
          <span className="inline-flex items-center gap-2 text-indigo-600 font-medium group-hover:text-indigo-700 transition-colors">
            Explore Category
            <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
          </span>
        </div>
      </div>
    </div>
  </Link>
);

const ReviewMasonryCard = ({ item, height: _height }: { item: any; height: string }) => (
  <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
    <div className="flex items-start gap-4 mb-4">
      <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
        {item.userName?.charAt(0) || 'U'}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-semibold text-slate-900">{item.userName}</h4>
          {item.verified && (
            <Award className="h-4 w-4 text-green-500" />
          )}
        </div>
        <div className="flex text-yellow-400 mb-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Star 
              key={i} 
              className={`h-4 w-4 ${i < item.rating ? 'fill-current' : ''}`} 
            />
          ))}
        </div>
      </div>
    </div>
    
    {item.title && (
      <h5 className="font-medium text-slate-900 mb-2">{item.title}</h5>
    )}
    <p className="text-slate-600 text-sm leading-relaxed">{item.comment}</p>
    
    <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
      <span className="text-xs text-slate-500">
        {new Date(item.createdAt).toLocaleDateString()}
      </span>
      <div className="flex items-center gap-3">
        <button className="flex items-center gap-1 text-slate-400 hover:text-red-500 transition-colors">
          <Heart className="h-4 w-4" />
          <span className="text-xs">{item.helpful || 0}</span>
        </button>
        <button className="text-slate-400 hover:text-slate-600 transition-colors">
          <Share2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  </div>
);

const DefaultMasonryCard = ({ item, height }: { item: any; height: string }) => (
  <div className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300">
    {item.image && (
      <div className={`relative ${height} overflow-hidden`}>
        <Image 
          src={item.image} 
          alt={item.title || item.name}
          fill
          className="object-cover"
        />
      </div>
    )}
    <div className="p-6">
      <h3 className="text-lg font-bold text-slate-900 mb-2">
        {item.title || item.name}
      </h3>
      <p className="text-slate-600 text-sm mb-4">{item.description}</p>
      {item.tags && (
        <div className="flex flex-wrap gap-2">
          {item.tags.slice(0, 3).map((tag: string, i: number) => (
            <span 
              key={i}
              className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  </div>
);

const ImageMasonryGallery = ({ images }: { images: string[] }) => (
  <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
    {images.map((image, index) => (
      <motion.div
        key={index}
        initial={{ opacity: 0, scale: 0.8 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: index * 0.1 }}
        className="break-inside-avoid relative group cursor-pointer overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300"
      >
        <img 
          src={image} 
          alt={`Gallery image ${index + 1}`}
          className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <Camera className="h-8 w-8 text-white" />
        </div>
      </motion.div>
    ))}
  </div>
);