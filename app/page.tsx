// app/page.tsx
// ============================================================================
// COMING SOON MODE: Set to `true` to show coming soon page, `false` for normal site
// ============================================================================
const COMING_SOON_MODE = true;
// ============================================================================

import { Metadata } from 'next';
import ComingSoonWrapper from '@/components/ComingSoonWrapper';
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

// Disable caching for coming soon mode, use ISR for normal mode
export const revalidate = COMING_SOON_MODE ? 0 : 60;

export default function HomePage() {
  if (COMING_SOON_MODE) {
    return <ComingSoonWrapper />;
  }
  return <HomePageServer />;
}
