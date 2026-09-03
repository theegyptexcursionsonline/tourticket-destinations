/**
 * Which supplementary tour-content sections actually have something to show.
 *
 * Client report (MT sheet, 02 Sep): "supplementary sections in content appears
 * on the front end even when they are empty in the back end." Every card in
 * Practical Information, Accessibility, Policies and Cultural Information was
 * rendered unconditionally, so an unfilled field produced a titled, empty box
 * — and the tab strip advertised sections with nothing in them.
 *
 * These predicates are the single source of truth for "is there content here",
 * used both to render a card and to decide whether its section and tab exist.
 */

export interface TourEnhancementContent {
  itinerary?: unknown[];
  whatToBring?: string[];
  whatToWear?: string[];
  physicalRequirements?: string;
  accessibilityInfo?: string[];
  groupSize?: { min: number; max: number } | null;
  transportationDetails?: string;
  mealInfo?: string;
  weatherPolicy?: string;
  photoPolicy?: string;
  tipPolicy?: string;
  healthSafety?: string[];
  culturalInfo?: string[];
  seasonalVariations?: string;
  localCustoms?: string[];
}

/** A text field counts only when it holds visible characters. */
export function hasText(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

/** A list counts only when it holds at least one entry with visible text. */
export function hasList(value: unknown): boolean {
  return Array.isArray(value) && value.some((item) => hasText(item));
}

/** A group-size box is meaningful only with a real upper bound. */
export function hasGroupSize(value: TourEnhancementContent['groupSize']): boolean {
  if (!value || typeof value !== 'object') return false;
  const max = Number((value as { max?: unknown }).max);
  return Number.isFinite(max) && max > 0;
}

export interface EnhancementSectionFlags {
  practical: boolean;
  accessibility: boolean;
  policies: boolean;
  cultural: boolean;
}

/**
 * A section renders only when at least one of its own cards would render.
 * Keep this aligned with the cards inside each section component.
 */
export function enhancementSections(enhancement: TourEnhancementContent | null | undefined): EnhancementSectionFlags {
  const value = enhancement || {};
  return {
    practical:
      hasList(value.whatToBring) ||
      hasList(value.whatToWear) ||
      hasText(value.physicalRequirements) ||
      hasGroupSize(value.groupSize),
    accessibility:
      hasList(value.accessibilityInfo) ||
      hasList(value.healthSafety) ||
      hasText(value.transportationDetails),
    policies:
      hasText(value.weatherPolicy) ||
      hasText(value.photoPolicy) ||
      hasText(value.tipPolicy) ||
      hasText(value.mealInfo),
    cultural:
      hasList(value.culturalInfo) ||
      hasList(value.localCustoms) ||
      hasText(value.seasonalVariations),
  };
}
