import fs from 'node:fs';
import path from 'node:path';
import { auditStamp } from '@/lib/admin/auditStamp';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

describe('archived is its own status, not a draft', () => {
  const list = read('app/admin/tours/ToursListClient.tsx');

  it('offers an Archived tab', () => {
    expect(list).toContain("id: 'archived' as TabFilter");
    expect(list).toContain("'all' | 'published' | 'draft' | 'featured' | 'archived'");
  });

  it('keeps archived tours out of every other tab, including Draft', () => {
    expect(list).toContain('list = list.filter((t) => !isArchived(t))');
  });

  it('derives the status instead of storing an enum, so nothing needs migrating', () => {
    expect(list).toContain('const isArchived = (tour: TourType) => Boolean(tour.archivedAt)');
  });

  it('ships archivedAt to the client so the tab can filter on it', () => {
    expect(read('app/api/admin/tours/route.ts')).toContain("'archivedAt'");
  });
});

describe('audit trail records who touched a tour', () => {
  it('stamps a snapshot that survives the team member being removed', () => {
    expect(auditStamp({ id: 'u1', name: 'Sara', email: 'sara@example.com' }))
      .toEqual({ id: 'u1', name: 'Sara', email: 'sara@example.com' });
  });

  it('falls back to the email when no name is set', () => {
    expect(auditStamp({ id: 'u1', email: 'ops@example.com' })?.name).toBe('ops@example.com');
  });

  it('never stamps an actor without an id', () => {
    expect(auditStamp({ email: 'nobody@example.com' })).toBeUndefined();
    expect(auditStamp(null)).toBeUndefined();
    expect(auditStamp(undefined)).toBeUndefined();
  });

  it('sets createdBy on create and updatedBy on edit', () => {
    expect(read('app/api/admin/tours/route.ts')).toContain('body.createdBy = author');
    const edit = read('app/api/admin/tours/[id]/route.ts');
    expect(edit).toContain('body.updatedBy = editor');
    // a client cannot rewrite authorship
    expect(edit).toContain('delete body.createdBy');
  });

  it('exposes an editor filter on the tours list', () => {
    const list = read('app/admin/tours/ToursListClient.tsx');
    expect(list).toContain('editorFilter');
    expect(list).toContain("params.set('editor', editorFilter)");
  });
});

describe('pages and destinations can be archived from the row', () => {
  const list = read('app/admin/pages/page.tsx');

  it('offers archive and restore actions without opening the page', () => {
    expect(list).toContain('setArchived(row, true)');
    expect(list).toContain('setArchived(row, false)');
  });

  it('filters archived rows in the database query, not in the browser', () => {
    // client-side filtering would silently drop rows past the cursor
    const route = read('app/api/admin/pages/route.ts');
    expect(route).toContain("status === 'archived'");
    expect(route).toContain('attractionTypeFilter.archivedAt = null');
    expect(route).toContain('categoryStatusFilter.archivedAt = null');
  });

  it('stores the archive timestamp on both page models', () => {
    expect(read('lib/models/AttractionPage.ts')).toContain('archivedAt');
    expect(read('lib/models/Category.ts')).toContain('archivedAt');
  });

  it('never blanks page arrays when the archive action sends a partial body', () => {
    // the archive PUT carries only archivedAt; the coercion to [] must not
    // apply to keys the request did not send
    const route = read('app/api/admin/attraction-pages/[id]/route.ts');
    expect(route).toContain("'images' in body");
    expect(route).toContain("'keywords' in body");
  });
});
