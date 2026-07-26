'use client';

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowLeft, KeyRound, Lock, Mail, ShieldCheck } from 'lucide-react';
import { useAdminAuth } from '@/contexts/AdminAuthContext';

interface LoginProps {
  onLoginSuccess: () => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAdminAuth();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    toast.dismiss();
    setIsSubmitting(true);
    try {
      const result = await login(email, password, requiresTwoFactor ? twoFactorCode : undefined);
      if (result.requiresTwoFactor) {
        setRequiresTwoFactor(true);
        setTwoFactorCode('');
        return;
      }
      onLoginSuccess();
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
        <div className="border-b border-slate-100 bg-gradient-to-br from-slate-950 to-slate-800 px-8 py-7 text-white">
          <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            {requiresTwoFactor ? 'Verify your identity' : 'Admin portal access'}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            {requiresTwoFactor
              ? 'Enter the code from your authenticator app, or use one recovery code.'
              : 'Sign in with your authorized work account.'}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5 px-8 py-7">
          {requiresTwoFactor ? (
            <>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Signing in as</p>
                <p className="mt-1 truncate text-sm font-semibold text-slate-800">{email}</p>
              </div>
              <div>
                <label htmlFor="twoFactorCode" className="block text-sm font-semibold text-slate-700">
                  Authentication or recovery code
                </label>
                <div className="relative mt-2">
                  <KeyRound className="pointer-events-none absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    id="twoFactorCode"
                    name="twoFactorCode"
                    value={twoFactorCode}
                    onChange={(event) => setTwoFactorCode(event.target.value)}
                    required
                    autoComplete="one-time-code"
                    inputMode="text"
                    maxLength={64}
                    className="w-full rounded-xl border border-slate-300 py-3 ps-10 pe-3 text-base font-semibold tracking-wider text-slate-900 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
                    placeholder="000000"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setRequiresTwoFactor(false);
                  setTwoFactorCode('');
                }}
                className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-950"
              >
                <ArrowLeft className="h-4 w-4" />
                Use a different account
              </button>
            </>
          ) : (
            <>
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-slate-700">Work email</label>
                <div className="relative mt-2">
                  <Mail className="pointer-events-none absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input id="email" name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" className="w-full rounded-xl border border-slate-300 py-3 ps-10 pe-3 text-slate-900 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100" placeholder="team@company.com" />
                </div>
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-slate-700">Password</label>
                <div className="relative mt-2">
                  <Lock className="pointer-events-none absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input id="password" name="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" className="w-full rounded-xl border border-slate-300 py-3 ps-10 pe-3 text-slate-900 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100" placeholder="Enter your password" />
                </div>
              </div>
            </>
          )}
          <button type="submit" disabled={isSubmitting || (requiresTwoFactor && !twoFactorCode.trim())} className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 font-semibold text-white shadow-lg shadow-red-200 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50">
            {isSubmitting ? 'Verifying…' : requiresTwoFactor ? 'Verify and continue' : 'Secure login'}
          </button>
        </form>
      </section>
    </main>
  );
}
