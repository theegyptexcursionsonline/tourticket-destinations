import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('tour itinerary authoring language', () => {
  it('uses itinerary and step terminology throughout the editor', () => {
    const source = readFileSync(join(process.cwd(), 'components/TourForm.tsx'), 'utf8');
    expect(source).toContain('<FormLabel icon={Map}>Itinerary</FormLabel>');
    expect(source).toContain('`Step ${i + 1}`');
    expect(source).toContain('>Title</label>');
    expect(source).toContain('placeholder="Itinerary title"');
    expect(source).toContain('placeholder="Itinerary description"');
    expect(source).toContain('<span>Remove Step</span>');
    expect(source).toContain('Add Step');
    expect(source).not.toContain('Day-by-day Itinerary');
    expect(source).not.toContain('placeholder="Day title"');
    expect(source).not.toContain('placeholder="Day description"');
  });
});
