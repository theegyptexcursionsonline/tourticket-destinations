'use client';

import { designFor } from './design';
import { LAYOUTS } from './layouts';
import { DeskBar, StickyBar, useCopy, whatsappHref, type OfferView } from './primitives';
import { ExitRescue, ScrollProgress } from './luxe';

export type { OfferTour, OfferQuote, OfferView } from './primitives';

/**
 * Each destination renders its own architecture — what the cities share is the
 * conversion mechanic (code, countdown, action bars) and the price contract,
 * never the layout.
 */
export default function OfferPageClient({
  view,
  locale,
  fontClass = '',
}: {
  view: OfferView;
  locale: string;
  fontClass?: string;
}) {
  const design = designFor(view.tenantId);
  const Layout = LAYOUTS[design.archetype];
  const [copied, copy] = useCopy(view.code);
  return (
    <main className={`min-h-screen pb-28 md:pb-0 ${fontClass}`} style={{ backgroundColor: design.paper }}>
      <ScrollProgress color={view.brandColor} />
      <DeskBar view={view} design={design} />
      <Layout view={view} design={design} locale={locale} />
      <StickyBar view={view} design={design} />
      <ExitRescue
        code={view.code}
        label={view.label}
        color={view.brandColor}
        expiresAt={view.expiresAt}
        firstName={view.firstName}
        whatsappHref={whatsappHref(view)}
        onCopy={copy}
        copied={copied}
      />
    </main>
  );
}
