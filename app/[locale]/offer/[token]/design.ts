/**
 * Per-city design profiles for planner offer pages.
 *
 * Client decision 2026-08-14 (afternoon revision, supersedes the morning
 * three-design split): the MT network domains carry exactly TWO designs —
 * marina (Hurghada's boarding pass) and lagoon (El Gouna's lookbook),
 * "one per domain". The third approved design is EEO main's own offer page
 * and lives in the main tourticket repo, never here. Every city maps onto
 * marina or lagoon; the palette, kicker, motif and section language stay
 * city-specific so each brand keeps its own voice.
 */

export type OfferArchetype = 'marina' | 'lagoon';

export type CityDesign = {
  archetype: OfferArchetype;
  /** Deep ground colour the hero copy sits on. */
  ink: string;
  /** Page background beneath the fold. */
  paper: string;
  /** Card surface. */
  surface: string;
  /** Secondary tint used for rules, chips and washes. */
  wash: string;
  /** Display face for headlines. Local stacks only — no external font loads. */
  display: string;
  /** Optional letter-spacing tweak for the display face. */
  displayTracking: string;
  /** Eyebrow above the headline. */
  kicker: string;
  /** Section titles, so no two cities read identically. */
  sections: { value: string; picks: string; words: string };
  /** Closes the hero headline ("15% off <heroLine>") — must stay true to the
   *  city: El Gouna has a lagoon, Luxor has two banks of the Nile. */
  heroLine: string;
  /** Short line under the hero headline; {label} is the discount, {site} the brand. */
  motif: 'wave' | 'sun' | 'rule' | 'column' | 'ripple';
};

const SHARM: CityDesign = {
  archetype: 'marina',
  ink: '#04141c',
  paper: '#f2f7f8',
  surface: '#ffffff',
  wash: '#0d3a47',
  display: 'var(--offer-reef), "Helvetica Neue", system-ui, sans-serif',
  displayTracking: '-0.035em',
  kicker: 'A private offer from your personal planner',
  heroLine: 'every experience.',
  sections: {
    value: 'Book bundles & save more',
    picks: 'Top tours recommended by your personal planner',
    words: 'Why travellers rate us',
  },
  motif: 'wave',
};

export const CITY_DESIGNS: Record<string, CityDesign> = {
  'sharm-excursions-online': SHARM,

  'hurghada-excursions-online': {
    archetype: 'marina',
    ink: '#1a0b06',
    paper: '#fff6f0',
    surface: '#ffffff',
    wash: '#7c2d12',
    display: 'var(--offer-marina), "Helvetica Neue", system-ui, sans-serif',
    displayTracking: '-0.03em',
    kicker: 'Your planner’s boarding pass',
    heroLine: 'every crossing.',
    sections: {
      value: 'Two boats, one price break',
      picks: 'What your planner would book first',
      words: 'From the deck',
    },
    motif: 'sun',
  },

  'cairo-excursions-online': {
    archetype: 'lagoon',
    ink: '#0f1013',
    paper: '#f6f3ec',
    surface: '#fffdf8',
    wash: '#3f3a2f',
    display: 'var(--offer-plate), Georgia, "Times New Roman", serif',
    displayTracking: '-0.01em',
    kicker: 'Prepared for you · Cairo & Giza',
    heroLine: 'every experience.',
    sections: {
      value: 'The value plates',
      picks: 'Your planner’s catalogue',
      words: 'Notes from the museum floor',
    },
    motif: 'rule',
  },

  'luxor-excursions': {
    archetype: 'lagoon',
    ink: '#17110a',
    paper: '#f7f1e4',
    surface: '#fffaf1',
    wash: '#6b4f23',
    display: 'var(--offer-scroll), Georgia, "Iowan Old Style", serif',
    displayTracking: '-0.005em',
    kicker: 'Written for you · East & West Bank',
    heroLine: 'both banks of the Nile.',
    sections: {
      value: 'Best value on the river',
      picks: 'Chosen by your planner',
      words: 'Traveller inscriptions',
    },
    motif: 'column',
  },

  'el-gouna': {
    archetype: 'lagoon',
    ink: '#062b33',
    paper: '#f0fbfb',
    surface: '#ffffff',
    wash: '#0e7490',
    display: 'var(--offer-lagoon), Inter, system-ui, sans-serif',
    displayTracking: '-0.04em',
    kicker: 'A private offer · lagoon side',
    heroLine: 'the whole lagoon.',
    sections: {
      value: 'Lagoon value picks',
      picks: 'Your planner’s shortlist',
      words: 'Around the marina',
    },
    motif: 'ripple',
  },
};

export function designFor(tenantId: string): CityDesign {
  return CITY_DESIGNS[tenantId] ?? SHARM;
}
