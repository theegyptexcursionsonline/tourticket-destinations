import fs from 'node:fs';
import path from 'node:path';

describe('Booking selected option schema', () => {
  it('preserves the nested pricing type without confusing Mongoose schema options', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'lib/models/Booking.ts'), 'utf8');
    const schemaStart = source.indexOf('const SelectedBookingOptionSchema = new Schema(');
    const schemaEnd = source.indexOf('\n);', schemaStart);
    const selectedOptionSchema = source.slice(schemaStart, schemaEnd + 3);

    expect(schemaStart).toBeGreaterThanOrEqual(0);
    expect(schemaEnd).toBeGreaterThan(schemaStart);
    expect(selectedOptionSchema).toMatch(/type: \{ type: String \},/);
    expect(selectedOptionSchema).not.toMatch(/\n\s*type: String,/);
    expect(selectedOptionSchema).toMatch(/\{ _id: false \},\s*\);/);
    expect(source).toMatch(/selectedBookingOption:\s*\{\s*type: SelectedBookingOptionSchema,\s*required: false,\s*\}/);
  });
});
