import {
  buildAuditFilters,
  decodeAuditCursor,
  encodeAuditCursor,
  withAuditCursor,
} from '@/lib/admin/auditQuery';

describe('audit cursor pagination', () => {
  it('round-trips a stable compound cursor', () => {
    const date = new Date('2026-08-04T10:20:30.000Z');
    const id = '64c2f4bc2f4bc2f4bc2f4bc2';
    expect(decodeAuditCursor(encodeAuditCursor(date, id))).toEqual({ createdAt: date, id });
  });

  it.each(['not-a-cursor', Buffer.from('{}').toString('base64url')])('rejects invalid cursor %s', (cursor) => {
    expect(decodeAuditCursor(cursor)).toBeNull();
  });

  it('builds the tail query without replacing tenant filters', () => {
    const cursor = {
      createdAt: new Date('2026-08-04T10:20:30.000Z'),
      id: '64c2f4bc2f4bc2f4bc2f4bc2',
    };
    expect(withAuditCursor({ tenantIds: 'default' }, cursor)).toEqual({
      $and: [
        { tenantIds: 'default' },
        { $or: [
          { createdAt: { $lt: cursor.createdAt } },
          { createdAt: cursor.createdAt, _id: { $lt: cursor.id } },
        ] },
      ],
    });
  });
});

describe('audit filters', () => {
  it('builds server-side action, resource, actor, and date filters', () => {
    const params = new URLSearchParams({
      action: 'update',
      outcome: 'failed',
      resourceType: 'tours',
      actor: 'jane+ops@example.com',
      from: '2026-08-01',
      to: '2026-08-04',
    });
    const filters = buildAuditFilters(params) as any;
    expect(filters.action).toBe('update');
    expect(filters.outcome).toBe('failed');
    expect(filters.resourceType).toBe('tours');
    expect(filters.$or[1].actorEmail.$regex).toContain('\\+');
    expect(filters.createdAt.$gte).toEqual(new Date('2026-08-01T00:00:00.000Z'));
    expect(filters.createdAt.$lte).toEqual(new Date('2026-08-04T23:59:59.999Z'));
  });

  it('maps legacy recorded outcome to rows without an outcome field', () => {
    const filters = buildAuditFilters(new URLSearchParams({ outcome: 'recorded' }));
    expect(filters.outcome).toEqual({ $exists: false });
  });

  it('ignores invalid dates instead of widening them into invalid Mongo queries', () => {
    const filters = buildAuditFilters(new URLSearchParams({ from: 'invalid', to: 'invalid' }));
    expect(filters).not.toHaveProperty('createdAt');
  });
});
