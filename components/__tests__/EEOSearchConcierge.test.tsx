import React from 'react';
import { cleanup, render, waitFor } from '@testing-library/react';
import EEOSearchConcierge from '@/components/EEOSearchConcierge';

let pathname = '/en';
let locale = 'en';
let aiSearchEnabled = true;

jest.mock('next/navigation', () => ({ usePathname: () => pathname }));
jest.mock('next-intl', () => ({ useLocale: () => locale }));
jest.mock('@/contexts/TenantContext', () => ({
  useTenant: () => ({ tenant: { features: { enableAISearch: aiSearchEnabled } } }),
}));

describe('EEOSearchConcierge', () => {
  beforeEach(() => {
    pathname = '/en';
    locale = 'en';
    aiSearchEnabled = true;
  });

  afterEach(() => {
    cleanup();
    document.getElementById('eeo-search-concierge-script')?.remove();
    document.getElementById('foxes-launcher-host')?.remove();
  });

  it('loads the same hosted AI Search Agent launcher and widget used on EEO', async () => {
    render(<EEOSearchConcierge />);
    await waitFor(() => {
      const script = document.getElementById('eeo-search-concierge-script') as HTMLScriptElement;
      expect(script.dataset.widgetId).toBe('wgt_6JW5umlfasNQfJywtFPs6g');
      expect(script.dataset.style).toBe('searchbar');
      expect(script.dataset.color).toBe('#4385F6');
      expect(script.src).toContain('https://search.foxestechnology.com/widget/foxes-launcher.js');
    });
  });

  it.each(['/en/checkout', '/de/booking/reference', '/en/admin'])('stays off sensitive route %s', async (route) => {
    pathname = route;
    render(<EEOSearchConcierge />);
    await waitFor(() => expect(document.getElementById('eeo-search-concierge-script')).toBeNull());
  });

  it('honors a tenant that disables AI Search', async () => {
    aiSearchEnabled = false;
    render(<EEOSearchConcierge />);
    await waitFor(() => expect(document.getElementById('eeo-search-concierge-script')).toBeNull());
  });

  it('uses the RTL-safe position and Arabic copy', async () => {
    pathname = '/ar/tours';
    locale = 'ar';
    render(<EEOSearchConcierge />);
    await waitFor(() => {
      const script = document.getElementById('eeo-search-concierge-script') as HTMLScriptElement;
      expect(script.dataset.position).toBe('left');
      expect(script.dataset.dir).toBe('rtl');
      expect(script.dataset.placeholder).toBe('ابحث عن رحلات مصر...');
    });
  });
});
