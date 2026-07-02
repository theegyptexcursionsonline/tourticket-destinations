'use client';

// components/tools/TripCostCalculator.tsx
// Interactive Egypt trip-cost calculator for /tools/trip-cost-calculator.
// Brand-aware: takes the tenant accent so every domain in the network renders
// the tool in its own colours.

import React, { useMemo, useState } from 'react';
import { computeTripCost, formatUsd, TRIP_STYLES, type TripStyle, clamp } from '@/lib/tripCost';

const BAR_LABELS: { key: keyof ReturnType<typeof computeTripCost>['breakdown']; label: string }[] = [
  { key: 'hotel', label: 'Hotel' },
  { key: 'food', label: 'Food & drinks' },
  { key: 'transport', label: 'Transport' },
  { key: 'activities', label: 'Tours & activities' },
];

export default function TripCostCalculator({ accent = '#E05D1A' }: { accent?: string }) {
  const [days, setDays] = useState(7);
  const [travelers, setTravelers] = useState(2);
  const [style, setStyle] = useState<TripStyle>('comfort');

  const r = useMemo(() => computeTripCost({ days, travelers, style }), [days, travelers, style]);

  const stepBtn =
    'w-8 h-8 rounded-lg border border-gray-200 bg-gray-50 text-lg font-semibold leading-none hover:bg-gray-100 transition-colors';

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-[0_14px_40px_-18px_rgba(20,24,40,0.18)] overflow-hidden max-w-md w-full">
      <div className="px-6 pt-5 pb-4">
        <span
          className="inline-block text-[10px] font-bold tracking-[0.12em] uppercase rounded-full px-2.5 py-1"
          style={{ color: accent, backgroundColor: `${accent}1A` }}
        >
          Free tool
        </span>
        <h2 className="text-lg font-bold mt-2 tracking-tight text-gray-900">Egypt Trip Cost Calculator</h2>
        <p className="text-xs text-gray-500 mt-1">Estimate your full trip budget in seconds.</p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 px-6">
        <div className="border border-gray-200 rounded-xl px-3 py-2">
          <label className="block text-[10.5px] font-semibold text-gray-500 uppercase tracking-wider">Days</label>
          <div className="flex items-center justify-between mt-1">
            <button type="button" aria-label="Fewer days" className={stepBtn} onClick={() => setDays((d) => clamp(d - 1, 1, 30))}>
              −
            </button>
            <b className="text-lg" data-testid="days">
              {r.days}
            </b>
            <button type="button" aria-label="More days" className={stepBtn} onClick={() => setDays((d) => clamp(d + 1, 1, 30))}>
              +
            </button>
          </div>
        </div>
        <div className="border border-gray-200 rounded-xl px-3 py-2">
          <label className="block text-[10.5px] font-semibold text-gray-500 uppercase tracking-wider">Travellers</label>
          <div className="flex items-center justify-between mt-1">
            <button
              type="button"
              aria-label="Fewer travellers"
              className={stepBtn}
              onClick={() => setTravelers((t) => clamp(t - 1, 1, 12))}
            >
              −
            </button>
            <b className="text-lg" data-testid="travelers">
              {r.travelers}
            </b>
            <button
              type="button"
              aria-label="More travellers"
              className={stepBtn}
              onClick={() => setTravelers((t) => clamp(t + 1, 1, 12))}
            >
              +
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-2 px-6 pt-3">
        {(Object.keys(TRIP_STYLES) as TripStyle[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setStyle(key)}
            className="flex-1 rounded-xl border px-2 py-2 text-sm font-semibold transition-colors"
            style={
              style === key
                ? { borderColor: accent, color: accent, backgroundColor: `${accent}14` }
                : { borderColor: '#E8E5DF', color: '#7A7F8C' }
            }
          >
            {TRIP_STYLES[key].label}
          </button>
        ))}
      </div>

      <div className="px-6 pt-4 space-y-2.5">
        {BAR_LABELS.map(({ key, label }) => (
          <div key={key}>
            <div className="flex justify-between text-xs text-gray-500">
              <span>{label}</span>
              <span className="font-semibold text-gray-700">{formatUsd(r.breakdown[key])}/d</span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-100 mt-1 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.round((r.breakdown[key] / r.perDay) * 100)}%`, backgroundColor: accent }}
              />
            </div>
          </div>
        ))}
        <p className="text-[11px] text-gray-400 pt-1">+ {formatUsd(r.visa)} Egypt e-visa per person</p>
      </div>

      <div className="mt-4 px-6 py-4 text-white" style={{ backgroundColor: accent }} data-testid="total">
        <div className="text-2xl font-extrabold tracking-tight">{formatUsd(r.total)} total</div>
        <div className="text-xs opacity-90 mt-0.5">
          {formatUsd(r.perPerson)} per person · {r.travelers} traveller{r.travelers > 1 ? 's' : ''} · {r.days} days
        </div>
      </div>
    </div>
  );
}
