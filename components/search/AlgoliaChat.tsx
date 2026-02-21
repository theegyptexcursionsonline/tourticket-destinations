'use client';

import { liteClient as algoliasearch } from 'algoliasearch/lite';
import { InstantSearch, Chat, SearchBox, Hits, useInstantSearch } from 'react-instantsearch';
import { Sparkles, MessageCircle, Zap, Shield, Globe2, AlertCircle, MapPin, Clock } from 'lucide-react';
import 'instantsearch.css/themes/satellite.css';
import { useState, useEffect } from 'react';

const ALGOLIA_APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || 'WMDNV9WSOI';
const ALGOLIA_SEARCH_KEY = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY || 'f485b4906072cedbd2f51a46e5ac2637';
const AGENT_ID = 'fb2ac93a-1b89-40e2-a9cb-c85c1bbd978e';
const INDEX_NAME = process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME || 'foxes_technology';

// Create search client with error handling
const createSearchClient = () => {
  try {
    return algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY);
  } catch (error) {
    console.error('Failed to create Algolia search client:', error);
    throw error;
  }
};

const searchClient = createSearchClient();

// Empty state boundary component
const EmptyQueryBoundary = ({ children, fallback }: { children: React.ReactNode; fallback: React.ReactNode }) => {
  const { indexUiState } = useInstantSearch();
  if (!indexUiState.query) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
};

// No results boundary component
const NoResultsBoundary = ({ children, fallback }: { children: React.ReactNode; fallback: React.ReactNode }) => {
  const { results } = useInstantSearch();
  if (!results.__isArtificial && results.nbHits === 0) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
};

// Compact hit component for Crunchbase-style display
const CompactHit = ({ hit }: any) => {
  return (
    <a
      href={`/${hit.slug}`}
      className="block p-3 hover:bg-slate-50 transition-colors"
    >
      <div className="flex items-start gap-3">
        {/* Tour Image */}
        {hit.image && (
          <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100">
            <img
              src={hit.image}
              alt={hit.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Tour Info */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-slate-900 truncate mb-0.5">
            {hit.title}
          </h4>
          <div className="flex items-center gap-3 text-xs text-slate-600">
            {hit.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {hit.location}
              </span>
            )}
            {hit.duration && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {hit.duration}
              </span>
            )}
          </div>
        </div>

        {/* Price */}
        {(hit.discountPrice || hit.price) && (
          <div className="flex-shrink-0 text-end">
            <div className="text-sm font-bold text-blue-600">
              ${hit.discountPrice || hit.price}
            </div>
            {hit.discountPrice && hit.price && hit.discountPrice < hit.price && (
              <div className="text-xs text-slate-400 line-through">
                ${hit.price}
              </div>
            )}
          </div>
        )}
      </div>
    </a>
  );
};

interface AlgoliaChatProps {
  initialQuery?: string;
  minimal?: boolean; // New prop for minimal UI mode
}

export default function AlgoliaChat({ initialQuery, minimal = false }: AlgoliaChatProps) {
  const [error, setError] = useState<string | null>(null);

  // Log configuration for debugging
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('Algolia AI Search Configuration:', {
        appId: ALGOLIA_APP_ID,
        agentId: AGENT_ID,
        indexName: INDEX_NAME,
        hasSearchKey: !!ALGOLIA_SEARCH_KEY
      });

      // Verify credentials
      if (!ALGOLIA_APP_ID || !ALGOLIA_SEARCH_KEY) {
        setError('Algolia credentials are missing. Please check your environment variables.');
        return;
      }
    }
  }, []);

  // Handle errors
  if (error) {
    return (
      <div className="w-full p-8 bg-red-50 border-2 border-red-200 rounded-2xl">
        <div className="flex items-start gap-4">
          <div className="bg-red-500 p-3 rounded-full">
            <AlertCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-red-900 mb-2">Configuration Error</h3>
            <p className="text-red-700 mb-4">{error}</p>
            <p className="text-sm text-red-600">
              Please contact support or check your Algolia configuration.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Minimal mode - AI-powered search results display like Crunchbase
  if (minimal) {
    return (
      <div className="w-full h-full flex flex-col bg-white">
        <InstantSearch searchClient={searchClient} indexName={INDEX_NAME}>
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Search Input */}
            <div className="p-3 border-b border-slate-100">
              <SearchBox
                placeholder="Search Egypt tours (e.g., tours under $100, Pyramids, Nile cruise)..."
                classNames={{
                  root: 'w-full',
                  form: 'relative flex items-center',
                  input: 'w-full px-3 py-2 pe-20 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none text-sm',
                  submit: 'absolute end-10 top-1/2 -translate-y-1/2 p-1.5 text-blue-600 hover:text-blue-700',
                  reset: 'absolute end-1 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600',
                  submitIcon: 'w-4 h-4',
                  resetIcon: 'w-4 h-4',
                }}
                autoFocus
              />
            </div>

            {/* Search Results */}
            <div className="flex-1 overflow-y-auto bg-white">
              <EmptyQueryBoundary
                fallback={
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <Sparkles className="w-10 h-10 text-blue-500 mb-3" />
                    <h3 className="text-sm font-semibold text-slate-800 mb-1">AI-Powered Search</h3>
                    <p className="text-xs text-slate-600 mb-4">
                      Ask naturally: "tours under $100", "romantic Nile cruise", "family trips"
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center max-w-md">
                      {['Pyramids of Giza', 'tours under $100', 'Nile cruise', 'Desert safari'].map((tag) => (
                        <button
                          key={tag}
                          className="px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-600 rounded-full text-xs font-medium hover:bg-blue-100 transition-colors"
                          onClick={() => {
                            const input = document.querySelector('.ais-SearchBox-input') as HTMLInputElement;
                            if (input) {
                              input.value = tag;
                              input.dispatchEvent(new Event('input', { bubbles: true }));
                            }
                          }}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                }
              >
                <NoResultsBoundary
                  fallback={
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                      <AlertCircle className="w-10 h-10 text-slate-400 mb-3" />
                      <h3 className="text-sm font-semibold text-slate-800 mb-1">No tours found</h3>
                      <p className="text-xs text-slate-600">Try rephrasing or use different keywords</p>
                    </div>
                  }
                >
                  <Hits
                    hitComponent={CompactHit}
                    classNames={{
                      root: 'w-full',
                      list: 'divide-y divide-slate-100',
                      item: 'list-none',
                    }}
                  />
                </NoResultsBoundary>
              </EmptyQueryBoundary>
            </div>
          </div>

          {/* Minimal chat styling */}
          <style jsx global>{`
            .algolia-chat-minimal {
              font-family: inherit !important;
            }

            .algolia-chat-minimal .ais-Chat-messages {
              padding: 0.875rem;
              background: white;
            }

            .algolia-chat-minimal .ais-Chat-message {
              margin-bottom: 0.625rem;
              animation: slideIn 0.2s ease-out;
            }

            @keyframes slideIn {
              from {
                opacity: 0;
                transform: translateY(6px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }

            .algolia-chat-minimal .ais-Chat-message--user {
              background: linear-gradient(135deg, #2563eb, #4f46e5) !important;
              color: white !important;
              border-radius: 1rem 1rem 0.25rem 1rem !important;
              padding: 0.625rem 0.875rem !important;
              box-shadow: 0 1px 4px rgba(37, 99, 235, 0.15) !important;
              font-size: 0.875rem;
            }

            .algolia-chat-minimal .ais-Chat-message--assistant {
              background: #f8fafc !important;
              color: #1e293b !important;
              border-radius: 1rem 1rem 1rem 0.25rem !important;
              padding: 0.625rem 0.875rem !important;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05) !important;
              border: 1px solid #e2e8f0;
              font-size: 0.875rem;
            }

            .algolia-chat-minimal .ais-Chat-inputWrapper {
              border: 1.5px solid #e2e8f0 !important;
              border-radius: 0.625rem !important;
              background: white !important;
              padding: 0.25rem !important;
              transition: all 0.2s ease !important;
            }

            .algolia-chat-minimal .ais-Chat-inputWrapper:focus-within {
              border-color: #2563eb !important;
              box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.08) !important;
            }

            .algolia-chat-minimal .ais-Chat-input {
              font-size: 0.8125rem !important;
              padding: 0.5rem 0.75rem !important;
              border: none !important;
            }

            .algolia-chat-minimal .ais-Chat-button {
              background: linear-gradient(135deg, #2563eb, #4f46e5) !important;
              color: white !important;
              border-radius: 0.5rem !important;
              padding: 0.5rem 0.875rem !important;
              font-weight: 600 !important;
              font-size: 0.8125rem !important;
              transition: all 0.2s ease !important;
              border: none !important;
            }

            .algolia-chat-minimal .ais-Chat-button:hover {
              transform: translateY(-1px);
              box-shadow: 0 3px 10px rgba(37, 99, 235, 0.25) !important;
            }
          `}</style>
        </InstantSearch>
      </div>
    );
  }

  // Full mode - original UI with all features
  return (
    <div className="w-full">
      <InstantSearch searchClient={searchClient} indexName={INDEX_NAME}>
        <div className="bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/30 rounded-2xl shadow-2xl border border-blue-100 overflow-hidden backdrop-blur-sm">
          {/* Enhanced Header with Gradient and Icons */}
          <div className="relative bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 p-8 text-white overflow-hidden">
            {/* Animated Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 start-0 w-72 h-72 bg-white rounded-full mix-blend-overlay filter blur-3xl animate-pulse"></div>
              <div className="absolute bottom-0 end-0 w-96 h-96 bg-white rounded-full mix-blend-overlay filter blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>

            {/* Content */}
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md border border-white/30 shadow-lg">
                    <Sparkles className="w-10 h-10 text-white" strokeWidth={2.5} />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold mb-1 flex items-center gap-2">
                      AI Travel Assistant
                      <span className="inline-block">
                        <Zap className="w-6 h-6 text-yellow-300 animate-pulse" />
                      </span>
                    </h2>
                    <p className="text-blue-100 text-sm font-medium flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Powered by Algolia AI
                    </p>
                  </div>
                </div>
              </div>

              {/* Feature Pills */}
              <div className="flex flex-wrap gap-2 mb-4">
                <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/30">
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">Natural Language</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/30">
                  <Globe2 className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">Egypt Tours</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/30">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">Instant Results</span>
                </div>
              </div>

              <p className="text-white/95 text-base leading-relaxed max-w-3xl">
                Ask me anything about Egypt tours! I can help you discover amazing experiences by location,
                price range, activities, and much more. Try asking in your own words.
              </p>
            </div>
          </div>

          {/* Chat Interface with Enhanced Styling */}
          <div className="p-6 bg-gradient-to-b from-white to-slate-50/50">
            {initialQuery && (
              <div className="mb-5 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-s-4 border-blue-500 rounded-xl shadow-sm">
                <p className="text-sm text-blue-900 font-medium mb-1">
                  <span className="font-bold">Your query:</span> {initialQuery}
                </p>
                <p className="text-xs text-blue-600 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Type this into the chat below to search
                </p>
              </div>
            )}

            {/* Pro Tips Section */}
            <div className="mb-5 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl shadow-sm">
              <div className="flex items-start gap-3">
                <div className="bg-blue-500 p-2 rounded-lg">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-blue-900 font-semibold mb-1">Pro Tips for Best Results</p>
                  <ul className="text-xs text-blue-800 space-y-1">
                    <li className="flex items-start gap-1.5">
                      <span className="text-blue-500 mt-0.5">•</span>
                      <span>Be specific about your preferences (e.g., budget, duration, activities)</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-blue-500 mt-0.5">•</span>
                      <span>Ask follow-up questions to refine your search</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-blue-500 mt-0.5">•</span>
                      <span>Try different phrasings if you don&apos;t find what you&apos;re looking for</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Enhanced Chat Component */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-100/20 to-indigo-100/20 rounded-2xl blur-xl"></div>
              <div className="relative bg-white rounded-2xl shadow-xl border border-slate-200/60 overflow-hidden">
                <Chat
                  {...{
                    agentId: AGENT_ID,
                    classNames: {
                      root: 'min-h-[500px] algolia-chat-enhanced',
                    },
                    placeholder: "Type your question here... (e.g., 'Find romantic sunset cruises in Cairo')",
                  } as any}
                />
              </div>
            </div>

            {/* Help Footer */}
            <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <p className="text-xs text-slate-600 text-center">
                <span className="font-semibold">Need help?</span> This AI assistant is connected to our live tour database.
                All recommendations are based on real, bookable tours.
              </p>
            </div>

            {/* Help Info */}
            <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-blue-900 font-semibold mb-1">AI-Powered Intelligent Search</p>
                  <p className="text-xs text-blue-700">
                    Ask naturally and get smart results. Try queries like "tours under $100", "romantic Nile cruises", or "family-friendly pyramids tour".
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Custom CSS for enhanced chat styling */}
        <style jsx global>{`
          .algolia-chat-enhanced {
            font-family: inherit !important;
          }

          .algolia-chat-enhanced .ais-Chat-messages {
            padding: 1.5rem;
            background: linear-gradient(to bottom, transparent, rgba(248, 250, 252, 0.5));
          }

          .algolia-chat-enhanced .ais-Chat-message {
            margin-bottom: 1rem;
            animation: slideIn 0.3s ease-out;
          }

          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .algolia-chat-enhanced .ais-Chat-message--user {
            background: linear-gradient(135deg, #2563eb, #4f46e5) !important;
            color: white !important;
            border-radius: 1.25rem 1.25rem 0.25rem 1.25rem !important;
            padding: 0.875rem 1.25rem !important;
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2) !important;
            font-weight: 500;
          }

          .algolia-chat-enhanced .ais-Chat-message--assistant {
            background: linear-gradient(135deg, #f8fafc, #e2e8f0) !important;
            color: #1e293b !important;
            border-radius: 1.25rem 1.25rem 1.25rem 0.25rem !important;
            padding: 0.875rem 1.25rem !important;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08) !important;
            border: 1px solid #e2e8f0;
          }

          .algolia-chat-enhanced .ais-Chat-inputWrapper {
            border: 2px solid #e2e8f0 !important;
            border-radius: 1rem !important;
            background: white !important;
            padding: 0.5rem !important;
            transition: all 0.3s ease !important;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05) !important;
          }

          .algolia-chat-enhanced .ais-Chat-inputWrapper:focus-within {
            border-color: #2563eb !important;
            box-shadow: 0 4px 16px rgba(37, 99, 235, 0.15) !important;
          }

          .algolia-chat-enhanced .ais-Chat-input {
            font-size: 0.95rem !important;
            padding: 0.75rem 1rem !important;
            border: none !important;
          }

          .algolia-chat-enhanced .ais-Chat-button {
            background: linear-gradient(135deg, #2563eb, #4f46e5) !important;
            color: white !important;
            border-radius: 0.75rem !important;
            padding: 0.625rem 1.25rem !important;
            font-weight: 600 !important;
            transition: all 0.3s ease !important;
            border: none !important;
            box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3) !important;
          }

          .algolia-chat-enhanced .ais-Chat-button:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4) !important;
          }

          .algolia-chat-enhanced .ais-Chat-button:active {
            transform: translateY(0);
          }
        `}</style>
      </InstantSearch>
    </div>
  );
}
