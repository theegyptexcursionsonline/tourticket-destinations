// components/PopularInterestsGrid.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Star,
  Sparkles,
  Landmark,
  Building2,
  Church,
  Castle,
  Sunset,
  Mountain,
  Waves,
  Palmtree,
  Tent,
  TreePine,
  Ship,
  Binoculars,
  Camera,
  UtensilsCrossed,
  Footprints,
  Calendar,
  Package,
  Users,
  Heart,
  Compass,
  Plane,
  Map,
  MapPin,
  Ticket,
  Globe
} from 'lucide-react';

interface Interest {
  _id: string;
  type: 'category' | 'attraction';
  name: string;
  slug: string;
  products: number;
  featured?: boolean;
  image?: string;
}

interface PopularInterestsGridProps {
  initialInterests?: Interest[]; // Server-provided data
  limit?: number;
  showFeaturedOnly?: boolean;
  title?: string;
  subtitle?: string;
  columns?: 2 | 3 | 4 | 5 | 6;
}

// Image mapping function
const getInterestImage = (name: string): string => {
  const lowerName = name.toLowerCase();

  const imageMap: { [key: string]: string } = {
    fun: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=600&h=400&fit=crop',
    family: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=600&h=400&fit=crop',
    sightseeing: 'https://images.unsplash.com/photo-1555881698-6bfe5f815071?w=600&h=400&fit=crop',
    historical: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&h=400&fit=crop',
    bus: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&h=400&fit=crop',
    water: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=600&h=400&fit=crop',
    nightlife: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&h=400&fit=crop',
    cultural: 'https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=600&h=400&fit=crop',
    adventure: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop',
    luxury: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop',
    food: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&h=400&fit=crop',
    beach: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=400&fit=crop',
    sport: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=600&h=400&fit=crop',
    nature: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&h=400&fit=crop',
    shopping: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&h=400&fit=crop',
    museum: 'https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=600&h=400&fit=crop',
  };

  for (const [key, url] of Object.entries(imageMap)) {
    if (lowerName.includes(key)) return url;
  }

  return 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600&h=400&fit=crop';
};

// Icon mapping function - matches categories with appropriate icons
const getIconForInterest = (name: string, _slug: string) => {
  const lowerName = name.toLowerCase();

  // Historical & Cultural
  if (lowerName.includes('pyramid') || lowerName.includes('giza')) return { Icon: Landmark, gradient: 'from-amber-500 to-yellow-600' };
  if (lowerName.includes('museum') || lowerName.includes('antiquities')) return { Icon: Building2, gradient: 'from-purple-500 to-indigo-600' };
  if (lowerName.includes('temple') || lowerName.includes('luxor') || lowerName.includes('karnak')) return { Icon: Church, gradient: 'from-orange-500 to-red-600' };
  if (lowerName.includes('castle') || lowerName.includes('fortress') || lowerName.includes('citadel')) return { Icon: Castle, gradient: 'from-slate-600 to-slate-800' };
  if (lowerName.includes('historic') || lowerName.includes('ancient') || lowerName.includes('pharaoh')) return { Icon: Landmark, gradient: 'from-amber-600 to-orange-700' };
  if (lowerName.includes('cultural') || lowerName.includes('city')) return { Icon: Building2, gradient: 'from-slate-500 to-gray-600' };

  // Nature & Adventure
  if (lowerName.includes('desert') || lowerName.includes('safari') || lowerName.includes('sand') || lowerName.includes('quad')) return { Icon: Sunset, gradient: 'from-orange-400 to-red-500' };
  if (lowerName.includes('mountain') || lowerName.includes('hiking') || lowerName.includes('trek')) return { Icon: Mountain, gradient: 'from-emerald-500 to-teal-600' };
  if (lowerName.includes('beach') || lowerName.includes('sea') || lowerName.includes('diving') || lowerName.includes('snorkel')) return { Icon: Waves, gradient: 'from-cyan-500 to-blue-600' };
  if (lowerName.includes('oasis') || lowerName.includes('palm')) return { Icon: Palmtree, gradient: 'from-green-500 to-emerald-600' };
  if (lowerName.includes('camping') || lowerName.includes('outdoor')) return { Icon: Tent, gradient: 'from-lime-500 to-green-600' };
  if (lowerName.includes('wildlife') || lowerName.includes('nature')) return { Icon: TreePine, gradient: 'from-green-600 to-emerald-700' };

  // Activities & Tours
  if (lowerName.includes('cruise') || lowerName.includes('nile') || lowerName.includes('boat')) return { Icon: Ship, gradient: 'from-blue-500 to-indigo-600' };
  if (lowerName.includes('tour') || lowerName.includes('sightseeing') || lowerName.includes('guided') || lowerName.includes('day trip')) return { Icon: Binoculars, gradient: 'from-violet-500 to-purple-600' };
  if (lowerName.includes('photo') || lowerName.includes('photography')) return { Icon: Camera, gradient: 'from-pink-500 to-rose-600' };
  if (lowerName.includes('food') || lowerName.includes('culinary') || lowerName.includes('dining') || lowerName.includes('dinner')) return { Icon: UtensilsCrossed, gradient: 'from-red-500 to-orange-600' };
  if (lowerName.includes('walking') || lowerName.includes('walk')) return { Icon: Footprints, gradient: 'from-teal-500 to-cyan-600' };
  if (lowerName.includes('excursion') || lowerName.includes('multi')) return { Icon: Calendar, gradient: 'from-indigo-500 to-blue-600' };
  if (lowerName.includes('spa') || lowerName.includes('wellness')) return { Icon: Heart, gradient: 'from-pink-500 to-rose-600' };

  // City & Urban
  if (lowerName.includes('market') || lowerName.includes('bazaar') || lowerName.includes('shopping')) return { Icon: Package, gradient: 'from-fuchsia-500 to-pink-600' };

  // Special Interests
  if (lowerName.includes('family') || lowerName.includes('kids') || lowerName.includes('children')) return { Icon: Users, gradient: 'from-yellow-500 to-amber-600' };
  if (lowerName.includes('romantic') || lowerName.includes('couple') || lowerName.includes('honeymoon')) return { Icon: Heart, gradient: 'from-rose-500 to-red-600' };
  if (lowerName.includes('luxury') || lowerName.includes('premium') || lowerName.includes('vip')) return { Icon: Star, gradient: 'from-amber-500 to-yellow-600' };
  if (lowerName.includes('adventure') || lowerName.includes('extreme')) return { Icon: Compass, gradient: 'from-red-500 to-orange-600' };
  if (lowerName.includes('unique') || lowerName.includes('experience')) return { Icon: Sparkles, gradient: 'from-purple-500 to-pink-600' };

  // Transport related
  if (lowerName.includes('flight') || lowerName.includes('air') || lowerName.includes('airport')) return { Icon: Plane, gradient: 'from-sky-500 to-blue-600' };
  if (lowerName.includes('transfer') || lowerName.includes('transport') || lowerName.includes('private')) return { Icon: Map, gradient: 'from-gray-500 to-slate-600' };

  // Attractions
  if (lowerName.includes('attraction') || lowerName.includes('landmark')) return { Icon: MapPin, gradient: 'from-red-600 to-rose-700' };
  if (lowerName.includes('ticket') || lowerName.includes('pass')) return { Icon: Ticket, gradient: 'from-purple-500 to-violet-600' };

  // Default
  return { Icon: Globe, gradient: 'from-blue-500 to-cyan-600' };
};

const InterestCard = ({ interest }: { interest: Interest }) => {
  const linkUrl =
    interest.type === 'attraction' ? `/attraction/${interest.slug}` : `/interests/${interest.slug}`;
  const imageUrl = interest.image || getInterestImage(interest.name);
  const { Icon, gradient } = getIconForInterest(interest.name, interest.slug);

  return (
    <Link
      href={linkUrl}
      aria-label={`Open ${interest.name}`}
      className="group relative block overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
    >
      {/* Image Container */}
      <div className="relative w-full h-80 overflow-hidden rounded-2xl">
        <Image
          src={imageUrl}
          alt={interest.name}
          fill
          unoptimized
          className="object-cover transition-transform duration-700 group-hover:scale-110"
          sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
          placeholder="empty"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />

        {/* Subtle hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300 pointer-events-none" />

        {/* Border Effect */}
        <div className="absolute inset-0 rounded-2xl border-4 border-transparent group-hover:border-cyan-400 transition-all duration-300 pointer-events-none" />
      </div>

      {/* Content Overlay */}
      <div className="absolute bottom-0 start-0 end-0 p-5 z-10">
        <div className="bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-lg transform transition-all duration-300 group-hover:bg-white">
          {/* Icon Badge */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className={`flex-shrink-0 w-12 h-12 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-all duration-300`}>
              <Icon className="w-6 h-6 text-white" strokeWidth={2} />
            </div>
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                interest.type === 'attraction'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              {interest.type === 'attraction' ? 'Attraction' : 'Category'}
            </span>
          </div>

          <h3 className="text-lg font-bold text-slate-900 mb-1 uppercase tracking-wide line-clamp-2">
            {interest.name}
          </h3>
          <p className="text-sm text-slate-700 font-medium">
            {interest.products} {interest.products === 1 ? 'tour' : 'tours'}
          </p>
        </div>
      </div>

      {/* Featured Badge */}
      {interest.featured && (
        <div className="absolute top-4 end-4 z-20 bg-gradient-to-r from-red-500 to-orange-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
          <Star className="w-3 h-3 fill-current" />
          Featured
        </div>
      )}
    </Link>
  );
};

const PopularInterestsGrid: React.FC<PopularInterestsGridProps> = ({
  initialInterests,
  limit = 12,
  showFeaturedOnly = false,
  title = 'Popular Interests',
  subtitle = 'Discover the most popular experiences chosen by travelers',
  columns = 4,
}) => {
  const [interests, setInterests] = useState<Interest[]>([]);
  const [loading, setLoading] = useState(!initialInterests);

  useEffect(() => {
    // If we have initialInterests, process and use them
    if (initialInterests) {
      let filtered = initialInterests.filter((interest: Interest) => interest.products > 0);

      if (showFeaturedOnly) {
        filtered = filtered.filter((interest: Interest) => interest.featured);
      }

      // Sort by products count (most popular first)
      filtered.sort((a: Interest, b: Interest) => {
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return b.products - a.products;
      });

      setInterests(filtered.slice(0, limit));
      setLoading(false);
      return;
    }

    // Otherwise fetch from API (fallback for pages not using server component)
    const fetchInterests = async () => {
      try {
        const response = await fetch('/api/interests');

        if (!response.ok) {
          throw new Error('Failed to fetch interests');
        }

        const data = await response.json();

        if (data.success && Array.isArray(data.data)) {
          let filtered = data.data.filter((interest: Interest) => interest.products > 0);

          if (showFeaturedOnly) {
            filtered = filtered.filter((interest: Interest) => interest.featured);
          }

          // Sort by products count (most popular first)
          filtered.sort((a: Interest, b: Interest) => {
            if (a.featured && !b.featured) return -1;
            if (!a.featured && b.featured) return 1;
            return b.products - a.products;
          });

          setInterests(filtered.slice(0, limit));
        }
      } catch (error) {
        console.error('Error fetching interests:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInterests();
  }, [initialInterests, limit, showFeaturedOnly]);

  const gridColsClass = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
    5: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
    6: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6',
  };

  if (loading) {
    return (
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6 max-w-[1400px]">
          <div className="text-center mb-12">
            <div className="h-10 w-64 bg-slate-200 rounded-lg mx-auto mb-4 animate-pulse"></div>
            <div className="h-6 w-96 bg-slate-200 rounded-lg mx-auto animate-pulse"></div>
          </div>
          <div className={`grid ${gridColsClass[columns]} gap-8`}>
            {[...Array(limit)].map((_, i) => (
              <div
                key={i}
                className="relative rounded-2xl bg-slate-200 animate-pulse"
                style={{ height: 320 }}
              ></div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (interests.length === 0) {
    return null;
  }

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-6 max-w-[1400px]">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-red-100 to-orange-100 text-red-700 px-4 py-2 rounded-full text-sm font-semibold mb-4">
            <Sparkles className="w-4 h-4" />
            {showFeaturedOnly ? 'Featured Experiences' : 'Popular Categories'}
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
            {title}
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">{subtitle}</p>
        </motion.div>

        {/* Grid */}
        <div className={`grid ${gridColsClass[columns]} gap-8`}>
          {interests.map((interest, index) => (
            <motion.div
              key={interest._id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
            >
              <InterestCard interest={interest} />
            </motion.div>
          ))}
        </div>

        {/* View All Link */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-16"
        >
          <Link
            href="/interests"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-red-600 to-red-700 text-white font-bold rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            Explore All Categories
            <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default PopularInterestsGrid;