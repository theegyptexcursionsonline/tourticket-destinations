import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DiscountsPage from '@/app/admin/discounts/page';

jest.mock('@/components/admin/withAuth', () => ({ __esModule: true, default: (Component: React.ComponentType) => Component }));
jest.mock('@/contexts/AdminTenantContext', () => ({ useAdminTenant: () => ({ selectedTenantId: 'brand', getSelectedTenant: () => ({ name: 'Selected brand' }), isAllTenantsSelected: () => false }) }));

const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; jest.restoreAllMocks(); });

test('duplicate code keeps the entered fields and a readable alert separate from the retry action', async () => {
  const message = 'This discount code already exists. Please use a different code.';
  const fetchMock = jest.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: [] }) }).mockResolvedValueOnce({ ok: false, status: 409, json: async () => ({ error: message }) });
  global.fetch = fetchMock;
  render(<DiscountsPage />);
  await waitFor(() => expect(screen.queryByText('Loading discounts...')).not.toBeInTheDocument());
  const code = screen.getByPlaceholderText('SUMMER20, SAVE15, etc.');
  const value = screen.getByPlaceholderText('20');
  fireEvent.change(code, { target: { value: 'MN20EEO' } });
  fireEvent.change(value, { target: { value: '20' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create Discount' }));
  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent(message);
  expect(code).toHaveValue('MN20EEO');
  expect(value).toHaveValue(20);
  expect(screen.getByRole('combobox')).toHaveValue('percentage');
  expect(screen.getByRole('button', { name: 'Create Discount' })).toBeEnabled();
  expect(fetchMock).toHaveBeenLastCalledWith('/api/admin/discounts', expect.objectContaining({ method: 'POST', body: JSON.stringify({ code: 'MN20EEO', discountType: 'percentage', value: 20, isActive: true, tenantId: 'brand' }) }));
});
