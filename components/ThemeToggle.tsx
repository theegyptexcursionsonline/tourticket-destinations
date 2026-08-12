'use client';

import { Moon, Sun, SunMoon } from 'lucide-react';
import { useStorefrontTheme } from '@/contexts/StorefrontThemeContext';

const LABELS: Record<string, { dark: string; light: string; pending: string }> = {
  ar: { dark: 'تفعيل الوضع الداكن', light: 'تفعيل الوضع الفاتح', pending: 'تغيير مظهر الموقع' },
  de: { dark: 'Dunklen Modus aktivieren', light: 'Hellen Modus aktivieren', pending: 'Farbschema ändern' },
  es: { dark: 'Activar modo oscuro', light: 'Activar modo claro', pending: 'Cambiar tema de color' },
  fr: { dark: 'Activer le mode sombre', light: 'Activer le mode clair', pending: 'Changer le thème' },
  ru: { dark: 'Включить темную тему', light: 'Включить светлую тему', pending: 'Изменить тему' },
  en: { dark: 'Switch to dark mode', light: 'Switch to light mode', pending: 'Change color theme' },
};

export default function ThemeToggle({ transparent = false, className = '' }: { transparent?: boolean; className?: string }) {
  const { mounted, resolvedTheme, toggleTheme } = useStorefrontTheme();
  const locale = !mounted || typeof document === 'undefined' ? 'en' : document.documentElement.lang.split('-')[0].toLowerCase();
  const labels = LABELS[locale] || LABELS.en;
  const label = !mounted ? labels.pending : resolvedTheme === 'dark' ? labels.light : labels.dark;
  return (
    <button type="button" data-testid="storefront-theme-toggle" aria-label={label} aria-pressed={mounted && resolvedTheme === 'dark'} title={label} onClick={toggleTheme} className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-2 ${transparent ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'} ${className}`}>
      {!mounted ? <SunMoon size={20} aria-hidden="true" /> : resolvedTheme === 'dark' ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
    </button>
  );
}
