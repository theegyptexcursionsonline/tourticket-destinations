'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { Check, Copy, Download, KeyRound, Loader2, ShieldCheck, ShieldOff } from 'lucide-react';
import toast from 'react-hot-toast';
import withAuth from '@/components/admin/withAuth';
import { useAdminAuth } from '@/contexts/AdminAuthContext';

interface SetupData {
  qrCodeDataUrl: string;
  manualKey: string;
}

function SecurityPage() {
  const { refreshUser } = useAdminAuth();
  const [enabled, setEnabled] = useState(false);
  const [enabledAt, setEnabledAt] = useState<string | null>(null);
  const [setup, setSetup] = useState<SetupData | null>(null);
  const [code, setCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/2fa');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load security settings.');
      setEnabled(Boolean(data.enabled));
      setEnabledAt(data.enabledAt || null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load security settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadStatus(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadStatus]);

  const postAction = async (action: string, actionCode = '') => {
    setPendingAction(action);
    try {
      const response = await fetch('/api/admin/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, code: actionCode }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Security update failed.');
      return data;
    } finally {
      setPendingAction(null);
    }
  };

  const beginSetup = async () => {
    try {
      const data = await postAction('setup');
      setSetup({ qrCodeDataUrl: data.qrCodeDataUrl, manualKey: data.manualKey });
      setCode('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not start setup.');
    }
  };

  const enableTwoFactor = async () => {
    try {
      const data = await postAction('enable', code);
      setEnabled(true);
      setEnabledAt(new Date().toISOString());
      setSetup(null);
      setCode('');
      setRecoveryCodes(data.recoveryCodes || []);
      await refreshUser();
      toast.success('Two-factor authentication is now enabled.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not enable two-factor authentication.');
    }
  };

  const regenerateCodes = async () => {
    try {
      const data = await postAction('regenerate', code);
      setRecoveryCodes(data.recoveryCodes || []);
      setCode('');
      toast.success('New recovery codes generated. Previous codes no longer work.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not regenerate recovery codes.');
    }
  };

  const copyText = async (text: string, message: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(message);
  };

  const downloadRecoveryCodes = () => {
    const blob = new Blob(
      [`Egypt Excursions Online admin recovery codes\n\n${recoveryCodes.join('\n')}\n`],
      { type: 'text/plain' },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'eeo-admin-recovery-codes.txt';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-violet-600" aria-label="Loading security settings" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6 lg:p-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-600">Account protection</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Security</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Protect your admin account with a time-based code from Google Authenticator, Microsoft Authenticator, Authy, or another compatible app.
        </p>
      </header>

      {!enabled && (
        <section className="rounded-2xl border border-violet-200 bg-violet-50 p-5 text-violet-950 shadow-sm">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-violet-700" />
            <div>
              <h2 className="font-bold">Two-step verification is required</h2>
              <p className="mt-1 text-sm leading-6 text-violet-800">
                Complete this one-time setup before accessing the admin portal. You will use a fresh authenticator code for future sign-ins.
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
              {enabled ? <ShieldCheck className="h-6 w-6" /> : <ShieldOff className="h-6 w-6" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Two-factor authentication</h2>
              <p className="mt-1 text-sm text-slate-600">
                {enabled
                  ? `Enabled${enabledAt ? ` since ${new Date(enabledAt).toLocaleDateString()}` : ''}.`
                  : 'Not enabled. Your account currently relies on its password alone.'}
              </p>
            </div>
          </div>
          <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
            {enabled ? 'Protected · Required' : 'Setup required'}
          </span>
        </div>

        <div className="p-6">
          {!enabled && !setup && (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-xl text-sm leading-6 text-slate-600">
                After activation, every new login requires your password and a fresh six-digit code.
              </p>
              <button onClick={beginSetup} disabled={pendingAction !== null} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-50">
                {pendingAction === 'setup' ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                Set up 2FA
              </button>
            </div>
          )}

          {!enabled && setup && (
            <div className="grid gap-8 md:grid-cols-[260px_1fr]">
              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <Image src={setup.qrCodeDataUrl} alt="Authenticator setup QR code" width={280} height={280} unoptimized className="h-auto w-full rounded-xl" />
              </div>
              <div>
                <ol className="space-y-4 text-sm leading-6 text-slate-700">
                  <li><strong>1.</strong> Open your authenticator app and scan the QR code.</li>
                  <li>
                    <strong>2.</strong> If scanning is unavailable, enter this setup key:
                    <button type="button" onClick={() => void copyText(setup.manualKey, 'Setup key copied.')} className="mt-2 flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm font-bold tracking-wider text-slate-900">
                      <span className="truncate">{setup.manualKey}</span>
                      <Copy className="h-4 w-4 shrink-0" />
                    </button>
                  </li>
                  <li><strong>3.</strong> Enter the current six-digit code to confirm setup.</li>
                </ol>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <input value={code} onChange={(event) => setCode(event.target.value)} autoComplete="one-time-code" inputMode="numeric" maxLength={6} placeholder="000000" className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3 text-center text-lg font-bold tracking-[0.35em] outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100" />
                  <button onClick={enableTwoFactor} disabled={pendingAction !== null || !/^\d{6}$/.test(code)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-violet-700 disabled:opacity-50">
                    {pendingAction === 'enable' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Enable 2FA
                  </button>
                </div>
              </div>
            </div>
          )}

          {enabled && recoveryCodes.length === 0 && (
            <div className="space-y-5">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
                Your account is protected. Keep your authenticator app available whenever you sign in.
              </div>
              <div>
                <label htmlFor="securityCode" className="text-sm font-semibold text-slate-700">Current authenticator or recovery code</label>
                <input id="securityCode" value={code} onChange={(event) => setCode(event.target.value)} autoComplete="one-time-code" maxLength={64} placeholder="Required to change security settings" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100" />
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button onClick={regenerateCodes} disabled={pendingAction !== null || !code.trim()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-800 transition hover:bg-slate-50 disabled:opacity-50">
                  <KeyRound className="h-4 w-4" />
                  Generate new recovery codes
                </button>
                <span className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-5 py-3 text-sm font-bold text-violet-800">
                  <ShieldCheck className="h-4 w-4" />
                  Required for admin access
                </span>
              </div>
            </div>
          )}

          {recoveryCodes.length > 0 && (
            <div className="space-y-5">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
                <strong>Save these recovery codes now.</strong> Each code works once, and they will not be shown again.
              </div>
              <div className="grid grid-cols-1 gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm font-bold tracking-wider text-slate-800 sm:grid-cols-2">
                {recoveryCodes.map((recoveryCode) => <div key={recoveryCode} className="rounded-lg bg-white px-3 py-2">{recoveryCode}</div>)}
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button onClick={() => void copyText(recoveryCodes.join('\n'), 'Recovery codes copied.')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800">
                  <Copy className="h-4 w-4" /> Copy codes
                </button>
                <button onClick={downloadRecoveryCodes} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-800 hover:bg-white">
                  <Download className="h-4 w-4" /> Download codes
                </button>
                <button onClick={() => setRecoveryCodes([])} className="inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-bold text-violet-700 hover:bg-violet-50">
                  I have saved them
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default withAuth(SecurityPage);
