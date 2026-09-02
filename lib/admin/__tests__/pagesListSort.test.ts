/**
 * Client request (MT sheet, 31 Aug — parity with EEO): the Pages list could
 * only be sorted by newest-created, so an editor could not find what they had
 * just changed.
 *
 * The Pages list is cursor-paginated over two collections, and legacy rows can
 * carry no createdAt/updatedAt. Sorting on the raw field would strand those
 * rows past the cursor — the tail unreachable — and one missing date would
 * 500 the whole list. These lock the computed sort value and the keyset
 * predicate built on top of it, and walk a mixed dataset to the tail.
 */

import {
  buildPagesCursorFilter,
  buildSortValueStage,
  resolvePagesSortKey,
  PAGES_SORT_KEYS,
  SORT_VALUE_FIELD,
  type PagesSortKey,
} from '@/lib/admin/pagesListSort';

const toObjectId = (id: string) => ({ oid: id });
const cursor = { c: '2026-07-20T10:00:00.000Z', id: '66a000000000000000000001' };

describe('pages list sort key', () => {
  it('only accepts the two supported keys, defaulting to created', () => {
    expect(PAGES_SORT_KEYS).toEqual(['createdAt', 'updatedAt']);
    expect(resolvePagesSortKey('updated')).toBe('updatedAt');
    expect(resolvePagesSortKey('created')).toBe('createdAt');
    expect(resolvePagesSortKey(null)).toBe('createdAt');
    expect(resolvePagesSortKey('nonsense')).toBe('createdAt');
  });
});

describe('computed sort value', () => {
  it('falls back createdAt -> ObjectId timestamp under the default sort', () => {
    const stage = buildSortValueStage('createdAt') as { $addFields: Record<string, unknown> };
    expect(stage.$addFields[SORT_VALUE_FIELD]).toEqual({
      $ifNull: ['$createdAt', { $toDate: '$_id' }],
    });
  });

  it('falls back updatedAt -> createdAt -> ObjectId timestamp under last-modified', () => {
    const stage = buildSortValueStage('updatedAt') as { $addFields: Record<string, unknown> };
    expect(stage.$addFields[SORT_VALUE_FIELD]).toEqual({
      $ifNull: ['$updatedAt', { $ifNull: ['$createdAt', { $toDate: '$_id' }] }],
    });
  });
});

describe('pages list cursor', () => {
  it('walks the computed value, never the raw timestamp', () => {
    const filter = buildPagesCursorFilter(cursor, toObjectId) as { $or: Record<string, unknown>[] };
    expect(filter.$or[0]).toHaveProperty(SORT_VALUE_FIELD);
    expect(filter.$or[0]).not.toHaveProperty('createdAt');
    expect(filter.$or[0]).not.toHaveProperty('updatedAt');
  });

  it('breaks ties on _id so equal timestamps cannot loop', () => {
    const filter = buildPagesCursorFilter(cursor, toObjectId) as { $or: Record<string, unknown>[] };
    expect(filter.$or[1]).toHaveProperty('_id');
    expect(filter.$or[1][SORT_VALUE_FIELD]).toEqual(new Date(cursor.c));
  });

  it('is a no-op on the first page', () => {
    expect(buildPagesCursorFilter(null, toObjectId)).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// Tail reachability. A deterministic evaluator of exactly the operators the
// pipeline uses ($ifNull, $toDate on an ObjectId hex, $lt on Date/_id, $or),
// applied to a dataset where some rows lack createdAt, some lack updatedAt and
// several share a timestamp. Every row must be visited exactly once under
// both sort keys when paging with the emitted cursor.
// ---------------------------------------------------------------------------

type Doc = { _id: string; createdAt?: Date; updatedAt?: Date };

function objectIdDate(hex: string): Date {
  return new Date(parseInt(hex.slice(0, 8), 16) * 1000);
}

function evaluate(expr: unknown, doc: Doc): Date | null {
  if (typeof expr === 'string' && expr.startsWith('$')) {
    const value = (doc as Record<string, unknown>)[expr.slice(1)];
    return value instanceof Date ? value : null;
  }
  const op = expr as { $ifNull?: unknown[]; $toDate?: string };
  if (op.$ifNull) {
    for (const candidate of op.$ifNull) {
      const value = evaluate(candidate, doc);
      if (value !== null) return value;
    }
    return null;
  }
  if (op.$toDate) return objectIdDate(doc._id);
  throw new Error(`Unsupported expression: ${JSON.stringify(expr)}`);
}

function matches(predicate: Record<string, unknown>, doc: Doc & Record<string, unknown>): boolean {
  if (Object.keys(predicate).length === 0) return true;
  const or = predicate.$or as Record<string, unknown>[];
  return or.some((clause) =>
    Object.entries(clause).every(([field, condition]) => {
      const actual = doc[field] as Date | string;
      if (condition && typeof condition === 'object' && '$lt' in (condition as object)) {
        const bound = (condition as { $lt: unknown }).$lt;
        if (field === '_id') return String(actual) < String((bound as { oid: string }).oid);
        return (actual as Date).getTime() < (bound as Date).getTime();
      }
      return (actual as Date).getTime() === (condition as Date).getTime();
    }),
  );
}

function walk(docs: Doc[], sortKey: PagesSortKey, limit: number): string[] {
  const stage = buildSortValueStage(sortKey) as { $addFields: Record<string, unknown> };
  const withValue = docs.map((doc) => ({
    ...doc,
    [SORT_VALUE_FIELD]: evaluate(stage.$addFields[SORT_VALUE_FIELD], doc),
  })) as Array<Doc & Record<string, unknown> & { __sortValue: Date }>;

  const seen: string[] = [];
  let next: { c: string; id: string } | null = null;
  for (let page = 0; page < 50; page += 1) {
    const predicate = buildPagesCursorFilter(next, toObjectId);
    const rows = withValue
      .filter((doc) => matches(predicate, doc))
      .sort((a, b) => {
        const delta = b.__sortValue.getTime() - a.__sortValue.getTime();
        return delta !== 0 ? delta : (a._id < b._id ? 1 : -1);
      })
      .slice(0, limit + 1);
    const pageRows = rows.slice(0, limit);
    seen.push(...pageRows.map((row) => row._id));
    if (rows.length <= limit) return seen;
    const last = pageRows[pageRows.length - 1];
    next = { c: last.__sortValue.toISOString(), id: last._id };
  }
  throw new Error('cursor loop did not terminate');
}

describe('pages list cursor reaches the tail', () => {
  const at = (iso: string) => new Date(iso);
  // ObjectIds carry a 2024-01-01 timestamp so the fallback is distinguishable
  // from the explicit dates (2026).
  const hex = (n: number) => `6592008${n.toString(16)}`.padEnd(8, '0') + n.toString(16).padStart(16, '0');
  const docs: Doc[] = [
    { _id: hex(1), createdAt: at('2026-07-01T00:00:00Z'), updatedAt: at('2026-07-30T00:00:00Z') },
    { _id: hex(2), createdAt: at('2026-07-02T00:00:00Z') }, // no updatedAt
    { _id: hex(3) }, // legacy: no dates at all
    { _id: hex(4), createdAt: at('2026-07-02T00:00:00Z'), updatedAt: at('2026-07-02T00:00:00Z') }, // ties #2 on created
    { _id: hex(5), createdAt: at('2026-07-05T00:00:00Z'), updatedAt: at('2026-07-05T00:00:00Z') },
    { _id: hex(6) }, // legacy
    { _id: hex(7), createdAt: at('2026-07-02T00:00:00Z'), updatedAt: at('2026-07-31T00:00:00Z') }, // ties #2/#4 on created
  ];

  it.each([1, 2, 3])('visits every row exactly once under Newest with page size %i', (limit) => {
    const ids = walk(docs, 'createdAt', limit);
    expect(ids).toHaveLength(docs.length);
    expect(new Set(ids).size).toBe(docs.length);
    // Legacy rows (ObjectId fallback, 2024) come after every 2026 row.
    expect(ids.slice(-2).sort()).toEqual([hex(3), hex(6)].sort());
  });

  it.each([1, 2, 3])('visits every row exactly once under Last Modified with page size %i', (limit) => {
    const ids = walk(docs, 'updatedAt', limit);
    expect(ids).toHaveLength(docs.length);
    expect(new Set(ids).size).toBe(docs.length);
    expect(ids[0]).toBe(hex(7)); // most recently modified first
    expect(ids[1]).toBe(hex(1));
    // A row with no updatedAt falls back to its createdAt, not to the tail.
    expect(ids.indexOf(hex(2))).toBeLessThan(ids.indexOf(hex(3)));
  });
});
