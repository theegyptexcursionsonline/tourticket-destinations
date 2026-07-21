import {
  bindTimeSlotsToOption,
  findSelectedBookingOption,
  isSelectedTimeSlot,
  nextAddOnSelectionQuantity,
} from '../bookingSelection';

describe('booking selection isolation', () => {
  const standard = { id: 'standard', timeSlots: bindTimeSlotsToOption('standard', [{ id: '10:00', price: 80 }]) };
  const privateOption = { id: 'private', timeSlots: bindTimeSlotsToOption('private', [{ id: '10:00', price: 170 }]) };

  it('does not select the same slot id under another option', () => {
    const selected = privateOption.timeSlots[0];
    expect(isSelectedTimeSlot(selected, 'private', '10:00')).toBe(true);
    expect(isSelectedTimeSlot(selected, 'standard', '10:00')).toBe(false);
  });

  it('resolves checkout pricing from the owning option', () => {
    expect(findSelectedBookingOption([standard, privateOption], privateOption.timeSlots[0])).toBe(privateOption);
  });

  it('toggles add-on storage state independently of guest pricing', () => {
    expect(nextAddOnSelectionQuantity(0)).toBe(1);
    expect(nextAddOnSelectionQuantity(2)).toBe(0);
  });
});
