'use client';

import { useEffect, useRef } from 'react';
import { liteClient as algoliasearch } from 'algoliasearch/lite';
import { InstantSearch, Chat } from 'react-instantsearch';
// ReactMarkdown and remarkGfm are imported but not used in the user's manual-DOM-parser approach.
// I will leave them in case they are used elsewhere, but they are not used in this component's logic.
import 'instantsearch.css/themes/satellite.css';

const ALGOLIA_APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || 'WMDNV9WSOI';
const ALGOLIA_SEARCH_KEY = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY || 'f485b4906072cedbd2f51a46e5ac2637';
const AGENT_ID = 'fb2ac93a-1b89-40e2-a9cb-c85c1bbd978e';
const INDEX_NAME = process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME || 'foxes_technology';

const searchClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY);

const createTourCardHTML = (tour: any): string => {
  const discountPercent = tour.discountPrice && tour.discountPrice < tour.price
    ? Math.round(((tour.price - tour.discountPrice) / tour.price) * 100)
    : 0;

  return `
    <a href="/tours/${tour.slug || tour.objectID}" target="_blank" rel="noopener noreferrer"
       class="tour-card-link group bg-white border border-blue-100 rounded-lg overflow-hidden hover:shadow-md hover:border-blue-300 transition-all duration-300 block cursor-pointer flex-shrink-0 w-[240px]">
      ${(tour.image || tour.images?.[0] || tour.primaryImage) ? `
        <div class="relative w-full h-32 overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50">
          <img src="${tour.image || tour.images?.[0] || tour.primaryImage}"
               alt="${tour.title || 'Tour'}"
               class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ${tour.isFeatured ? `
            <div class="absolute top-2 start-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-0.5 shadow-md">
              <svg class="w-2.5 h-2.5 fill-current" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              Featured
            </div>
          ` : ''}
          ${discountPercent > 0 ? `
            <div class="absolute top-2 end-2 bg-gradient-to-r from-red-500 to-red-600 text-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow-md">
              -${discountPercent}%
            </div>
          ` : ''}
        </div>
      ` : ''}

      <div class="p-2.5">
        <h3 class="font-semibold text-xs text-slate-900 mb-1 group-hover:text-blue-600 transition-colors line-clamp-2 leading-tight">
          ${tour.title || 'Untitled Tour'}
        </h3>

        <div class="flex flex-wrap items-center gap-1.5 mb-2 text-[10px]">
          ${tour.location ? `
            <span class="flex items-center gap-0.5 bg-blue-50 px-1.5 py-0.5 rounded-full">
              <svg class="w-2.5 h-2.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/></svg>
              <span class="font-medium text-blue-700">${tour.location}</span>
            </span>
          ` : ''}
          ${tour.duration ? `
            <span class="flex items-center gap-0.5 bg-green-50 px-1.5 py-0.5 rounded-full">
              <svg class="w-2.5 h-2.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              <span class="font-medium text-green-700">${tour.duration}</span>
            </span>
          ` : ''}
          ${tour.rating ? `
            <span class="flex items-center gap-0.5 bg-yellow-50 px-1.5 py-0.5 rounded-full">
              <svg class="w-2.5 h-2.5 text-yellow-500 fill-current" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              <span class="font-medium text-yellow-700">${tour.rating}</span>
            </span>
          ` : ''}
        </div>

        <div class="flex items-center justify-between pt-2 border-t border-slate-100">
          <div class="flex items-center gap-1">
            ${tour.discountPrice && tour.discountPrice < tour.price ? `
              <span class="text-slate-400 text-[10px] line-through">$${tour.price}</span>
              <span class="text-blue-600 font-bold text-base">$${tour.discountPrice}</span>
            ` : tour.price ? `
              <span class="text-blue-600 font-bold text-base">$${tour.price}</span>
            ` : ''}
          </div>
          <span class="text-blue-600 text-[10px] font-semibold group-hover:translate-x-0.5 transition-transform">
            View →
          </span>
        </div>
      </div>
    </a>
  `;
};

export default function AIAgentWidget() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Utility functions for localStorage and card management
    const getClosedCards = (): Set<string> => {
      const stored = localStorage.getItem('closedTourCards');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    };

    const saveClosedCards = (closedSet: Set<string>) => {
      localStorage.setItem('closedTourCards', JSON.stringify([...closedSet]));
    };

    const generateMessageId = (content: string): string => {
      // Generate a simple hash from the content for consistency across reloads
      let hash = 0;
      for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      return `msg-${Math.abs(hash)}`;
    };

    // Load closed cards from localStorage
    const closedCards = getClosedCards();
    console.log('Loaded closed cards from localStorage:', Array.from(closedCards));

    // Function to transform JSON messages into tour cards
    const transformMessages = () => {
      if (!containerRef.current) return;

      // Try multiple selectors to find messages
      const messageSelectors = [
        '.ais-Chat-message--assistant',
        '.ais-Chat-message',
        '[class*="Chat-message"]',
        '[class*="assistant"]'
      ];

      let messages: NodeListOf<Element> | null = null;
      for (const selector of messageSelectors) {
        const found = containerRef.current.querySelectorAll(selector);
        if (found.length > 0) {
          messages = found;
          break;
        }
      }

      if (!messages || messages.length === 0) {
        // Fallback: search all divs for JSON content
        const allDivs = containerRef.current.querySelectorAll('div');
        allDivs.forEach((div) => {
          processElement(div);
        });
        return;
      }

      messages.forEach((message) => {
        processElement(message);
      });
    };

    // Helper function to extract JSON objects from text
    const extractJSONObjects = (text: string): any[] => {
      const tours: any[] = [];
      let depth = 0;
      let jsonStart = -1;
      let inString = false;
      let escapeNext = false;

      for (let i = 0; i < text.length; i++) {
        const char = text[i];

        if (escapeNext) {
          escapeNext = false;
          continue;
        }

        if (char === '\\') {
          escapeNext = true;
          continue;
        }

        if (char === '"' && !escapeNext) {
          inString = !inString;
          continue;
        }

        if (inString) continue;

        if (char === '{') {
          if (depth === 0) {
            jsonStart = i;
          }
          depth++;
        } else if (char === '}') {
          depth--;
          if (depth === 0 && jsonStart !== -1) {
            const jsonStr = text.substring(jsonStart, i + 1);
            try {
              const obj = JSON.parse(jsonStr);
              // **FIXED:** Check for slug OR objectID
              if (obj.title && (obj.slug || obj.objectID)) {
                tours.push(obj);
              }
            } catch (_e) {
              // Not valid JSON, skip
            }
            jsonStart = -1;
          }
        }
      }

      return tours;
    };

    // **FIXED:** Helper function to render markdown in text messages
    const renderMarkdownMessage = (element: Element) => {
      // Skip if already processed for markdown
      if (element.classList.contains('markdown-processed')) return;

      // Get the message content element
      const messageContent = element.querySelector('.ais-Chat-message-content');
      if (!messageContent) return;

      const text = messageContent.textContent || '';

      // Skip empty messages or messages with JSON data
      if (!text.trim() || text.includes('"title"') && (text.includes('"slug"') || text.includes('"objectID"'))) return;

      // Mark as processed
      element.classList.add('markdown-processed');

      // Create a wrapper div for markdown content
      const markdownWrapper = document.createElement('div');
      markdownWrapper.className = 'markdown-content';

      const lines = text.split('\n');
      let htmlContent = '';
      let inList = false; // **FIX:** State for list parsing

      lines.forEach((line) => {
        // Convert markdown-style bold (**text** or __text__)
        let processedLine = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        processedLine = processedLine.replace(/__(.+?)__/g, '<strong>$1</strong>');

        // Convert markdown-style italic (*text* or _text_)
        processedLine = processedLine.replace(/\*(.+?)\*/g, '<em>$1</em>');
        processedLine = processedLine.replace(/_(.+?)_/g, '<em>$1</em>');

        const trimmedLine = processedLine.trim();

        // **FIXED:** Handle lists statefully
        if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
          const itemText = trimmedLine.substring(2);
          if (!inList) {
            htmlContent += '<ul>';
            inList = true;
          }
          htmlContent += `<li>${itemText}</li>`;
        } else {
          // If we were in a list and this line is not a list item, close the list
          if (inList) {
            htmlContent += '</ul>';
            inList = false;
          }

          // Handle headings and paragraphs
          if (trimmedLine.startsWith('### ')) {
            htmlContent += `<h3>${trimmedLine.substring(4)}</h3>`;
          } else if (trimmedLine.startsWith('## ')) {
            htmlContent += `<h2>${trimmedLine.substring(3)}</h2>`;
          } else if (trimmedLine.startsWith('# ')) {
            htmlContent += `<h1>${trimmedLine.substring(2)}</h1>`;
          } else if (trimmedLine) {
            htmlContent += `<p>${processedLine}</p>`;
          } else {
            // Keep empty lines as breaks
            htmlContent += '<br/>';
          }
        }
      });

      // **FIX:** Close any list that's still open at the end
      if (inList) {
        htmlContent += '</ul>';
      }

      markdownWrapper.innerHTML = htmlContent;

      // Replace the message content
      messageContent.innerHTML = '';
      messageContent.appendChild(markdownWrapper);
    };

    // Helper function to process an element
    const processElement = (element: Element) => {
      // Check if element is still in the document
      if (!document.contains(element)) return;

      const text = element.textContent || '';

      // Check if element contains tour JSON data
      if (text.includes('"title"') && (text.includes('"slug"') || text.includes('"objectID"'))) {
        // Skip if already processed for tour cards
        if (element.classList.contains('tour-cards-processed')) return;
        try {
          const tours = extractJSONObjects(text);

          if (tours.length > 0) {
            // Generate unique ID based on tour slugs for consistency across reloads
            const tourSlugs = tours.map((t: any) => t.slug || t.objectID).sort().join('-');
            const messageId = generateMessageId(tourSlugs);

            // Check if this message's cards were previously closed
            if (closedCards.has(messageId)) {
              console.log('Skipping closed cards with ID:', messageId);
              // Mark as processed but don't show cards
              element.classList.add('tour-cards-processed');
              // Hide the JSON content but keep the element visible
              element.textContent = '';
              return;
            }

            console.log('Found tours to transform:', tours);
            console.log('Generated message ID:', messageId);

            // Mark as processed first to prevent race conditions
            element.classList.add('tour-cards-processed');
            // Store message ID as data attribute
            (element as HTMLElement).dataset.messageId = messageId;

            // Hide only the message content, not the entire chat
            const messageContent = element.querySelector('.ais-Chat-message-content') as HTMLElement;
            if (messageContent) {
              messageContent.style.opacity = '0';
            } else {
              (element as HTMLElement).style.opacity = '0';
            }

            // Extract any text before the JSON (like a descriptive message)
            let introText = '';
            const firstBraceIndex = text.indexOf('{');
            if (firstBraceIndex > 0) {
              const beforeJson = text.substring(0, firstBraceIndex).trim();
              // Only include if it's a meaningful message (not "Results" or similar)
              if (beforeJson &&
                  !beforeJson.toLowerCase().includes('result') &&
                  beforeJson.length > 5 &&
                  beforeJson.length < 200) {
                introText = beforeJson;
              }
            }

            // Create tour cards HTML
            const cardsHTML = tours.map(tour => createTourCardHTML(tour)).join('');
            const wrapper = document.createElement('div');
            wrapper.className = 'tour-cards-container space-y-3';

         // Build the final HTML without showing JSON or "Results" text
            let finalHTML = `
              <div class="tour-results-wrapper relative" data-message-id="${messageId}">
                <button class="close-tour-cards absolute -top-1 -end-1 bg-slate-800 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-slate-900 transition-colors z-10 text-xs font-bold" aria-label="Close">×</button>
            `;
            if (introText) {
              finalHTML += `<p class="text-xs text-slate-600 mb-2 px-2">${introText}</p>`;
            } else if (tours.length > 1) {
              finalHTML += `<p class="text-xs text-slate-600 mb-2 px-2">Found ${tours.length} tours:</p>`;
            }
            finalHTML += `<div class="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-blue-300 scrollbar-track-transparent px-2">${cardsHTML}</div>`;
            finalHTML += `</div>`;
            wrapper.innerHTML = finalHTML;

            // Attach click handlers to all tour card links and close button
            setTimeout(() => {
              const links = wrapper.querySelectorAll('.tour-card-link');
              links.forEach(link => {
                link.addEventListener('click', (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const href = (link as HTMLAnchorElement).href;
                  window.open(href, '_blank', 'noopener,noreferrer');
                });
              });

              // Add close button handler
              const closeBtn = wrapper.querySelector('.close-tour-cards');
              if (closeBtn) {
                closeBtn.addEventListener('click', (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const resultsWrapper = wrapper.querySelector('.tour-results-wrapper') as HTMLElement;
                  if (resultsWrapper) {
                    // Get message ID and save to localStorage
                    const msgId = resultsWrapper.dataset.messageId;
                    if (msgId) {
                      closedCards.add(msgId);
                      saveClosedCards(closedCards);
                      console.log('Saved closed card ID to localStorage:', msgId);
                      console.log('All closed cards:', Array.from(closedCards));
                    }

                    // Animate and remove only the tour cards, not the parent message
                    resultsWrapper.style.animation = 'fadeOut 0.2s ease-out';
                    setTimeout(() => {
                      resultsWrapper.remove();
                      // Clear the parent element content to avoid showing JSON
                      if (element && document.contains(element)) {
                        element.textContent = '';
                      }
                    }, 200);
                  }
                });
              }
            }, 0);

            // Safely replace content - use requestAnimationFrame to avoid conflicts
            requestAnimationFrame(() => {
              if (document.contains(element)) {
                try {
                  // Clear and append in a safer way
                  while (element.firstChild) {
                    element.removeChild(element.firstChild);
                  }
                  element.appendChild(wrapper);
                  // Fade in the clean result
                  const messageContent = element.querySelector('.ais-Chat-message-content') as HTMLElement;
                  if (messageContent) {
                    messageContent.style.opacity = '1';
                    messageContent.style.transition = 'opacity 0.3s ease-in';
                  } else {
                    (element as HTMLElement).style.opacity = '1';
                    (element as HTMLElement).style.transition = 'opacity 0.3s ease-in';
                  }

                  // Ensure chat trigger remains visible
                  const chatRoot = containerRef.current;
                  if (chatRoot) {
                    const trigger = chatRoot.querySelector('.ais-Chat-trigger') as HTMLElement;
                    if (trigger) {
                      trigger.style.display = 'flex';
                      trigger.style.opacity = '1';
                      trigger.style.visibility = 'visible';
                    }
                  }
                } catch (err) {
                  console.error('Error replacing content:', err);
                  // Fallback: just set innerHTML
                  element.innerHTML = wrapper.innerHTML;
                  (element as HTMLElement).style.opacity = '1';
                }
              }
            });
          }
        } catch (error) {
          console.error('Error transforming tour message:', error);
          // If transformation fails, show the element again
          (element as HTMLElement).style.opacity = '1';
        }
      } else {
        // This is a regular text message, render it with markdown
        renderMarkdownMessage(element);
      }
    };

    // Set up MutationObserver to watch for new messages with debouncing
    let timeoutId: NodeJS.Timeout;
    const observer = new MutationObserver(() => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(transformMessages, 300);
    });

    if (containerRef.current) {
      observer.observe(containerRef.current, {
        childList: true,
        subtree: true,
        characterData: true
      });

      // Initial transformation with delay to ensure content is loaded
      setTimeout(transformMessages, 500);
      setTimeout(transformMessages, 1500);
    }

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, []);

  // Listen for custom event from AI Search Widget
  useEffect(() => {
    const handleOpenAIAgent = (event: CustomEvent) => {
      const query = event.detail?.query;
      console.log('AI Agent opened with query:', query);

      if (query) {
        // Find the chat input and trigger button
        setTimeout(() => {
          // Try to find the Algolia chat input
          const chatInput = containerRef.current?.querySelector('.ais-Chat-input') as HTMLInputElement;
          const chatTextarea = containerRef.current?.querySelector('.ais-Chat-input textarea') as HTMLTextAreaElement;
          const chatButton = containerRef.current?.querySelector('.ais-Chat-trigger') as HTMLButtonElement;

          // Open the chat if it's closed
          if (chatButton) {
            chatButton.click();
          }

          // Set the query in the input
          setTimeout(() => {
            const input = chatTextarea || chatInput;
            if (input) {
              input.value = query;
              input.focus();

              // Trigger input event to update React state
              const inputEvent = new Event('input', { bubbles: true });
              input.dispatchEvent(inputEvent);

              // Try to find and click the submit button
              setTimeout(() => {
                const submitButton = containerRef.current?.querySelector('.ais-Chat-form button[type="submit"]') as HTMLButtonElement;
                if (submitButton) {
                  submitButton.click();
                }
              }, 100);
            }
          }, 300);
        }, 100);
      }
    };

    window.addEventListener('openAIAgent', handleOpenAIAgent as EventListener);

    return () => {
      window.removeEventListener('openAIAgent', handleOpenAIAgent as EventListener);
    };
  }, []);

  // **FIXED:** Removed the redundant ensureTriggerVisible useEffect hook

  return (
    // **FIXED:** Simplified root container classes
    <div ref={containerRef} className="fixed end-0 bottom-0 z-[99999]">
      <InstantSearch searchClient={searchClient} indexName={INDEX_NAME}>
        <Chat
          agentId={AGENT_ID}
          classNames={{
            root: 'ai-chat-root'
          }}
        />
      </InstantSearch>

      {/* Enhanced styling for tour card display */}
      <style jsx global>{`
        /* Chat container */
        .ais-Chat {
          font-family: inherit;
          max-width: 380px;
          width: 380px;
          position: relative;
        }

        /* Mobile chat container */
        @media (max-width: 768px) {
          .ais-Chat {
            max-width: 100vw;
            width: 100vw;
          }
        }

        /* AI Agent Icon - ensure proper positioning */
        .ais-Chat-trigger,
        [class*="Chat-trigger"] {
          position: fixed !important;
          bottom: 24px !important;
          right: 24px !important;
          z-index: 99999 !important; /* **FIXED:** Ensure trigger is on top */
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          display: flex !important;
          opacity: 1 !important;
          visibility: visible !important;
          pointer-events: auto !important;
          isolation: isolate; /* Create stacking context */
        }

        /* Mobile: Show as vertical tab on right side */
        @media (max-width: 768px) {
          .ais-Chat-trigger,
          [class*="Chat-trigger"] {
            top: 50% !important;
            right: 0 !important;
            bottom: auto !important;
            transform: translateY(-50%) !important;
            border-radius: 12px 0 0 12px !important;
            padding: 12px 8px !important;
            min-width: 48px !important;
            min-height: 64px !important;
            flex-direction: column !important;
            gap: 4px !important;
            box-shadow: -2px 0 12px rgba(0, 0, 0, 0.15) !important;
            writing-mode: vertical-rl !important;
            text-orientation: mixed !important;
          }

          /* Style the icon inside */
          .ais-Chat-trigger svg,
          [class*="Chat-trigger"] svg {
            writing-mode: horizontal-tb !important;
            transform: rotate(0deg) !important;
          }
        }

        .ais-Chat-trigger:hover,
        [class*="Chat-trigger"]:hover {
          transform: scale(1.05);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        }

        /* Mobile hover effect */
        @media (max-width: 768px) {
          .ais-Chat-trigger:hover,
          [class*="Chat-trigger"]:hover {
            transform: translateY(-50%) translateX(-4px) !important;
            box-shadow: -4px 0 16px rgba(0, 0, 0, 0.2) !important;
          }
        }

        /* Ensure trigger stays visible even when dialog is open on desktop */
        @media (min-width: 769px) {
          .ais-Chat[data-open="true"] .ais-Chat-trigger,
          .ais-Chat[data-open="true"] [class*="Chat-trigger"] {
            display: flex !important;
            opacity: 1 !important;
            visibility: visible !important;
          }
        }

        /* Chat dialog positioning */
        .ais-Chat-dialog,
        [class*="Chat-dialog"] {
          position: fixed !important;
          bottom: 90px !important;
          right: 24px !important;
          max-height: calc(100vh - 120px);
          z-index: 99998 !important; /* Below trigger */
          isolation: isolate; /* Create stacking context */
        }

        /* **FIXED:** Mobile-specific dialog positioning (FULL SCREEN) */
        @media (max-width: 768px) {
          .ais-Chat-dialog,
          [class*="Chat-dialog"] {
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            width: 100vw !important;
            height: 100dvh !important; /* Use dynamic viewport height */
            max-width: 100vw !important;
            max-height: 100dvh !important;
            transform: none !important;
            border-radius: 0 !important;
          }
        }

        /* Message styling */
        .ais-Chat-message {
          margin-bottom: 1rem;
        }

        /* **FIXED:** Assistant messages containing cards */
        .ais-Chat-message--assistant .ais-Chat-message-content {
          background: transparent !important;
          padding: 0 !important; /* Removed padding */
          min-height: auto !important;
          max-width: 100%; /* Ensure it doesn't overflow */
          overflow: hidden; /* Contain the scrolling cards */
        }

        .ais-Chat-message--assistant .ais-Chat-message-content.tour-cards-processed {
          background: transparent !important;
          padding: 0 !important; /* Removed padding */
          display: block !important;
          visibility: visible !important;
        }

        /* Keep chat input and interface visible */
        .ais-Chat-input,
        .ais-Chat-form,
        [class*="Chat-input"],
        [class*="Chat-form"] {
          display: flex !important;
          visibility: visible !important;
          opacity: 1 !important;
        }

        /* User messages */
        .ais-Chat-message--user .ais-Chat-message-content,
        .ais-Chat [class*="message--user"] [class*="message-content"] {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
          color: white !important;
          border-radius: 1rem !important;
          padding: 0.75rem 1rem !important;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
        }

        /* Tour cards styling - scoped to AI chat only */
        .ais-Chat .tour-card-link {
          text-decoration: none;
          display: block;
          pointer-events: auto !important;
          cursor: pointer !important;
          position: relative;
          z-index: 1;
        }

        /* Mobile tour cards - smaller size */
        @media (max-width: 768px) {
          .ais-Chat .tour-card-link {
            width: 200px !important;
            min-width: 200px !important;
          }
        }

        .ais-Chat .tour-card-link * {
          pointer-events: none;
        }

        .ais-Chat .line-clamp-2 {
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

       /* Horizontal scrollbar for cards */
        .tour-cards-container {
          position: relative;
          z-index: 1;
          max-width: 100%;
          box-sizing: border-box;
        }

        /* Close button styling */
        .close-tour-cards {
          pointer-events: auto !important;
          cursor: pointer !important;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .close-tour-cards:hover {
          transform: scale(1.1);
        }

        /* Tour results wrapper */
        .tour-results-wrapper {
          background: transparent;
          padding-top: 0.5rem; /* Add padding here */
          padding-bottom: 0.5rem;
          border-radius: 0.5rem;
          max-width: 100%;
          box-sizing: border-box;
        }

        /* Animations */
        @keyframes fadeOut {
          from {
            opacity: 1;
            transform: translateY(0);
          }
          to {
            opacity: 0;
            transform: translateY(-10px);
          }
        }

        .tour-cards-container > div {
          scrollbar-width: thin;
          scrollbar-color: #93c5fd transparent;
        }

        .tour-cards-container > div::-webkit-scrollbar {
          height: 4px;
        }

        .tour-cards-container > div::-webkit-scrollbar-track {
          background: transparent;
        }

        .tour-cards-container > div::-webkit-scrollbar-thumb {
          background: #93c5fd;
          border-radius: 2px;
        }

        .tour-cards-container > div::-webkit-scrollbar-thumb:hover {
          background: #60a5fa;
        }

        /* Vertical scrollbar for messages */
        .ais-Chat-messages::-webkit-scrollbar,
        [class*="Chat-messages"]::-webkit-scrollbar {
          width: 6px;
        }

        .ais-Chat-messages::-webkit-scrollbar-track,
        [class*="Chat-messages"]::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 3px;
        }

        .ais-Chat-messages::-webkit-scrollbar-thumb,
        [class*="Chat-messages"]::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }

        .ais-Chat-messages::-webkit-scrollbar-thumb:hover,
        [class*="Chat-messages"]::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        /* Override any display:none on trigger */
        .ais-Chat .ais-Chat-trigger[style*="display: none"] {
          display: flex !important;
        }

        /* Markdown content styling for beautiful, readable text */
        .markdown-content {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
          line-height: 1.7;
          color: #1e293b;
        }

        .markdown-content h1 {
          font-size: 1.5rem;
          font-weight: 700;
          color: #0f172a;
          margin: 1.25rem 0 0.75rem 0;
          padding-bottom: 0.5rem;
          border-bottom: 2px solid #e2e8f0;
          line-height: 1.3;
        }

        .markdown-content h2 {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1e293b;
          margin: 1rem 0 0.6rem 0;
          padding-bottom: 0.4rem;
          border-bottom: 1px solid #e2e8f0;
          line-height: 1.3;
        }

        .markdown-content h3 {
          font-size: 1.1rem;
          font-weight: 600;
          color: #334155;
          margin: 0.875rem 0 0.5rem 0;
          line-height: 1.4;
        }

        .markdown-content p {
          margin: 0.625rem 0;
          font-size: 0.9375rem;
          color: #475569;
          line-height: 1.7;
        }

        .markdown-content strong {
          font-weight: 700;
          color: #0f172a;
        }

        .markdown-content em {
          font-style: italic;
          color: #334155;
        }

        .markdown-content ul {
          margin: 0.75rem 0;
          padding-left: 1.5rem;
          list-style-type: disc;
        }

        .markdown-content ul li {
          margin: 0.4rem 0;
          font-size: 0.9375rem;
          color: #475569;
          line-height: 1.6;
          padding-left: 0.25rem;
        }

        .markdown-content ul li::marker {
          color: #3b82f6;
          font-size: 0.875rem;
        }

        .markdown-content ol {
          margin: 0.75rem 0;
          padding-left: 1.5rem;
          list-style-type: decimal;
        }

        .markdown-content ol li {
          margin: 0.4rem 0;
          font-size: 0.9375rem;
          color: #475569;
          line-height: 1.6;
          padding-left: 0.25rem;
        }

        .markdown-content ol li::marker {
          color: #3b82f6;
          font-weight: 600;
        }

        .markdown-content br {
          content: "";
          display: block;
          margin: 0.375rem 0;
        }

        /* First paragraph after heading should have less top margin */
        .markdown-content h1 + p,
        .markdown-content h2 + p,
        .markdown-content h3 + p {
          margin-top: 0.5rem;
        }

        /* List items with nested bold text */
        .markdown-content li strong {
          color: #1e293b;
        }

        /* Improve spacing for consecutive headings */
        .markdown-content h1 + h2,
        .markdown-content h2 + h3 {
          margin-top: 0.5rem;
        }

        /* Better readability for assistant messages with markdown */
        .ais-Chat-message--assistant .markdown-content {
          background: linear-gradient(to bottom, #ffffff, #f8fafc);
          padding: 1rem;
          border-radius: 0.75rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        /* Mobile responsive text sizes */
        @media (max-width: 768px) {
          .markdown-content h1 {
            font-size: 1.25rem;
          }

          .markdown-content h2 {
            font-size: 1.1rem;
          }

          .markdown-content h3 {
            font-size: 1rem;
          }

          .markdown-content p,
          .markdown-content li {
            font-size: 0.875rem;
          }
        }
      `}</style>
    </div>
  );
}