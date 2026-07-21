export type MongoFilter = Record<string, unknown>;
export function combinePageFilters(...filters: MongoFilter[]): MongoFilter {
  const active = filters.filter((filter) => Object.keys(filter).length > 0);
  if (active.length === 0) return {};
  if (active.length === 1) return active[0];
  return { $and: active };
}
