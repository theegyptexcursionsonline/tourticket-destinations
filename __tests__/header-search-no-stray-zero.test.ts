// `{n && <jsx/>}` renders the text "0" when n is 0. A search result or chat
// tour card without a price (or rating) printed a stray "0" in the header
// search. Numeric fields there must be guarded with Boolean(...).
import fs from 'node:fs';
import path from 'node:path';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');
const numericFields = ['price', 'discountPrice', 'rating', 'reviews'];

describe.each(['components/Header.tsx', 'components/Header2.tsx', 'components/Headersearch.tsx'])('%s', (file) => {
  const source = read(file);

  it('never guards a numeric field with a bare && in JSX', () => {
    for (const field of numericFields) {
      expect(source).not.toMatch(new RegExp(`\\{\\(?(hit|tour)\\.${field}( \\|\\| (hit|tour)\\.\\w+)?\\)? &&`));
    }
  });
});

it('a price of 0 or blank shows nothing in the result row', () => {
  const header = read('components/Header.tsx');
  expect(header).toContain('{Boolean(hit.price || hit.discountPrice) && (');
  expect(header).toContain('{Boolean(tour.price) && (');
  expect(read('components/Header2.tsx')).toContain('{Boolean(hit.price || hit.discountPrice) && (');
});
