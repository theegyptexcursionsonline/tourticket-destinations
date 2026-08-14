import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

describe('tour editor dismissal contract', () => {
  const form = read('components/TourForm.tsx');

  it('keeps the editor open when the backdrop is clicked', () => {
    const classIndex = form.indexOf('className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"');
    expect(classIndex).toBeGreaterThanOrEqual(0);
    const backdropStart = form.lastIndexOf('<motion.div', classIndex);
    const backdropEnd = form.indexOf('/>', classIndex);
    const backdrop = form.slice(backdropStart, backdropEnd + 2);
    expect(backdrop).toContain('data-testid="tour-editor-backdrop"');
    expect(backdrop).toContain('aria-hidden="true"');
    expect(backdrop).not.toContain('onClick=');
  });

  it('retains deliberate, accessible close controls', () => {
    expect(form).toContain('role="dialog"');
    expect(form).toContain('aria-modal="true"');
    expect(form).toContain('aria-labelledby="tour-editor-title"');
    expect(form).toContain('aria-label="Close tour editor"');
    expect(form).toContain('onClick={() => setIsPanelOpen(false)}');
  });
});
