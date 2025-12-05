// app/page.tsx
// ============================================================================
// COMING SOON MODE: Set to `true` to show coming soon page, `false` for normal site
// ============================================================================
const COMING_SOON_MODE = true;
// ============================================================================

import { Metadata } from 'next';
import ComingSoonWrapper from '@/components/ComingSoonWrapper';
import HomePageServer from './HomePageServer';

// Note: metadata and revalidate must be static values (not conditional)
// When changing COMING_SOON_MODE, also update these exports accordingly
export const metadata: Metadata = {
  title: 'Coming Soon - Egypt Excursions Online',
  description: 'Something extraordinary is coming. Discover Egypt\'s wonders with unforgettable tours and experiences. Sign up for early access.',
};

// Set to 0 for coming soon (no caching), change to 60 for normal mode with ISR
export const revalidate = 0;

export default function HomePage() {
  if (COMING_SOON_MODE) {
    return <ComingSoonWrapper />;
  }
  return <HomePageServer />;
}
