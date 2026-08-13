import fs from 'node:fs';
import path from 'node:path';

describe('BookingSidebar iPhone scrolling contract', () => {
  it('keeps the booking-option pane vertically pannable with momentum scrolling', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'components/BookingSidebar.tsx'), 'utf8');
    expect(source).toContain('touch-pan-y');
    expect(source).toContain('[-webkit-overflow-scrolling:touch]');
    expect(source).toContain('overflow-y-auto');
  });
});
