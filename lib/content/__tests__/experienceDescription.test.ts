import { formatExperienceDescription } from '../experienceDescription';

describe('formatExperienceDescription', () => {
  it('turns long plain copy into readable paragraphs', () => {
    const result = formatExperienceDescription('One. Two. Three. Four. Five. Six.');
    expect(result).toBe('<p>One. Two.</p><p>Three. Four. Five.</p><p>Six.</p>');
  });

  it('preserves already structured HTML', () => {
    expect(formatExperienceDescription('<p>Already structured.</p>')).toBe('<p>Already structured.</p>');
  });
});
