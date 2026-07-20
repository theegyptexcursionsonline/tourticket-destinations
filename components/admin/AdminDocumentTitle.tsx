'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

const ADMIN_PAGE_TITLES: Array<[RegExp, string]> = [
  [/^\/(?:admin\/)?bookings\/create(?:\/|$)/, 'Create Booking'],
  [/^\/(?:admin\/)?bookings(?:\/|$)/, 'Bookings Management'],
  [/^\/(?:admin\/)?reports(?:\/|$)/, 'Reports'],
  [/^\/(?:admin\/)?tours(?:\/|$)/, 'Tours'],
  [/^\/(?:admin\/)?availability(?:\/|$)/, 'Availability'],
  [/^\/(?:admin\/)?discounts(?:\/|$)/, 'Discounts'],
  [/^\/(?:admin\/)?reviews(?:\/|$)/, 'Reviews'],
  [/^\/(?:admin\/)?destinations(?:\/|$)/, 'Destinations'],
  [/^\/(?:admin\/)?attraction-pages(?:\/|$)/, 'Pages'],
  [/^\/(?:admin\/)?categories(?:\/|$)/, 'Pages'],
  [/^\/(?:admin\/)?hero-settings(?:\/|$)/, 'Hero Settings'],
  [/^\/(?:admin\/)?special-offers(?:\/|$)/, 'Special Offers'],
  [/^\/(?:admin\/)?manifests(?:\/|$)/, 'Manifest'],
  [/^\/(?:admin\/)?tenants(?:\/|$)/, 'Brands'],
  [/^\/(?:admin\/)?users(?:\/|$)/, 'Users'],
  [/^\/(?:admin\/)?team(?:\/|$)/, 'Team'],
  [/^\/(?:admin\/)?blog(?:\/|$)/, 'Blog'],
  [/^\/admin(?:\/|$)/, 'Dashboard'],
  [/^\/$/, 'Dashboard'],
];

function getAdminDocumentTitle(pathname: string | null) {
  const normalizedPath = pathname || '/admin';
  const match = ADMIN_PAGE_TITLES.find(([pattern]) => pattern.test(normalizedPath));
  const pageTitle = match?.[1];

  return pageTitle ? `${pageTitle} | Admin Panel` : 'Admin Panel';
}

export default function AdminDocumentTitle() {
  const pathname = usePathname();

  useEffect(() => {
    document.title = getAdminDocumentTitle(pathname);
  }, [pathname]);

  return null;
}
