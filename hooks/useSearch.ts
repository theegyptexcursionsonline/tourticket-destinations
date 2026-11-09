import { useState, useEffect, useMemo } from 'react';
import { safeLocalStorage } from '@/lib/browserStorage';

export const useRecentSearches = (storageKey = 'recentTravelSearches') => {
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  useEffect(() => {
    try {
      const storedItems = safeLocalStorage.getItem(storageKey);
      if (storedItems) setRecentSearches(JSON.parse(storedItems));
    } catch (error) { console.error("Failed to load recent searches", error); }
  }, [storageKey]);

  const addSearchTerm = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    const newSearches = [trimmed, ...recentSearches.filter(s => s.toLowerCase() !== trimmed.toLowerCase())].slice(0, 5);
    setRecentSearches(newSearches);
    try { safeLocalStorage.setItem(storageKey, JSON.stringify(newSearches)); } catch (error) { console.error("Failed to save recent searches", error); }
  };

  const removeSearchTerm = (term: string) => {
    const newSearches = recentSearches.filter(s => s.toLowerCase() !== term.toLowerCase());
    setRecentSearches(newSearches);
    try { safeLocalStorage.setItem(storageKey, JSON.stringify(newSearches)); } catch (error) { console.error("Failed to save recent searches", error); }
  };

  return { recentSearches, addSearchTerm, removeSearchTerm };
};

export const usePopularSearches = () => useMemo(() => ['LIGHT FESTIVAL', 'MUSEUM', 'CANAL CRUISE'], []);