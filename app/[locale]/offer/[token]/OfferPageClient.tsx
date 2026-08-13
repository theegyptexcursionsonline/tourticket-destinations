'use client';

import { designFor } from './design';
import { LAYOUTS } from './layouts';
import { DeskBar, StickyBar, type OfferView } from './primitives';

export type { OfferTour, OfferQuote, OfferView } from './primitives';

/**
 * Each destination renders its own architecture — what the cities share is the
 * conversion mechanic (code, countdown, action bars) and the price contract,
 * never the layout.
 */
export default function OfferPageClient({ view, locale }: { view: OfferView; locale: string }) {
  const design = designFor(view.tenantId);
  const Layout = LAYOUTS[design.archetype];
  return (
    <main className="min-h-screen pb-28 md:pb-0" style={{ backgroundColor: design.paper }}>
      <DeskBar view={view} design={design} />
      <Layout view={view} design={design} locale={locale} />
      <StickyBar view={view} design={design} />
    </main>
  );
}
