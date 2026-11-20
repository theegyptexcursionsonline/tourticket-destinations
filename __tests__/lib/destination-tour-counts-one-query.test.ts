/**
 * @jest-environment node
 */
// The destinations index counted tours with one query per destination (reported
// as an N+1 on GET /[locale]/destinations). It now asks once, grouped by
// destination, with the tenant scope and the destination list in the match.
const aggregate = jest.fn();

jest.mock('@/lib/models/Tour', () => ({
  __esModule: true,
  default: { aggregate: (...args: unknown[]) => aggregate(...args) },
}));

import { countToursByDestination } from '@/lib/destinations/tourCountsByDestination';

beforeEach(() => aggregate.mockReset());

describe('tour counts per destination', () => {
  it('asks once, grouped by destination, with the caller scope untouched', async () => {
    aggregate.mockResolvedValue([{ _id: { toString: () => 'd1' }, count: 4 }, { _id: 'd2', count: 1 }]);
    const match = { destination: { $in: ['d1', 'd2', 'd3'] }, isPublished: true, $or: [{ tenantId: 't1' }, { tenantIds: 't1' }] };
    const counts = await countToursByDestination(match);
    expect(aggregate).toHaveBeenCalledTimes(1);
    expect(aggregate).toHaveBeenCalledWith([
      { $match: match },
      { $group: { _id: '$destination', count: { $sum: 1 } } },
    ]);
    expect(counts.get('d1')).toBe(4);
    expect(counts.get('d2')).toBe(1);
    expect(counts.get('d3')).toBeUndefined();
  });

  it('the destinations page no longer counts tours one destination at a time', () => {
    const fs = require('fs');
    const source = fs.readFileSync('app/[locale]/destinations/page.tsx', 'utf8');
    expect(source).toContain('countToursByDestination(');
    expect(source).not.toMatch(/destinations\.map\(async[\s\S]*?Tour\.countDocuments/);
  });
});
