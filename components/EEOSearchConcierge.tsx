'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useTenant } from '@/contexts/TenantContext';

const SEARCH_ORIGIN = process.env.NEXT_PUBLIC_FOXES_SEARCH_ORIGIN || 'https://search.foxestechnology.com';
const WIDGET_ID = process.env.NEXT_PUBLIC_FOXES_SEARCH_WIDGET_ID || 'wgt_6JW5umlfasNQfJywtFPs6g';
const SCRIPT_ID = 'eeo-search-concierge-script';
const HOST_ID = 'foxes-launcher-host';
const CLOSE_EVENT = 'foxes:search:close';
const DESTROY_EVENT = 'foxes:search:destroy';
const EEO_BRAND_BLUE = '#4385F6';
const MOBILE_BOOKING_BAR_SELECTOR = '[data-mobile-booking-bar="true"]';
const MOBILE_ACTION_GAP_PX = 12;
const LAUNCHER_RELEASE = '20260814-load-recovery-v1';

const copy: Record<string, { label: string; kicker: string; placeholder: string }> = {
  en: { label: 'Search Egypt tours with AI', kicker: 'AI trip search', placeholder: 'Search Egypt tours...' },
  ar: { label: 'ابحث عن رحلات مصر بالذكاء الاصطناعي', kicker: 'بحث ذكي للرحلات', placeholder: 'ابحث عن رحلات مصر...' },
  de: { label: 'Ägypten-Touren mit KI suchen', kicker: 'KI-Reisesuche', placeholder: 'Ägypten-Touren suchen...' },
  fr: { label: 'Rechercher des excursions en Égypte avec l’IA', kicker: 'Recherche voyage IA', placeholder: 'Excursions en Égypte...' },
  es: { label: 'Buscar tours por Egipto con IA', kicker: 'Búsqueda de viajes con IA', placeholder: 'Buscar tours en Egipto...' },
};

// Conversion-critical or transactional surfaces own their own call to action;
// a floating search launcher there competes with it or leaks the customer away.
const HIDDEN_ROUTES = ['/admin', '/checkout', '/booking', '/payment', '/login', '/signup', '/offer'];

export default function EEOSearchConcierge() {
  const pathname = usePathname() || '';
  const locale = useLocale();
  const { tenant } = useTenant();
  const enabled = tenant?.features?.enableAISearch !== false;

  useEffect(() => {
    const normalizedPath = pathname.replace(/^\/(en|ar|de|fr|es)(?=\/|$)/, '') || '/';
    const hidden = HIDDEN_ROUTES.some((route) => normalizedPath === route || normalizedPath.startsWith(`${route}/`));
    let observer: MutationObserver | null = null;
    let syncFrame: number | null = null;

    const sync = () => {
      const host = document.getElementById(HOST_ID);
      if (!host) return;
      const launcher = host.shadowRoot?.querySelector<HTMLElement>('.launcher');
      const modalOpen = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]'))
        .some((dialog) => !dialog.closest('.gm-style') && dialog.getClientRects().length > 0);
      if (modalOpen) window.dispatchEvent(new CustomEvent(CLOSE_EVENT));
      host.hidden = modalOpen;
      if (!launcher) return;
      const bookingBar = document.querySelector<HTMLElement>(MOBILE_BOOKING_BAR_SELECTOR);
      const bookingBarHeight = bookingBar?.getBoundingClientRect().height ?? 0;
      if (!modalOpen && bookingBarHeight > 0) {
        launcher.style.setProperty('bottom', `${Math.ceil(bookingBarHeight) + MOBILE_ACTION_GAP_PX}px`, 'important');
      } else {
        launcher.style.removeProperty('bottom');
      }
    };

    const scheduleSync = () => {
      if (syncFrame !== null) return;
      syncFrame = window.requestAnimationFrame(() => {
        syncFrame = null;
        sync();
      });
    };

    const removeWidget = () => {
      observer?.disconnect();
      if (syncFrame !== null) window.cancelAnimationFrame(syncFrame);
      syncFrame = null;
      window.dispatchEvent(new CustomEvent(DESTROY_EVENT));
      document.getElementById(SCRIPT_ID)?.remove();
      document.getElementById(HOST_ID)?.remove();
    };

    if (hidden || !enabled) {
      removeWidget();
      return removeWidget;
    }

    removeWidget();
    const localizedCopy = copy[locale] || copy.en;
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = `${SEARCH_ORIGIN}/widget/foxes-launcher.js?v=${LAUNCHER_RELEASE}`;
    script.async = true;
    script.dataset.widgetId = WIDGET_ID;
    script.dataset.apiUrl = SEARCH_ORIGIN;
    script.dataset.style = 'searchbar';
    script.dataset.label = localizedCopy.label;
    script.dataset.kicker = localizedCopy.kicker;
    script.dataset.placeholder = localizedCopy.placeholder;
    script.dataset.color = EEO_BRAND_BLUE;
    script.dataset.position = locale === 'ar' ? 'left' : 'right';
    script.dataset.dir = locale === 'ar' ? 'rtl' : 'ltr';
    script.dataset.locale = locale;
    script.dataset.rememberDismiss = 'false';
    document.body.appendChild(script);

    observer = new MutationObserver(scheduleSync);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'hidden', 'aria-modal', 'aria-hidden', 'open'],
    });
    window.addEventListener('resize', scheduleSync);
    sync();

    return () => {
      window.removeEventListener('resize', scheduleSync);
      removeWidget();
    };
  }, [enabled, locale, pathname]);

  return null;
}
