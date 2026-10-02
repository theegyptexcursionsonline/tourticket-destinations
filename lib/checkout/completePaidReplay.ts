/** A paid replay is complete only when every durable item matches the bound cart. */
export function completePaidReplay(bookings: any[], cart: any[], total: number): boolean {
  if (!cart.length || bookings.length !== cart.length || !Number.isFinite(total)) return false;
  const byIndex = new Map<number, any>();
  for (const booking of bookings) {
    const index = booking.paymentItemIndex === undefined && cart.length === 1 ? 0 : booking.paymentItemIndex;
    if (!Number.isInteger(index) || index < 0 || index >= cart.length || byIndex.has(index)) return false;
    if (!['Confirmed', 'Completed'].includes(booking.status) || booking.paymentStatus !== 'paid'
      || !Number.isFinite(Number(booking.totalPrice)) || Number(booking.totalPrice) < 0
      || !Number.isFinite(Number(booking.amountPaid)) || Number(booking.amountPaid) < Number(booking.totalPrice)) return false;
    byIndex.set(index, booking);
  }
  if (Math.round(bookings.reduce((sum, booking) => sum + Number(booking.totalPrice), 0) * 100) !== Math.round(total * 100)) return false;
  return cart.every((item, index) => {
    const booking = byIndex.get(index);
    const parsedDate = booking.date ? new Date(booking.date) : null;
    const date = booking.dateString || (parsedDate && Number.isFinite(parsedDate.getTime()) ? parsedDate.toISOString().slice(0, 10) : null);
    const option = item.selectedBookingOption;
    return String(booking.tour?._id || booking.tour) === String(item._id || item.id)
      && date === item.selectedDate && booking.time === item.selectedTime
      && Number(booking.adultGuests) === Number(item.quantity || 1)
      && Number(booking.childGuests || 0) === Number(item.childQuantity || 0)
      && Number(booking.infantGuests || 0) === Number(item.infantQuantity || 0)
      && String(booking.selectedBookingOption?.id || '') === String(option?.id || '')
      && String(booking.selectedBookingOption?.pricingKey || '') === String(option?.pricingKey || '');
  });
}
