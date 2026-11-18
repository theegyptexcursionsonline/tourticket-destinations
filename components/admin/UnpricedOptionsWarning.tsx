'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { unpricedBookingOptionNames } from '@/lib/admin/unpricedBookingOptions';

/**
 * Shown in the tour editor while any booking option has no real price. It is
 * a notice, not a block: "Price on request" options are kept on purpose, and
 * the tour still saves.
 */
export default function UnpricedOptionsWarning({ options, className = '' }: { options: unknown; className?: string }) {
  const names = unpricedBookingOptionNames(options);
  if (names.length === 0) return null;
  return (
    <div
      role="status"
      data-testid="unpriced-options-warning"
      className={`flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 ${className}`}
    >
      <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" aria-hidden="true" />
      <div className="min-w-0">
        <p className="font-semibold">
          {names.length === 1 ? '1 booking option has no price' : `${names.length} booking options have no price`}
        </p>
        <ul className="mt-1 list-disc pl-5">
          {names.map((name, index) => (
            <li key={`${index}-${name}`} className="break-words">{name}</li>
          ))}
        </ul>
        <p className="mt-1 text-amber-800">
          Customers see &ldquo;Price on request&rdquo; and cannot book these online. Give the option a base price or a
          start-time price to sell it. You can still save the tour as it is.
        </p>
      </div>
    </div>
  );
}
