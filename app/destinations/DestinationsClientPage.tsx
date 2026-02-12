'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Search, Sparkles, X, Bot, Loader2, ChevronLeft, ChevronRight, DollarSign, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { IDestination } from '@/lib/models/Destination';

// Algolia Configuration for AI
const ALGOLIA_APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || 'WMDNV9WSOI';
const ALGOLIA_SEARCH_KEY = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY || 'f485b4906072cedbd2f51a46e5ac2637';
const AGENT_ID = 'fb2ac93a-1b89-40e2-a9cb-c85c1bbd978e';

interface DestinationWithCount extends IDestination {
    tourCount: number;
}

interface DestinationsClientPageProps {
  destinations: DestinationWithCount[];
}

// Tour Card Component for AI Chat
const TourCard = ({ tour }: { tour: any }) => (
  <motion.div whileHover={{ y: -4 }}>
    <Link
      href={`/${tour.slug}`}
      className="group block flex-shrink-0 w-[240px] bg-white rounded-xl overflow-hidden border shadow-sm hover:shadow-lg transition-all duration-300"
    >
    {tour.image && (
      <div className="relative h-32 bg-gradient-to-br from-blue-100 to-purple-100 overflow-hidden">
        <img
          src={tour.image}
          alt={tour.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
        />
        {tour.duration && (
          <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-lg text-[10px] font-medium">
            {tour.duration}
          </div>
        )}
      </div>
    )}
    <div className="p-2.5">
      <h3 className="font-semibold text-xs text-gray-900 mb-1.5 line-clamp-2 group-hover:text-blue-600 transition-colors">
        {tour.title}
      </h3>
      {tour.location && (
        <div className="flex items-center gap-1 text-[10px] mb-1.5">
          <MapPin className="w-2.5 h-2.5 text-gray-400" />
          <span className="line-clamp-1 text-gray-600">{tour.location}</span>
        </div>
      )}
      {tour.rating && (
        <div className="flex items-center gap-1 mb-1.5">
          <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
          <span className="text-[10px] font-medium text-gray-900">{tour.rating}</span>
          {tour.reviews && <span className="text-[10px] text-gray-400">({tour.reviews})</span>}
        </div>
      )}
      {tour.price && (
        <div className="flex items-center gap-1 text-blue-600 font-bold text-sm">
          <DollarSign className="w-3 h-3" />
          <span>{tour.price}</span>
        </div>
      )}
    </div>
    </Link>
  </motion.div>
);

// Tour Slider Component for AI Chat
const TourSlider = ({ tours }: { tours: any[] }) => {
  const sliderRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (!sliderRef.current) return;
    const scrollAmount = 260;
    sliderRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <div className="relative w-full">
      {tours.length > 1 && (
        <>
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center hover:bg-white transition-all"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center hover:bg-white transition-all"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </>
      )}
      <div
        ref={sliderRef}
        className="flex gap-2.5 overflow-x-auto scrollbar-hide scroll-smooth py-1 px-1"
      >
        {tours.map((tour, idx) => (
          <TourCard key={idx} tour={tour} />
        ))}
      </div>
    </div>
  );
};

const DestinationCard = ({ destination }: { destination: DestinationWithCount }) => (
  <Link href={`/destinations/${destination.slug}`} className="group block bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden">
    <div className="relative h-48">
      <Image
        src={destination.image}
        alt={`Image of ${destination.name}`}
        fill
        className="object-cover transition-transform duration-300 group-hover:scale-105"
      />
       <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent"></div>
    </div>
    <div className="p-4">
      <h3 className="text-xl font-bold text-slate-800 group-hover:text-red-600 transition-colors">{destination.name}</h3>
      <div className="flex items-center text-sm text-slate-500 mt-1">
        <MapPin size={14} className="mr-1.5" />
        <span>{destination.tourCount} tours available</span>
      </div>
    </div>
  </Link>
);


export default function DestinationsClientPage({ destinations }: DestinationsClientPageProps) {
  const [query, setQuery] = useState(''); // Unified input for both search and chat
  const [showAIChat, setShowAIChat] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // AI SDK Chat Setup
  const {
    messages,
    sendMessage,
    isLoading,
  } = useChat({
    transport: new DefaultChatTransport({
      api: `https://${ALGOLIA_APP_ID}.algolia.net/agent-studio/1/agents/${AGENT_ID}/completions?stream=true&compatibilityMode=ai-sdk-5`,
      headers: {
        'x-algolia-application-id': ALGOLIA_APP_ID,
        'x-algolia-api-key': ALGOLIA_SEARCH_KEY,
      },
    }),
  });

  // Filter destinations based on search query
  const filteredDestinations = useMemo(() => {
    if (!query.trim() || showAIChat) return destinations;

    const searchText = query.toLowerCase();
    return destinations.filter(dest =>
      dest.name.toLowerCase().includes(searchText) ||
      dest.country?.toLowerCase().includes(searchText) ||
      dest.description?.toLowerCase().includes(searchText)
    );
  }, [destinations, query, showAIChat]);

  const handleOpenAI = () => {
    setShowAIChat(true);
    if (query) {
      setTimeout(() => sendMessage({ text: query }), 300);
      setQuery(''); // Clear input after sending
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    if (showAIChat) {
      // Send as chat message
      sendMessage({ text: query });
      setQuery(''); // Clear input after sending
    }
    // For search mode, just filter results (no submit action needed)
  };

  // Track if user has manually scrolled away from bottom
  const [userHasScrolledUp, setUserHasScrolledUp] = useState(false);
  const isScrollingRef = useRef(false);
  
  // Auto-scroll only when user hasn't manually scrolled up
  useEffect(() => {
    if (!chatContainerRef.current || userHasScrolledUp) return;
    
    const container = chatContainerRef.current;
    setTimeout(() => {
      if (!userHasScrolledUp && container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 100);
  }, [messages, isLoading, userHasScrolledUp]);
  
  // Track manual scrolling - let user scroll freely
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container || !showAIChat) return;
    
    let scrollTimeout: NodeJS.Timeout;
    
    const handleScroll = () => {
      // Don't interfere if this is a programmatic scroll
      if (isScrollingRef.current) return;
      
      clearTimeout(scrollTimeout);
      
      // Check if user is at the bottom
      const isAtBottom = Math.abs(container.scrollHeight - container.scrollTop - container.clientHeight) < 5;
      
      if (isAtBottom) {
        // User scrolled back to bottom - re-enable auto-scroll
        setUserHasScrolledUp(false);
      } else {
        // User scrolled away from bottom - disable auto-scroll
        setUserHasScrolledUp(true);
      }
    };
    
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [showAIChat]);

  // Render tool outputs (tours)
  const renderToolOutput = (obj: any) => {
    if (Array.isArray(obj)) {
      const tours = obj.filter(item => item.title && item.slug);
      if (tours.length > 0) return <TourSlider tours={tours} />;
    }
    if (obj.title && obj.slug) return <TourSlider tours={[obj]} />;
    if (obj.hits && Array.isArray(obj.hits)) {
      const tours = obj.hits.filter((item: any) => item.title && item.slug);
      if (tours.length > 0) return <TourSlider tours={tours} />;
    }
    return (
      <pre className="bg-gray-900 text-gray-100 p-2 rounded-lg text-[10px] overflow-x-auto">
        {JSON.stringify(obj, null, 2)}
      </pre>
    );
  };

  // Render message content
  const renderContent = (parts: any[]) => {
    return parts.map((p: any, idx: number) => {
      if (p.type === 'tool-result') {
        try {
          const obj = JSON.parse(p.text);
          return <div key={idx} className="my-2">{renderToolOutput(obj)}</div>;
        } catch {
          return <pre key={idx} className="text-[10px]">{p.text}</pre>;
        }
      }
      if (p.type === 'text') {
        return (
          <div key={idx} className="prose prose-sm max-w-none text-gray-800 leading-relaxed text-[11px]">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
              {p.text}
            </ReactMarkdown>
          </div>
        );
      }
      return null;
    });
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900">Explore Our Destinations</h1>
        <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
          From ancient wonders to modern marvels, find your next adventure in one of our handpicked locations.
        </p>

        {/* Unified Search/Chat Input */}
        <div className="mt-8 max-w-2xl mx-auto">
          <form onSubmit={handleSubmit}>
            <motion.div
              whileHover={{ y: -2, scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="relative group"
            >
              <div className="relative bg-white/95 backdrop-blur-xl rounded-full shadow-xl hover:shadow-2xl border-2 border-blue-300/30 hover:border-blue-400/50 transition-all duration-300">
                <div className="relative">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={showAIChat ? "Ask AI anything about Egypt tours..." : "Search destinations..."}
                    className="w-full pl-14 md:pl-16 pr-24 md:pr-28 py-4 text-sm md:text-base text-gray-900 placeholder:text-gray-400/70 placeholder:font-normal font-medium bg-transparent outline-none rounded-full relative z-10"
                    disabled={isLoading && showAIChat}
                  />

                {/* Left Icon */}
                <div className="absolute left-4 md:left-5 top-1/2 transform -translate-y-1/2 z-10">
                  <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center shadow-md">
                    <Search className="w-4 h-4 text-white" />
                  </div>
                </div>

                {/* Right Side Elements */}
                <div className="absolute right-4 md:right-5 top-1/2 transform -translate-y-1/2 flex items-center gap-2 z-10">
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                      aria-label="Clear search"
                    >
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  )}
                  <motion.button
                    type="button"
                    onClick={handleOpenAI}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 hover:from-blue-500 hover:to-purple-600 flex items-center justify-center shadow-md hover:shadow-lg cursor-pointer transition-all"
                    aria-label="Open AI Assistant"
                  >
                    <Sparkles className="w-4 h-4 text-white" />
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </form>

          {/* Search Results Count */}
          {query && !showAIChat && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 text-sm text-slate-600"
            >
              Found {filteredDestinations.length} {filteredDestinations.length === 1 ? 'destination' : 'destinations'}
            </motion.p>
          )}
        </div>
      </div>

      {filteredDestinations.length > 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
        >
          {filteredDestinations.map((dest, index) => (
            <motion.div
              key={dest._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <DestinationCard destination={dest} />
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          {query && !showAIChat ? (
            <>
              <p className="text-slate-500 mb-4">
                No destinations found matching "{query}"
              </p>
              <button
                onClick={() => setQuery('')}
                className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors"
              >
                Clear Search
              </button>
            </>
          ) : (
            <p className="text-slate-500">No destinations are currently available. Please check back later.</p>
          )}
        </motion.div>
      )}

      {/* AI Chat Modal */}
      <AnimatePresence>
        {showAIChat && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-50"
              onClick={() => setShowAIChat(false)}
            />

            {/* Chat Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-4 md:inset-8 lg:inset-16 z-50 bg-white shadow-2xl rounded-2xl flex flex-col overflow-hidden max-w-5xl mx-auto"
            >
              {/* Header */}
              <div className="px-4 py-3 flex items-center justify-between border-b bg-gradient-to-r from-blue-50 to-purple-50">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                    <Bot className="text-white" size={18} />
                  </div>
                  <div>
                    <h2 className="font-bold text-base bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text">
                      AI Travel Assistant
                    </h2>
                    <p className="text-[11px] text-gray-500">Ask anything about Egypt tours</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAIChat(false)}
                  className="w-8 h-8 flex items-center justify-center hover:bg-white/60 rounded-lg transition-colors"
                >
                  <X className="text-gray-600" size={18} />
                </button>
              </div>

              {/* Messages */}
              <div
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-gray-50 to-white space-y-3"
              >
                {messages.length === 0 && (
                  <div className="bg-white p-4 rounded-xl border border-blue-100">
                    <div className="flex items-start gap-2 mb-3">
                      <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Bot className="text-white" size={14} />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 text-sm mb-1">
                          Hi! I'm your AI Egypt Travel Assistant
                        </p>
                        <p className="text-gray-500 text-xs leading-relaxed">
                          Ask me anything — I'll help you find tours, trips, prices, destinations & more.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {["Find me the best Nile Cruise under $300", "Plan a 7-day Egypt itinerary", "Top tours near Cairo?"].map((s) => (
                        <button
                          key={s}
                          onClick={() => sendMessage({ text: s })}
                          className="px-2.5 py-1.5 bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 border border-blue-100 rounded-lg text-xs font-medium text-gray-700 transition-all"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] px-3 py-2.5 rounded-xl ${
                        m.role === 'user'
                          ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-sm'
                          : 'bg-white text-gray-800 border shadow-sm'
                      }`}
                    >
                      {renderContent(m.parts)}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex items-center gap-2 text-gray-500 bg-white px-3 py-2 rounded-lg border">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span className="text-[10px]">AI is thinking</span>
                  </div>
                )}
              </div>

              {/* Input - Using unified query state */}
              <form
                onSubmit={handleSubmit}
                className="border-t p-3 bg-white flex items-center gap-2"
              >
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask about tours, destinations, prices..."
                  disabled={isLoading}
                  className="flex-1 px-3 py-2.5 rounded-lg border bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition-all disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={isLoading || !query.trim()}
                  className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-semibold shadow-sm hover:shadow-md hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Send
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
