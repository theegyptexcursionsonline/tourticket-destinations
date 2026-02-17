/**
 * Unit tests for admin bookings API filter logic.
 *
 * We extract the pure filter-building functions from the route handler
 * and test them in isolation — no database or HTTP mocking needed.
 */

import { toBookingStatusDb, BOOKING_STATUSES_DB } from '@/lib/constants/bookingStatus';

// ---------------------------------------------------------------------------
// Helpers extracted from app/api/admin/bookings/route.ts
// (keep in sync if the route changes)
// ---------------------------------------------------------------------------

function resolveEffectiveTenantId(
  raw: string | null | undefined
): string | undefined {
  return raw && raw !== 'all' ? raw : undefined;
}

function buildBaseMatch(params: {
  status?: string;
  tourId?: string;
  purchaseFrom?: string;
  purchaseTo?: string;
  activityFrom?: string;
  activityTo?: string;
}): Record<string, unknown> {
  const match: Record<string, unknown> = {};

  // Status
  if (params.status && params.status !== 'all') {
    const mapped = toBookingStatusDb(params.status);
    match.status = mapped || params.status;
  }

  // Tour ObjectId
  if (params.tourId && /^[a-f\d]{24}$/i.test(params.tourId)) {
    match.tour = params.tourId; // simplified — real code wraps in ObjectId
  }

  // Date range helpers
  const parseDayStartUtc = (dateStr: string): Date | null => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
    return new Date(`${dateStr}T00:00:00.000Z`);
  };
  const parseDayEndUtc = (dateStr: string): Date | null => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
    return new Date(`${dateStr}T23:59:59.999Z`);
  };

  // Purchase date range (createdAt)
  if (params.purchaseFrom || params.purchaseTo) {
    const from = params.purchaseFrom
      ? parseDayStartUtc(params.purchaseFrom)
      : null;
    const to = params.purchaseTo ? parseDayEndUtc(params.purchaseTo) : null;
    if (from || to) {
      match.createdAt = {
        ...(from ? { $gte: from } : {}),
        ...(to ? { $lte: to } : {}),
      };
    }
  }

  // Activity date range
  if (params.activityFrom || params.activityTo) {
    const from = params.activityFrom
      ? parseDayStartUtc(params.activityFrom)
      : null;
    const to = params.activityTo ? parseDayEndUtc(params.activityTo) : null;
    if (from || to) {
      match.date = {
        ...(from ? { $gte: from } : {}),
        ...(to ? { $lte: to } : {}),
      };
    }
  }

  return match;
}

function buildTenantStage(
  effectiveTenantId: string | undefined
): Record<string, unknown>[] {
  if (!effectiveTenantId) return [];
  return [
    {
      $match: {
        $or: [
          { tenantId: effectiveTenantId },
          { 'tour.tenantId': effectiveTenantId },
        ],
      },
    },
  ];
}

function resolvePagination(pageRaw?: string, limitRaw?: string) {
  const page = Math.max(1, Number.parseInt(pageRaw || '1', 10) || 1);
  const requestedLimit = Number.parseInt(limitRaw || '10', 10) || 10;
  const allowedLimits = new Set([10, 20, 50]);
  const limit = allowedLimits.has(requestedLimit) ? requestedLimit : 10;
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

function resolveSort(sortParam?: string): Record<string, 1 | -1> {
  const sortMap: Record<string, Record<string, 1 | -1>> = {
    createdAt_desc: { createdAt: -1 },
    createdAt_asc: { createdAt: 1 },
    activityDate_desc: { date: -1 },
    activityDate_asc: { date: 1 },
  };
  return sortMap[sortParam || ''] || sortMap.createdAt_desc;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Admin Bookings API — filter logic', () => {
  // ============================
  // Tenant resolution
  // ============================
  describe('resolveEffectiveTenantId', () => {
    it('returns undefined for "all"', () => {
      expect(resolveEffectiveTenantId('all')).toBeUndefined();
    });

    it('returns undefined for null/undefined/empty', () => {
      expect(resolveEffectiveTenantId(null)).toBeUndefined();
      expect(resolveEffectiveTenantId(undefined)).toBeUndefined();
      expect(resolveEffectiveTenantId('')).toBeUndefined();
    });

    it('returns the tenant ID for a valid string', () => {
      expect(resolveEffectiveTenantId('hurghada-speedboat')).toBe(
        'hurghada-speedboat'
      );
      expect(resolveEffectiveTenantId('default')).toBe('default');
    });
  });

  // ============================
  // Tenant pipeline stage
  // ============================
  describe('buildTenantStage', () => {
    it('returns empty array when no tenant is selected (all brands)', () => {
      const stages = buildTenantStage(undefined);
      expect(stages).toEqual([]);
    });

    it('returns $match with $or for a specific tenant', () => {
      const stages = buildTenantStage('hurghada-speedboat');
      expect(stages).toHaveLength(1);
      expect(stages[0]).toEqual({
        $match: {
          $or: [
            { tenantId: 'hurghada-speedboat' },
            { 'tour.tenantId': 'hurghada-speedboat' },
          ],
        },
      });
    });

    it('works for "default" tenant', () => {
      const stages = buildTenantStage('default');
      expect(stages).toHaveLength(1);
      const orClauses = (stages[0] as any).$match.$or;
      expect(orClauses).toContainEqual({ tenantId: 'default' });
      expect(orClauses).toContainEqual({ 'tour.tenantId': 'default' });
    });
  });

  // ============================
  // Status filter
  // ============================
  describe('status filter (via toBookingStatusDb)', () => {
    it('maps lowercase codes to title-case DB values', () => {
      expect(toBookingStatusDb('confirmed')).toBe('Confirmed');
      expect(toBookingStatusDb('pending')).toBe('Pending');
      expect(toBookingStatusDb('completed')).toBe('Completed');
      expect(toBookingStatusDb('cancelled')).toBe('Cancelled');
      expect(toBookingStatusDb('refunded')).toBe('Refunded');
      expect(toBookingStatusDb('partial_refunded')).toBe('Partial Refunded');
    });

    it('maps title-case labels back to themselves', () => {
      expect(toBookingStatusDb('Confirmed')).toBe('Confirmed');
      expect(toBookingStatusDb('Partial Refunded')).toBe('Partial Refunded');
    });

    it('returns null for unknown status', () => {
      expect(toBookingStatusDb('bogus')).toBeNull();
      expect(toBookingStatusDb('')).toBeNull();
    });

    it('all DB values are in BOOKING_STATUSES_DB', () => {
      const codes = [
        'confirmed',
        'pending',
        'completed',
        'cancelled',
        'refunded',
        'partial_refunded',
      ];
      for (const code of codes) {
        const db = toBookingStatusDb(code);
        expect(BOOKING_STATUSES_DB).toContain(db);
      }
    });
  });

  // ============================
  // Base match builder
  // ============================
  describe('buildBaseMatch', () => {
    it('returns empty object when no filters are provided', () => {
      expect(buildBaseMatch({})).toEqual({});
    });

    it('ignores status "all"', () => {
      expect(buildBaseMatch({ status: 'all' })).toEqual({});
    });

    it('sets status filter with mapped value', () => {
      const match = buildBaseMatch({ status: 'confirmed' });
      expect(match.status).toBe('Confirmed');
    });

    it('sets status filter with raw value when mapping fails', () => {
      const match = buildBaseMatch({ status: 'CustomStatus' });
      // toBookingStatusDb returns null for unknown → uses raw
      expect(match.status).toBe('CustomStatus');
    });

    it('filters by tourId when valid ObjectId string', () => {
      const id = '507f1f77bcf86cd799439011';
      const match = buildBaseMatch({ tourId: id });
      expect(match.tour).toBe(id);
    });

    it('ignores invalid tourId', () => {
      const match = buildBaseMatch({ tourId: 'not-valid' });
      expect(match.tour).toBeUndefined();
    });

    it('builds purchase date range (createdAt)', () => {
      const match = buildBaseMatch({
        purchaseFrom: '2026-01-01',
        purchaseTo: '2026-01-31',
      });
      const range = match.createdAt as any;
      expect(range.$gte).toEqual(new Date('2026-01-01T00:00:00.000Z'));
      expect(range.$lte).toEqual(new Date('2026-01-31T23:59:59.999Z'));
    });

    it('builds partial purchase date range (from only)', () => {
      const match = buildBaseMatch({ purchaseFrom: '2026-02-01' });
      const range = match.createdAt as any;
      expect(range.$gte).toEqual(new Date('2026-02-01T00:00:00.000Z'));
      expect(range.$lte).toBeUndefined();
    });

    it('builds partial purchase date range (to only)', () => {
      const match = buildBaseMatch({ purchaseTo: '2026-02-28' });
      const range = match.createdAt as any;
      expect(range.$gte).toBeUndefined();
      expect(range.$lte).toEqual(new Date('2026-02-28T23:59:59.999Z'));
    });

    it('builds activity date range', () => {
      const match = buildBaseMatch({
        activityFrom: '2026-03-01',
        activityTo: '2026-03-15',
      });
      const range = match.date as any;
      expect(range.$gte).toEqual(new Date('2026-03-01T00:00:00.000Z'));
      expect(range.$lte).toEqual(new Date('2026-03-15T23:59:59.999Z'));
    });

    it('ignores malformed date strings', () => {
      const match = buildBaseMatch({
        purchaseFrom: '2026-1-1',
        activityTo: 'not-a-date',
      });
      expect(match.createdAt).toBeUndefined();
      expect(match.date).toBeUndefined();
    });

    it('combines multiple filters', () => {
      const match = buildBaseMatch({
        status: 'pending',
        tourId: '507f1f77bcf86cd799439011',
        purchaseFrom: '2026-01-01',
        activityTo: '2026-06-30',
      });
      expect(match.status).toBe('Pending');
      expect(match.tour).toBe('507f1f77bcf86cd799439011');
      expect((match.createdAt as any).$gte).toBeDefined();
      expect((match.date as any).$lte).toBeDefined();
    });
  });

  // ============================
  // Pagination
  // ============================
  describe('resolvePagination', () => {
    it('defaults to page 1, limit 10', () => {
      expect(resolvePagination()).toEqual({ page: 1, limit: 10, skip: 0 });
    });

    it('parses valid page and limit', () => {
      expect(resolvePagination('3', '20')).toEqual({
        page: 3,
        limit: 20,
        skip: 40,
      });
    });

    it('clamps page to minimum 1', () => {
      expect(resolvePagination('0')).toEqual({ page: 1, limit: 10, skip: 0 });
      expect(resolvePagination('-5')).toEqual({ page: 1, limit: 10, skip: 0 });
    });

    it('falls back to 10 for disallowed limits', () => {
      expect(resolvePagination('1', '15').limit).toBe(10);
      expect(resolvePagination('1', '100').limit).toBe(10);
      expect(resolvePagination('1', '0').limit).toBe(10);
    });

    it('accepts allowed limits: 10, 20, 50', () => {
      expect(resolvePagination('1', '10').limit).toBe(10);
      expect(resolvePagination('1', '20').limit).toBe(20);
      expect(resolvePagination('1', '50').limit).toBe(50);
    });

    it('handles non-numeric input', () => {
      expect(resolvePagination('abc', 'xyz')).toEqual({
        page: 1,
        limit: 10,
        skip: 0,
      });
    });

    it('calculates skip correctly', () => {
      expect(resolvePagination('2', '20').skip).toBe(20);
      expect(resolvePagination('5', '50').skip).toBe(200);
    });
  });

  // ============================
  // Sorting
  // ============================
  describe('resolveSort', () => {
    it('defaults to createdAt descending', () => {
      expect(resolveSort()).toEqual({ createdAt: -1 });
      expect(resolveSort('')).toEqual({ createdAt: -1 });
      expect(resolveSort('unknown_sort')).toEqual({ createdAt: -1 });
    });

    it('maps known sort keys', () => {
      expect(resolveSort('createdAt_desc')).toEqual({ createdAt: -1 });
      expect(resolveSort('createdAt_asc')).toEqual({ createdAt: 1 });
      expect(resolveSort('activityDate_desc')).toEqual({ date: -1 });
      expect(resolveSort('activityDate_asc')).toEqual({ date: 1 });
    });
  });

  // ============================
  // Search regex safety
  // ============================
  describe('search regex escaping', () => {
    const escapeForRegex = (s: string) =>
      s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    it('escapes special regex characters', () => {
      expect(escapeForRegex('test.com')).toBe('test\\.com');
      expect(escapeForRegex('price $100')).toBe('price \\$100');
      expect(escapeForRegex('(hello)')).toBe('\\(hello\\)');
      expect(escapeForRegex('[bracket]')).toBe('\\[bracket\\]');
    });

    it('leaves alphanumerics untouched', () => {
      expect(escapeForRegex('abc123')).toBe('abc123');
      expect(escapeForRegex('John Doe')).toBe('John Doe');
    });

    it('produces valid RegExp', () => {
      const dangerous = 'user+name@email.com';
      const escaped = escapeForRegex(dangerous);
      expect(() => new RegExp(escaped, 'i')).not.toThrow();
    });
  });

  // ============================
  // End-to-end pipeline shape
  // ============================
  describe('full pipeline shape', () => {
    it('has correct stage order for "all brands" with no filters', () => {
      const baseMatch = buildBaseMatch({});
      const tenantStages = buildTenantStage(undefined);

      const pipeline = [
        { $match: baseMatch },
        { $lookup: { from: 'tours' } },
        { $unwind: '$tour' },
        ...tenantStages, // should be empty
        { $lookup: { from: 'destinations' } },
        { $unwind: '$destination' },
        { $lookup: { from: 'users' } },
        { $unwind: '$user' },
      ];

      // No tenant $match stage when "all" is selected
      const matchStages = pipeline.filter(
        (s: any) => s.$match && s.$match.$or
      );
      expect(matchStages).toHaveLength(0);
    });

    it('injects tenant stage when a brand is selected', () => {
      const tenantStages = buildTenantStage('cairo-excursions-online');

      const pipeline = [
        { $match: {} },
        { $lookup: { from: 'tours' } },
        { $unwind: '$tour' },
        ...tenantStages,
        { $lookup: { from: 'destinations' } },
      ];

      const matchStages = pipeline.filter(
        (s: any) => s.$match && s.$match.$or
      );
      expect(matchStages).toHaveLength(1);
      expect(matchStages[0].$match.$or[0].tenantId).toBe(
        'cairo-excursions-online'
      );
    });
  });
});
