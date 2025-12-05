'use client';

import dynamic from 'next/dynamic';

// Dynamically import ComingSoonPage with SSR disabled to avoid hydration issues
const ComingSoonPage = dynamic(() => import('@/components/ComingSoonPage'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center">
      <div className="text-amber-600 text-xl animate-pulse" style={{ fontFamily: "'Cinzel', serif" }}>
        Loading...
      </div>
    </div>
  ),
});

export default function ComingSoonWrapper() {
  return <ComingSoonPage />;
}

