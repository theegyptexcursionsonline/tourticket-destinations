import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * A missing or zero saving must hide the badge, not render a bare "0" beside
 * the add-on price (seen live on the sibling EO storefront).
 */
describe('add-on savings badge', () => {
  const source = readFileSync(join(process.cwd(), 'components/BookingSidebar.tsx'), 'utf8');

  it('never renders a falsy savings value into the markup', () => {
    expect(source).not.toContain('{addOn.savings && (');
    expect(source.match(/\{Number\(addOn\.savings\) > 0 && \(/g)?.length).toBeGreaterThanOrEqual(2);
  });
});
