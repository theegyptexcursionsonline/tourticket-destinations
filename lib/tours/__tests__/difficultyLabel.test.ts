import fs from 'node:fs';
import path from 'node:path';
import { tourDifficultyLabel } from '@/lib/tours/difficultyLabel';

// The words come from the message files of each language (19 Nov 2026: the
// Russian page showed "Easy" and the German network word "Mittel" on every
// non-German page). German pages read exactly as before.
const messages = (locale: string) => JSON.parse(fs.readFileSync(path.join(process.cwd(), 'messages', `${locale}.json`), 'utf8'));
const translator = (locale: string) => (key: string) => key.split('.').reduce((node: any, part) => node?.[part], messages(locale)) as string;

describe('tourDifficultyLabel', () => {
  it('shows the German network words for canonical values on German pages (unchanged)', () => {
    const t = translator('de');
    expect(tourDifficultyLabel('Easy', t)).toBe('Leicht');
    expect(tourDifficultyLabel('Moderate', t)).toBe('Mittel');
    expect(tourDifficultyLabel('Challenging', t)).toBe('Anspruchsvoll');
    expect(tourDifficultyLabel('Difficult', t)).toBe('Schwierig');
    expect(tourDifficultyLabel(' Moderate ', t)).toBe('Mittel');
  });

  it('keeps the German word an older tour still stores on German pages', () => {
    const t = translator('de');
    expect(tourDifficultyLabel('Leicht', t)).toBe('Leicht');
    expect(tourDifficultyLabel('Mittel', t)).toBe('Mittel');
    expect(tourDifficultyLabel('Anspruchsvoll', t)).toBe('Anspruchsvoll');
  });

  it('writes the list values in every other language, old German words included', () => {
    expect(tourDifficultyLabel('Moderate', translator('en'))).toBe('Moderate');
    expect(tourDifficultyLabel('Mittel', translator('en'))).toBe('Moderate');
    expect(tourDifficultyLabel('Easy', translator('ru'))).toBe('Лёгкая');
    expect(tourDifficultyLabel('Mittel', translator('ru'))).toBe('Средняя');
    expect(tourDifficultyLabel('Easy', translator('ar'))).toBe('سهلة');
    expect(tourDifficultyLabel('Challenging', translator('fr'))).toBe('Exigeante');
    expect(tourDifficultyLabel('Difficult', translator('es'))).toBe('Difícil');
  });

  it('leaves words outside the list exactly as the operator wrote them', () => {
    expect(tourDifficultyLabel('Einfach', translator('de'))).toBe('Einfach');
    expect(tourDifficultyLabel('constructor', translator('ru'))).toBe('constructor');
  });

  it('renders nothing for a missing value', () => {
    const t = translator('de');
    expect(tourDifficultyLabel(undefined, t)).toBe('');
    expect(tourDifficultyLabel(null, t)).toBe('');
    expect(tourDifficultyLabel('   ', t)).toBe('');
  });

  it('every language has every difficulty word', () => {
    for (const locale of ['en', 'de', 'ar', 'fr', 'es', 'ru']) {
      for (const key of ['difficultyEasy', 'difficultyModerate', 'difficultyChallenging', 'difficultyDifficult']) {
        expect(messages(locale).booking[key]).toBeTruthy();
      }
    }
  });
});
