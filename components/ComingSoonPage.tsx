'use client';

import { useState, useEffect } from 'react';
import { TenantPublicConfig } from '@/lib/tenant';

interface ComingSoonPageProps {
  tenant?: TenantPublicConfig | null;
}

// Theme configuration for different tenants
const TENANT_THEMES: Record<string, {
  brandName: string;
  logo: string;
  background: string;
  accentColor: string;
  primaryColor: string;
  contentTone: string;
  glowColor: string;
  deco: 'stars' | 'waves' | 'sand' | 'pyramids';
  heading: { top: string; middle: string; bottom: string };
  tagline: string;
  features?: { title: string; desc: string; icon: string }[];
}> = {
  'hurghada-speedboat': {
    brandName: 'Hurghada Speedboat',
    logo: '/branding/hurghada-speedboat-logo.png',
    background: 'linear-gradient(180deg, #001230 0%, #002451 35%, #013B66 60%, #0077B6 85%, #00A8E8 100%)',
    accentColor: '#00E0FF',
    primaryColor: '#64FFDA',
    contentTone: '#d7f3ff',
    glowColor: '#00E0FFAA',
    deco: 'waves',
    heading: {
      top: 'Red Sea',
      middle: 'Speed Rush',
      bottom: 'Is Igniting Soon',
    },
    tagline: 'Strap in for high-octane speedboat rides, secret snorkeling coves, and cinematic sunsets along the Hurghada coast.',
    features: [
      { title: 'Island Hopping', desc: 'Giftun, Orange Bay & secret sandbars', icon: '🏝️' },
      { title: 'Snorkeling Paradise', desc: 'Crystal reefs, gear & GoPro footage included', icon: '🤿' },
      { title: 'Sunset Cruises', desc: 'Chase the horizon at golden hour', icon: '🌅' },
      { title: 'Private Charters', desc: 'Exclusive boats for groups & celebrations', icon: '🚤' },
    ],
  },
  'hurghada': {
    brandName: 'Hurghada Excursions',
    logo: '/branding/hurghada-logo.png',
    background: 'linear-gradient(180deg, #0c0a09 0%, #1a1a2e 50%, #16213e 100%)',
    accentColor: '#FF6B6B',
    primaryColor: '#4ECDC4',
    contentTone: '#e0e0e0',
    glowColor: '#FF6B6BAA',
    deco: 'waves',
    heading: {
      top: 'Hurghada',
      middle: 'Adventures',
      bottom: 'Await You',
    },
    tagline: 'Experience the magic of the Red Sea with world-class diving, desert safaris, and unforgettable excursions.',
  },
  'cairo': {
    brandName: 'Cairo Tours',
    logo: '/branding/cairo-logo.png',
    background: 'linear-gradient(180deg, #1a1a2e 0%, #2d2d44 50%, #3d3d5c 100%)',
    accentColor: '#FFD700',
    primaryColor: '#C9A227',
    contentTone: '#e8e8e8',
    glowColor: '#FFD700AA',
    deco: 'pyramids',
    heading: {
      top: 'Ancient',
      middle: 'Cairo',
      bottom: 'Unveiled',
    },
    tagline: 'Walk among pharaohs at the Pyramids, explore the treasures of the Egyptian Museum, and discover 5000 years of history.',
  },
  'luxor': {
    brandName: 'Luxor Excursions',
    logo: '/branding/luxor-logo.png',
    background: 'linear-gradient(180deg, #2c1810 0%, #3d2317 50%, #4a2c1c 100%)',
    accentColor: '#FFB347',
    primaryColor: '#D4A574',
    contentTone: '#e8ddd4',
    glowColor: '#FFB347AA',
    deco: 'sand',
    heading: {
      top: 'Temple',
      middle: 'Kingdom',
      bottom: 'Awaits',
    },
    tagline: 'Journey through the Valley of Kings, marvel at Karnak Temple, and cruise the legendary Nile.',
  },
};

export default function ComingSoonPage({ tenant }: ComingSoonPageProps) {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  // Determine if we have a specific tenant theme
  const tenantId = tenant?.tenantId || 'default';
  const isSpeedboat = tenantId === 'hurghada-speedboat';
  const hasCustomTheme = tenantId in TENANT_THEMES;

  // Get theme configuration
  const getTheme = () => {
    // If tenant has a predefined theme, use it
    if (hasCustomTheme) {
      const theme = TENANT_THEMES[tenantId];
      return {
        ...theme,
        // Override with tenant's actual branding if available
        brandName: tenant?.name || theme.brandName,
        logo: tenant?.branding?.logo || theme.logo,
      };
    }
    
    // Default theme for any other tenant
    return {
      brandName: tenant?.name || 'Egypt Excursions Online',
      logo: tenant?.branding?.logo || '/EEO-logo.png',
      background: 'linear-gradient(180deg, #0c0a09 0%, #1c1917 50%, #292524 100%)',
      accentColor: tenant?.branding?.accentColor || '#FFEB3B',
      primaryColor: tenant?.branding?.primaryColor || '#d4a574',
      contentTone: '#a8a29e',
      glowColor: (tenant?.branding?.accentColor || '#FFEB3B') + 'CC',
      deco: 'stars' as const,
      heading: {
        top: 'Something',
        middle: 'Extraordinary',
        bottom: 'Is Coming',
      },
      tagline: tenant
        ? `Discover amazing experiences with ${tenant.name}. Unforgettable tours and adventures await you.`
        : 'Discover the wonders of ancient Egypt like never before. Immersive tours, unforgettable experiences, and adventures that transcend time await you.',
    };
  };

  const THEME = getTheme();
  const { brandName, logo, background, accentColor, primaryColor, contentTone, glowColor, deco, heading, tagline } = THEME;
  const features = 'features' in THEME ? THEME.features : undefined;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          source: 'coming_soon',
          tenantId: tenant?.tenantId || 'default'
        }),
      });
      
      if (response.ok) {
        setIsSubmitted(true);
        setEmail('');
      }
    } catch (error) {
      console.error('Subscription error:', error);
    } finally {
      setIsSubmitting(false);
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
      background,
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
          {[...Array(18)].map((_, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: `${isSpeedboat ? (i * 5.5) % 100 : 5 + i * 6}%`,
                width: isSpeedboat ? '6px' : '4px',
                height: isSpeedboat ? `${8 + (i % 4) * 4}px` : '4px',
                borderRadius: isSpeedboat ? '30% 30% 50% 50%' : '50%',
                background: isSpeedboat ? `${accentColor}33` : `${primaryColor}4D`,
                animation: `${isSpeedboat ? 'floatBubble' : 'floatUp'} ${8 + (i % 5) * 2}s linear infinite`,
                animationDelay: `${i * 0.45}s`,
              }}
            />
          ))}
        </div>
      )}

      {isSpeedboat && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1 }}>
          {[...Array(3)].map((_, idx) => (
            <div
              key={idx}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: `${-10 + idx * 4}%`,
                height: '160px',
                background: `linear-gradient(180deg, ${accentColor}0${idx} 0%, ${accentColor}11 40%, transparent 100%)`,
                opacity: 0.6 - idx * 0.15,
                transform: `translateY(${idx * 6}px)`,
                animation: `waveMotion ${12 + idx * 4}s ease-in-out infinite`,
              }}
            />
          ))}
          <div
            style={{
              position: 'absolute',
              left: '15%',
              bottom: '18%',
              width: '160px',
              height: '60px',
              background: 'linear-gradient(90deg, #FFD700, #FFA500)',
              clipPath: 'polygon(0% 20%, 70% 0%, 100% 25%, 95% 70%, 30% 100%)',
              opacity: 0.35,
              filter: 'blur(2px)',
              animation: 'boatFloat 6s ease-in-out infinite',
            }}
          />
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
            {heading.top}
          </span>
          <span style={{
            fontFamily: "'Cinzel', Georgia, serif",
            color: accentColor,
            fontSize: 'clamp(28px, 6vw, 56px)',
            fontWeight: 700,
            letterSpacing: '0.02em',
            textShadow: `0 4px 20px ${glowColor}, 0 0 40px ${glowColor}`,
            display: 'block',
          }}>
            {heading.middle}
          </span>
          <span style={{
            fontFamily: "'Cinzel', serif",
            color: '#f5f5f4',
            fontSize: 'clamp(24px, 5vw, 48px)',
            fontWeight: 400,
            letterSpacing: '0.05em',
          }}>
            {heading.bottom}
          </span>
        </h1>

        {/* Tagline - tenant specific */}
        <p style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontStyle: 'italic',
          color: contentTone,
          fontSize: 'clamp(16px, 2.5vw, 20px)',
          lineHeight: 1.8,
          maxWidth: '640px',
          margin: '0 auto 40px',
          padding: '0 16px',
        }}>
          {tagline}
        </p>

        {/* Feature Cards - Show for tenants with features */}
        {features && features.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '40px',
            maxWidth: '900px',
            margin: '0 auto 40px',
            padding: '0 16px',
          }}>
            {features.map((feature, idx) => (
              <div key={feature.title} style={{
                padding: '20px',
                borderRadius: '20px',
                background: `linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)`,
                backdropFilter: 'blur(10px)',
                border: `1px solid ${accentColor}25`,
                transform: isMounted ? 'translateY(0)' : 'translateY(20px)',
                opacity: isMounted ? 1 : 0,
                transition: `all 0.5s ease ${idx * 0.1}s`,
              }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>{feature.icon}</div>
                <div style={{ 
                  fontFamily: "'Cinzel', serif", 
                  color: accentColor, 
                  marginBottom: '8px', 
                  fontSize: '16px',
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                }}>{feature.title}</div>
                <div style={{ 
                  fontFamily: "'Cormorant Garamond', serif", 
                  fontSize: '14px',
                  color: contentTone,
                  opacity: 0.9,
                  lineHeight: 1.5,
                }}>{feature.desc}</div>
              </div>
            ))}
          </div>
        )}

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
                disabled={isSubmitting}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '16px 24px',
                  background: isSubmitting 
                    ? `${primaryColor}80`
                    : `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}CC 100%)`,
                  border: 'none',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  color: '#0c0a09',
                  fontSize: '14px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontFamily: "'Cinzel', serif",
                  whiteSpace: 'nowrap',
                  transition: 'all 0.3s ease',
                }}
              >
                {isSubmitting ? (
                  <>
                    <svg 
                      viewBox="0 0 24 24" 
                      style={{ 
                        width: '16px', 
                        height: '16px',
                        animation: 'spin 1s linear infinite',
                      }}
                    >
                      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="32" strokeDashoffset="12"/>
                    </svg>
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <span>Notify Me</span>
                    <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px' }}>
                      <path d="M5 12h14M12 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </>
                )}
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
          flexWrap: 'wrap',
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

      {/* Keyframes for animations */}
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
        @keyframes floatBubble {
          0% {
            transform: translateY(120%) translateX(0);
            opacity: 0;
          }
          20% { opacity: 0.6; }
          100% {
            transform: translateY(-50%) translateX(10px);
            opacity: 0;
          }
        }
        @keyframes waveMotion {
          0% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(6px) translateX(20px); }
          100% { transform: translateY(0) translateX(0); }
        }
        @keyframes boatFloat {
          0% { transform: translateY(0) translateX(0) rotate(-2deg); }
          50% { transform: translateY(-8px) translateX(10px) rotate(2deg); }
          100% { transform: translateY(0) translateX(0) rotate(-2deg); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
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
