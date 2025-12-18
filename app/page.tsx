// app/page.tsx
// ============================================================================
// COMING SOON MODE: Set to `true` to show coming soon page, `false` for normal site
// ============================================================================
const COMING_SOON_MODE = false;
// ============================================================================

import { Metadata } from 'next';
import ComingSoonWrapper from '@/components/ComingSoonWrapper';
import HomePageServer from './HomePageServer';

// Note: metadata and revalidate must be static values (not conditional)
// When changing COMING_SOON_MODE, also update these exports accordingly
export const metadata: Metadata = {
  title: 'Egypt Excursions Online - Tours & Activities',
  description: 'Discover Egypt\'s wonders with unforgettable tours and experiences. Book your next adventure today.',
};

// Set to 0 for coming soon (no caching), change to 60 for normal mode with ISR
export const revalidate = 0;

export default function HomePage() {
  if (COMING_SOON_MODE) {
    return <ComingSoonWrapper />;
  }
  return <HomePageServer />;
}
