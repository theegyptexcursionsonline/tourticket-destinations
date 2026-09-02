import {
  evaluateDepartureSellability,
  stopSaleAliasesForOption,
  stoppedPricingKeysForOptionIds,
} from '@/lib/revenue/departureSellability';

const sellable = {
  scheduled: true,
  startsAtUtc: '2026-08-15T08:00:00.000Z',
  now: new Date('2026-07-13T00:00:00.000Z'),
  slots: [{ time: '10:00', capacity: 10, booked: 2 }],
  time: '10:00',
  explicitStopSale: false,
  fullStopSale: false,
  optionStopSale: false,
  booked: 3,
};

describe('RevenuePilot sellable-departure guard', () => {
  it('returns capacity evidence for an actual future sellable slot', () => {
    expect(evaluateDepartureSellability(sellable)).toEqual({
      startsAtUtc: sellable.startsAtUtc,
      capacity: 10,
      booked: 3,
      available: 7,
    });
  });

  it.each([
    [{ scheduled: false }, 'DEPARTURE_NOT_SCHEDULED'],
    [{ startsAtUtc: '2026-07-12T08:00:00.000Z' }, 'DEPARTURE_NOT_FUTURE'],
    [{ fullStopSale: true }, 'DEPARTURE_STOP_SALE'],
    [{ optionStopSale: true }, 'OPTION_STOP_SALE'],
    [{ slots: [{ time: '11:00', capacity: 10 }] }, 'DEPARTURE_TIME_UNAVAILABLE'],
    [{ slots: [{ time: '10:00', capacity: 10, blocked: true }] }, 'DEPARTURE_SLOT_BLOCKED'],
    [{ booked: 10 }, 'DEPARTURE_SOLD_OUT'],
  ])('blocks an unsellable target (%s)', (override, code) => {
    try {
      evaluateDepartureSellability({ ...sellable, ...override });
      throw new Error('Expected sellability guard to throw');
    } catch (error) {
      expect(error).toMatchObject({ code });
    }
  });

  it('maps legacy storefront option IDs to immutable pricing keys', () => {
    const options = [
      { pricingKey: 'shared-key' },
      { id: 'private-id', pricingKey: 'private-key' },
    ];
    expect(stopSaleAliasesForOption(options, 'shared-key')).toEqual(['shared-key', 'option-0']);
    expect(stopSaleAliasesForOption(options, 'private-key')).toEqual(['private-key', 'private-id']);
    expect(stoppedPricingKeysForOptionIds(options, ['option-0', 'standard-default'])).toEqual(['standard', 'shared-key']);
  });

  it('accepts a white-label option ID when that older record has no pricing key', () => {
    const options = [{ id: 'd84ce0bd-a038-44f0-9e45-34f56d1ab860' }];
    expect(stopSaleAliasesForOption(options, 'd84ce0bd-a038-44f0-9e45-34f56d1ab860'))
      .toEqual(['d84ce0bd-a038-44f0-9e45-34f56d1ab860']);
  });
});
