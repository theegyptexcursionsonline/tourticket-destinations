export interface AuditCursor {
  createdAt: Date;
  id: string;
}

export function encodeAuditCursor(createdAt: Date, id: unknown): string {
  return Buffer.from(JSON.stringify({ createdAt: createdAt.toISOString(), id: String(id) }))
    .toString('base64url');
}

export function decodeAuditCursor(value: string | null): AuditCursor | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as {
      createdAt?: string;
      id?: string;
    };
    const createdAt = new Date(parsed.createdAt || '');
    if (!Number.isFinite(createdAt.getTime()) || !/^[a-f\d]{24}$/i.test(parsed.id || '')) return null;
    return { createdAt, id: parsed.id as string };
  } catch {
    return null;
  }
}

export function buildAuditFilters(searchParams: URLSearchParams): Record<string, unknown> {
  const filters: Record<string, unknown> = {};
  const action = searchParams.get('action')?.trim();
  const outcome = searchParams.get('outcome')?.trim();
  const resourceType = searchParams.get('resourceType')?.trim();
  const actor = searchParams.get('actor')?.trim();
  const from = searchParams.get('from')?.trim();
  const to = searchParams.get('to')?.trim();

  if (action && action !== 'all') filters.action = action;
  if (outcome && outcome !== 'all') {
    filters.outcome = outcome === 'recorded' ? { $exists: false } : outcome;
  }
  if (resourceType && resourceType !== 'all') filters.resourceType = resourceType;
  if (actor) {
    const safeActor = actor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 120);
    filters.$or = [
      { actorName: { $regex: safeActor, $options: 'i' } },
      { actorEmail: { $regex: safeActor, $options: 'i' } },
    ];
  }

  const createdAt: Record<string, Date> = {};
  const fromDate = from ? new Date(`${from}T00:00:00.000Z`) : null;
  const toDate = to ? new Date(`${to}T23:59:59.999Z`) : null;
  if (fromDate && Number.isFinite(fromDate.getTime())) createdAt.$gte = fromDate;
  if (toDate && Number.isFinite(toDate.getTime())) createdAt.$lte = toDate;
  if (Object.keys(createdAt).length) filters.createdAt = createdAt;

  return filters;
}

export function withAuditCursor(
  filters: Record<string, unknown>,
  cursor: AuditCursor | null,
): Record<string, unknown> {
  if (!cursor) return filters;
  return {
    $and: [
      filters,
      {
        $or: [
          { createdAt: { $lt: cursor.createdAt } },
          { createdAt: cursor.createdAt, _id: { $lt: cursor.id } },
        ],
      },
    ],
  };
}
