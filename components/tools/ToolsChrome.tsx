// components/tools/ToolsChrome.tsx
// Lightweight header/footer for the /tools pages — a utility page doesn't need
// the full marketing nav, app-download banner or newsletter block.

import React from 'react';
import Link from 'next/link';
/* eslint-disable @next/next/no-img-element */

export function ToolsHeader({
  name,
  logoUrl,
  accent,
}: {
  name: string;
  logoUrl: string;
  accent: string;
}) {
  return (
    <header className="border-b border-slate-100 bg-white">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <img src={logoUrl} alt={name} className="h-9 w-9 rounded-lg object-cover" />
          <span className="font-bold text-slate-900 leading-tight">{name}</span>
        </Link>
        <div className="flex items-center gap-5">
          <span className="hidden sm:inline text-xs font-bold tracking-widest uppercase text-slate-400">
            Free travel tools
          </span>
          <Link
            href="/"
            className="rounded-xl px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: accent }}
          >
            Browse tours →
          </Link>
        </div>
      </div>
    </header>
  );
}

export function ToolsFooter({ name, accent }: { name: string; accent: string }) {
  return (
    <footer className="border-t border-slate-100 bg-white mt-16">
      <div className="container mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-slate-500">
          © {new Date().getFullYear()} {name} — free tools for planning your Egypt trip.
        </p>
        <nav className="flex items-center gap-5 text-sm">
          <Link href="/" className="text-slate-500 hover:text-slate-800">Tours</Link>
          <Link href="/destinations" className="text-slate-500 hover:text-slate-800">Destinations</Link>
          <Link href="/contact" className="text-slate-500 hover:text-slate-800">Contact</Link>
          <Link href="/tools" className="font-semibold" style={{ color: accent }}>All tools</Link>
        </nav>
      </div>
    </footer>
  );
}
