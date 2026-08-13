/**
 * Per-city design profiles for planner offer pages.
 *
 * Each destination gets its own architecture — not one template in a different
 * colour. The archetype decides the hero composition, the card construction,
 * the type pairing and the section rhythm; the palette and motif carry the
 * city's own material world (reef water, marina light, limestone, papyrus,
 * lagoon). A tenant with no profile falls back to `reef`, which is the most
 * neutral of the five.
 */

export type OfferArchetype = 'reef' | 'marina' | 'plate' | 'scroll' | 'lagoon';

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
  /** Short line under the hero headline; {label} is the discount, {site} the brand. */
  motif: 'wave' | 'sun' | 'rule' | 'column' | 'ripple';
};

const REEF: CityDesign = {
  archetype: 'reef',
  ink: '#04141c',
  paper: '#f2f7f8',
  surface: '#ffffff',
  wash: '#0d3a47',
  display: '"Helvetica Neue", Inter, system-ui, sans-serif',
  displayTracking: '-0.03em',
  kicker: 'A private offer from your personal planner',
  sections: {
    value: 'Book bundles & save more',
    picks: 'Top tours recommended by your personal planner',
    words: 'Why travellers rate us',
  },
  motif: 'wave',
};

export const CITY_DESIGNS: Record<string, CityDesign> = {
  'sharm-excursions-online': REEF,

  'hurghada-excursions-online': {
    archetype: 'marina',
    ink: '#1a0b06',
    paper: '#fff6f0',
    surface: '#ffffff',
    wash: '#7c2d12',
    display: '"Avenir Next", "Helvetica Neue", system-ui, sans-serif',
    displayTracking: '-0.02em',
    kicker: 'Your planner’s boarding pass',
    sections: {
      value: 'Two boats, one price break',
      picks: 'What your planner would book first',
      words: 'From the deck',
    },
    motif: 'sun',
  },

  'cairo-excursions-online': {
    archetype: 'plate',
    ink: '#0f1013',
    paper: '#f6f3ec',
    surface: '#fffdf8',
    wash: '#3f3a2f',
    display: 'Georgia, "Times New Roman", serif',
    displayTracking: '-0.015em',
    kicker: 'Prepared for you · Cairo & Giza',
    sections: {
      value: 'The value plates',
      picks: 'Your planner’s catalogue',
      words: 'Notes from the museum floor',
    },
    motif: 'rule',
  },

  'luxor-excursions': {
    archetype: 'scroll',
    ink: '#17110a',
    paper: '#f7f1e4',
    surface: '#fffaf1',
    wash: '#6b4f23',
    display: 'Georgia, "Iowan Old Style", serif',
    displayTracking: '0',
    kicker: 'Written for you · East & West Bank',
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
    display: '"Avenir Next", Inter, system-ui, sans-serif',
    displayTracking: '-0.035em',
    kicker: 'A private offer · lagoon side',
    sections: {
      value: 'Lagoon value picks',
      picks: 'Your planner’s shortlist',
      words: 'Around the marina',
    },
    motif: 'ripple',
  },
};

export function designFor(tenantId: string): CityDesign {
  return CITY_DESIGNS[tenantId] ?? REEF;
}
