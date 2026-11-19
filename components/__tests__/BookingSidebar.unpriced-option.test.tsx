import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import BookingSidebar from '@/components/BookingSidebar';

// #2727: a new option starts with a 0 base. Staff may price it per start time
// or not at all yet. The panel must never list it, or a departure, at $0.00.
const mockFetch = jest.fn();
const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; jest.clearAllMocks(); });
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
jest.mock('@/hooks/useSettings', () => ({ useSettings: () => ({ formatPrice: (n: number) => `$${n.toFixed(2)}` }) }));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key, useLocale: () => 'en' }));

const apiOptions = [
  {
    id: 'unpriced', pricingKey: 'unpriced', title: 'Private experience', type: 'Per Person', price: 0,
    timeSlots: [{ id: 'slot-1', time: '09:00', available: 10, price: 0 }],
  },
  {
    id: 'per-time', pricingKey: 'per-time', title: 'Shared museum tour', type: 'Per Person', price: 0,
    timeSlots: [
      { id: 'slot-1', time: '08:00', available: 10, price: 116 },
      { id: 'slot-2', time: '10:00', available: 10, price: 0 },
    ],
  },
  {
    id: 'priced', pricingKey: 'priced', title: 'Group tour', type: 'Per Person', price: 60,
    timeSlots: [{ id: 'slot-1', time: '11:00', available: 10, price: 60 }],
  },
];

const tour = {
  id: 'tour-one', title: 'Zero base tour', image: '/tour.jpg', discountPrice: 0,
  bookingOptions: [
    { id: 'unpriced', pricingKey: 'unpriced', label: 'Private experience', type: 'Per Person', price: 0 },
    { id: 'per-time', pricingKey: 'per-time', label: 'Shared museum tour', type: 'Per Person', price: 0, timeSlots: [{ time: '08:00', price: 116 }, { time: '10:00' }] },
    { id: 'priced', pricingKey: 'priced', label: 'Group tour', type: 'Per Person', price: 60, timeSlots: [{ time: '11:00' }] },
  ],
  availability: { type: 'daily', slots: [{ time: '09:00', capacity: 20 }] },
};

const openOptions = async () => {
  global.fetch = mockFetch;
  HTMLElement.prototype.scrollTo = jest.fn();
  HTMLElement.prototype.scrollIntoView = jest.fn();
  mockFetch.mockImplementation(async (url: string) => ({
    ok: true,
    json: async () => url.endsWith('/options')
      ? apiOptions
      : { success: true, data: { days: {}, stopSaleStatus: 'none', stoppedOptionIds: [] } },
  }));
  render(<BookingSidebar isOpen onClose={jest.fn()} initialStopSaleDates={{}} tour={tour as any} />);
  fireEvent.click(screen.getByRole('button', { name: 'booking.selectDate' }));
  fireEvent.click(screen.getByRole('button', { name: String(new Date().getDate()) }));
  fireEvent.click(screen.getByRole('button', { name: 'booking.checkAvailability' }));
  await waitFor(() => expect(screen.getByText('Group tour')).toBeInTheDocument());
};

const card = (title: string) => screen.getByText(title).closest('div.relative.border-2') as HTMLElement;
const expand = (title: string) => {
  const header = card(title).querySelector('[aria-controls^="option-body-"]') as HTMLElement | null;
  if (header && header.getAttribute('aria-expanded') === 'false') fireEvent.click(header);
  return card(title);
};

describe('booking panel with unpriced options', () => {
  it('headline shows the cheapest real option price, never $0.00', async () => {
    await openOptions();
    // Base 0: the cheapest real option quote (60 per person) leads.
    expect(screen.queryByText('$0.00')).not.toBeInTheDocument();
  });

  it('lists an option priced nowhere last, as price on request, with no time to pick', async () => {
    await openOptions();
    const titles = screen.getAllByRole('heading', { level: 3 }).map((node) => node.textContent);
    expect(titles.indexOf('Private experience')).toBeGreaterThan(titles.indexOf('Group tour'));
    const unpriced = expand('Private experience');
    expect(within(unpriced).getByText('price.onRequest')).toBeInTheDocument();
    expect(within(unpriced).getByText('booking.optionPriceUnavailable')).toBeInTheDocument();
    expect(within(unpriced).queryByRole('button', { name: /09:00/ })).not.toBeInTheDocument();
  });

  it('offers a 0-base option only at its priced start time, quoted at that price', async () => {
    await openOptions();
    const perTime = expand('Shared museum tour');
    expect(within(perTime).getByRole('button', { name: /08:00/ })).toBeInTheDocument();
    expect(within(perTime).queryByRole('button', { name: /10:00/ })).not.toBeInTheDocument();
    expect(within(perTime).queryByText('$0.00')).not.toBeInTheDocument();
    expect(within(perTime).getAllByText('$116.00').length).toBeGreaterThan(0); // 1 adult × 116
  });

  it('leaves a priced option unchanged', async () => {
    await openOptions();
    const priced = expand('Group tour');
    expect(within(priced).getByRole('button', { name: /11:00/ })).toBeInTheDocument();
    expect(within(priced).getAllByText('$60.00').length).toBeGreaterThan(0);
  });
});

describe('booking panel footer and unpriced option toggle', () => {
  const footer = () => screen.getByTestId('booking-footer-total');

  it('before a time is chosen the footer estimates from a priced option, never 0', async () => {
    await openOptions();
    expect(footer()).toHaveAttribute('data-total-state', 'priced');
    expect(footer()).not.toHaveTextContent('$0.00');
    expect(footer()).toHaveTextContent('$60.00');
  });

  it('the unpriced option card never invites the customer to select a time', async () => {
    await openOptions();
    const unpriced = card('Private experience');
    const header = unpriced.querySelector('[aria-controls^="option-body-"]') as HTMLElement | null;
    if (header) {
      expect(header).not.toHaveTextContent('booking.selectTime');
      expect(header).toHaveTextContent('common.readMore');
    }
    const priced = card('Group tour').querySelector('[aria-controls^="option-body-"]') as HTMLElement | null;
    if (priced && priced.getAttribute('aria-expanded') === 'false') expect(priced).toHaveTextContent('booking.selectTime');
  });

  it('a tour with every option unpriced shows the choose-an-option prompt, not a 0 total or the tour base', async () => {
    const allUnpriced = apiOptions.map((option) => ({ ...option, price: 0, timeSlots: option.timeSlots.map((slot) => ({ ...slot, price: 0 })) }));
    global.fetch = mockFetch;
    HTMLElement.prototype.scrollTo = jest.fn();
    HTMLElement.prototype.scrollIntoView = jest.fn();
    mockFetch.mockImplementation(async (url: string) => ({
      ok: true,
      json: async () => url.endsWith('/options')
        ? allUnpriced
        : { success: true, data: { days: {}, stopSaleStatus: 'none', stoppedOptionIds: [] } },
    }));
    // The tour itself carries a real base price: it must not be quoted as a total.
    render(<BookingSidebar isOpen onClose={jest.fn()} initialStopSaleDates={{}} tour={{ ...tour, discountPrice: 60, bookingOptions: tour.bookingOptions.map((option) => ({ ...option, price: 0, timeSlots: [] })) } as any} />);
    fireEvent.click(screen.getByRole('button', { name: 'booking.selectDate' }));
    fireEvent.click(screen.getByRole('button', { name: String(new Date().getDate()) }));
    fireEvent.click(screen.getByRole('button', { name: 'booking.checkAvailability' }));
    await waitFor(() => expect(screen.getByText('Group tour')).toBeInTheDocument());
    expect(footer()).toHaveAttribute('data-total-state', 'choose-option');
    expect(footer()).toHaveTextContent('booking.chooseOptionForTotal');
    expect(footer()).not.toHaveTextContent('$');
  });
});
