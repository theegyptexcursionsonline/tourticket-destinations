import fs from 'node:fs';
import path from 'node:path';

// Keep an uncapped expanded panel: slot lists may grow beyond any fixed pixel budget.
it('keeps the complete booking option form in normal page flow', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'components/TourForm.tsx'), 'utf8');
  const editor = source.slice(source.indexOf('{/* Booking Options Editor */}'));
  expect(editor).toContain("'max-h-none opacity-100'");
  expect(editor).not.toMatch(/max-h-\[\d+px\]/);
  expect(editor).toContain('aria-expanded={expandedOptionIndex === index}');
  expect(editor).toContain('Save Option');
});
