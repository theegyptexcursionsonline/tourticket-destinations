'use client';

import { useState, useEffect, useMemo } from 'react';

// Seeded random number generator for consistent values between server/client
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}

// Pre-generate deterministic dust particle positions based on index
function getDustParticleStyle(index: number) {
  return {
    left: `${seededRandom(index * 3 + 1) * 100}%`,
    animationDelay: `${seededRandom(index * 3 + 2) * 5}s`,
    animationDuration: `${5 + seededRandom(index * 3 + 3) * 10}s`,
  };
}

export default function ComingSoonPage() {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isClient, setIsClient] = useState(false);
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  // Pre-computed dust particle styles (deterministic)
  const dustParticles = useMemo(() => 
    [...Array(20)].map((_, i) => getDustParticleStyle(i)), 
  []);

  // Mark as client-side rendered
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Countdown to a launch date (set this to your actual launch date)
  useEffect(() => {
    const launchDate = new Date('2025-02-01T00:00:00').getTime();

    // Initial calculation
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

  // Track mouse for parallax effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      // In production, you'd send this to your backend
      console.log('Email submitted:', email);
      setIsSubmitted(true);
      setEmail('');
    }
  };

  return (
    <div className="coming-soon-container">
      {/* Animated background elements */}
      <div className="bg-elements">
        <div 
          className="pyramid pyramid-1"
          style={{ transform: `translate(${mousePosition.x * 0.5}px, ${mousePosition.y * 0.5}px)` }}
        />
        <div 
          className="pyramid pyramid-2"
          style={{ transform: `translate(${mousePosition.x * -0.3}px, ${mousePosition.y * -0.3}px)` }}
        />
        <div 
          className="pyramid pyramid-3"
          style={{ transform: `translate(${mousePosition.x * 0.7}px, ${mousePosition.y * 0.7}px)` }}
        />
        <div className="sand-dunes" />
        <div className="floating-dust">
          {dustParticles.map((style, i) => (
            <div key={i} className="dust-particle" style={style} />
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="content-wrapper">
        {/* Logo/Brand */}
        <div className="brand">
          <div className="logo-icon">
            <svg viewBox="0 0 100 100" className="ankh-icon">
              <path d="M50 25 C50 15, 35 15, 35 25 C35 35, 50 35, 50 45 C50 35, 65 35, 65 25 C65 15, 50 15, 50 25" fill="none" stroke="currentColor" strokeWidth="3"/>
              <line x1="50" y1="45" x2="50" y2="80" stroke="currentColor" strokeWidth="3"/>
              <line x1="35" y1="55" x2="65" y2="55" stroke="currentColor" strokeWidth="3"/>
            </svg>
          </div>
          <span className="brand-name">Egypt Excursions</span>
        </div>

        {/* Main heading */}
        <h1 className="main-heading">
          <span className="heading-line heading-line-1">Something</span>
          <span className="heading-line heading-line-2">Extraordinary</span>
          <span className="heading-line heading-line-3">Is Coming</span>
        </h1>

        <p className="tagline">
          Discover the wonders of ancient Egypt like never before. 
          Immersive tours, unforgettable experiences, and adventures 
          that transcend time await you.
        </p>

        {/* Countdown timer */}
        <div className="countdown">
          <div className="countdown-item">
            <span className="countdown-value">
              {isClient ? String(timeLeft.days).padStart(2, '0') : '--'}
            </span>
            <span className="countdown-label">Days</span>
          </div>
          <div className="countdown-separator">:</div>
          <div className="countdown-item">
            <span className="countdown-value">
              {isClient ? String(timeLeft.hours).padStart(2, '0') : '--'}
            </span>
            <span className="countdown-label">Hours</span>
          </div>
          <div className="countdown-separator">:</div>
          <div className="countdown-item">
            <span className="countdown-value">
              {isClient ? String(timeLeft.minutes).padStart(2, '0') : '--'}
            </span>
            <span className="countdown-label">Minutes</span>
          </div>
          <div className="countdown-separator">:</div>
          <div className="countdown-item">
            <span className="countdown-value">
              {isClient ? String(timeLeft.seconds).padStart(2, '0') : '--'}
            </span>
            <span className="countdown-label">Seconds</span>
          </div>
        </div>

        {/* Email signup */}
        <div className="signup-section">
          {!isSubmitted ? (
            <form onSubmit={handleSubmit} className="signup-form">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email for early access"
                className="email-input"
                required
              />
              <button type="submit" className="submit-btn">
                <span>Notify Me</span>
                <svg viewBox="0 0 24 24" className="arrow-icon">
                  <path d="M5 12h14M12 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </form>
          ) : (
            <div className="success-message">
              <svg viewBox="0 0 24 24" className="check-icon">
                <path d="M20 6L9 17l-5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>You&apos;re on the list! We&apos;ll notify you when we launch.</span>
            </div>
          )}
        </div>

        {/* Social links */}
        <div className="social-links">
          <a href="#" className="social-link" aria-label="Instagram">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
          </a>
          <a href="#" className="social-link" aria-label="Facebook">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </a>
          <a href="#" className="social-link" aria-label="Twitter">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </a>
          <a href="#" className="social-link" aria-label="YouTube">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
          </a>
        </div>
      </div>

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&display=swap');

        .coming-soon-container {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          background: linear-gradient(
            135deg,
            #0c0a09 0%,
            #1c1917 25%,
            #292524 50%,
            #1c1917 75%,
            #0c0a09 100%
          );
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
        }

        /* Background elements */
        .bg-elements {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .pyramid {
          position: absolute;
          width: 0;
          height: 0;
          border-style: solid;
          opacity: 0.15;
          transition: transform 0.3s ease-out;
        }

        .pyramid-1 {
          bottom: -10%;
          left: 10%;
          border-width: 0 150px 260px 150px;
          border-color: transparent transparent #d4a574 transparent;
        }

        .pyramid-2 {
          bottom: -5%;
          left: 35%;
          border-width: 0 200px 350px 200px;
          border-color: transparent transparent #c4956a transparent;
        }

        .pyramid-3 {
          bottom: -15%;
          right: 15%;
          border-width: 0 120px 200px 120px;
          border-color: transparent transparent #e4b584 transparent;
        }

        .sand-dunes {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 30%;
          background: linear-gradient(
            to top,
            rgba(212, 165, 116, 0.1) 0%,
            transparent 100%
          );
        }

        .floating-dust {
          position: absolute;
          inset: 0;
        }

        .dust-particle {
          position: absolute;
          width: 2px;
          height: 2px;
          background: rgba(212, 165, 116, 0.4);
          border-radius: 50%;
          animation: float-up linear infinite;
        }

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

        /* Content */
        .content-wrapper {
          position: relative;
          z-index: 10;
          text-align: center;
          max-width: 800px;
          animation: fade-in 1s ease-out;
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

        /* Brand */
        .brand {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          margin-bottom: 3rem;
        }

        .logo-icon {
          width: 50px;
          height: 50px;
          color: #d4a574;
        }

        .ankh-icon {
          width: 100%;
          height: 100%;
        }

        .brand-name {
          font-family: 'Cinzel', serif;
          font-size: 1.5rem;
          font-weight: 600;
          color: #d4a574;
          letter-spacing: 0.15em;
          text-transform: uppercase;
        }

        /* Main heading */
        .main-heading {
          display: flex;
          flex-direction: column;
          margin-bottom: 2rem;
        }

        .heading-line {
          font-family: 'Cinzel', serif;
          font-weight: 400;
          line-height: 1.1;
          color: #fafaf9;
        }

        .heading-line-1 {
          font-size: clamp(2rem, 6vw, 4rem);
          opacity: 0;
          animation: slide-up 0.8s ease-out 0.3s forwards;
        }

        .heading-line-2 {
          font-size: clamp(2.5rem, 8vw, 5.5rem);
          background: linear-gradient(135deg, #d4a574 0%, #f5d4a8 50%, #d4a574 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          opacity: 0;
          animation: slide-up 0.8s ease-out 0.5s forwards;
        }

        .heading-line-3 {
          font-size: clamp(2rem, 6vw, 4rem);
          opacity: 0;
          animation: slide-up 0.8s ease-out 0.7s forwards;
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

        /* Tagline */
        .tagline {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(1.1rem, 2.5vw, 1.4rem);
          color: #a8a29e;
          line-height: 1.8;
          max-width: 600px;
          margin: 0 auto 3rem;
          font-style: italic;
        }

        /* Countdown */
        .countdown {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-bottom: 3rem;
          flex-wrap: wrap;
        }

        .countdown-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 1rem 1.5rem;
          background: rgba(212, 165, 116, 0.08);
          border: 1px solid rgba(212, 165, 116, 0.2);
          border-radius: 8px;
          backdrop-filter: blur(10px);
          min-width: 80px;
        }

        .countdown-value {
          font-family: 'Cinzel', serif;
          font-size: clamp(1.8rem, 4vw, 2.5rem);
          font-weight: 600;
          color: #d4a574;
          min-width: 2ch;
        }

        .countdown-label {
          font-family: 'Cormorant Garamond', serif;
          font-size: 0.85rem;
          color: #78716c;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-top: 0.25rem;
        }

        .countdown-separator {
          font-family: 'Cinzel', serif;
          font-size: 2rem;
          color: #d4a574;
          opacity: 0.5;
          margin-bottom: 1.5rem;
        }

        /* Signup form */
        .signup-section {
          margin-bottom: 3rem;
        }

        .signup-form {
          display: flex;
          gap: 0;
          max-width: 500px;
          margin: 0 auto;
          background: rgba(250, 250, 249, 0.05);
          border: 1px solid rgba(212, 165, 116, 0.3);
          border-radius: 50px;
          overflow: hidden;
          transition: border-color 0.3s ease, box-shadow 0.3s ease;
        }

        .signup-form:focus-within {
          border-color: #d4a574;
          box-shadow: 0 0 30px rgba(212, 165, 116, 0.2);
        }

        .email-input {
          flex: 1;
          padding: 1rem 1.5rem;
          background: transparent;
          border: none;
          outline: none;
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.1rem;
          color: #fafaf9;
        }

        .email-input::placeholder {
          color: #78716c;
        }

        .submit-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem 2rem;
          background: linear-gradient(135deg, #d4a574 0%, #c4956a 100%);
          border: none;
          cursor: pointer;
          font-family: 'Cinzel', serif;
          font-size: 0.9rem;
          font-weight: 600;
          color: #0c0a09;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          transition: all 0.3s ease;
        }

        .submit-btn:hover {
          background: linear-gradient(135deg, #e4b584 0%, #d4a574 100%);
          transform: translateX(3px);
        }

        .arrow-icon {
          width: 18px;
          height: 18px;
          transition: transform 0.3s ease;
        }

        .submit-btn:hover .arrow-icon {
          transform: translateX(3px);
        }

        /* Success message */
        .success-message {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 1rem 2rem;
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.3);
          border-radius: 50px;
          color: #4ade80;
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.1rem;
        }

        .check-icon {
          width: 24px;
          height: 24px;
          color: #4ade80;
        }

        /* Social links */
        .social-links {
          display: flex;
          justify-content: center;
          gap: 1.5rem;
        }

        .social-link {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #78716c;
          background: rgba(250, 250, 249, 0.05);
          border: 1px solid rgba(212, 165, 116, 0.2);
          border-radius: 50%;
          transition: all 0.3s ease;
        }

        .social-link:hover {
          color: #d4a574;
          border-color: #d4a574;
          transform: translateY(-3px);
          box-shadow: 0 10px 30px rgba(212, 165, 116, 0.2);
        }

        .social-link svg {
          width: 20px;
          height: 20px;
        }

        /* Responsive */
        @media (max-width: 640px) {
          .coming-soon-container {
            padding: 1.5rem;
          }

          .brand-name {
            font-size: 1.1rem;
          }

          .countdown {
            gap: 0.3rem;
          }

          .countdown-item {
            padding: 0.75rem 1rem;
            min-width: 65px;
          }

          .countdown-separator {
            font-size: 1.5rem;
            margin-bottom: 1rem;
          }

          .signup-form {
            flex-direction: column;
            border-radius: 16px;
          }

          .email-input {
            text-align: center;
            padding: 1.25rem 1rem;
          }

          .submit-btn {
            justify-content: center;
            border-radius: 0 0 14px 14px;
            padding: 1.25rem 2rem;
          }

          .pyramid-1 {
            border-width: 0 80px 140px 80px;
          }

          .pyramid-2 {
            border-width: 0 100px 180px 100px;
          }

          .pyramid-3 {
            border-width: 0 60px 100px 60px;
          }
        }
      `}</style>
    </div>
  );
}
