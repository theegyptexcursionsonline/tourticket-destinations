import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Bookings taken in the mobile app used to be indistinguishable from website
 * bookings in the admin list (every row said "online"), so the operator could
 * not tell which channel a sale came from. Client ask, 13 Aug.
 */
describe('booking channel in the admin list', () => {
  const client = readFileSync(
    path.join(process.cwd(), 'app/admin/bookings/BookingsPageClient.tsx'),
    'utf8',
  );
  const model = readFileSync(path.join(process.cwd(), 'lib/models/Booking.ts'), 'utf8');

  it('accepts the app channel on the model', () => {
    expect(model).toContain("enum: ['online', 'manual', 'app']");
    expect(model).toContain("source?: 'online' | 'manual' | 'app'");
  });

  it('badges app bookings in the list', () => {
    expect(client).toContain("booking.source === 'app'");
    expect(client).toContain('App booking');
  });

  it('keeps the existing manual badge', () => {
    expect(client).toContain("booking.source === 'manual'");
  });
});
