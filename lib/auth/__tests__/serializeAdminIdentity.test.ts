import { serializeTenantIds } from '../serializeAdminIdentity';

describe('serializeTenantIds', () => {
  it('returns a plain string array for an array-like database value', () => {
    class DatabaseArray extends Array<unknown> {}

    const source = new DatabaseArray('default', 42);
    const result = serializeTenantIds(source);

    expect(result).toEqual(['default', '42']);
    expect(Object.getPrototypeOf(result)).toBe(Array.prototype);
  });

  it('returns an empty array when tenant access is unset', () => {
    expect(serializeTenantIds(undefined)).toEqual([]);
  });
});
