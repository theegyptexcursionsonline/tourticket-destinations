import type { ReactNode } from 'react';
import OfferThemePin from './theme';

// Runs at HTML parse time on hard loads (WhatsApp links) so the pinned
// palette wins before first paint; OfferThemePin covers client-side
// navigation and restores the visitor's theme on exit.
const PIN_LIGHT =
  "(function(){try{document.documentElement.dataset.storefrontTheme='light';document.documentElement.style.colorScheme='light';}catch(e){}})();";

export default function OfferLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <script id="offer-theme-pin" dangerouslySetInnerHTML={{ __html: PIN_LIGHT }} />
      <OfferThemePin />
      {children}
    </>
  );
}
