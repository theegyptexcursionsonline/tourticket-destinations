// app/page.tsx
// ============================================================================
// COMING SOON MODE: Set to `true` to show coming soon page, `false` for normal site
// ============================================================================
const COMING_SOON_MODE = true;
// ============================================================================

import { Metadata } from 'next';
import ComingSoonPage from '@/components/ComingSoonPage';
import HomePageServer from './HomePageServer';

export const metadata: Metadata = COMING_SOON_MODE
  ? {
      title: 'Coming Soon - Egypt Excursions Online',
      description: 'Something extraordinary is coming. Discover Egypt\'s wonders with unforgettable tours and experiences. Sign up for early access.',
    }
  : {
      title: 'Egypt Excursions Online - Tours, Activities & Experiences',
      description: 'Discover Egypt\'s wonders with unforgettable tours and experiences. From Pyramids to Nile cruises, book your adventure today.',
    };

// Ensure Next.js picks up the ISR config for the homepage route.
export const revalidate = 60;

export default function HomePage() {
  if (COMING_SOON_MODE) {
    return <ComingSoonPage />;
  }
  return <HomePageServer />;
}
