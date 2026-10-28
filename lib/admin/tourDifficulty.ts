export const TOUR_DIFFICULTIES = ['Easy', 'Moderate', 'Challenging', 'Difficult'] as const;
export type TourDifficulty = (typeof TOUR_DIFFICULTIES)[number];

// Difficulty used to be a free-text field, so stored tours can hold values
// like "easy", "Medium" or a translated word. The schema only accepts the
// four canonical values, and one stale value blocked every save of the tour.
const ALIASES: Record<string, TourDifficulty> = {
  easy: 'Easy', leicht: 'Easy', einfach: 'Easy', facile: 'Easy', 'fácil': 'Easy', facil: 'Easy',
  moderate: 'Moderate', medium: 'Moderate', mittel: 'Moderate', moderat: 'Moderate', moyen: 'Moderate', moderado: 'Moderate',
  challenging: 'Challenging', anspruchsvoll: 'Challenging', hard: 'Challenging', schwer: 'Challenging',
  difficult: 'Difficult', schwierig: 'Difficult', difficile: 'Difficult', 'difícil': 'Difficult', dificil: 'Difficult',
};

export function normalizeTourDifficulty(value: unknown): TourDifficulty {
  if (typeof value !== 'string') return 'Easy';
  return ALIASES[value.trim().toLowerCase()] ?? 'Easy';
}
