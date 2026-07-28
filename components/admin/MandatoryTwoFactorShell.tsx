'use client';

import Image from 'next/image';
import { LogOut, ShieldCheck } from 'lucide-react';
import { useAdminAuth } from '@/contexts/AdminAuthContext';

export default function MandatoryTwoFactorShell({ children }: { children: React.ReactNode }) {
  const { logout } = useAdminAuth();
  return (
    <div dir="ltr" className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#ede9fe_0,_#f8fafc_36%,_#f8fafc_100%)] text-slate-950">
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Image src="/EEO-logo.png" alt="Egypt Excursions Online" width={44} height={44} priority className="h-11 w-11 rounded-xl object-contain" />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-950">Secure admin setup</p>
              <p className="truncate text-xs text-slate-500">EEO Network</p>
            </div>
          </div>
          <button type="button" onClick={logout} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 sm:px-4">
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Use another account</span>
            <span className="sm:hidden">Sign out</span>
          </button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-violet-200 bg-white/90 p-4 shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="font-bold text-slate-950">Finish protecting your account</p>
            <p className="mt-0.5 text-sm text-slate-600">Dashboard access stays locked until setup and recovery-code confirmation are complete.</p>
          </div>
        </div>
        {children}
      </main>
      <footer className="px-4 pb-8 text-center text-xs text-slate-500">
        Need help? Contact your EEO administrator. Your setup session expires after 15 minutes.
      </footer>
    </div>
  );
}
