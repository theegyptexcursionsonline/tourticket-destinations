'use client';

import { X } from 'lucide-react';
import toast, { ToastBar, Toaster } from 'react-hot-toast';

type AppToasterProps = {
  direction?: 'ltr' | 'rtl';
};

const TOAST_LAYER = 2_147_483_000;

const toneByType = {
  success: {
    borderColor: '#bbf7d0',
    boxShadow: '0 18px 48px -22px rgba(22, 101, 52, 0.42), 0 8px 24px -16px rgba(15, 23, 42, 0.28)',
  },
  error: {
    borderColor: '#fecaca',
    boxShadow: '0 18px 48px -22px rgba(185, 28, 28, 0.42), 0 8px 24px -16px rgba(15, 23, 42, 0.28)',
  },
  loading: {
    borderColor: '#cbd5e1',
    boxShadow: '0 18px 48px -24px rgba(15, 23, 42, 0.34), 0 8px 24px -16px rgba(15, 23, 42, 0.22)',
  },
  blank: {
    borderColor: '#dbeafe',
    boxShadow: '0 18px 48px -22px rgba(37, 99, 235, 0.32), 0 8px 24px -16px rgba(15, 23, 42, 0.24)',
  },
  custom: {
    borderColor: '#dbeafe',
    boxShadow: '0 18px 48px -22px rgba(37, 99, 235, 0.32), 0 8px 24px -16px rgba(15, 23, 42, 0.24)',
  },
} as const;

export default function AppToaster({ direction = 'ltr' }: AppToasterProps) {
  return (
    <Toaster
      position="top-center"
      reverseOrder={false}
      gutter={10}
      containerStyle={{
        zIndex: TOAST_LAYER,
        top: 'max(12px, env(safe-area-inset-top))',
        right: 'max(12px, env(safe-area-inset-right))',
        left: 'max(12px, env(safe-area-inset-left))',
      }}
      toastOptions={{
        duration: 4500,
        style: {
          width: 'fit-content',
          minWidth: 'min(320px, calc(100vw - 24px))',
          maxWidth: 'min(430px, calc(100vw - 24px))',
          padding: 0,
          overflow: 'hidden',
          background: '#ffffff',
          color: '#0f172a',
          border: '1px solid #dbeafe',
          borderRadius: '18px',
          fontFamily: 'inherit',
        },
        success: {
          duration: 4500,
          style: {
            background: '#ffffff',
            color: '#166534',
            border: '1px solid #bbf7d0',
          },
          iconTheme: {
            primary: '#16a34a',
            secondary: '#f0fdf4',
          },
        },
        error: {
          duration: 6500,
          style: {
            background: '#ffffff',
            color: '#991b1b',
            border: '1px solid #fecaca',
          },
          iconTheme: {
            primary: '#dc2626',
            secondary: '#fef2f2',
          },
        },
        loading: {
          duration: Infinity,
          style: {
            background: '#ffffff',
            color: '#334155',
            border: '1px solid #cbd5e1',
          },
          iconTheme: {
            primary: '#2563eb',
            secondary: '#eff6ff',
          },
        },
      }}
    >
      {(currentToast) => {
        const tone = toneByType[currentToast.type] ?? toneByType.blank;

        return (
          <ToastBar
            toast={currentToast}
            style={{
              ...currentToast.style,
              ...tone,
              direction,
            }}
          >
            {({ icon, message }) => (
              <div className="flex w-full min-w-0 items-start gap-3 px-4 py-3.5 sm:px-5">
                <span className="mt-0.5 flex shrink-0" aria-hidden="true">
                  {icon}
                </span>
                <div className="min-w-0 flex-1 whitespace-pre-line break-words text-sm font-semibold leading-5 text-current">
                  {message}
                </div>
                {currentToast.type !== 'loading' && (
                  <button
                    type="button"
                    onClick={() => toast.dismiss(currentToast.id)}
                    className="-me-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    aria-label="Dismiss notification"
                  >
                    <X size={16} strokeWidth={2.25} />
                  </button>
                )}
              </div>
            )}
          </ToastBar>
        );
      }}
    </Toaster>
  );
}
