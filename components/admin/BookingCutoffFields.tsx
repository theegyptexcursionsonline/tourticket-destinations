'use client';
import { useEffect, useState } from 'react';
import { isValidBookingCutoff } from '@/lib/bookings/bookingCutoff';

export default function BookingCutoffFields({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const valid = isValidBookingCutoff(value);
  const [hoursText, setHoursText] = useState(String(valid ? Math.floor(value / 60) : 0));
  const [minutesText, setMinutesText] = useState(String(valid ? value % 60 : 0));
  useEffect(() => { if (isValidBookingCutoff(value)) { setHoursText(String(Math.floor(value / 60))); setMinutesText(String(value % 60)); } }, [value]);
  const hours = Number(hoursText);
  const minutes = Number(minutesText);
  const change = (h: string, m: string) => {
    setHoursText(h); setMinutesText(m);
    const combined = Number(h) * 60 + Number(m);
    onChange(/^\d+$/.test(h) && /^\d+$/.test(m) && Number(m) < 60 && isValidBookingCutoff(combined) ? combined : NaN);
  };
  const exampleMinutes = 10 * 60 - (valid ? value : 0);
  const daysBefore = Math.max(0, -Math.floor(exampleMinutes / 1440));
  const clock = ((exampleMinutes % 1440) + 1440) % 1440;
  const example = `${String(Math.floor(clock / 60)).padStart(2, '0')}:${String(clock % 60).padStart(2, '0')}`;
  return <fieldset className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
    <legend className="px-1 text-sm font-semibold text-slate-900">Close bookings before departure</legend>
    <div className="grid grid-cols-2 gap-3">
      <label className="text-sm text-slate-700">Hours<input aria-label="Cutoff hours" type="number" min="0" max="720" step="1" required value={hoursText}
        onChange={event => change(event.target.value, minutesText)} className="mt-1 block w-full rounded-lg border border-slate-300 p-2" /></label>
      <label className="text-sm text-slate-700">Minutes<input aria-label="Cutoff minutes" type="number" min="0" max="59" step="1" required value={minutesText}
        onChange={event => change(hoursText, event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 p-2" /></label>
    </div>
    <p className="mt-3 text-sm text-slate-600">Applies to every departure and option on this tour, using the booking website’s timezone. 0 hours and 0 minutes closes bookings at departure.</p>
    {valid ? <p className="mt-2 text-sm text-slate-700">{value === 0 ? 'Customers can book until the departure time.' : `Customers must complete payment at least ${hours ? `${hours} hour${hours === 1 ? '' : 's'}` : ''}${hours && minutes ? ' and ' : ''}${minutes ? `${minutes} minute${minutes === 1 ? '' : 's'}` : ''} before departure.`}</p> : <p role="alert" className="mt-2 text-sm text-red-700">Enter whole hours and minutes, up to 30 days.</p>}
    {valid && <p className="mt-2 text-sm text-slate-600">Example: a 10:00 departure closes at {example}{daysBefore ? `, ${daysBefore} day${daysBefore === 1 ? "" : "s"} earlier` : " on the same day"}, in the booking website’s timezone.</p>}
  </fieldset>;
}
