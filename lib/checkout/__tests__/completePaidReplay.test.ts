import { completePaidReplay } from '../completePaidReplay';
const cart = [{ id: 'tour-one', selectedDate: '2026-12-01', selectedTime: '09:00', quantity: 1 }, { id: 'tour-two', selectedDate: '2026-12-02', selectedTime: '10:00', quantity: 2, selectedBookingOption: { id: 'boat', pricingKey: 'shared' } }];
const rows = () => cart.map((item, index) => ({ paymentItemIndex: index, tour: item.id, dateString: item.selectedDate, time: item.selectedTime, adultGuests: item.quantity, selectedBookingOption: item.selectedBookingOption, status: 'Confirmed', paymentStatus: 'paid', amountPaid: 50, totalPrice: 50 }));
describe('complete paid replay', () => {
  it('matches each exact immutable paid item regardless of result ordering', () => expect(completePaidReplay(rows().reverse(), cart, 100)).toBe(true));
  it.each([{ paymentItemIndex: 9 }, { paymentItemIndex: 1 }, { tour: 'wrong' }, { time: '11:00' }, { adultGuests: 3 }, { selectedBookingOption: { id: 'wrong' } }, { status: 'Pending' }, { amountPaid: 49 }])('rejects mismatched/partial record %j', (change) => {
    const bookings = rows(); Object.assign(bookings[0], change); expect(completePaidReplay(bookings, cart, 100)).toBe(false);
  });
  it('rejects wrong paid total and partial list', () => { expect(completePaidReplay(rows(), cart, 101)).toBe(false); expect(completePaidReplay(rows().slice(0, 1), cart, 100)).toBe(false); });
  it('permits missing index only for a matching single-item legacy purchase', () => {
    const booking = { ...rows()[0], paymentItemIndex: undefined };
    expect(completePaidReplay([booking], [cart[0]], 50)).toBe(true);
    expect(completePaidReplay([{ ...booking, tour: 'wrong' }], [cart[0]], 50)).toBe(false);
  });
});
