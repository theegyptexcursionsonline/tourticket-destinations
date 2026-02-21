'use client';

import { usePathname } from '@/i18n/navigation';

/**
 * Wrapper component that conditionally renders AI widgets
 * based on the current page. Hides widgets on checkout/booking pages.
 *
 * Note: AI chat is now integrated into the AISearchWidget.
 * Access it by clicking the AI icon in the search bar.
 */
export default function ConditionalAIWidgets() {
  const pathname = usePathname();

  // Hide AI widgets on checkout and booking-related pages
  const shouldHideWidgets = pathname?.includes('/checkout') ||
                           pathname?.includes('/booking') ||
                           pathname?.includes('/payment');

  if (shouldHideWidgets) {
    return null;
  }

  // No widgets to render - AI is now part of the unified search widget
  return null;
}
