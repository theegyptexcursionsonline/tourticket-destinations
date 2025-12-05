'use client';

import { useState, useEffect } from 'react';
import { TenantPublicConfig } from '@/lib/tenant';

interface ComingSoonPageProps {
  tenant?: TenantPublicConfig | null;
}

export default function ComingSoonPage({ tenant }: ComingSoonPageProps) {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  // Get tenant-specific values with fallbacks
  const brandName = tenant?.name || 'Egypt Excursions Online';
  const logo = tenant?.branding?.logo || '/EEO-logo.png';
  const primaryColor = tenant?.branding?.primaryColor || '#d4a574';
  const accentColor = tenant?.branding?.accentColor || '#FFEB3B';
  const socialLinks = tenant?.socialLinks || {};

  useEffect(() => {
    setIsMounted(true);
  }, []);

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

  // Build social links array from tenant config
  const socialLinksArray = [
    socialLinks.instagram && { label: 'Instagram', url: socialLinks.instagram, path: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z' },
    socialLinks.facebook && { label: 'Facebook', url: socialLinks.facebook, path: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' },
    socialLinks.twitter && { label: 'Twitter', url: socialLinks.twitter, path: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' },
    socialLinks.youtube && { label: 'YouTube', url: socialLinks.youtube, path: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z' },
  ].filter(Boolean) as { label: string; url: string; path: string }[];

  // Default social links if tenant doesn't have any
  const defaultSocialLinks = [
    { label: 'Instagram', url: '#', path: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z' },
    { label: 'Facebook', url: '#', path: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' },
    { label: 'Twitter', url: '#', path: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' },
    { label: 'YouTube', url: '#', path: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z' },
  ];

  const displaySocialLinks = socialLinksArray.length > 0 ? socialLinksArray : defaultSocialLinks;

  return (
    <div style={{
      minHeight: '100vh',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px',
      background: 'linear-gradient(180deg, #0c0a09 0%, #1c1917 50%, #292524 100%)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {/* Google Fonts */}
      <link 
        href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&display=swap" 
        rel="stylesheet" 
      />

      {/* Subtle dust particles */}
      {isMounted && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: `${5 + i * 6}%`,
                width: '4px',
                height: '4px',
                borderRadius: '50%',
                background: `${primaryColor}4D`, // 30% opacity
                animation: `floatUp ${8 + (i % 5) * 2}s linear infinite`,
                animationDelay: `${i * 0.5}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Main content */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        textAlign: 'center',
        maxWidth: '900px',
        width: '100%',
      }}>
        
        {/* Logo/Brand */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '40px',
        }}>
          <img 
            src={logo} 
            alt={brandName} 
            style={{ 
              height: '80px', 
              objectFit: 'contain',
              filter: `drop-shadow(0 0 20px ${primaryColor}4D)`,
            }} 
          />
        </div>

        {/* Main heading */}
        <h1 style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          marginBottom: '32px',
          padding: '0 8px',
        }}>
          <span style={{
            fontFamily: "'Cinzel', serif",
            color: '#f5f5f4',
            fontSize: 'clamp(24px, 5vw, 48px)',
            fontWeight: 400,
            letterSpacing: '0.05em',
          }}>
            Something
          </span>
          <span style={{
            fontFamily: "'Cinzel', Georgia, serif",
            color: accentColor,
            fontSize: 'clamp(28px, 6vw, 56px)',
            fontWeight: 700,
            letterSpacing: '0.02em',
            textShadow: `0 4px 20px ${accentColor}CC, 0 0 40px ${accentColor}99`,
            display: 'block',
          }}>
            Extraordinary
          </span>
          <span style={{
            fontFamily: "'Cinzel', serif",
            color: '#f5f5f4',
            fontSize: 'clamp(24px, 5vw, 48px)',
            fontWeight: 400,
            letterSpacing: '0.05em',
          }}>
            Is Coming
          </span>
        </h1>

        {/* Tagline - tenant specific */}
        <p style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontStyle: 'italic',
          color: '#a8a29e',
          fontSize: 'clamp(16px, 2.5vw, 20px)',
          lineHeight: 1.8,
          maxWidth: '600px',
          margin: '0 auto 40px',
          padding: '0 16px',
        }}>
          {tenant 
            ? `Discover amazing experiences with ${brandName}. Unforgettable tours and adventures await you.`
            : 'Discover the wonders of ancient Egypt like never before. Immersive tours, unforgettable experiences, and adventures that transcend time await you.'
          }
        </p>

        {/* Countdown timer */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          marginBottom: '40px',
          flexWrap: 'wrap',
          padding: '0 16px',
        }}>
          {[
            { value: timeLeft.days, label: 'Days' },
            { value: timeLeft.hours, label: 'Hours' },
            { value: timeLeft.minutes, label: 'Minutes' },
            { value: timeLeft.seconds, label: 'Seconds' },
          ].map((item, index) => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {index > 0 && (
                <span style={{
                  fontFamily: "'Cinzel', serif",
                  color: primaryColor,
                  fontSize: '28px',
                  opacity: 0.4,
                }}>:</span>
              )}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '16px 24px',
                borderRadius: '12px',
                minWidth: '80px',
                background: `${primaryColor}1A`, // 10% opacity
                border: `1px solid ${primaryColor}40`, // 25% opacity
              }}>
                <span style={{
                  fontFamily: "'Cinzel', serif",
                  color: primaryColor,
                  fontSize: 'clamp(24px, 4vw, 36px)',
                  fontWeight: 600,
                }}>
                  {isMounted ? String(item.value).padStart(2, '0') : '--'}
                </span>
                <span style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  color: '#78716c',
                  fontSize: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginTop: '4px',
                }}>
                  {item.label}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Email signup */}
        <div style={{ marginBottom: '40px', padding: '0 16px' }}>
          {!isSubmitted ? (
            <form 
              onSubmit={handleSubmit}
              style={{
                display: 'flex',
                flexDirection: 'row',
                maxWidth: '500px',
                margin: '0 auto',
                borderRadius: '50px',
                overflow: 'hidden',
                background: 'rgba(40, 40, 40, 0.8)',
                border: `1px solid ${primaryColor}4D`,
              }}
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email for early access"
                required
                style={{
                  flex: 1,
                  padding: '16px 20px',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#fafaf9',
                  fontSize: '16px',
                  fontFamily: "'Cormorant Garamond', serif",
                }}
              />
              <button 
                type="submit"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '16px 24px',
                  background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}CC 100%)`,
                  border: 'none',
                  cursor: 'pointer',
                  color: '#0c0a09',
                  fontSize: '14px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontFamily: "'Cinzel', serif",
                  whiteSpace: 'nowrap',
                }}
              >
                <span>Notify Me</span>
                <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px' }}>
                  <path d="M5 12h14M12 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </form>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              padding: '16px 24px',
              borderRadius: '50px',
              maxWidth: '500px',
              margin: '0 auto',
              color: '#4ade80',
              fontSize: '16px',
              fontFamily: "'Cormorant Garamond', serif",
              background: 'rgba(34, 197, 94, 0.15)',
              border: '1px solid rgba(34, 197, 94, 0.4)',
            }}>
              <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px' }}>
                <path d="M20 6L9 17l-5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>You&apos;re on the list! We&apos;ll notify you when we launch.</span>
            </div>
          )}
        </div>

        {/* Social links */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '16px',
        }}>
          {displaySocialLinks.map((social) => (
            <a 
              key={social.label}
              href={social.url} 
              target="_blank"
              rel="noopener noreferrer"
              aria-label={social.label}
              style={{
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#a8a29e',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${primaryColor}33`,
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = primaryColor;
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#a8a29e';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '16px', height: '16px' }}>
                <path d={social.path}/>
              </svg>
            </a>
          ))}
        </div>

        {/* Tenant name footer */}
        {tenant && (
          <div style={{
            marginTop: '40px',
            color: '#78716c',
            fontSize: '14px',
            fontFamily: "'Cormorant Garamond', serif",
          }}>
            © {new Date().getFullYear()} {brandName}. All rights reserved.
          </div>
        )}
      </div>

      {/* Keyframes for dust particles */}
      <style>{`
        @keyframes floatUp {
          0% {
            transform: translateY(100vh);
            opacity: 0;
          }
          10% {
            opacity: 0.6;
          }
          90% {
            opacity: 0.6;
          }
          100% {
            transform: translateY(-20px);
            opacity: 0;
          }
        }
        
        input::placeholder {
          color: #6b6b6b;
        }
        
        @media (max-width: 640px) {
          form {
            flex-direction: column !important;
            border-radius: 16px !important;
          }
          
          form button {
            border-radius: 0 0 14px 14px !important;
          }
        }
      `}</style>
    </div>
  );
}
