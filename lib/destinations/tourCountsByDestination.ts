import Tour from '@/lib/models/Tour';

/**
 * Published tour count per destination, in one grouped query.
 *
 * The destinations index used to run one count per destination, a database
 * round trip each on every render (reported as an N+1 on GET
 * /[locale]/destinations). `match` must already carry the tenant scope and
 * `destination: { $in: [...] }`; this only groups it. Destinations without a
 * published tour are absent from the map and count as 0.
 */
export async function countToursByDestination(match: Record<string, unknown>): Promise<Map<string, number>> {
  const rows = await Tour.aggregate<{ _id: unknown; count: number }>([
    { $match: match },
    { $group: { _id: '$destination', count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((row) => [String(row._id), row.count]));
}
