'use client';

import { useState, useEffect } from 'react';

export default function ComingSoonPage() {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  // Mark component as mounted (client-side only)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Countdown to a launch date (set this to your actual launch date)
  useEffect(() => {
    const launchDate = new Date('2026-01-15T00:00:00').getTime();

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const distance = launchDate - now;

      if (distance > 0) {
        setTimeLeft({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000),
        });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      console.log('Email submitted:', email);
      setIsSubmitted(true);
      setEmail('');
    }
  };

  return (
    <div 
      className="min-h-screen relative overflow-hidden flex items-center justify-center p-8"
      style={{ 
        background: 'linear-gradient(135deg, #0c0a09 0%, #1c1917 25%, #292524 50%, #1c1917 75%, #0c0a09 100%)' 
      }}
      suppressHydrationWarning
    >
      {/* Google Fonts */}
      <link 
        href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&display=swap" 
        rel="stylesheet" 
      />

      {/* Animated background elements */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        {/* Pyramids - positioned lower and more transparent */}
        <div 
          className="absolute transition-transform duration-300"
          style={{ 
            bottom: '-20%', 
            left: '5%',
            width: 0,
            height: 0,
            borderStyle: 'solid',
            borderWidth: '0 120px 200px 120px',
            borderColor: 'transparent transparent rgba(212, 165, 116, 0.08) transparent',
            zIndex: 0,
          }}
        />
        <div 
          className="absolute transition-transform duration-300"
          style={{ 
            bottom: '-25%', 
            left: '30%',
            width: 0,
            height: 0,
            borderStyle: 'solid',
            borderWidth: '0 150px 250px 150px',
            borderColor: 'transparent transparent rgba(196, 149, 106, 0.08) transparent',
            zIndex: 0,
          }}
        />
        <div 
          className="absolute transition-transform duration-300"
          style={{ 
            bottom: '-18%', 
            right: '10%',
            width: 0,
            height: 0,
            borderStyle: 'solid',
            borderWidth: '0 100px 180px 100px',
            borderColor: 'transparent transparent rgba(228, 181, 132, 0.08) transparent',
            zIndex: 0,
          }}
        />

        {/* Sand dunes gradient - reduced height to not overlap content */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-[15%]"
          style={{ 
            background: 'linear-gradient(to top, rgba(212, 165, 116, 0.05) 0%, transparent 100%)',
            zIndex: 0,
          }}
        />

        {/* Floating dust particles - only rendered client-side */}
        {isMounted && (
          <div className="absolute inset-0" suppressHydrationWarning>
            {[
              { left: '5%', delay: '0s', duration: '8s' },
              { left: '12%', delay: '2.5s', duration: '10s' },
              { left: '18%', delay: '1s', duration: '7s' },
              { left: '25%', delay: '3.5s', duration: '12s' },
              { left: '32%', delay: '0.5s', duration: '9s' },
              { left: '38%', delay: '4s', duration: '11s' },
              { left: '45%', delay: '1.5s', duration: '8s' },
              { left: '52%', delay: '2s', duration: '13s' },
              { left: '58%', delay: '3s', duration: '7s' },
              { left: '65%', delay: '0.8s', duration: '10s' },
              { left: '72%', delay: '4.5s', duration: '9s' },
              { left: '78%', delay: '1.2s', duration: '11s' },
              { left: '85%', delay: '2.8s', duration: '8s' },
              { left: '92%', delay: '0.3s', duration: '12s' },
              { left: '8%', delay: '3.8s', duration: '10s' },
              { left: '22%', delay: '1.8s', duration: '9s' },
              { left: '48%', delay: '4.2s', duration: '7s' },
              { left: '62%', delay: '0.6s', duration: '11s' },
              { left: '88%', delay: '2.2s', duration: '13s' },
              { left: '35%', delay: '3.2s', duration: '8s' },
            ].map((particle, i) => (
              <div
                key={i}
                className="absolute w-0.5 h-0.5 rounded-full animate-float-up"
                style={{
                  left: particle.left,
                  background: 'rgba(212, 165, 116, 0.4)',
                  animationDelay: particle.delay,
                  animationDuration: particle.duration,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="relative text-center max-w-[800px] animate-fade-in" style={{ zIndex: 10 }}>
        {/* Logo/Brand */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <div className="w-12 h-12 text-[#d4a574]">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <path d="M50 25 C50 15, 35 15, 35 25 C35 35, 50 35, 50 45 C50 35, 65 35, 65 25 C65 15, 50 15, 50 25" fill="none" stroke="currentColor" strokeWidth="3"/>
              <line x1="50" y1="45" x2="50" y2="80" stroke="currentColor" strokeWidth="3"/>
              <line x1="35" y1="55" x2="65" y2="55" stroke="currentColor" strokeWidth="3"/>
            </svg>
          </div>
          <span 
            className="text-[#d4a574] text-xl font-semibold tracking-[0.15em] uppercase"
            style={{ fontFamily: "'Cinzel', serif" }}
          >
            Egypt Excursions
          </span>
        </div>

        {/* Main heading */}
        <h1 className="flex flex-col mb-8 gap-2">
          <span 
            className="block text-[#fafaf9] leading-[1.1] text-[clamp(2rem,6vw,4rem)] opacity-0 animate-slide-up"
            style={{ fontFamily: "'Cinzel', serif", animationDelay: '0.3s', animationFillMode: 'forwards' }}
          >
            Something
          </span>
          <span 
            className="block leading-[1.1] text-[clamp(2.5rem,8vw,5.5rem)] opacity-0 animate-slide-up"
            style={{ 
              fontFamily: "'Cinzel', serif", 
              animationDelay: '0.5s', 
              animationFillMode: 'forwards',
              color: '#d4a574',
              textShadow: '0 0 20px rgba(212, 165, 116, 0.5)',
            }}
          >
            Extraordinary
          </span>
          <span 
            className="block text-[#fafaf9] leading-[1.1] text-[clamp(2rem,6vw,4rem)] opacity-0 animate-slide-up"
            style={{ fontFamily: "'Cinzel', serif", animationDelay: '0.7s', animationFillMode: 'forwards' }}
          >
            Is Coming
          </span>
        </h1>

        {/* Tagline */}
        <p 
          className="text-[#a8a29e] text-[clamp(1.1rem,2.5vw,1.4rem)] leading-[1.8] max-w-[600px] mx-auto mb-12 italic"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          Discover the wonders of ancient Egypt like never before. 
          Immersive tours, unforgettable experiences, and adventures 
          that transcend time await you.
        </p>

        {/* Countdown timer */}
        <div className="flex items-center justify-center gap-2 mb-12 flex-wrap relative" style={{ zIndex: 10 }}>
          {[
            { value: timeLeft.days, label: 'Days' },
            { value: timeLeft.hours, label: 'Hours' },
            { value: timeLeft.minutes, label: 'Minutes' },
            { value: timeLeft.seconds, label: 'Seconds' },
          ].map((item, index) => (
            <div key={item.label} className="flex items-center relative" style={{ zIndex: 10 }}>
              {index > 0 && (
                <span 
                  className="text-[#d4a574] text-3xl opacity-50 mx-1 mb-6"
                  style={{ fontFamily: "'Cinzel', serif" }}
                >
                  :
                </span>
              )}
              <div 
                className="flex flex-col items-center px-6 py-4 rounded-lg min-w-[80px] backdrop-blur-sm relative"
                style={{ 
                  background: 'rgba(212, 165, 116, 0.12)',
                  border: '1px solid rgba(212, 165, 116, 0.3)',
                  zIndex: 10,
                }}
              >
                <span 
                  className="text-[#d4a574] text-[clamp(1.8rem,4vw,2.5rem)] font-semibold"
                  style={{ fontFamily: "'Cinzel', serif" }}
                >
                  {isMounted ? String(item.value).padStart(2, '0') : '--'}
                </span>
                <span 
                  className="text-[#78716c] text-sm uppercase tracking-[0.1em] mt-1"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  {item.label}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Email signup */}
        <div className="mb-12 relative" style={{ zIndex: 10 }}>
          {!isSubmitted ? (
            <form 
              onSubmit={handleSubmit} 
              className="flex max-w-[500px] mx-auto rounded-full overflow-hidden transition-all duration-300 focus-within:border-[#d4a574] focus-within:shadow-[0_0_30px_rgba(212,165,116,0.2)] relative"
              style={{ 
                background: 'rgba(250, 250, 249, 0.08)',
                border: '1px solid rgba(212, 165, 116, 0.4)',
                zIndex: 10,
              }}
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email for early access"
                className="flex-1 px-6 py-4 bg-transparent border-none outline-none text-[#fafaf9] text-lg placeholder:text-[#78716c]"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
                required
              />
              <button 
                type="submit" 
                className="flex items-center gap-2 px-8 py-4 text-[#0c0a09] font-semibold text-sm uppercase tracking-[0.05em] cursor-pointer transition-all duration-300 hover:translate-x-1"
                style={{ 
                  fontFamily: "'Cinzel', serif",
                  background: 'linear-gradient(135deg, #d4a574 0%, #c4956a 100%)',
                }}
              >
                <span>Notify Me</span>
                <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] transition-transform duration-300 group-hover:translate-x-1">
                  <path d="M5 12h14M12 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </form>
          ) : (
            <div 
              className="flex items-center justify-center gap-3 px-8 py-4 rounded-full text-[#4ade80] text-lg"
              style={{ 
                fontFamily: "'Cormorant Garamond', serif",
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
              }}
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6">
                <path d="M20 6L9 17l-5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>You&apos;re on the list! We&apos;ll notify you when we launch.</span>
            </div>
          )}
        </div>

        {/* Social links */}
        <div className="flex justify-center gap-6 relative" style={{ zIndex: 10 }}>
          {[
            { label: 'Instagram', path: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z' },
            { label: 'Facebook', path: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' },
            { label: 'Twitter', path: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' },
            { label: 'YouTube', path: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z' },
          ].map((social) => (
            <a 
              key={social.label}
              href="#" 
              className="w-11 h-11 flex items-center justify-center text-[#78716c] rounded-full transition-all duration-300 hover:text-[#d4a574] hover:border-[#d4a574] hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(212,165,116,0.2)]"
              style={{ 
                background: 'rgba(250, 250, 249, 0.05)',
                border: '1px solid rgba(212, 165, 116, 0.2)',
              }}
              aria-label={social.label}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d={social.path}/>
              </svg>
            </a>
          ))}
        </div>
      </div>

      {/* Custom keyframes */}
      <style>{`
        @keyframes float-up {
          0% {
            transform: translateY(100vh) scale(0);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(-100px) scale(1);
            opacity: 0;
          }
        }
        
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-float-up {
          animation: float-up linear infinite;
        }
        
        .animate-fade-in {
          animation: fade-in 1s ease-out;
        }
        
        .animate-slide-up {
          animation: slide-up 0.8s ease-out;
        }
        
        @media (max-width: 640px) {
          .countdown-wrapper {
            gap: 0.3rem;
          }
        }
      `}</style>
    </div>
  );
}
