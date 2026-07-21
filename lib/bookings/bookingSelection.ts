export interface OptionBoundTimeSlot {
  id: string;
  optionId?: string;
}

export interface BookingOptionWithSlots<TSlot extends OptionBoundTimeSlot = OptionBoundTimeSlot> {
  id: string;
  timeSlots?: TSlot[];
}

export function bindTimeSlotsToOption<TSlot extends OptionBoundTimeSlot>(
  optionId: string,
  timeSlots: TSlot[],
): Array<TSlot & { optionId: string }> {
  return timeSlots.map((slot) => ({ ...slot, optionId }));
}

export function isSelectedTimeSlot(
  selected: OptionBoundTimeSlot | null | undefined,
  optionId: string,
  slotId: string,
): boolean {
  if (!selected) return false;
  return selected.optionId === optionId && selected.id === slotId;
}

export function findSelectedBookingOption<
  TSlot extends OptionBoundTimeSlot,
  TOption extends BookingOptionWithSlots<TSlot>,
>(options: TOption[] | null | undefined, selected: TSlot | null | undefined): TOption | undefined {
  if (!selected || !options) return undefined;
  if (selected.optionId) return options.find((option) => option.id === selected.optionId);
  return options.find((option) => option.timeSlots?.some((slot) => slot.id === selected.id));
}

export function nextAddOnSelectionQuantity(currentQuantity: number): number {
  return currentQuantity > 0 ? 0 : 1;
}
