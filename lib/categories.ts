import { Category } from '@/types';

export const categories = [
  {
    id: 'canal-cruises',
    name: 'Canal Cruises',
    slug: 'canal-cruises',
    icon: '🚢',
    description: 'Explore cities from the water with our scenic canal cruises',
    color: 'from-blue-500 to-cyan-600',
    tourCount: 15
  },
  {
    id: 'museums',
    name: 'Museums',
    slug: 'museums',
    icon: '🏛️',
    description: 'Discover art, history, and culture in world-class museums',
    color: 'from-purple-500 to-indigo-600',
    tourCount: 24
  },
  {
    id: 'food-tours',
    name: 'Food Tours',
    slug: 'food-tours',
    icon: '🍕',
    description: 'Taste your way through local cuisines and culinary traditions',
    color: 'from-orange-500 to-red-600',
    tourCount: 18
  },
  {
    id: 'walking-tours',
    name: 'Walking Tours',
    slug: 'walking-tours',
    icon: '🚶',
    description: 'Explore cities on foot with expert local guides',
    color: 'from-green-500 to-emerald-600',
    tourCount: 32
  },
  {
    id: 'day-trips',
    name: 'Day Trips',
    slug: 'day-trips',
    icon: '🗺️',
    description: 'Full-day adventures to nearby attractions and countryside',
    color: 'from-yellow-500 to-orange-600',
    tourCount: 28
  },
  {
    id: 'cultural',
    name: 'Cultural Experiences',
    slug: 'cultural',
    icon: '🎭',
    description: 'Immerse yourself in local traditions and cultural heritage',
    color: 'from-pink-500 to-rose-600',
    tourCount: 22
  },
  {
    id: 'historical',
    name: 'Historical Tours',
    slug: 'historical',
    icon: '🏰',
    description: 'Journey through time with historical sites and stories',
    color: 'from-amber-500 to-yellow-600',
    tourCount: 19
  },
  {
    id: 'romantic',
    name: 'Romantic',
    slug: 'romantic',
    icon: '💕',
    description: 'Perfect experiences for couples and romantic getaways',
    color: 'from-rose-500 to-pink-600',
    tourCount: 12
  },
  {
    id: 'sightseeing',
    name: 'Sightseeing',
    slug: 'sightseeing',
    icon: '📸',
    description: 'See the best attractions and landmarks',
    color: 'from-teal-500 to-cyan-600',
    tourCount: 35
  },
  {
    id: 'family-friendly',
    name: 'Family Friendly',
    slug: 'family-friendly',
    icon: '👨‍👩‍👧‍👦',
    description: 'Fun activities perfect for families with children',
    color: 'from-lime-500 to-green-600',
    tourCount: 26
  }
] as Category[];

export const getCategoryById = (id: string): Category | undefined => {
  return categories.find(cat => cat.id === id || cat.slug === id);
};

export const getAllCategories = (): Category[] => {
  return categories;
};