'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, User } from 'lucide-react';

// Define the structure of a message
interface Message {
  id: number;
  text: string;
  sender: 'bot' | 'user';
}

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Function to scroll to the latest message
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Add initial welcome message when chat opens
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        { id: 1, text: "Hi there! 👋 I'm here to help. How can I assist you with your travel plans today?", sender: 'bot' }
      ]);
    }
  }, [isOpen, messages.length]);

  // Listen for external events (from Footer)
  useEffect(() => {
    const handler = (_e: Event) => {
      // Optionally, you could read e.detail if you want to pass metadata
      setIsOpen(true);

      // focus input after animation/open
      setTimeout(() => inputRef.current?.focus(), 120);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('open-chatbot', handler as EventListener);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('open-chatbot', handler as EventListener);
      }
    };
  }, []);

  // Effect to scroll down when new messages are added or typing changes
  useEffect(scrollToBottom, [messages, isTyping]);

  const toggleChat = () => {
    setIsOpen(prev => !prev);
    // focus when opening via toggle
    if (!isOpen) setTimeout(() => inputRef.current?.focus(), 120);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = inputValue.trim();
    if (!trimmedInput) return;

    // Add user's message
    const userMessage: Message = {
      id: Date.now(),
      text: trimmedInput,
      sender: 'user',
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');

    // Simulate bot response
    setIsTyping(true);
    setTimeout(() => {
      const botResponse: Message = {
        id: Date.now() + 1,
        text: "Thanks for your message! An expert is being connected and will be with you shortly.",
        sender: 'bot',
      };
      setIsTyping(false);
      setMessages(prev => [...prev, botResponse]);
    }, 1500);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.5 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.5 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="w-[350px] h-[500px] bg-white rounded-lg shadow-2xl flex flex-col origin-bottom-right"
          >
            {/* Chat Header */}
            <div className="bg-slate-800 text-white p-4 rounded-t-lg flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-white p-1.5 rounded-full">
                  <User size={20} className="text-slate-800" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Live Support</h3>
                  <p className="text-xs opacity-80">Typically replies in a few minutes</p>
                </div>
              </div>
              <button onClick={toggleChat} className="p-1 rounded-full hover:bg-slate-700 transition-colors" aria-label="Close chat">
                <X size={20} />
              </button>
            </div>

            {/* Message Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {messages.map((message) => (
                <div key={message.id} className={`flex items-end gap-2 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {message.sender === 'bot' && <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0"><User size={16} className="text-slate-600"/></div>}
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 shadow-sm ${message.sender === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-100 text-slate-800 rounded-bl-none'}`}>
                    <p className="text-sm">{message.text}</p>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex items-end gap-2 justify-start">
                  <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0"><User size={16} className="text-slate-600"/></div>
                  <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-slate-100 shadow-sm rounded-bl-none">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></span>
                      <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-slate-200">
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 w-full px-4 py-2 border border-slate-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button type="submit" className="bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700 transition-colors disabled:bg-blue-300" aria-label="Send message" disabled={!inputValue.trim()}>
                  <Send size={20} />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Toggle Button */}
      <motion.button
        onClick={toggleChat}
        className="w-16 h-16 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        <AnimatePresence initial={false}>
            {isOpen ? (
                <motion.div key="close" initial={{opacity: 0, rotate: -90}} animate={{opacity: 1, rotate: 0}} exit={{opacity: 0, rotate: 90}}>
                    <X size={30} />
                </motion.div>
            ) : (
                <motion.div key="open" initial={{opacity: 0, rotate: 90}} animate={{opacity: 1, rotate: 0}} exit={{opacity: 0, rotate: -90}}>
                    <MessageSquare size={30} />
                </motion.div>
            )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
