'use client';

import { useEffect, useId, useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowRight, CalendarCheck, LifeBuoy, Mail, MessageCircle, Search, X } from 'lucide-react';
import { Link, useRouter } from '@/i18n/navigation';
import { useTenant } from '@/contexts/TenantContext';
import { extractBookingReference } from '@/lib/booking/bookingReference';
import { whatsAppLink } from '@/lib/contact/whatsAppLink';

const PRIMARY_BACKGROUND = { backgroundColor: 'var(--primary-color, #dc2626)' };

function FindBookingForm({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations('auth.accountsPaused');
  const router = useRouter();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();
  const helpId = useId();
  const errorId = useId();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!value.trim()) {
      setError(t('referenceRequired'));
      return;
    }
    const reference = extractBookingReference(value);
    if (!reference) {
      setError(t('referenceInvalid'));
      return;
    }
    setError(null);
    onNavigate?.();
    router.push(`/booking/verify/${encodeURIComponent(reference)}`);
  };

  return (
    <form onSubmit={submit} noValidate className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
      <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
        <Search className="h-4 w-4 text-slate-500" aria-hidden="true" />
        {t('findTitle')}
      </h2>
      <label htmlFor={inputId} className="mt-3 block text-sm font-medium text-slate-800">
        {t('referenceLabel')}
      </label>
      <p id={helpId} className="mt-1 text-sm text-slate-600">
        {t('referenceHelp')}
      </p>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <input
          id={inputId}
          name="bookingReference"
          type="text"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            if (error) setError(null);
          }}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          aria-describedby={error ? `${helpId} ${errorId}` : helpId}
          aria-invalid={error ? true : undefined}
          className={`min-h-12 w-full flex-1 rounded-xl border bg-white px-4 text-base uppercase tracking-wide text-slate-900 placeholder:normal-case placeholder:tracking-normal focus:outline-none focus:ring-4 ${
            error ? 'border-red-400 focus:ring-red-100' : 'border-slate-300 focus:border-slate-500 focus:ring-slate-200'
          }`}
        />
        <button
          type="submit"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 font-semibold text-white shadow-sm transition-opacity hover:opacity-90 focus:outline-none focus:ring-4 focus:ring-slate-300"
          style={PRIMARY_BACKGROUND}
        >
          {t('viewBooking')}
          <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
        </button>
      </div>
      {error && (
        <p id={errorId} role="alert" className="mt-2 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
    </form>
  );
}

function ContactOptions({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations('auth.accountsPaused');
  const { tenant } = useTenant();
  // Direct channels only for a loaded brand; the storefront's fallback config
  // carries placeholder contact details that must never reach a customer.
  const brand = tenant && tenant.tenantId !== 'default' ? tenant : null;
  const whatsApp = whatsAppLink(brand?.contact?.whatsapp);
  const email = brand?.contact?.email?.trim() || '';
  const buttonClass =
    'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 font-semibold text-slate-800 transition-colors hover:bg-slate-100 focus:outline-none focus:ring-4 focus:ring-slate-200';

  return (
    <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      {whatsApp && (
        <a href={whatsApp} target="_blank" rel="noopener noreferrer" className={buttonClass}>
          <MessageCircle className="h-4 w-4 text-emerald-600" aria-hidden="true" />
          {t('whatsapp')}
        </a>
      )}
      {email && (
        <a href={`mailto:${email}`} className={buttonClass}>
          <Mail className="h-4 w-4 text-slate-500" aria-hidden="true" />
          {t('email')}
        </a>
      )}
      <Link href="/contact" onClick={onNavigate} className={buttonClass}>
        <LifeBuoy className="h-4 w-4 text-slate-500" aria-hidden="true" />
        {t('contact')}
      </Link>
    </div>
  );
}

function AccountsPausedPanel({ headingLevel: Heading, onNavigate }: { headingLevel: 'h1' | 'h2'; onNavigate?: () => void }) {
  const t = useTranslations('auth.accountsPaused');

  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-lg">
      <div className="p-5 sm:p-8">
        <div className="flex items-start gap-3 sm:gap-4">
          <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
            <CalendarCheck className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <Heading className="text-xl font-bold leading-tight text-slate-900 sm:text-2xl">{t('title')}</Heading>
            <p className="mt-2 leading-relaxed text-slate-600">{t('intro')}</p>
          </div>
        </div>
        <FindBookingForm onNavigate={onNavigate} />
      </div>
      <div className="space-y-6 border-t border-slate-200 bg-slate-50/60 p-5 sm:p-8">
        <div>
          <h2 className="text-base font-semibold text-slate-900">{t('changeTitle')}</h2>
          <p className="mt-1 text-sm text-slate-600">{t('changeBody')}</p>
          <ContactOptions onNavigate={onNavigate} />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-900">{t('guestTitle')}</h2>
          <p className="mt-1 text-sm text-slate-600">{t('guest')}</p>
          <Link
            href="/tours"
            onClick={onNavigate}
            className="mt-2 inline-flex min-h-12 items-center gap-2 font-semibold text-slate-900 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-900"
          >
            {t('browse')}
            <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/**
 * Full-page explanation for the sign-in, sign-up, password and account routes
 * while customer accounts are paused (lib/auth/customerAccounts). It leads
 * with the one thing a returning customer needs — their booking — and never
 * leaves them at a dead end.
 */
export default function AccountsUnavailableNotice() {
  return (
    <main className="min-h-screen bg-[#E9ECEE] px-4 py-6 sm:py-14">
      <div className="mx-auto w-full max-w-xl">
        <AccountsPausedPanel headingLevel="h1" />
      </div>
    </main>
  );
}

/** The same help where an account dialog would have opened. */
export function AccountsUnavailableDialog({ onClose }: { onClose: () => void }) {
  const t = useTranslations('auth.accountsPaused');

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t('title')}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />
      <div className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl" onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('close')}
          className="absolute end-3 top-3 z-10 rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
        <AccountsPausedPanel headingLevel="h2" onNavigate={onClose} />
      </div>
    </div>
  );
}

/** One-line version for checkout, where booking as a guest still works. */
export function AccountsUnavailableCheckoutNote() {
  const t = useTranslations('auth.accountsPaused');

  return (
    <p className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">
      <CalendarCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" aria-hidden="true" />
      <span>{t('checkoutNote')}</span>
    </p>
  );
}
