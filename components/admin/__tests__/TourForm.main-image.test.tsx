/** @jest-environment jsdom */
// Removing a tour's main image and pressing Update Tour used to save a
// placeholder path that has never existed, which blanked the tour's photo
// everywhere. The editor now refuses the save and sends the admin to Media.
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockRefresh = jest.fn();
const mockTenant = { tenants: [{ tenantId: 'brand-a', name: 'Brand' }], selectedTenantId: 'brand-a', isAllTenantsSelected: () => false };
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mockRefresh, push: jest.fn() }) }));
jest.mock('@/hooks/useSettings', () => ({ useSettings: () => ({ selectedCurrency: { code: 'USD' } }) }));
jest.mock('@/contexts/AdminTenantContext', () => ({ useAdminTenant: () => mockTenant }));
jest.mock('next/image', () => ({ __esModule: true, default: () => null }));
jest.mock('framer-motion', () => {
  const React = require('react');
  return {
    AnimatePresence: ({ children }: any) => children,
    motion: {
      div: React.forwardRef(({ children, initial, animate, exit, transition, ...props }: any, ref: any) => <div ref={ref} {...props}>{children}</div>),
      button: React.forwardRef(({ children, whileHover, whileTap, ...props }: any, ref: any) => <button ref={ref} {...props}>{children}</button>),
    },
  };
});
jest.mock('@/components/admin/TranslationEditor', () => () => null);
jest.mock('@/components/admin/TourStructuredTranslationEditor', () => () => null);
jest.mock('@/components/admin/SearchableCheckboxList', () => () => null);
jest.mock('@/components/admin/ImageSeoFields', () => () => null);
jest.mock('@/components/admin/ContentNavigationFields', () => () => null);
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));

import toast from 'react-hot-toast';
import TourForm from '@/components/TourForm';
import { MAIN_IMAGE_REQUIRED_MESSAGE, MISSING_MAIN_IMAGE_PATH } from '@/lib/admin/tourMainImage';

const realImage = 'https://res.cloudinary.com/demo/image/upload/v1/tours/kom-ombo.webp';
const tour: any = {
  _id: 'tour-one',
  tenantId: 'brand-a',
  tenantIds: ['brand-a'],
  title: 'Tour',
  description: 'Description',
  duration: '2 hours',
  discountPrice: 20,
  destination: 'destination-one',
  category: ['category-one'],
  difficulty: 'Mittel',
  image: realImage,
  bookingCutoffMinutes: 0,
  availability: { type: 'daily', slots: [{ time: '10:00', capacity: 10 }] },
};

const writes = () => (global.fetch as jest.Mock).mock.calls.filter(([, options]) => options?.method === 'PUT');

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn(async (_url: any, options: any) => ({
    ok: true,
    json: async () => (options?.method === 'PUT'
      ? { success: true }
      : { success: true, data: [], destinations: [], categories: [], attractions: [], interests: [] }),
  })) as any;
});

it('refuses to save after the main image is removed and opens Media', async () => {
  render(<TourForm tourToEdit={tour} fullPage />);
  fireEvent.click(screen.getByRole('button', { name: 'Media' }));
  fireEvent.click(screen.getByRole('button', { name: /Remove Image/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Update Tour' }));

  await waitFor(() => expect(toast.error).toHaveBeenCalledWith(MAIN_IMAGE_REQUIRED_MESSAGE));
  expect(writes()).toHaveLength(0);
  expect(screen.getByText('Upload Main Image')).toBeTruthy();
});

it('refuses to save a tour that still holds the never-existing placeholder', async () => {
  render(<TourForm tourToEdit={{ ...tour, image: MISSING_MAIN_IMAGE_PATH }} fullPage />);
  expect(screen.queryByText('Main Image')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Update Tour' }));

  await waitFor(() => expect(toast.error).toHaveBeenCalledWith(MAIN_IMAGE_REQUIRED_MESSAGE));
  expect(writes()).toHaveLength(0);
  // The editor switches to Media so the admin can upload the replacement.
  expect(screen.getByText('Main Image')).toBeTruthy();
});

it('saves the real main image as it is, never a placeholder', async () => {
  render(<TourForm tourToEdit={tour} fullPage />);
  fireEvent.change(screen.getByDisplayValue('Tour'), { target: { value: 'Updated Tour' } });
  fireEvent.click(screen.getByRole('button', { name: 'Update Tour' }));

  await waitFor(() => expect(writes()).toHaveLength(1));
  const body = JSON.parse(writes()[0][1].body);
  expect(body.image).toBe(realImage);
  expect(body.difficulty).toBe('Moderate');
  expect(toast.error).not.toHaveBeenCalled();
});
