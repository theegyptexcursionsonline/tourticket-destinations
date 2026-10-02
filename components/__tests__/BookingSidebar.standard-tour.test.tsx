import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import BookingSidebar from '@/components/BookingSidebar';
const mockFetch = jest.fn();
const originalFetch = global.fetch;
afterEach(() => { jest.useRealTimers(); global.fetch = originalFetch; jest.clearAllMocks(); });
jest.mock('framer-motion', () => {
  const React = require('react');
  const cache = new Map();
  return { AnimatePresence: ({ children }: any) => children, motion: new Proxy({}, { get: (_target, tag: string) => {
    if (!cache.has(tag)) cache.set(tag, React.forwardRef(({ children, initial, animate, exit, transition, whileHover, whileTap, layout, ...props }: any, ref: any) => React.createElement(tag, { ...props, ref }, children)));
    return cache.get(tag);
  } }) };
});
jest.mock('@/i18n/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/hooks/useCart', () => ({ useCart: () => ({ addToCart: jest.fn() }) }));
jest.mock('@/hooks/useSettings', () => ({ useSettings: () => ({ formatPrice: (n: number) => `$${n}` }) }));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
describe('rendered no-option catalogue tour', () => {
  it('opens authored standard departures without a pricing-option render error', async () => {
    global.fetch = mockFetch;
    HTMLElement.prototype.scrollTo = jest.fn();
    HTMLElement.prototype.scrollIntoView = jest.fn();
    mockFetch.mockImplementation(async (url: string) => ({ ok: true, json: async () => url.endsWith('/options') ? [] : { success: true, data: { days: {}, stopSaleStatus: 'none', stoppedOptionIds: [], availableTimesByOption: { 'standard-default': ['09:00'] } } } }));
    render(<BookingSidebar isOpen onClose={jest.fn()} initialStopSaleDates={{}} tour={{ id: 'tour-one', title: 'Standard catalogue tour', image: '/tour.jpg', discountPrice: 100, bookingOptions: [], availability: { type: 'daily', slots: [{ time: '09:00', capacity: 20, price: 100 }] } } as any} />);
    fireEvent.click(screen.getByRole('button', { name: 'booking.selectDate' }));
    const day = new Date().getDate();
    fireEvent.click(screen.getByRole('button', { name: String(day) }));
    fireEvent.click(screen.getByRole('button', { name: 'booking.checkAvailability' }));
    await waitFor(() => expect(screen.getByText('Standard Tour Experience')).toBeInTheDocument());
    expect(screen.getByText('09:00')).toBeInTheDocument();
    expect(screen.queryByText('Pricing option unavailable')).not.toBeInTheDocument();
  });
});

describe('rendered civil-date request consistency', () => {
  it('uses the picked calendar day for availability and quote, including UTC-authored blocked dates', async () => {
    jest.useFakeTimers({ now: Date.parse('2026-10-02T08:00:00Z'), doNotFake: ['setTimeout','clearTimeout','setInterval','clearInterval','nextTick','queueMicrotask','performance','requestAnimationFrame','cancelAnimationFrame'] });
    global.fetch = mockFetch;
    HTMLElement.prototype.scrollTo = jest.fn(); HTMLElement.prototype.scrollIntoView = jest.fn();
    mockFetch.mockImplementation(async (url: string) => ({ ok: true, json: async () => url.endsWith('/options') ? [] : url.includes('/quote?') ? { quote: { prices: { adult: 100, child: 50, infant: 0 }, version: 1 } } : { success: true, data: { days: {}, stopSaleStatus: 'none', stoppedOptionIds: [], availableTimesByOption: { 'standard-default': ['09:00'] } } } }));
    render(<BookingSidebar isOpen onClose={jest.fn()} initialStopSaleDates={{ '2026-10-04': 'full' }} tour={{ id: 'tour-one', title: 'Standard catalogue tour', image: '/tour.jpg', discountPrice: 100, bookingOptions: [], availability: { type: 'daily', blockedDates: ['2026-10-04T00:00:00.000Z'], slots: [{ time: '09:00', capacity: 20, price: 100 }] } } as any} />);
    fireEvent.click(screen.getByRole('button', { name: 'booking.selectDate' }));
    expect(screen.getByRole('button', { name: '4 — booking.unavailable' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    fireEvent.click(screen.getByRole('button', { name: 'booking.checkAvailability' }));
    await waitFor(() => expect(screen.getByText('Standard Tour Experience')).toBeInTheDocument());
    const availabilityUrl = mockFetch.mock.calls.map(([url]) => String(url)).find(url => url.includes('?date='));
    expect(new URL(availabilityUrl!, 'https://example.test').searchParams.get('date')).toBe('2026-10-03');
    fireEvent.click(screen.getByRole('button', { name: /09:00/ }));
    await waitFor(() => expect(mockFetch.mock.calls.some(([url]) => String(url).includes('/quote?'))).toBe(true));
    const quoteUrl = mockFetch.mock.calls.map(([url]) => String(url)).find(url => url.includes('/quote?'));
    expect(new URL(quoteUrl!, 'https://example.test').searchParams.get('date')).toBe('2026-10-03');
    expect(new URL(quoteUrl!, 'https://example.test').searchParams.get('time')).toBe('09:00');
  });
});


describe('rendered departure availability state', () => {
  it.each([false, true])('shows explicit closed-date feedback only when no future slot remains (%s)', async (future) => {
    global.fetch = mockFetch;
    HTMLElement.prototype.scrollTo = jest.fn(); HTMLElement.prototype.scrollIntoView = jest.fn();
    mockFetch.mockImplementation(async (url: string) => ({ ok: true, json: async () => url.endsWith('/options') ? [] : { success: true, data: { days: {}, stopSaleStatus: 'none', stoppedOptionIds: [], availableTimesByOption: { 'standard-default': future ? ['09:00'] : [] } } } }));
    render(<BookingSidebar isOpen onClose={jest.fn()} initialStopSaleDates={{}} tour={{ id: 'tour-one', title: 'Standard catalogue tour', image: '/tour.jpg', discountPrice: 100, bookingOptions: [], availability: { type: 'daily', slots: [{ time: '09:00', capacity: 20, price: 100 }] } } as any} />);
    fireEvent.click(screen.getByRole('button', { name: 'booking.selectDate' }));
    fireEvent.click(screen.getByRole('button', { name: String(new Date().getDate()) }));
    fireEvent.click(screen.getByRole('button', { name: 'booking.checkAvailability' }));
    await screen.findByText('Standard Tour Experience');
    const message = 'No departures are available for this date. Please choose another date.';
    if (future) {
      expect(screen.queryByText(message)).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /09:00/ })).toBeEnabled();
    } else {
      expect(screen.getByRole('status')).toHaveTextContent(message);
      expect(screen.queryByRole('button', { name: /09:00/ })).not.toBeInTheDocument();
    }
  });
});
