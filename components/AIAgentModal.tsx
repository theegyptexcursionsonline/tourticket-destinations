'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bot, Loader2, ChevronLeft, ChevronRight, MapPin, DollarSign, Star } from 'lucide-react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { liteClient as algoliasearch } from 'algoliasearch/lite';

const ALGOLIA_APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || 'WMDNV9WSOI';
const ALGOLIA_API_KEY = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY || 'f485b4906072cedbd2f51a46e5ac2637';
const AGENT_ID = 'fb2ac93a-1b89-40e2-a9cb-c85c1bbd978e';
const INDEX_TOURS = process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME || 'foxes_technology';

const searchClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_API_KEY);

export default function AIAgentModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [_initialQuery, setInitialQuery] = useState('');
  const [detectedTours, setDetectedTours] = useState<any[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);

  /** ---------- AI SDK SETUP ---------- **/
  const {
    messages,
    sendMessage,
    isLoading,
    stop: _stop,
  } = useChat({
    transport: new DefaultChatTransport({
      api: `https://${ALGOLIA_APP_ID}.algolia.net/agent-studio/1/agents/${AGENT_ID}/completions?stream=true&compatibilityMode=ai-sdk-5`,
      headers: {
        'x-algolia-application-id': ALGOLIA_APP_ID,
        'x-algolia-api-key': ALGOLIA_API_KEY,
      },
    }),
  }) as any;

  /** ---------- OPEN MODAL FROM FLOATING BUTTON ---------- **/
  useEffect(() => {
    const openHandler = (e: any) => {
      const query = e.detail?.query || '';
      setInitialQuery(query);
      setIsOpen(true);

      // Auto-send query
      if (query) {
        setTimeout(() => sendMessage({ text: query }), 300);
      }
    };

    window.addEventListener('openAIAgent', openHandler);
    return () => window.removeEventListener('openAIAgent', openHandler);
  }, [sendMessage]);

  /** ---------- SCROLL TO BOTTOM ---------- **/
  useEffect(() => {
    if (!containerRef.current) return;
    setTimeout(() => {
      containerRef.current!.scrollTop = containerRef.current!.scrollHeight;
    }, 80);
  }, [messages, isLoading]);

  const [input, setInput] = useState('');

  /** ---------- DETECT AND FETCH TOURS ---------- **/
  const detectAndFetchTours = async (text: string) => {
    try {
      const tourPatterns = [
        /(?:From |)([\w\s:,-]+?)(?:\s+\(\$\d+\))/g,
        /(?:^|\n)([A-Z][\w\s:,-]+?Tour[\w\s]*?)(?:\s+\(\$\d+\)|\n|$)/gm,
      ];

      const potentialTours = new Set<string>();

      for (const pattern of tourPatterns) {
        const matches = text.matchAll(pattern);
        for (const match of matches) {
          if (match[1]) {
            potentialTours.add(match[1].trim());
          }
        }
      }

      if (potentialTours.size > 0) {
        const toursArray = Array.from(potentialTours).slice(0, 5);
        const searchPromises = toursArray.map(async (tourTitle) => {
          try {
            const response = await (searchClient as any).search([{
              indexName: INDEX_TOURS,
              query: tourTitle,
              params: {
                hitsPerPage: 1,
              }
            }]);
            return (response.results[0] as any)?.hits[0];
          } catch (error) {
            console.error('Error searching for tour:', tourTitle, error);
            return null;
          }
        });

        const tours = (await Promise.all(searchPromises)).filter(Boolean);
        if (tours.length > 0) {
          setDetectedTours(tours);
          return tours;
        }
      }
    } catch (error) {
      console.error('Error detecting tours:', error);
    }
    return [];
  };

  /** ---------- DETECT TOURS IN MESSAGES ---------- **/
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === 'assistant') {
      const textParts = lastMessage.parts.filter((p: any) => p.type === 'text');
      const fullText = textParts.map((p: any) => p.text).join(' ');
      const hasTourPattern = /(?:Tour|tour).*?\$\d+/i.test(fullText);

      if (hasTourPattern) {
        detectAndFetchTours(fullText);
      }
    }
  }, [messages]);

  /** ---------- SUBMIT MESSAGE ---------- **/
  const handleSubmit = (e: any) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage({ text: input });
    setInput('');
  };

  /** ---------- WELCOME SUGGESTIONS ---------- **/
  const suggestions = [
    "Find me the best Nile Cruise under $300",
    "Plan a 7-day Egypt itinerary",
    "Top tours near Cairo?",
    "Best time to visit pyramids?",
  ];

  /** ---------- ESC CLOSE ---------- **/
  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && setIsOpen(false);
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  /** ---------- TYPING ANIMATION ---------- **/
  const TypingDots = () => (
    <motion.div
      className="flex items-center gap-2 text-gray-500 bg-white px-3 py-2 rounded-lg border"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <Loader2 className="w-4 h-4 animate-spin" />
      <span className="text-sm">AI is thinking</span>
    </motion.div>
  );

  /** ---------- TOUR CARD COMPONENT ---------- **/
  const TourCard = ({ tour }: { tour: any }) => (
    <motion.a
      href={`/${tour.slug}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group block flex-shrink-0 w-[280px] bg-white rounded-xl overflow-hidden border shadow-sm hover:shadow-lg transition-all duration-300"
      whileHover={{ y: -4 }}
    >
      {/* Image */}
      {tour.image && (
        <div className="relative h-40 bg-gradient-to-br from-blue-100 to-purple-100 overflow-hidden">
          <img
            src={tour.image}
            alt={tour.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
          {tour.duration && (
            <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-medium">
              {tour.duration}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-3">
        <h3 className="font-semibold text-sm mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
          {tour.title}
        </h3>

        {tour.location && (
          <div className="flex items-center gap-1 text-gray-500 text-xs mb-2">
            <MapPin className="w-3 h-3" />
            <span className="line-clamp-1">{tour.location}</span>
          </div>
        )}

        {tour.rating && (
          <div className="flex items-center gap-1 mb-2">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            <span className="text-xs font-medium">{tour.rating}</span>
            {tour.reviews && (
              <span className="text-xs text-gray-400">({tour.reviews})</span>
            )}
          </div>
        )}

        {tour.price && (
          <div className="flex items-center gap-1 text-blue-600 font-bold">
            <DollarSign className="w-4 h-4" />
            <span>{tour.price}</span>
          </div>
        )}
      </div>
    </motion.a>
  );

  /** ---------- TOUR SLIDER COMPONENT ---------- **/
  const TourSlider = ({ tours }: { tours: any[] }) => {
    const sliderRef = useRef<HTMLDivElement>(null);

    const scroll = (direction: 'left' | 'right') => {
      if (!sliderRef.current) return;
      const scrollAmount = 300;
      sliderRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    };

    return (
      <div className="relative w-full">
        {/* Scroll Buttons */}
        {tours.length > 1 && (
          <>
            <button
              onClick={() => scroll('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center hover:bg-white transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center hover:bg-white transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Slider */}
        <div
          ref={sliderRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth py-1 px-1"
        >
          {tours.map((tour, idx) => (
            <TourCard key={idx} tour={tour} />
          ))}
        </div>
      </div>
    );
  };

  /** ---------- TOOL RENDERING (JSON OUTPUT) ---------- **/
  const renderToolOutput = (obj: any) => {
    // Check if it's an array of tours
    if (Array.isArray(obj)) {
      const tours = obj.filter(item => item.title && item.slug);
      if (tours.length > 0) {
        return <TourSlider tours={tours} />;
      }
    }

    // Single tour
    if (obj.title && obj.slug) {
      return <TourSlider tours={[obj]} />;
    }

    // Check if object has a hits/results array (Algolia format)
    if (obj.hits && Array.isArray(obj.hits)) {
      const tours = obj.hits.filter((item: any) => item.title && item.slug);
      if (tours.length > 0) {
        return <TourSlider tours={tours} />;
      }
    }

    // Fallback for unknown tool formats
    return (
      <pre className="bg-gray-900 text-gray-100 p-2 rounded-lg text-xs overflow-x-auto">
        {JSON.stringify(obj, null, 2)}
      </pre>
    );
  };

  /** ---------- MESSAGE RENDERING ---------- **/
  const renderContent = (parts: any[]) => {
    return parts.map((p: any, idx: number) => {
      if (p.type === 'tool-result') {
        try {
          const obj = JSON.parse(p.text);
          return <div key={idx}>{renderToolOutput(obj)}</div>;
        } catch {
          return <pre key={idx}>{p.text}</pre>;
        }
      }

      if (p.type === 'text') {
        return (
          <div key={idx} className="prose prose-sm max-w-none text-gray-800 leading-relaxed text-[13px]">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]}
            >
              {p.text}
            </ReactMarkdown>
          </div>
        );
      }

      return null;
    });
  };

  return (
    <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.35 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-[9998]"
              onClick={() => setIsOpen(false)}
            />

          {/* Chat Window */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-4 md:inset-8 lg:inset-16 z-[9999] bg-white shadow-2xl rounded-2xl flex flex-col overflow-hidden max-w-5xl mx-auto"
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
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 flex items-center justify-center hover:bg-white/60 rounded-lg transition-colors"
              >
                <X className="text-gray-600" size={18} />
              </button>
            </div>

            {/* Messages */}
            <div
              ref={containerRef}
              className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-gray-50 to-white space-y-3"
              style={{ minHeight: 0 }}
            >
              {/* Welcome message */}
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
                    {suggestions.map((s) => (
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

              {messages.map((m: any, mIdx: any) => (
                <div key={m.id}>
                  <div
                    className={`flex ${
                      m.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
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
                  {/* Show detected tours after last assistant message */}
                  {m.role === 'assistant' && mIdx === messages.length - 1 && detectedTours.length > 0 && (
                    <div className="mt-3">
                      <TourSlider tours={detectedTours} />
                    </div>
                  )}
                </div>
              ))}

              {isLoading && <TypingDots />}
            </div>

            {/* Input */}
            <form
              onSubmit={handleSubmit}
              className="border-t p-3 bg-white flex items-center gap-2 flex-shrink-0"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about tours, destinations, prices..."
                disabled={isLoading}
                className="flex-1 px-3 py-2.5 rounded-lg border bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition-all disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-semibold shadow-sm hover:shadow-md hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Send
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
