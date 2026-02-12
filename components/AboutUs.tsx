'use client';

import { ArrowRight, Award, DollarSign, Smartphone, CalendarCheck, Anchor, Shield, Users, Clock } from 'lucide-react';
import Image from 'next/image';
import { useTenant } from '@/contexts/TenantContext';
import type { IAboutUsContent } from '@/lib/models/Tenant';

// Props interface for server-side content injection
export interface AboutUsProps {
  content?: IAboutUsContent | null;
}

// Fallback content configurations (used when DB content is not available)
const FALLBACK_CONTENT: Record<string, {
  title: string;
  subtitle: string;
  features: { icon: string; text: string }[];
  image: string;
  imageAlt: string;
  ctaText: string;
  ctaLink: string;
  accentColor: string;
}> = {
  'hurghada-speedboat': {
    title: 'Why book with Hurghada Speedboat?',
    subtitle: 'Your Red Sea adventure experts since 2015.',
    features: [
      { icon: 'anchor', text: 'Modern speedboat fleet maintained to highest standards' },
      { icon: 'shield', text: 'Licensed & insured with experienced captains' },
      { icon: 'users', text: 'Small groups for personalized experiences' },
      { icon: 'clock', text: 'Free cancellation up to 24 hours before' },
    ],
    image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800',
    imageAlt: 'Speedboat on crystal clear Red Sea waters',
    ctaText: 'Explore our boats',
    ctaLink: '/about',
    accentColor: 'from-cyan-500 to-cyan-600',
  },
  'default': {
    title: 'Why book with Egypt Excursions Online?',
    subtitle: 'With 15 years of experience, we are the travel experts.',
    features: [
      { icon: 'award', text: 'Official partner of top museums & attractions' },
      { icon: 'dollar', text: 'Best price guaranteed & simple booking process' },
      { icon: 'smartphone', text: 'No printer needed! Show your tickets on your smartphone' },
      { icon: 'calendar', text: 'Cancel for free up to 8 hours in advance' },
    ],
    image: '/about.png',
    imageAlt: 'A scenic view of a popular travel destination',
    ctaText: 'More about us',
    ctaLink: '/about',
    accentColor: 'from-red-600 to-red-700',
  },
};

const ICON_MAP: Record<string, React.ElementType> = {
  anchor: Anchor,
  shield: Shield,
  users: Users,
  clock: Clock,
  award: Award,
  dollar: DollarSign,
  smartphone: Smartphone,
  calendar: CalendarCheck,
};

export default function WhyBookWithUs({ content: dbContent }: AboutUsProps) {
  const { tenant } = useTenant();
  const tenantId = tenant?.tenantId || 'default';

  // Use DB content if available, otherwise fall back to hardcoded content
  const fallbackContent = FALLBACK_CONTENT[tenantId] || FALLBACK_CONTENT['default'];
  const content = dbContent ? {
    title: dbContent.title,
    subtitle: dbContent.subtitle,
    features: dbContent.features,
    image: dbContent.image,
    imageAlt: dbContent.imageAlt,
    ctaText: dbContent.ctaText,
    ctaLink: dbContent.ctaLink || '/about',
    accentColor: dbContent.accentColor || fallbackContent.accentColor,
  } : fallbackContent;

  return (
    <section className="bg-slate-50 py-12 sm:py-16 md:py-20 lg:py-24">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10 md:gap-12 lg:gap-16 items-center">
          {/* Left Column: Text Content */}
          <div className="order-2 lg:order-1">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 mb-3 tracking-tight">
              {content.title}
            </h2>
            <p className="text-base sm:text-lg text-slate-600 mb-8 sm:mb-10 max-w-lg">
              {content.subtitle}
            </p>

            <ul className="space-y-4 sm:space-y-5 md:space-y-6 mb-8 sm:mb-10">
              {content.features.map((feature, index) => {
                const IconComponent = ICON_MAP[feature.icon] || Award;
                return (
                  <li key={index} className="flex items-start">
                    <IconComponent className="w-5 h-5 sm:w-6 sm:h-6 mr-3 sm:mr-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--primary-color)' }} />
                    <span className="text-base sm:text-lg font-medium text-slate-800 leading-tight">
                      {feature.text}
                    </span>
                  </li>
                );
              })}
            </ul>

            {/* CTA - rounded full button */}
            <a
              href={content.ctaLink}
              className="inline-flex items-center gap-2 sm:gap-3 px-6 sm:px-8 md:px-10 py-3 sm:py-4 rounded-full text-white text-sm sm:text-base font-semibold shadow-xl hover:scale-[1.03] transition-all duration-300 group"
              style={{ background: 'var(--gradient-primary)' }}
            >
              <span>{content.ctaText}</span>
              <ArrowRight className="w-4 sm:w-5 h-4 sm:h-5 transition-transform duration-300 group-hover:translate-x-1 flex-shrink-0" />
            </a>
          </div>

          {/* Right Column: Image */}
          <div className="order-1 lg:order-2 relative w-full h-[300px] sm:h-[400px] md:h-[450px] lg:h-[500px] rounded-2xl overflow-hidden shadow-xl">
            <Image
              src={content.image}
              alt={content.imageAlt}
              fill
              className="object-cover"
              priority
              unoptimized={content.image.startsWith('http')}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
