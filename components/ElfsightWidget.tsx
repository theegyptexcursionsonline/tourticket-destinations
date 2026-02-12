'use client';

import React, { useEffect } from 'react';
import Script from 'next/script';

type Props = {
  className?: string;
  width?: string; // e.g. '100%' or '900px'
  minHeight?: string; // e.g. '280px' to match review card height
  appId?: string; // override default app id if needed
};

/**
 * ElfsightWidget - client component
 * - Ensures widget is re-initialized on mount (useful for SPA navigation)
 * - Accepts width and minHeight so layout can control the widget size
 *
 * Usage:
 * <ElfsightWidget width="100%" minHeight="300px" />
 */

const DEFAULT_APP_ID = '0fea9001-da59-4955-b598-76327377c50c';

export default function ElfsightWidget({
  className = '',
  width = '100%',
  minHeight = '300px',
  appId = DEFAULT_APP_ID,
}: Props) {
  useEffect(() => {
    // Try to initialize/re-init widget after platform.js loads (or if already loaded).
     
    const w = window as any;

    const tryInit = () => {
      try {
        if (typeof w?.elfsightInit === 'function') {
          w.elfsightInit();
        } else if (w?.Elf && typeof w.Elf.init === 'function') {
          w.Elf.init();
        } else {
          // If platform script is not yet present, wait briefly and try again.
          // This is safe — it will stop once the script loads.
          // Limit number of retries to avoid runaway loops.
        }
      } catch (_e) {
        // swallow
      }
    };

    // call once
    tryInit();

    // also set a short retry in case script loads after mount
    const t = setTimeout(tryInit, 600);
    const t2 = setTimeout(tryInit, 1600);

    return () => {
      clearTimeout(t);
      clearTimeout(t2);
    };
  }, [appId]);

  return (
    <>
      <Script
        src="https://static.elfsight.com/platform/platform.js"
        strategy="afterInteractive"
      />
      <div className={className} style={{ width, minHeight }}>
        <div
          // NOTE: Elfsight expects the exact class "elfsight-app-<appId>"
          // keep data-elfsight-app-lazy so it lazily initializes if supported
          className={`elfsight-app-${appId}`}
          data-elfsight-app-lazy
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    </>
  );
}
