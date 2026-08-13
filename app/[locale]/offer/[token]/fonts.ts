import { Archivo, Bricolage_Grotesque, Cormorant_Garamond, Fraunces, Sora } from 'next/font/google';

/**
 * Display faces for the planner offer pages, self-hosted at build time by
 * next/font — one voice per city, loaded only on this route.
 */
const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--offer-reef',
  display: 'swap',
});

const archivo = Archivo({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--offer-marina',
  display: 'swap',
});

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--offer-plate',
  display: 'swap',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--offer-scroll',
  display: 'swap',
});

const sora = Sora({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--offer-lagoon',
  display: 'swap',
});

export const OFFER_FONT_CLASS = [
  bricolage.variable,
  archivo.variable,
  cormorant.variable,
  fraunces.variable,
  sora.variable,
].join(' ');
