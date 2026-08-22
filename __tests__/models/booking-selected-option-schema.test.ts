import fs from 'node:fs';
import path from 'node:path';

describe('Booking selected option schema', () => {
  it('preserves the nested pricing type without confusing Mongoose schema options', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'lib/models/Booking.ts'), 'utf8');

    expect(source).toMatch(/const SelectedBookingOptionSchema = new Schema\([\s\S]*?type: String,[\s\S]*?\{ _id: false \},\s*\);/);
    expect(source).toMatch(/selectedBookingOption:\s*\{\s*type: SelectedBookingOptionSchema,\s*required: false,\s*\}/);
  });
});
