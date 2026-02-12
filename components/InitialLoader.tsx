// components/InitialLoader.tsx
'use client';

import { useEffect } from 'react';

export default function InitialLoader() {
  useEffect(() => {
    const el = document.getElementById('initial-loader');
    if (!el) return;

    // Ensure it blocks while we're about to remove it
    el.style.pointerEvents = 'auto';

    // Start exit animation: fade + slight move up, then remove from DOM
    el.style.transition = 'opacity 360ms cubic-bezier(.2,.9,.26,1), transform 360ms cubic-bezier(.2,.9,.26,1)';
    requestAnimationFrame(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(-8px) scale(0.995)';
    });

    const t = setTimeout(() => {
      try {
        if (el.parentNode) el.parentNode.removeChild(el);
      } catch (_e) {
        // ignore
      }
    }, 420);

    return () => clearTimeout(t);
  }, []);

  return null;
}
