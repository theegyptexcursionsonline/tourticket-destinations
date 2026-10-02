import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import BookingSidebar from '@/components/BookingSidebar';
const mockFetch = jest.fn();
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
