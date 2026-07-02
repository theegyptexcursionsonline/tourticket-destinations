'use client';

// components/tools/EmbedCode.tsx
// "Put this tool on your website" block: the one-line snippet in a copyable
// code card, with plain-English steps. Shown on every /tools/<tool> page so
// partners and bloggers can grab the embed themselves.

import React, { useState } from 'react';
import { Copy, Check, Code2 } from 'lucide-react';

export default function EmbedCode({ snippet, accent = '#E05D1A' }: { snippet: string; accent?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // clipboard blocked — select-and-copy still works from the <code> block
    }
  };

  return (
    <section className="border border-slate-200 rounded-2xl overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100 flex items-start gap-3">
        <span className="rounded-xl p-2.5 shrink-0" style={{ backgroundColor: `${accent}14`, color: accent }}>
          <Code2 className="w-5 h-5" />
        </span>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Put this tool on your website — free</h2>
          <p className="text-sm text-slate-600 mt-1">
            One line of code. Works on WordPress, Wix, Squarespace or plain HTML — in an article or a sidebar.
          </p>
        </div>
      </div>

      <div className="bg-slate-900 px-5 py-4 relative">
        <code className="block font-mono text-[13px] leading-relaxed text-emerald-300 whitespace-pre-wrap break-all pr-24">
          {snippet}
        </code>
        <button
          type="button"
          onClick={copy}
          className="absolute top-3.5 right-4 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: copied ? '#059669' : accent }}
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied!' : 'Copy code'}
        </button>
      </div>

      <ol className="px-6 py-5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-slate-700">
        <li className="flex gap-2.5">
          <span className="font-bold" style={{ color: accent }}>1.</span>
          Copy the code above.
        </li>
        <li className="flex gap-2.5">
          <span className="font-bold" style={{ color: accent }}>2.</span>
          Paste it where the calculator should appear — in your article or sidebar.
        </li>
        <li className="flex gap-2.5">
          <span className="font-bold" style={{ color: accent }}>3.</span>
          Done. Prices and features update automatically — nothing to maintain.
        </li>
      </ol>

      <p className="px-6 pb-5 text-xs text-slate-400">
        The widget shows a small “Free tool by …” credit line. No signup, no tracking of your visitors.
      </p>
    </section>
  );
}
