'use client';

// components/tools/TripCostCalculator.tsx
// Egypt trip-cost calculator v2 — destination, season, style, group size and
// internal-flight inputs; estimate shown as an honest range with a live
// breakdown and a style comparison strip. Config comes from the central tools
// API; all math runs locally so every control reacts instantly.

import React, { useMemo, useState } from 'react';
import { computeTripCost, formatUsd, clamp, type TripCostConfig } from '@/lib/toolsApi';

const BAR_LABELS: { key: 'hotel' | 'food' | 'transport' | 'activities'; label: string }[] = [
  { key: 'hotel', label: 'Hotels' },
  { key: 'food', label: 'Food & drinks' },
  { key: 'transport', label: 'Getting around' },
  { key: 'activities', label: 'Tours & tickets' },
];

export default function TripCostCalculator({
  config,
  accent = '#E05D1A',
}: {
  config: TripCostConfig;
  accent?: string;
}) {
  const [days, setDays] = useState(7);
  const [travelers, setTravelers] = useState(2);
  const [style, setStyle] = useState('comfort');
  const [region, setRegion] = useState('cairo');
  const [season, setSeason] = useState('peak');
  const [flight, setFlight] = useState(false);

  const r = useMemo(
    () => computeTripCost(config, { days, travelers, style, region, season, flight }),
    [config, days, travelers, style, region, season, flight],
  );

  const stepBtn =
    'w-8 h-8 rounded-lg border border-gray-200 bg-gray-50 text-lg font-semibold leading-none hover:bg-gray-100 transition-colors';
  const selectCls =
    'w-full mt-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 outline-none focus:border-gray-400';
  const fieldLabel = 'block text-[10.5px] font-semibold text-gray-500 uppercase tracking-wider';

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-[0_18px_50px_-20px_rgba(20,24,40,0.25)] overflow-hidden w-full max-w-md">
      {/* header */}
      <div className="px-6 pt-5 pb-4">
        <div className="flex items-center justify-between">
          <span
            className="inline-block text-[10px] font-bold tracking-[0.12em] uppercase rounded-full px-2.5 py-1"
            style={{ color: accent, backgroundColor: `${accent}1A` }}
          >
            Free tool
          </span>
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">2026 prices</span>
        </div>
        <h2 className="text-lg font-bold mt-2 tracking-tight text-gray-900">Egypt Trip Cost Calculator</h2>
        <p className="text-xs text-gray-500 mt-1">Real daily prices from local operators.</p>
      </div>

      {/* trip shape */}
      <div className="grid grid-cols-2 gap-2.5 px-6">
        <div>
          <label className={fieldLabel}>Destination</label>
          <select className={selectCls} value={region} onChange={(e) => setRegion(e.target.value)} aria-label="Destination">
            {Object.keys(config.regions).map((k) => (
              <option key={k} value={k}>{config.regions[k].label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={fieldLabel}>When</label>
          <select className={selectCls} value={season} onChange={(e) => setSeason(e.target.value)} aria-label="Season">
            {Object.keys(config.seasons).map((k) => (
              <option key={k} value={k}>{config.seasons[k].label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 px-6 pt-2.5">
        <div className="border border-gray-200 rounded-xl px-3 py-2">
          <label className={fieldLabel}>Days</label>
          <div className="flex items-center justify-between mt-1">
            <button type="button" aria-label="Fewer days" className={stepBtn} onClick={() => setDays((d) => clamp(d - 1, 1, 30))}>−</button>
            <b className="text-lg">{r.days}</b>
            <button type="button" aria-label="More days" className={stepBtn} onClick={() => setDays((d) => clamp(d + 1, 1, 30))}>+</button>
          </div>
        </div>
        <div className="border border-gray-200 rounded-xl px-3 py-2">
          <label className={fieldLabel}>Travellers</label>
          <div className="flex items-center justify-between mt-1">
            <button type="button" aria-label="Fewer travellers" className={stepBtn} onClick={() => setTravelers((t) => clamp(t - 1, 1, 12))}>−</button>
            <b className="text-lg">{r.travelers}</b>
            <button type="button" aria-label="More travellers" className={stepBtn} onClick={() => setTravelers((t) => clamp(t + 1, 1, 12))}>+</button>
          </div>
        </div>
      </div>

      {/* style segmented control with live totals */}
      <div className="flex gap-2 px-6 pt-3">
        {Object.keys(config.styles).map((key) => {
          const alt = computeTripCost(config, { days, travelers, style: key, region, season, flight });
          const on = style === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setStyle(key)}
              className="flex-1 rounded-xl border px-2 py-2 text-center transition-colors"
              style={on ? { borderColor: accent, backgroundColor: `${accent}10` } : { borderColor: '#E8E5DF' }}
            >
              <span className="block text-[13px] font-semibold" style={{ color: on ? accent : '#7A7F8C' }}>
                {config.styles[key].label}
              </span>
              <span className="block text-[11px] mt-0.5" style={{ color: on ? accent : '#A9AEB9' }}>
                {formatUsd(alt.perPerson)}/pp
              </span>
            </button>
          );
        })}
      </div>

      {/* internal flight toggle */}
      <label className="flex items-center justify-between px-6 pt-3 cursor-pointer select-none">
        <span className="text-sm text-gray-700">
          Internal flight <span className="text-gray-400">(Cairo ↔ Luxor / Red Sea)</span>
        </span>
        <span
          role="switch"
          aria-checked={flight}
          onClick={() => setFlight((f) => !f)}
          className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
          style={{ backgroundColor: flight ? accent : '#E2E8F0' }}
        >
          <span
            className="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform"
            style={{ transform: flight ? 'translateX(22px)' : 'translateX(2px)' }}
          />
        </span>
      </label>

      {/* breakdown */}
      <div className="px-6 pt-4 space-y-2.5">
        {BAR_LABELS.map(({ key, label }) => (
          <div key={key}>
            <div className="flex justify-between text-xs text-gray-500">
              <span>{label}</span>
              <span className="font-semibold text-gray-700">{formatUsd(r.breakdown[key])}/day</span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-100 mt-1 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.round((r.breakdown[key] / r.perDay) * 100)}%`, backgroundColor: accent }}
              />
            </div>
          </div>
        ))}
        <p className="text-[11px] text-gray-400 pt-1">
          + {formatUsd(r.visa)} e-visa{r.flight ? ` + ${formatUsd(r.flightAddon)} internal flight` : ''} per person ·
          excludes international flights
        </p>
      </div>

      {/* result */}
      <div className="mt-4 px-6 py-4 text-white" style={{ backgroundColor: accent }}>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider opacity-80">Estimated total</div>
            <div className="text-[26px] leading-8 font-extrabold tracking-tight">
              {formatUsd(r.range.low)} – {formatUsd(r.range.high)}
            </div>
          </div>
          <div className="text-right text-xs opacity-90 leading-5">
            ≈ {formatUsd(r.perPerson)} per person<br />
            {r.travelers} traveller{r.travelers > 1 ? 's' : ''} · {r.days} days
          </div>
        </div>
      </div>
    </div>
  );
}
