// Difficulty is chosen from a fixed list in the tour editor and stored as the
// English word (older German tours store the German word). Every page shows it
// in its own language through the message files; a value outside the list is
// operator text and is shown exactly as stored.
const DIFFICULTY_KEYS = new Map<string, string>([
  ['easy', 'booking.difficultyEasy'],
  ['moderate', 'booking.difficultyModerate'],
  ['challenging', 'booking.difficultyChallenging'],
  ['difficult', 'booking.difficultyDifficult'],
  ['leicht', 'booking.difficultyEasy'],
  ['mittel', 'booking.difficultyModerate'],
  ['anspruchsvoll', 'booking.difficultyChallenging'],
  ['schwierig', 'booking.difficultyDifficult'],
]);

export function tourDifficultyLabel(value: string | null | undefined, t: (key: string) => string): string {
  const difficulty = typeof value === 'string' ? value.trim() : '';
  if (!difficulty) return '';
  const key = DIFFICULTY_KEYS.get(difficulty.toLowerCase());
  return key ? t(key) : difficulty;
}
