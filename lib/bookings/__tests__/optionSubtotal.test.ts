import { optionSubtotal } from '@/lib/bookings/optionSubtotal';

// The client's rule (sheet 2026-08-20): a unit covers TOTAL participants —
// adults, children AND infants — because a seat is a seat. Per-person
// pricing keeps the network's child-half rule and infants travel free.
describe('optionSubtotal', () => {
  it('charges per person with children at half and infants free', () => {
    expect(optionSubtotal({ type: 'Per Person' }, 100, 2, 1, 1)).toBe(250);
    expect(optionSubtotal(null, 100, 2, 1, 3)).toBe(250);
  });

  it('charges a whole unit once regardless of head count', () => {
    expect(optionSubtotal({ type: 'Per Group' }, 150, 3, 1, 0)).toBe(150);
    expect(optionSubtotal({ type: 'Per Group' }, 150, 3, 1, 2)).toBe(150);
  });

  it('steps a couple unit up when an infant is the third seat', () => {
    expect(optionSubtotal({ type: 'Per Couple' }, 80, 2, 0, 0)).toBe(80);
    expect(optionSubtotal({ type: 'Per Couple' }, 80, 2, 0, 1)).toBe(160);
    expect(optionSubtotal({ type: 'Per Couple', minCapacity: 2 }, 80, 1, 1, 1)).toBe(160);
  });

  it('counts infants toward an authored family unit', () => {
    expect(optionSubtotal({ type: 'Per Family', minCapacity: 4 }, 200, 2, 2, 0)).toBe(200);
    expect(optionSubtotal({ type: 'Per Family', minCapacity: 4 }, 200, 2, 2, 1)).toBe(400);
  });

  it('treats the infant argument as optional and tolerates junk counts', () => {
    expect(optionSubtotal({ type: 'Per Couple' }, 80, 2, 0)).toBe(80);
    expect(optionSubtotal({ type: 'Per Couple' }, 80, 2, 0, Number.NaN)).toBe(80);
    expect(optionSubtotal({ type: 'Per Couple' }, 80, 2, 0, -4)).toBe(80);
  });
});
